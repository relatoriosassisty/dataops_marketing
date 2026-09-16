"""
gerar_lista_por_banco.py
------------------------
Gera uma lista de contatos filtrada pelo BANCO em que a pessoa tem conta,
cruzando `latest_contacts` com a tabela `cd_bank`.

Caso de uso original (Diego Souza — "7.000 clientes Bradesco"):
  - Banco Bradesco, base mais atualizada (principal característica)
  - Idade de 40 a 70 anos
  - Somente celulares
  - Somente o DDD da própria cidade
  - Capitais do Norte e Nordeste

Como rodar (a partir da raiz do projeto):
  python -m backend.scripts.gerar_lista_por_banco

Credenciais: lidas de backend/.env (mesmas vars do backend). NÃO hardcode senha aqui.
Saída: backend/output/lista_<banco>_<data>.xlsx  (coluna BANCO à direita)

Para outro banco/lista: ajuste o bloco CONFIG abaixo.
  Códigos de banco (CD_BANK):  237 = Bradesco | 341 = Itaú | 001 = Banco do Brasil
"""

import os
import re
import sys
from datetime import datetime
from pathlib import Path

import mysql.connector
import pandas as pd

# Console do Windows usa cp1252 por padrão e quebra em emoji/acentos.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

# ============================================================
# CONFIG — ajuste aqui para gerar outras listas
# ============================================================
BANCO_CD_BANK = 237                 # 237 = Bradesco (cd_bank.CD_BANK)
BANCO_LABEL   = "BRADESCO"          # rótulo que vai na coluna BANCO da saída

IDADE_MIN = 40
IDADE_MAX = 70

SOMENTE_CELULAR      = True         # descarta fixos (mantém só 11 dígitos)
SOMENTE_DDD_CIDADE   = True         # o celular precisa ter o DDD da própria cidade

QTD_TOTAL = 7000                    # total de contatos na lista final

# Capitais do Norte/Nordeste — (UF, cidade exata no banco, DDD da cidade)
CIDADES = [
    ("PA", "BELEM",        "91"),
    ("RR", "BOA VISTA",    "95"),   # print dizia "RO"; correto é RR
    ("AP", "MACAPA",       "96"),
    ("AM", "MANAUS",       "92"),
    ("TO", "PALMAS",       "63"),
    ("RO", "PORTO VELHO",  "69"),
    ("AC", "RIO BRANCO",   "68"),
    ("SE", "ARACAJU",      "79"),
    ("CE", "FORTALEZA",    "85"),
    ("PB", "JOAO PESSOA",  "83"),   # print dizia "PA"; correto é PB
    ("AL", "MACEIO",       "82"),
    ("RN", "NATAL",        "84"),
    ("PE", "RECIFE",       "81"),
    ("BA", "SALVADOR",     "71"),
    ("MA", "SAO LUIS",     "98"),
    ("PI", "TERESINA",     "86"),
]

# Quantas linhas buscar por cidade (buffer p/ dedup + alocação). ~2x a cota por
# cidade (7000/16 ≈ 438) dá folga para repor CPFs duplicados e cidades pequenas.
FETCH_POR_CIDADE = 800

# ============================================================
# Conexão — lê backend/.env (último valor de cada chave vence)
# ============================================================
def carregar_env() -> dict:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    env = {}
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def conectar():
    env = carregar_env()
    return mysql.connector.connect(
        host=env["DB_HOST"],
        port=int(env.get("DB_PORT", "3306")),
        user=env["DB_USER"],
        password=env["DB_PASSWORD"],
        database=env.get("DB_NAME", "bd_contatus"),
        charset="utf8mb4",
        connection_timeout=10,
    )


# ============================================================
# Helpers
# ============================================================
_CAMPOS = ("NOME", "CPF", "DATA_NASCIMENTO", "GENERO", "ENDERECO", "NUM_END",
           "COMPLEMENTO", "BAIRRO", "cidade", "CEP", "UF", "email_1", "email_2",
           "telefone_1", "telefone_2", "telefone_3", "telefone_4", "telefone_5",
           "telefone_6", "snapshot_updated_at")


def celulares_do_ddd(row: dict, ddd: str) -> list[str]:
    """Retorna os celulares (11 dígitos) cujo DDD bate com o da cidade."""
    achados = []
    for i in range(1, 7):
        tel = re.sub(r"\D", "", str(row.get(f"telefone_{i}") or ""))
        if len(tel) in (12, 13) and tel.startswith("55"):
            tel = tel[2:]
        if SOMENTE_CELULAR and len(tel) != 11:
            continue
        if SOMENTE_DDD_CIDADE and not tel.startswith(ddd):
            continue
        if tel and tel not in achados:
            achados.append(tel)
    return achados


def idade(data_nasc) -> int | None:
    if not data_nasc:
        return None
    hoje = datetime.today().date()
    return hoje.year - data_nasc.year - ((hoje.month, hoje.day) < (data_nasc.month, data_nasc.day))


# ============================================================
# Busca por cidade
# ============================================================
def buscar_cidade(cur, uf: str, cidade: str, ddd: str) -> list[dict]:
    campos = ", ".join(f"lc.{c}" for c in _CAMPOS)

    # Pré-filtro de telefone no SQL: ao menos um celular (11 díg.) com o DDD da cidade.
    # LIKE + CHAR_LENGTH é bem mais rápido que REGEXP nesta base.
    if SOMENTE_DDD_CIDADE:
        tel_or = " OR ".join(
            f"(lc.telefone_{i} LIKE '{ddd}%' AND CHAR_LENGTH(lc.telefone_{i}) = 11)"
            for i in range(1, 7)
        )
    else:
        tel_or = " OR ".join(
            f"CHAR_LENGTH(lc.telefone_{i}) = 11" for i in range(1, 7)
        )

    # STRAIGHT_JOIN + join por id_mailing força o plano a começar pela cidade
    # (índice UF+cidade) e só então consultar o banco — evita varrer os ~7,8M
    # correntistas Bradesco do país inteiro (o que o join por cpf provocava).
    # Sem ORDER BY global (filesort custoso); a preferência pelo mais recente é
    # aplicada no Python sobre o buffer retornado.
    sql = f"""
        SELECT STRAIGHT_JOIN {campos}
        FROM latest_contacts lc
        JOIN cd_bank b ON b.id_mailing = lc.ID_MAILING AND b.CD_BANK = %s
        WHERE lc.UF = %s
          AND lc.cidade = %s
          AND lc.DATA_NASCIMENTO IS NOT NULL
          AND lc.DATA_NASCIMENTO BETWEEN (CURDATE() - INTERVAL %s YEAR)
                                     AND (CURDATE() - INTERVAL %s YEAR)
          AND ({tel_or})
        LIMIT %s
    """
    cur.execute(sql, (BANCO_CD_BANK, uf, cidade, IDADE_MAX, IDADE_MIN, FETCH_POR_CIDADE))
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def dedup_por_cpf(rows: list[dict]) -> list[dict]:
    """Ordena por snapshot mais recente e mantém 1 linha (a mais nova) por CPF."""
    rows = sorted(rows, key=lambda r: r.get("snapshot_updated_at") or datetime.min, reverse=True)
    vistos, out = set(), []
    for r in rows:
        cpf = r.get("CPF")
        if cpf in vistos:
            continue
        vistos.add(cpf)
        out.append(r)
    return out


# ============================================================
# Alocação para atingir QTD_TOTAL distribuindo entre as cidades
# ============================================================
def alocar(pools: dict[str, list[dict]], total: int) -> list[dict]:
    n = len(pools)
    base = total // n
    alocado = {c: p[:base] for c, p in pools.items()}
    selecionados = sum(len(v) for v in alocado.values())

    # Preenche o que faltar com o excedente das cidades que ainda têm sobra
    faltam = total - selecionados
    restos = {c: pools[c][len(alocado[c]):] for c in pools}
    while faltam > 0 and any(restos.values()):
        for c in list(restos):
            if faltam <= 0:
                break
            if restos[c]:
                alocado[c].append(restos[c].pop(0))
                faltam -= 1

    final = [r for v in alocado.values() for r in v]
    return final[:total]


# ============================================================
# Main
# ============================================================
def main():
    # Popula o ambiente para os imports do backend (config_db valida DB_*).
    for k, v in carregar_env().items():
        os.environ.setdefault(k, v)

    print(f"Gerando lista: banco={BANCO_LABEL} (CD_BANK={BANCO_CD_BANK}), "
          f"idade {IDADE_MIN}-{IDADE_MAX}, alvo {QTD_TOTAL} contatos\n")

    conn = conectar()
    cur = conn.cursor()

    pools = {}
    for uf, cidade, ddd in CIDADES:
        rows = dedup_por_cpf(buscar_cidade(cur, uf, cidade, ddd))
        # anexa metadados de saída
        for r in rows:
            r["_ddd"] = ddd
            r["_celulares"] = celulares_do_ddd(r, ddd)
        # descarta quem, após normalização, ficou sem celular válido
        rows = [r for r in rows if r["_celulares"]]
        pools[f"{cidade}/{uf}"] = rows
        print(f"  {cidade}/{uf} (DDD {ddd}): {len(rows)} contatos Bradesco elegíveis")

    cur.close()
    conn.close()

    disponivel = sum(len(v) for v in pools.values())
    print(f"\nTotal elegível: {disponivel}")
    if disponivel < QTD_TOTAL:
        print(f"⚠️  Disponível ({disponivel}) < alvo ({QTD_TOTAL}). "
              f"A lista sairá com {disponivel}. Aumente FETCH_POR_CIDADE se necessário.")

    selecionados = alocar(pools, QTD_TOTAL)
    print(f"Selecionados para a lista: {len(selecionados)}")

    # UF → nome canônico da capital (a busca é accent/case-insensitive no banco,
    # então alguns registros vêm com grafia suja/mojibake; normalizamos aqui).
    cidade_por_uf = {uf: cidade for uf, cidade, _ in CIDADES}

    # ── Monta as linhas no schema oficial da API ─────────────────────────
    # Colunas DDD_i/TELEFONE_i (celular = DDD 2 díg. + número 9 díg.), + BANCO.
    linhas = []
    for r in selecionados:
        cels = r["_celulares"]      # celulares 11 díg. já filtrados pelo DDD da cidade
        reg = {
            "NOME": r.get("NOME"),
            "CPF": r.get("CPF"),
            "TIPO_PESSOA": "FISICA",
            "DATA_NASCIMENTO": r.get("DATA_NASCIMENTO"),
            "GENERO": r.get("GENERO"),
            "ENDERECO": r.get("ENDERECO"),
            "NUM_END": r.get("NUM_END"),
            "COMPLEMENTO": r.get("COMPLEMENTO"),
            "BAIRRO": r.get("BAIRRO"),
            "CIDADE": cidade_por_uf.get(r.get("UF"), r.get("cidade")),
            "CEP": r.get("CEP"),
            "UF": r.get("UF"),
            "EMAIL_1": r.get("email_1"),
            "EMAIL_2": r.get("email_2"),
            "BANCO": BANCO_LABEL,     # ← coluna extra, à direita
        }
        for i in range(1, 7):
            tel = cels[i - 1] if i <= len(cels) else ""
            reg[f"DDD_{i}"]      = tel[:2] if tel else ""
            reg[f"TELEFONE_{i}"] = tel[2:] if tel else ""
        linhas.append(reg)

    df = pd.DataFrame(linhas)

    out_dir = Path(__file__).resolve().parent.parent / "output"
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.today().strftime("%Y%m%d")
    out_path = out_dir / f"lista_{BANCO_LABEL.lower()}_{stamp}.xlsx"

    # Formatação IDÊNTICA à do backend (aba "Lista PF", estilo Input, Aptos Narrow,
    # CPF/telefone numéricos com zeros, DD/MM/YYYY, zoom 90%, freeze A2).
    from backend.utils.xlsx_exporter import gerar_xlsx
    buf = gerar_xlsx(df)
    out_path.write_bytes(buf.getvalue())
    print(f"\n[OK] Lista salva em: {out_path}  ({len(df)} linhas)")


if __name__ == "__main__":
    main()

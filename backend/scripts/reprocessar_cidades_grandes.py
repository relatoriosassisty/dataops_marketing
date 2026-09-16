import os
"""
Reprocessa cidades grandes com cursor-based pagination.
Salva progresso a cada lote — pode ser interrompido e retomado.

Arquivo de progresso: api/utils/bairros/_progresso_grandes.json
Formato: { "MG:BELO HORIZONTE": { "last_id": [id_m, id_c], "bairros": [...] }, ... }
"""
import json
import re
import sys
import time
from pathlib import Path

import mysql.connector

sys.stdout.reconfigure(encoding="utf-8")

DB = dict(
    host=os.environ["DB_HOST"],
    port=3306,
    user=os.environ["DB_USER"],
    password=os.environ["DB_PASSWORD"],
    database="bd_contatus",
    connection_timeout=10,
    read_timeout=60,
)

CIDADES = [
    ("MG", "BELO HORIZONTE"),
    ("RJ", "RIO DE JANEIRO"),
    ("SP", "SAO PAULO"),
]

LOTE = 10000
SALVAR_A_CADA = 10  # lotes entre cada salvamento

BAIRROS_DIR  = Path(__file__).parent.parent / "utils" / "bairros"
PROGRESSO_F  = BAIRROS_DIR / "_progresso_grandes.json"

_INVALIDOS = {
    "NAO INFORMADO","N INF","NAO INFORMAD","SEM BAIRRO","SEM CIDADE",
    "INTERIOR","ZONA RURAL","RURAL","NAO IDENTIFICADO","OUTROS",
    "NAO INFORMADA","IGNORADO","DESCONHECIDO","INDEFINIDO",
}

def valido(s: str) -> bool:
    s = s.strip()
    if not s or len(s) < 4 or s.upper() in _INVALIDOS:
        return False
    if re.match(r"^\d+$", s):
        return False
    return any(c.isalpha() for c in s)


def carregar_progresso() -> dict:
    if PROGRESSO_F.exists():
        return json.loads(PROGRESSO_F.read_text(encoding="utf-8"))
    return {}


def salvar_progresso(prog: dict):
    PROGRESSO_F.write_text(json.dumps(prog, ensure_ascii=False), encoding="utf-8")


prog = carregar_progresso()

for uf, cidade in CIDADES:
    chave = f"{uf}:{cidade}"

    if chave in prog and prog[chave].get("concluido"):
        print(f"{uf} {cidade}: ja concluida, pulando.")
        continue

    print(f"\n{uf} {cidade}")

    # Retoma do ponto salvo ou começa do zero
    if chave in prog and prog[chave].get("last_id"):
        last_id = tuple(prog[chave]["last_id"])
        bairros: set[str] = set(prog[chave]["bairros"])
        lote_ini = prog[chave].get("lote", 0)
        print(f"  Retomando do lote {lote_ini+1}, {len(bairros)} bairros ja coletados")
    else:
        last_id = (0, 0)
        bairros = set()
        lote_ini = 0

    lote = lote_ini

    while True:
        tentativas = 0
        rows = None
        while tentativas < 3:
            try:
                conn = mysql.connector.connect(**DB)
                cur = conn.cursor()
                cur.execute(
                    "SELECT BAIRRO, ID_MAILING, ID_COMPLEMENT "
                    "FROM latest_contacts "
                    "WHERE UF = %s AND cidade = %s "
                    "  AND BAIRRO IS NOT NULL AND BAIRRO != '' "
                    "  AND (ID_MAILING, ID_COMPLEMENT) > (%s, %s) "
                    "ORDER BY ID_MAILING, ID_COMPLEMENT "
                    "LIMIT %s",
                    (uf, cidade, last_id[0], last_id[1], LOTE),
                )
                rows = cur.fetchall()
                cur.close()
                conn.close()
                break
            except Exception as e:
                tentativas += 1
                print(f"  ERRO lote {lote+1} (tentativa {tentativas}): {e}")
                time.sleep(5)

        if rows is None:
            print("  Abortando cidade apos 3 falhas — progresso salvo.")
            break
        if not rows:
            break

        for bairro, id_m, id_c in rows:
            if bairro:
                b = bairro.strip().upper()
                if valido(b):
                    bairros.add(b)
        last_id = (rows[-1][1], rows[-1][2])
        lote += 1

        print(f"  lote {lote}: {len(rows)} registros, {len(bairros)} bairros distintos")

        if lote % SALVAR_A_CADA == 0:
            prog[chave] = {"last_id": list(last_id), "bairros": sorted(bairros), "lote": lote}
            salvar_progresso(prog)

    # Cidade concluida
    resultado = sorted(bairros)
    print(f"  Total: {len(resultado)} bairros")

    f = BAIRROS_DIR / f"{uf}.json"
    data = json.loads(f.read_text(encoding="utf-8"))
    data[cidade] = resultado
    f.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  Salvo em {f.name}")

    prog[chave] = {"concluido": True, "total": len(resultado)}
    salvar_progresso(prog)
    time.sleep(1)

print("\nConcluido.")

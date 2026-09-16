"""
Aplica correcoes_banco.csv nos arquivos estaticos api/utils/bairros/{UF}.json.

- tipo=cidade: renomeia a chave cidade_banco -> valor_correto no JSON do UF
               (mescla os bairros se a chave destino ja existir)
- tipo=bairro: substitui bairro_banco -> valor_correto na lista da cidade
"""
import csv
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

csv.field_size_limit(10_000_000)

CORRECOES = Path(__file__).parent.parent / "output" / "correcoes" / "correcoes_banco.csv"
BAIRROS_DIR = Path(__file__).parent.parent / "utils" / "bairros"

# Carrega todos os JSONs em memoria
dados: dict[str, dict[str, list[str]]] = {}
for f in BAIRROS_DIR.glob("*.json"):
    uf = f.stem
    dados[uf] = json.loads(f.read_text(encoding="utf-8"))

cidades_ok = 0
bairros_ok = 0
nao_encontrados = 0

with open(CORRECOES, encoding="utf-8-sig", errors="replace") as f:
    for row in csv.DictReader(f, delimiter=";"):
        tipo   = row["tipo"].strip()
        uf     = row["uf"].strip()
        cidade = row["cidade_banco"].strip().upper()
        correto = row["valor_correto"].strip().upper()

        if uf not in dados:
            continue

        if tipo == "cidade":
            if cidade not in dados[uf]:
                nao_encontrados += 1
                continue
            if cidade == correto:
                continue
            # Mescla bairros se destino ja existe
            bairros_antigos = dados[uf].pop(cidade)
            if correto in dados[uf]:
                existentes = set(dados[uf][correto])
                dados[uf][correto] = sorted(existentes | set(bairros_antigos))
            else:
                dados[uf][correto] = bairros_antigos
            cidades_ok += 1

        elif tipo == "bairro":
            bairro_errado = row["bairro_banco"].strip().upper()
            if cidade not in dados[uf]:
                nao_encontrados += 1
                continue
            lista = dados[uf][cidade]
            if bairro_errado not in lista:
                nao_encontrados += 1
                continue
            lista[lista.index(bairro_errado)] = correto
            # Remove duplicatas mantendo ordem
            seen = set()
            dados[uf][cidade] = [b for b in lista if not (b in seen or seen.add(b))]
            bairros_ok += 1

# Salva de volta
for uf, cidades in dados.items():
    f = BAIRROS_DIR / f"{uf}.json"
    f.write_text(
        json.dumps(cidades, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

print(f"Cidades corrigidas : {cidades_ok}")
print(f"Bairros corrigidos : {bairros_ok}")
print(f"Nao encontrados    : {nao_encontrados}")

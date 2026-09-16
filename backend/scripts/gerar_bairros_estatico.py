import os
"""
Gera arquivos estáticos de bairros por UF.

Saída: api/utils/bairros/{UF}.json
Formato: { "CIDADE": ["BAIRRO A", "BAIRRO B", ...], ... }

Consulta o banco cidade por cidade (1 query por cidade, LIMIT 500).
Suporta retomada: salva progresso em bairros_estatico_progresso.json.
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
    read_timeout=300,
)

IBGE_JSON  = Path(__file__).parent.parent / "utils" / "municipios_ibge.json"
OUT_DIR    = Path(__file__).parent.parent / "utils" / "bairros"
PROGRESSO  = Path(__file__).parent.parent / "utils" / "bairros_estatico_progresso.json"

QTD_MIN    = 5
LIMITE     = 500
PAUSA_SEG  = 1

_INVALIDOS = {
    "NAO INFORMADO","N INF","NAO INFORMAD","SEM BAIRRO","SEM CIDADE",
    "INTERIOR","ZONA RURAL","RURAL","NAO IDENTIFICADO","OUTROS",
    "NAO INFORMADA","IGNORADO","DESCONHECIDO","INDEFINIDO",
}
_RE_SO_NUMS = re.compile(r"^\d+$")
_RE_SO_SIMB = re.compile(r"^[^a-zA-ZÀ-ú]+$")


def valido(s: str) -> bool:
    s = s.strip()
    if not s or len(s) < 4 or s.upper() in _INVALIDOS:
        return False
    if _RE_SO_NUMS.match(s) or _RE_SO_SIMB.match(s):
        return False
    return any(c.isalpha() for c in s)


def buscar_bairros(uf: str, cidade: str) -> list[str]:
    conn = mysql.connector.connect(**DB)
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT BAIRRO, COUNT(*) AS qtd "
            "FROM latest_contacts "
            "WHERE UF = %s AND cidade = %s "
            "  AND BAIRRO IS NOT NULL AND BAIRRO != '' "
            "GROUP BY BAIRRO "
            "HAVING qtd >= %s "
            "ORDER BY BAIRRO "
            "LIMIT %s",
            (uf, cidade, QTD_MIN, LIMITE),
        )
        return [
            r[0].strip().upper()
            for r in cur.fetchall()
            if r[0] and valido(r[0].strip())
        ]
    finally:
        conn.close()


OUT_DIR.mkdir(exist_ok=True)
ibge: dict[str, list[str]] = json.loads(IBGE_JSON.read_text(encoding="utf-8"))

# Carrega progresso anterior
if PROGRESSO.exists():
    progresso: dict = json.loads(PROGRESSO.read_text(encoding="utf-8"))
else:
    progresso = {}

# Acumula resultados por UF (pode já ter dados de execuções anteriores)
resultados: dict[str, dict[str, list[str]]] = {}
for uf in ibge:
    uf_file = OUT_DIR / f"{uf}.json"
    if uf_file.exists():
        resultados[uf] = json.loads(uf_file.read_text(encoding="utf-8"))
    else:
        resultados[uf] = {}

total_cidades = sum(len(v) for v in ibge.values())
processadas   = 0
puladas       = 0

for uf, cidades in sorted(ibge.items()):
    for cidade in cidades:
        chave = f"{uf}:{cidade}"
        processadas += 1

        if chave in progresso:
            puladas += 1
            if processadas % 500 == 0:
                print(f"  [{processadas}/{total_cidades}] pulando já processadas...")
            continue

        try:
            bairros = buscar_bairros(uf, cidade)
        except Exception as e:
            print(f"  ERRO {uf} {cidade}: {e}")
            bairros = []

        if bairros:
            resultados[uf][cidade] = bairros

        progresso[chave] = True

        pct = processadas / total_cidades * 100
        print(f"  [{processadas}/{total_cidades} {pct:.1f}%] {uf} {cidade[:30]:30} -> {len(bairros)} bairros")

        # Salva progresso e arquivo UF a cada cidade
        PROGRESSO.write_text(json.dumps(progresso), encoding="utf-8")
        uf_file = OUT_DIR / f"{uf}.json"
        uf_file.write_text(
            json.dumps(resultados[uf], ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )

        time.sleep(PAUSA_SEG)

print(f"\nConcluído. {processadas} cidades processadas ({puladas} puladas).")
print(f"Arquivos em: {OUT_DIR}")

"""
Aplica correcoes_banco.csv nos JSONs de bairros.

Para tipo=cidade: renomeia/merge a chave da cidade no JSON.
Para tipo=bairro: dentro da cidade, substitui o nome errado pelo correto.

Resultado: JSONs com nomes já corrigidos (versão pós-atualização do banco).
"""
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

BAIRROS_DIR   = Path(__file__).parent.parent / "utils" / "bairros"
CORRECOES_CSV = Path(__file__).parent.parent / "output" / "correcoes" / "correcoes_banco.csv"

# ── Carregar correções ────────────────────────────────────────────────────────

# corr_bairro[uf][cidade][bairro_errado] = correto
corr_bairro: dict[str, dict[str, dict[str, str]]] = defaultdict(lambda: defaultdict(dict))
# corr_cidade[uf][cidade_errada] = correta
corr_cidade: dict[str, dict[str, str]] = defaultdict(dict)

with open(CORRECOES_CSV, encoding="utf-8-sig", newline="") as f:
    reader = csv.DictReader(f, delimiter=";")
    for row in reader:
        uf    = row["uf"].strip().upper()
        tipo  = row["tipo"].strip().lower()
        if tipo == "bairro":
            cidade  = row["cidade_banco"].strip().upper()
            errado  = row["bairro_banco"].strip().upper()
            correto = row["valor_correto"].strip().upper()
            if errado and correto and errado != correto:
                corr_bairro[uf][cidade][errado] = correto
        elif tipo == "cidade":
            errada  = row["cidade_banco"].strip().upper()
            correta = row["valor_correto"].strip().upper()
            if errada and correta and errada != correta:
                corr_cidade[uf][errada] = correta

print(f"Correções carregadas: {sum(len(c) for u in corr_bairro.values() for c in u.values())} bairros, "
      f"{sum(len(v) for v in corr_cidade.values())} cidades")

# ── Processar cada JSON ───────────────────────────────────────────────────────

total_bairros_renomeados = 0
total_cidades_renomeadas = 0

for json_path in sorted(BAIRROS_DIR.glob("??.json")):
    uf = json_path.stem.upper()
    data: dict[str, list[str]] = json.loads(json_path.read_text(encoding="utf-8"))

    renomeados_b = 0
    renomeados_c = 0

    # 1. Renomear cidades
    mapa_c = corr_cidade.get(uf, {})
    if mapa_c:
        novas_chaves: dict[str, list[str]] = {}
        for cidade, bairros in data.items():
            correta = mapa_c.get(cidade, cidade)
            if correta in novas_chaves:
                # Merge: adiciona bairros sem duplicar
                novas_chaves[correta] = sorted(set(novas_chaves[correta]) | set(bairros))
                renomeados_c += 1
            else:
                if correta != cidade:
                    renomeados_c += 1
                novas_chaves[correta] = list(bairros)
        data = novas_chaves

    # 2. Renomear bairros dentro de cada cidade
    mapa_uf_b = corr_bairro.get(uf, {})
    if mapa_uf_b:
        for cidade in list(data.keys()):
            mapa_b = mapa_uf_b.get(cidade, {})
            if not mapa_b:
                continue
            bairros_antigos = data[cidade]
            bairros_novos = set()
            for b in bairros_antigos:
                correto = mapa_b.get(b, b)
                if correto != b:
                    renomeados_b += 1
                bairros_novos.add(correto)
            data[cidade] = sorted(bairros_novos)

    json_path.write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8"
    )

    total_bairros_renomeados += renomeados_b
    total_cidades_renomeadas += renomeados_c
    if renomeados_b or renomeados_c:
        print(f"  {uf}: {renomeados_c} cidades renomeadas, {renomeados_b} bairros renomeados")

print(f"\nConcluído. Total: {total_cidades_renomeadas} cidades e {total_bairros_renomeados} bairros atualizados.")

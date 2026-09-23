"""
api/routes/consulta/schema.py
------------------------------
Validação de entrada do endpoint de consulta.

Parâmetros aceitos e suas etapas de processamento:

  ETAPA 1 — BANCO (SQL):
    ufs / estado  obrigatório  lista de UFs ou UF singular
    cidades       obrigatório  lista de nomes de cidades (máx 50)
    bairros       opcional     lista de bairros (máx 100)
    genero        opcional     M | F | MASCULINO | FEMININO | AMBOS
    genero_distribuicao  opcional  {M, F} percentuais somando 100 —
                  só se aplica quando genero=AMBOS e não há 'distribuicao'.
    idade_min     opcional     inteiro 18–120
    idade_max     opcional     inteiro 18–120
    email         opcional     obrigatorio | nao | preferencial | nao_filtrar
    tem_telefone  opcional     obrigatorio | nao_filtrar
    tem_cbo       opcional     obrigatorio | nao_filtrar
    cbos          opcional     lista de códigos numéricos CBO (máx 50)

  ETAPA 2 — PYTHON (pós-query):
    tipo_telefone opcional     movel | fixo | ambos  (default: movel)

  FATIAS (opcional):
    distribuicao  lista de {uf?, cidade?, bairro?, genero?, quantidade?}
                  O backend executa cada fatia e devolve tudo merged.
                  quantidade ausente/nula = sem meta fixa, pega tudo
                  disponível para aquela fatia (até o teto absoluto).

  QUANTIDADE:
    quantidade    opcional     inteiro >= 1  (teto por role aplicado na rota)

  EXCLUSÃO (opcional):
    exclusao_token  token (uuid4) retornado por POST /consulta/excluir-cpfs.
                    CPFs da lista enviada são removidos do resultado.
"""

import re


# ── Conjuntos de valores válidos ─────────────────────────────────────────────


UFS_VALIDAS = {
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
    "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
    "RO", "RR", "RS", "SC", "SE", "SP", "TO",
}

_UUID4_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
)

GENEROS_VALIDOS      = {"M", "F", "MASCULINO", "FEMININO", "AMBOS"}
EMAIL_OPCOES         = {"obrigatorio", "nao_filtrar", "nao", "preferencial"}
TELEFONE_OPCOES      = {"movel", "fixo", "ambos"}
TEM_TELEFONE_OPCOES  = {"obrigatorio", "nao_filtrar"}
TEM_CBO_OPCOES       = {"obrigatorio", "nao_filtrar"}

# ── Parâmetros por etapa de processamento ────────────────────────────────────
# Usado por _buscar_ate_quantidade para separar DB ↔ Python.

FILTROS_ETAPA_BANCO = frozenset({
    "ufs", "cidades", "bairros",
    "genero", "idade_min", "idade_max",
    "email",        # "obrigatorio"/"nao" → SQL; "preferencial" → Python
    "tem_telefone", # "obrigatorio" → WHERE telefone_1 IS NOT NULL
    "tem_cbo",      # "obrigatorio" → JOIN + WHERE cbo IS NOT NULL
    "cbos",         # lista de códigos → WHERE cbo IN (...)
})

FILTROS_ETAPA_PYTHON = frozenset({
    "tipo_telefone",  # movel | fixo | ambos — filtra por nº de dígitos
    "email",          # "preferencial" → reordenação em Python
    "ddds",           # lista de DDDs — filtra por DDD após separação
})


# ── Exceção de validação ─────────────────────────────────────────────────────

class ValidationError(Exception):
    """Erro de validação de schema."""

    def __init__(self, erros: list[str]):
        self.erros = erros
        super().__init__(f"Erros de validação: {'; '.join(erros)}")


# ── Funções de validação ─────────────────────────────────────────────────────

def validar_consulta(data: dict) -> dict:
    """
    Valida e sanitiza os dados de uma requisição de consulta.
    Raises ValidationError com lista de erros se dados inválidos.
    """
    erros = []
    resultado = {}

    # ── UFs (obrigatório) ────────────────────────────────────
    ufs = data.get("ufs") or []
    if not ufs and data.get("estado"):
        ufs = [data["estado"]]
    if isinstance(ufs, str):
        ufs = [u.strip() for u in re.split(r"[,;\s]+", ufs) if u.strip()]
    if not isinstance(ufs, list):
        erros.append("'ufs' deve ser uma lista.")
    elif not ufs:
        erros.append("Ao menos um estado (UF) deve ser informado.")
    else:
        ufs_limpas = []
        for uf in ufs[:27]:
            uf_upper = str(uf).strip().upper()
            if uf_upper in UFS_VALIDAS:
                ufs_limpas.append(uf_upper)
            else:
                erros.append(f"UF inválida: '{uf}'")
        resultado["ufs"] = ufs_limpas

    # ── Cidades (opcional — obrigatório apenas quando sem CBOs) ──
    cidades = data.get("cidades") or data.get("cidade", [])
    if isinstance(cidades, str):
        cidades = [c.strip() for c in re.split(r"[,;\n]+", cidades) if c.strip()]
    cidades_limpas = []
    if cidades:
        if len(cidades) > 50:
            erros.append("Máximo de 50 cidades por consulta.")
        for cidade in cidades[:50]:
            c = str(cidade).strip().upper()
            if len(c) > 100:
                erros.append(f"Nome de cidade muito longo: '{c[:20]}...'")
            elif len(c) < 2:
                erros.append(f"Nome de cidade muito curto: '{c}'")
            elif re.search(r"[<>{}()\[\]@#$%^&*]", c):
                erros.append(f"Caracteres inválidos no nome da cidade: '{c[:20]}'")
            else:
                cidades_limpas.append(c)
        if not cidades_limpas:
            erros.append("Nenhuma cidade válida foi informada.")
    resultado["cidades"] = cidades_limpas
    resultado["sem_cidade"] = not bool(cidades_limpas)

    # ── Bairros (opcional) ───────────────────────────────────
    bairros = data.get("bairros", [])
    if isinstance(bairros, str):
        bairros = [b.strip() for b in re.split(r"[,;\n]+", bairros) if b.strip()]
    if bairros:
        if len(bairros) > 100:
            erros.append("Máximo de 100 bairros por consulta.")
        bairros_limpos = []
        for bairro in bairros[:100]:
            b = str(bairro).strip().upper()
            if len(b) > 100:
                erros.append(f"Nome de bairro muito longo: '{b[:20]}...'")
            elif re.search(r"[<>{}()\[\]@#$%^&*]", b):
                erros.append(f"Caracteres inválidos no nome do bairro: '{b[:20]}'")
            else:
                bairros_limpos.append(b)
        resultado["bairros"] = bairros_limpos
    else:
        resultado["bairros"] = []

    # ── Gênero ────────────────────────────────────────────────
    genero = str(data.get("genero", "ambos")).strip().upper()
    if genero not in GENEROS_VALIDOS:
        erros.append(f"Gênero inválido: '{genero}'. Use: {', '.join(sorted(GENEROS_VALIDOS))}")
    resultado["genero"] = genero if genero in GENEROS_VALIDOS else "AMBOS"

    # ── Proporção M/F (opcional, só faz sentido com gênero ambos) ─
    # Distribui a quantidade entre masculino e feminino nessa proporção,
    # em vez de deixar o banco decidir livremente.
    genero_dist_raw = data.get("genero_distribuicao")
    genero_distribuicao = None
    if genero_dist_raw is not None:
        if not isinstance(genero_dist_raw, dict):
            erros.append("'genero_distribuicao' deve ser um objeto {M, F}.")
        else:
            try:
                pct_m = int(genero_dist_raw.get("M", 0))
                pct_f = int(genero_dist_raw.get("F", 0))
            except (ValueError, TypeError):
                erros.append("'genero_distribuicao': M e F devem ser inteiros.")
                pct_m = pct_f = None
            if pct_m is not None:
                if pct_m < 0 or pct_f < 0 or pct_m + pct_f != 100:
                    erros.append("'genero_distribuicao': M + F deve somar 100.")
                else:
                    genero_distribuicao = {"M": pct_m, "F": pct_f}
    resultado["genero_distribuicao"] = genero_distribuicao

    # ── Idade ────────────────────────────────────────────────
    idade_min = data.get("idade_min")
    idade_max = data.get("idade_max")

    if idade_min is not None:
        try:
            idade_min = int(idade_min)
            if idade_min < 18:
                erros.append("Idade mínima não pode ser menor que 18.")
                idade_min = 18
            if idade_min > 120:
                erros.append("Idade mínima não pode ser maior que 120.")
        except (ValueError, TypeError):
            erros.append("'idade_min' deve ser um número inteiro.")
            idade_min = None

    if idade_max is not None:
        try:
            idade_max = int(idade_max)
            if idade_max > 120:
                erros.append("Idade máxima não pode ser maior que 120.")
                idade_max = 120
            if idade_max < 18:
                erros.append("Idade máxima não pode ser menor que 18.")
        except (ValueError, TypeError):
            erros.append("'idade_max' deve ser um número inteiro.")
            idade_max = None

    # Faixa de idade SEMPRE presente na entrada: 18-70 é o padrão quando ausente.
    # (O query_builder aplica o BETWEEN sempre — inclusive no padrão.)
    if idade_min is None:
        idade_min = 18
    if idade_max is None:
        idade_max = 70

    if idade_min > idade_max:
        erros.append("'idade_min' não pode ser maior que 'idade_max'.")

    resultado["idade_min"] = idade_min
    resultado["idade_max"] = idade_max

    # ── Email ────────────────────────────────────────────────
    email = str(data.get("email", "nao_filtrar")).strip().lower()
    if email not in EMAIL_OPCOES:
        erros.append(f"Opção de email inválida: '{email}'. Use: {', '.join(sorted(EMAIL_OPCOES))}")
        email = "nao_filtrar"
    resultado["email"] = email

    # ── Tipo de telefone (filtro Python) ─────────────────────
    tipo_tel = str(data.get("tipo_telefone", "movel")).strip().lower()
    if tipo_tel not in TELEFONE_OPCOES:
        erros.append(f"Tipo de telefone inválido: '{tipo_tel}'. Use: {', '.join(sorted(TELEFONE_OPCOES))}")
        tipo_tel = "movel"
    resultado["tipo_telefone"] = tipo_tel

    # ── Existência de telefone (filtro banco) ────────────────
    tem_telefone = str(data.get("tem_telefone", "nao_filtrar")).strip().lower()
    if tem_telefone not in TEM_TELEFONE_OPCOES:
        erros.append(f"Opção de telefone inválida: '{tem_telefone}'. Use: {', '.join(sorted(TEM_TELEFONE_OPCOES))}")
        tem_telefone = "nao_filtrar"
    resultado["tem_telefone"] = tem_telefone

    # ── Existência de CBO (filtro banco via JOIN) ─────────────
    tem_cbo = str(data.get("tem_cbo", "nao_filtrar")).strip().lower()
    if tem_cbo not in TEM_CBO_OPCOES:
        erros.append(f"Opção de CBO inválida: '{tem_cbo}'. Use: {', '.join(sorted(TEM_CBO_OPCOES))}")
        tem_cbo = "nao_filtrar"
    resultado["tem_cbo"] = tem_cbo

    # ── CBOs (opcional) ──────────────────────────────────────
    cbos = data.get("cbos", [])
    if isinstance(cbos, str):
        cbos = [c.strip() for c in re.split(r"[,;\n]+", cbos) if c.strip()]
    if cbos:
        cbos_limpos = []
        for cbo in cbos[:50]:
            try:
                cbo_int = int(str(cbo).strip())
                if cbo_int <= 0:
                    erros.append(f"CBO inválido: '{cbo}' (deve ser um código positivo).")
                    continue
                cbos_limpos.append(str(cbo_int))
            except (ValueError, TypeError):
                erros.append(f"CBO inválido: '{str(cbo)[:20]}' (deve ser um código numérico).")
        resultado["cbos"] = cbos_limpos
    else:
        resultado["cbos"] = []

    # Segurança: sem cidade exige ao menos 1 CBO (evita full scan por UF)
    if resultado.get("sem_cidade") and not resultado.get("cbos"):
        erros.append(
            "Consulta sem cidade exige ao menos um CBO. "
            "Informe 'cbos' ou adicione ao menos uma cidade."
        )

    # ── DDDs (opcional, filtro Python) ──────────────────────────
    ddds = data.get("ddds", [])
    if isinstance(ddds, int):
        ddds = [ddds]
    if isinstance(ddds, str):
        ddds = [d.strip() for d in re.split(r"[,;\s]+", ddds) if d.strip()]
    if ddds:
        ddds_limpos = []
        for ddd in ddds[:30]:
            try:
                ddd_int = int(str(ddd).strip())
                if ddd_int < 11 or ddd_int > 99:
                    erros.append(f"DDD inválido: '{ddd}' (deve ser entre 11 e 99).")
                    continue
                ddds_limpos.append(ddd_int)
            except (ValueError, TypeError):
                erros.append(f"DDD inválido: '{str(ddd)[:10]}' (deve ser numérico).")
        resultado["ddds"] = ddds_limpos
    else:
        resultado["ddds"] = []

    # ── Fatias (distribuicao) ────────────────────────────────
    _MAPA_GENERO_FATIA = {"MASCULINO": "M", "FEMININO": "F", "M": "M", "F": "F", "AMBOS": "AMBOS"}
    distribuicao = data.get("distribuicao")
    if distribuicao is not None:
        if not isinstance(distribuicao, list):
            erros.append("'distribuicao' deve ser uma lista de objetos {uf?, cidade?, bairro?, genero?, quantidade?}.")
            distribuicao = None
        else:
            dist_limpa = []
            for item in distribuicao[:200]:
                if not isinstance(item, dict):
                    erros.append("Cada item de 'distribuicao' deve ser um objeto.")
                    continue
                uf_item = str(item.get("uf", "")).strip().upper()
                if uf_item and uf_item not in UFS_VALIDAS:
                    erros.append(f"'distribuicao': UF inválida '{uf_item}'.")
                    continue
                cidade_item = str(item.get("cidade", "")).strip().upper()
                # bairro: string legada (compatibilidade) ou bairros: lista (novo)
                bairros_lista = item.get("bairros")
                if isinstance(bairros_lista, list):
                    bairros_item = [str(b).strip().upper() for b in bairros_lista if str(b).strip()]
                else:
                    bairro_str = str(item.get("bairro", "")).strip().upper()
                    bairros_item = [bairro_str] if bairro_str else []
                # alta_renda por item (herda global se não informado)
                ar_raw = item.get("alta_renda")
                if ar_raw is None:
                    alta_renda_item = None  # herda global
                elif isinstance(ar_raw, str):
                    alta_renda_item = ar_raw.lower() in ("true", "1", "sim", "yes")
                else:
                    alta_renda_item = bool(ar_raw)
                genero_raw  = str(item.get("genero",  "AMBOS")).strip().upper()
                genero_item = _MAPA_GENERO_FATIA.get(genero_raw)
                if genero_item is None:
                    erros.append(f"'distribuicao': gênero inválido '{genero_raw}'. Use M, F ou AMBOS.")
                    continue
                # quantidade ausente/nula = "sem limite definido": a fatia
                # busca tudo que estiver disponível, sem meta fixa.
                qtd_raw = item.get("quantidade")
                if qtd_raw is None or qtd_raw == "":
                    qtd_item = None
                else:
                    try:
                        qtd_item = int(qtd_raw)
                        if qtd_item < 1:
                            erros.append("'distribuicao': quantidade deve ser >= 1.")
                            continue
                    except (ValueError, TypeError):
                        erros.append("'distribuicao': quantidade deve ser um inteiro.")
                        continue
                dist_limpa.append({
                    "uf":          uf_item,
                    "cidade":      cidade_item,
                    "bairros":     bairros_item,
                    "alta_renda":  alta_renda_item,
                    "genero":      genero_item,
                    "quantidade":  qtd_item,
                })
            distribuicao = dist_limpa if dist_limpa else None
    resultado["distribuicao"] = distribuicao

    # ── Quantidade ───────────────────────────────────────────
    quantidade = data.get("quantidade")
    if quantidade is not None:
        try:
            quantidade = int(quantidade)
            if quantidade < 1:
                erros.append("'quantidade' deve ser pelo menos 1.")
                quantidade = None
        except (ValueError, TypeError):
            erros.append("'quantidade' deve ser um número inteiro.")
            quantidade = None
    resultado["quantidade"] = quantidade

    # Cap de segurança para consulta só por UF (sem cidade) — evita full scan
    if resultado.get("sem_cidade"):
        _CAP_SEM_CIDADE = 5000
        if resultado["quantidade"] is None or resultado["quantidade"] > _CAP_SEM_CIDADE:
            resultado["quantidade"] = _CAP_SEM_CIDADE

    # Cap para qualquer consulta com CBOs — pipeline roda um CBO por vez
    if resultado.get("cbos"):
        _CAP_COM_CBO = 20_000
        if resultado["quantidade"] is None or resultado["quantidade"] > _CAP_COM_CBO:
            resultado["quantidade"] = _CAP_COM_CBO

    # ── Alta renda ───────────────────────────────────────────
    alta_renda_raw = data.get("alta_renda", False)
    if isinstance(alta_renda_raw, str):
        alta_renda_raw = alta_renda_raw.lower() in ("true", "1", "sim", "yes")
    resultado["alta_renda"] = bool(alta_renda_raw)

    # ── Bairros por cidade (override manual para cidades sem mapeamento) ──
    # Formato: {"CIDADE_A": ["BAIRRO 1", "BAIRRO 2"], "CIDADE_B": [...]}
    bairros_por_cidade_raw = data.get("bairros_por_cidade", {})
    bairros_por_cidade: dict[str, list[str]] = {}
    if isinstance(bairros_por_cidade_raw, dict):
        for cidade_k, bairros_v in bairros_por_cidade_raw.items():
            cidade_k = str(cidade_k).strip().upper()
            if isinstance(bairros_v, list):
                limpos = [str(b).strip().upper() for b in bairros_v if str(b).strip()]
                if limpos:
                    bairros_por_cidade[cidade_k] = limpos
    resultado["bairros_por_cidade"] = bairros_por_cidade

    # ── Exclusão de CPFs já obtidos (opcional) ────────────────
    # Token retornado por POST /consulta/excluir-cpfs.
    exclusao_token = str(data.get("exclusao_token", "")).strip().lower()
    if exclusao_token and not _UUID4_RE.match(exclusao_token):
        erros.append("'exclusao_token' inválido.")
        exclusao_token = ""
    resultado["exclusao_token"] = exclusao_token or None

    if erros:
        raise ValidationError(erros)

    return resultado


def validar_contagem(data: dict) -> dict:
    """Valida dados para endpoint de contagem. Reutiliza validar_consulta."""
    return validar_consulta(data)

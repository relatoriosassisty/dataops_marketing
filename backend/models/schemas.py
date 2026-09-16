"""
api/models/schemas.py
---------------------
Re-exporta os schemas de validação da API para compatibilidade de imports.

Os schemas de consulta foram movidos para api/routes/consulta/schema.py.
Este módulo re-exporta tudo para que imports antigos continuem funcionando.
"""

# ── Re-exportações ───────────────────────────────────────────────────────────
# Toda a lógica de validação de consulta vive em api/routes/consulta/schema.py
# Este módulo re-exporta tudo para que imports existentes continuem funcionando.

from backend.routes.consulta.schema import (  # noqa: F401
    UFS_VALIDAS,
    GENEROS_VALIDOS,
    EMAIL_OPCOES,
    TELEFONE_OPCOES,
    TEM_TELEFONE_OPCOES,
    TEM_CBO_OPCOES,
    FILTROS_ETAPA_BANCO,
    FILTROS_ETAPA_PYTHON,
    ValidationError,
    validar_consulta,
    validar_contagem,
)

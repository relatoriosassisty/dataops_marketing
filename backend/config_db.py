"""
config_db.py
------------
Credenciais de conexão com o banco de dados MySQL.

Em produção: defina as variáveis de ambiente listadas abaixo.
Em desenvolvimento: crie api/.env e carregue com python-dotenv,
  ou exporte as variáveis diretamente no shell.

Variáveis obrigatórias:
  DB_HOST, DB_USER, DB_PASSWORD

Variáveis opcionais (têm defaults):
  DB_NAME, DB_PORT, DB_USER_ADMIN, DB_PASSWORD_ADMIN,
  DB_CONNECT_TIMEOUT, DB_READ_TIMEOUT, DB_WRITE_TIMEOUT
"""

import os
import sys

# ── Credenciais lidas de variáveis de ambiente ─────────────────
DB_HOST     = os.environ.get("DB_HOST", "")
DB_NAME     = os.environ.get("DB_NAME", "bd_contatus")
DB_PORT     = int(os.environ.get("DB_PORT", "3306"))

DB_USER     = os.environ.get("DB_USER", "")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")

# Usuário com permissões DELETE/DROP para enriquecimento
# Se não definido, usa as credenciais padrão
DB_USER_ADMIN     = os.environ.get("DB_USER_ADMIN", DB_USER)
DB_PASSWORD_ADMIN = os.environ.get("DB_PASSWORD_ADMIN", DB_PASSWORD)

# ── Configurações de conexão ───────────────────────────────────
DB_CHARSET    = "utf8mb4"
DB_AUTOCOMMIT = True

# IMPORTANTE: banco de big data — sem timeout queries podem rodar horas
DB_CONNECT_TIMEOUT = int(os.environ.get("DB_CONNECT_TIMEOUT", "10"))
DB_READ_TIMEOUT    = int(os.environ.get("DB_READ_TIMEOUT",    "120"))
DB_WRITE_TIMEOUT   = int(os.environ.get("DB_WRITE_TIMEOUT",   "30"))

# ── Validação em produção ──────────────────────────────────────
_is_test = any("pytest" in arg or "test" in arg for arg in sys.argv)
if not _is_test:
    _faltando = [v for v, val in [
        ("DB_HOST",     DB_HOST),
        ("DB_USER",     DB_USER),
        ("DB_PASSWORD", DB_PASSWORD),
    ] if not val]
    if _faltando:
        raise ValueError(
            f"ERRO: Variáveis de ambiente obrigatórias não definidas: "
            f"{', '.join(_faltando)}\n"
            f"Consulte api/.env.example para a lista completa."
        )

# ── Configurações para mysql-connector-python ─────────────────
DB_CONFIG = {
    "host":               DB_HOST,
    "port":               DB_PORT,
    "user":               DB_USER,
    "password":           DB_PASSWORD,
    "database":           DB_NAME,
    "charset":            DB_CHARSET,
    "autocommit":         DB_AUTOCOMMIT,
    "connection_timeout": DB_CONNECT_TIMEOUT,
    "read_timeout":       DB_READ_TIMEOUT,
    "write_timeout":      DB_WRITE_TIMEOUT,
}

# Config para operações que exigem DELETE/DROP (enriquecimento)
DB_CONFIG_ADMIN = {
    **DB_CONFIG,
    "user":     DB_USER_ADMIN,
    "password": DB_PASSWORD_ADMIN,
}

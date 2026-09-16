"""
api/config.py
-------------
Configurações centralizadas da API segura.

TODAS as credenciais sensíveis devem vir de variáveis de ambiente.
Nunca commitar valores reais em código-fonte.
"""

import os
from pathlib import Path

# ── Diretórios ─────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
PROJECT_DIR = BASE_DIR.parent
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

# ── Rate Limiting ──────────────────────────────────────────────
# Janela deslizante (sliding window) por IP.
RATE_LIMIT_ENABLED = True
RATE_LIMIT_DEFAULT = {
    "requests_per_minute": 30,
    "requests_per_hour": 500,
    "requests_per_day": 5000,
}
# ── IP Filtering ───────────────────────────────────────────────
IP_WHITELIST_ENABLED = True  # Edição local: permite somente loopback.
IP_WHITELIST = [
    # "192.168.1.0/24",
    # "10.0.0.0/8",
    "127.0.0.1",
    "::1",
]
IP_BLACKLIST = [
    # IPs bloqueados manualmente
]

# ── CORS ───────────────────────────────────────────────────────
CORS_ORIGINS = os.environ.get("API_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173").split(",")
CORS_METHODS = ["GET", "POST"]
CORS_HEADERS = ["Content-Type", "X-Request-ID"]
CORS_MAX_AGE = 3600

# ── Segurança Geral ───────────────────────────────────────────
ENFORCE_HTTPS = os.environ.get("API_ENFORCE_HTTPS", "false").lower() == "true"
MAX_CONTENT_LENGTH = 11 * 1024 * 1024   # comporta arquivo de 10 MB e envelope multipart

# Timeout técnico para processamento local (segundos).
REQUEST_TIMEOUT = int(os.environ.get("API_REQUEST_TIMEOUT", "1800"))

MAX_REGISTROS_POR_CONSULTA = 999_999  # teto absoluto da API (schema)
MAX_REGISTROS_PADRAO = 1000

# ── Consulta em Lotes ─────────────────────────────────────────
# A consulta busca no banco em lotes fixos (BATCH_SIZE_DB), aplica
# limpeza Python em cada lote e acumula até atingir a quantidade pedida.
#
# BATCH_MAX_ITERACOES: teto de segurança contra loop infinito.
#   Com 3.000 linhas/lote e aproveitamento médio de ~80%, são necessárias
#   ~420 iterações para entregar 999.999 registros limpos.
#   Valor 500 garante margem mesmo com bases de baixo aproveitamento.
BATCH_SIZE_DB = int(os.environ.get("API_BATCH_SIZE_DB", "3000"))    # linhas por query ao banco
BATCH_MAX_ITERACOES = int(os.environ.get("API_BATCH_MAX_ITER", "500"))  # máx iterações

# ── Cache Redis ───────────────────────────────────────────────
# REDIS_URL ex: redis://localhost:6379/0  ou  redis://:senha@host:6379/0
# Se vazio, cache é desabilitado (graceful degradation).
CACHE_TTL_SECONDS = int(os.environ.get("CACHE_TTL_SECONDS", "1800"))  # 30 min

# ── Auditoria ─────────────────────────────────────────────────
AUDIT_LOG_FILE = LOGS_DIR / "audit.log"
SECURITY_LOG_FILE = LOGS_DIR / "security.log"

# ── Banco de Dados ────────────────────────────────────────────
from backend.config_db import DB_CONFIG as _DB_CONFIG
DB_CONFIG = _DB_CONFIG.copy()

# Pool de conexões (evita excesso de conexões abertas)
DB_POOL_SIZE = 5
DB_POOL_NAME = "api_pool"

# Timeout de query na API (segundos) — segurança extra contra full scans
API_QUERY_TIMEOUT = int(os.environ.get("API_QUERY_TIMEOUT", "120"))

# ── Criptografia de dados sensíveis nos logs ──────────────────
MASK_CPF = True           # mascara CPF nos logs (***.***.***-XX)
MASK_EMAIL = True         # mascara email nos logs (a***@dom***)
MASK_TELEFONE = True      # mascara telefone nos logs ((**) *****-XXXX)

# ── Modo de execução ──────────────────────────────────────────
DEBUG = os.environ.get("API_DEBUG", "false").lower() == "true"
HOST = "127.0.0.1"
PORT = int(os.environ.get("API_PORT", "5001"))

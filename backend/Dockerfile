# ================================================================
# Dockerfile — Backend Segura (bd_contatus)
#
# Build a partir da raiz do projeto:
#   docker build -f backend/Dockerfile -t backend-contatus .
#
# Run:
#   docker run -p 5001:5001 --env-file backend/.env backend-contatus
# ================================================================

FROM python:3.12-slim

# Nenhuma dependência de sistema é necessária:
# mysql-connector-python é puro Python e pandas/pyarrow instalam via wheel.
# (o apt-get com gcc/libmysqlclient estourava a memória do builder)

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# ── Dependências Python (layer de cache separado) ─────────────
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# ── Código da aplicação ───────────────────────────────────────
COPY backend/ ./backend/

# ── Usuário sem privilégios (nunca root em produção) ──────────
RUN useradd -m -u 1000 backenduser \
    && mkdir -p backend/logs backend/output/temp \
    && chown -R backenduser:backenduser /app

USER backenduser

# ── Porta exposta ──────────────────────────────────────────────
EXPOSE 5001

# ── Health check ──────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import os,urllib.request; p=os.environ.get('PORT') or os.environ.get('API_PORT') or '5001'; urllib.request.urlopen(f'http://localhost:{p}/api/v1/health')" || exit 1

# ── Entrypoint ────────────────────────────────────────────────
# Gunicorn com config em backend/gunicorn.conf.py
CMD ["gunicorn", "--config", "backend/gunicorn.conf.py", "backend.app:create_app()"]

"""
api/routes/health.py
--------------------
Endpoints de saúde e diagnóstico da API.

Rotas:
  GET /api/v1/health         → health check (sem autenticação)
  GET /api/v1/health/db      → teste de conexão com o banco (local)
  GET /api/v1/health/stats   → estatísticas da API (local)
"""

import time
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify

from backend import __version__

health_bp = Blueprint("health", __name__, url_prefix="/api/v1/health")

_start_time = time.time()


@health_bp.route("", methods=["GET"])
def health_check():
    """
    Health check básico — sem autenticação.
    Usado por load balancers e monitoramento.
    """
    return jsonify({
        "status": "healthy",
        "version": __version__,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": int(time.time() - _start_time),
    }), 200


@health_bp.route("/db", methods=["GET"])
def db_health():
    """
    Teste de conexão com o banco de dados.
    Disponível nesta edição local.
    """
    try:
        import mysql.connector
        from backend.config import DB_CONFIG

        start = time.perf_counter()
        conn = None
        try:
            conn = mysql.connector.connect(**DB_CONFIG)
            cursor = conn.cursor()
            try:
                cursor.execute("SET SESSION MAX_EXECUTION_TIME = 5000")
            except Exception:
                pass
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
        finally:
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass
        latency_ms = round((time.perf_counter() - start) * 1000, 1)

        return jsonify({
            "status": "connected",
            "latency_ms": latency_ms,
            "host": DB_CONFIG.get("host", "unknown")[:30] + "...",
            "database": DB_CONFIG.get("database", "unknown"),
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "erro": str(e)[:200],
        }), 503


@health_bp.route("/stats", methods=["GET"])
def api_stats():
    """
    Estatísticas gerais da API da edição local.
    """
    import os
    from backend.config import LOGS_DIR

    # Tamanho dos logs
    log_size = 0
    for f in LOGS_DIR.glob("*.log*"):
        log_size += f.stat().st_size

    return jsonify({
        "version": __version__,
        "uptime_seconds": int(time.time() - _start_time),
        "logs_size_mb": round(log_size / (1024 * 1024), 2),
        "pid": os.getpid(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200

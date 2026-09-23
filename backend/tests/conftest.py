"""Fixtures para a edição local, sem autenticação e sem banco real."""
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
os.environ.update(DB_HOST="127.0.0.1", DB_USER="test", DB_PASSWORD="test-only",
                  DB_NAME="test", REDIS_URL="", API_ENFORCE_HTTPS="false")


@pytest.fixture(autouse=True)
def isolate_services(monkeypatch, tmp_path):
    import mysql.connector
    import backend.config as config
    import backend.middleware.rate_limiter as rate_limiter
    import backend.routes.consulta as consulta

    def no_database(*args, **kwargs):
        raise AssertionError("Teste tentou acessar banco real; use um mock.")

    monkeypatch.setattr(mysql.connector, "connect", no_database)
    monkeypatch.setattr(rate_limiter, "RATE_LIMIT_ENABLED", False)
    monkeypatch.setattr(config, "LOGS_DIR", tmp_path)
    monkeypatch.setattr(config, "AUDIT_LOG_FILE", tmp_path / "audit.log")
    monkeypatch.setattr(config, "SECURITY_LOG_FILE", tmp_path / "security.log")
    monkeypatch.setattr(consulta, "_DIR_TEMP", tmp_path)
    # _buscar_ate_quantidade abre a conexão uma vez para todos os lotes da
    # partição (ver __init__.py); testes que só mockam _executar_query não
    # precisam de uma conexão real por trás — devolve um dummy inofensivo.
    monkeypatch.setattr(consulta, "_conectar_banco", lambda: MagicMock())


@pytest.fixture
def app():
    from backend.app import create_app
    return create_app({"TESTING": True})


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def local_headers():
    return {"Content-Type": "application/json"}


@pytest.fixture
def filtro_basico():
    return {"ufs": ["SP"], "cidades": ["SAO PAULO"]}


@pytest.fixture
def filtro_completo():
    return {"ufs": ["SP", "RJ"], "cidades": ["SAO PAULO"],
            "bairros": ["JARDIM BOTANICO"], "genero": "ambos",
            "idade_min": 25, "idade_max": 60, "email": "nao_filtrar",
            "tipo_telefone": "movel", "cbos": [], "quantidade": 100}

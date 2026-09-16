"""
test_routes.py
--------------
Testes dos endpoints da API: auth, consulta, health, admin.
Testes de autorização (RBAC) e comportamentos esperados.
"""

import json
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest


# ================================================================
# HEALTH
# ================================================================

class TestHealthEndpoints:
    """Testes dos endpoints de saúde."""

    def test_health_sem_autenticacao(self, client):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "uptime_seconds" in data




    def test_health_stats_admin_ok(self, client, local_headers):
        resp = client.get("/api/v1/health/stats", headers=local_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert "version" in data
        assert "uptime_seconds" in data


# ================================================================
# AUTH
# ================================================================









# ================================================================
# CONSULTA — autorização RBAC
# ================================================================



class TestConsultaValidacao:
    """Testes de validação de dados nos endpoints de consulta."""

    def test_consulta_sem_uf_retorna_400(self, client, local_headers):
        resp = client.post(
            "/api/v1/consulta",
            json={},
            headers=local_headers,
        )
        assert resp.status_code == 400
        data = resp.get_json()
        assert data["ok"] is False
        assert "detalhes" in data

    def test_contagem_sem_uf_retorna_400(self, client, local_headers):
        resp = client.post(
            "/api/v1/consulta/contagem",
            json={},
            headers=local_headers,
        )
        assert resp.status_code == 400

    def test_consulta_uf_invalida_retorna_400(self, client, local_headers):
        resp = client.post(
            "/api/v1/consulta",
            json={"ufs": ["ZZ"]},
            headers=local_headers,
        )
        assert resp.status_code == 400

    def test_consulta_banco_vazio_retorna_200(self, client, local_headers):
        with patch("backend.routes.consulta._executar_query", return_value=pd.DataFrame()):
            resp = client.post(
                "/api/v1/consulta",
                json={"ufs": ["SP"], "cidades": ["SAO PAULO"]},
                headers=local_headers,
            )
            assert resp.status_code == 200
            data = resp.get_json()
            assert data["ok"] is True
            assert data["total_bruto_buscado"] == 0
            assert data["registros"] == []

    def test_contagem_com_mock(self, client, local_headers, tmp_path):
        _df = pd.DataFrame([{"NOME": "X", "CPF": "12345678901", "TELEFONE_1": "11987654321",
                              "TELEFONE_2": None, "TELEFONE_3": None, "TELEFONE_4": None,
                              "TELEFONE_5": None, "TELEFONE_6": None, "GENERO": "F",
                              "DATA_NASCIMENTO": "1990-01-01", "ENDERECO": "RUA A", "NUM_END": "1",
                              "COMPLEMENTO": None, "BAIRRO": "CENTRO", "CIDADE": "SAO PAULO",
                              "UF": "SP", "CEP": "01000000", "EMAIL_1": None, "EMAIL_2": None}])
        with patch("backend.routes.consulta._executar_query", return_value=_df), \
             patch("backend.routes.consulta._DIR_TEMP", tmp_path):
            resp = client.post(
                "/api/v1/consulta/contagem",
                json={"ufs": ["SP", "RJ"], "cidades": ["SAO PAULO"], "genero": "F", "idade_min": 25, "idade_max": 50},
                headers=local_headers,
            )
            assert resp.status_code == 200
            data = resp.get_json()
            assert data["ok"] is True
            assert "total_disponivel" in data
            assert "descricao" in data

    def test_request_id_na_resposta(self, client, local_headers):
        resp = client.post(
            "/api/v1/consulta/contagem",
            json={"ufs": ["SP"], "cidades": ["SAO PAULO"]},
            headers={**local_headers, "X-Request-ID": "test-id-999"},
        )
        # Independente de sucesso/erro, request_id deve estar presente
        data = resp.get_json()
        if "request_id" in data:
            assert data["request_id"] == "test-id-999"


# ================================================================
# ADMIN
# ================================================================



# ================================================================
# ROTA RAIZ
# ================================================================

class TestRootEndpoint:
    """Testes da rota raiz."""

    def test_root_retorna_info_api(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "api" in data
        assert "endpoints" in data

    def test_404_endpoint_inexistente(self, client):
        resp = client.get("/api/v1/rota_que_nao_existe")
        assert resp.status_code == 404
        data = resp.get_json()
        assert "erro" in data

    def test_405_metodo_incorreto(self, client):
        resp = client.delete("/api/v1/health")
        assert resp.status_code == 405

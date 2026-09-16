"""Contratos da edição local, com dados sintéticos e banco isolado."""
import io
import time
import uuid
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest


def pipeline_result():
    df = pd.DataFrame([{"NOME": "PESSOA TESTE", "CPF": "00000000000", "CIDADE": "SAO PAULO"}])
    return {"df_saida": df, "cols_existentes": list(df.columns), "total_final": 1,
            "total_bruto_buscado": 1, "alguma_esgotou": False, "duracao_s": 0.01,
            "cache_hit": False, "filtros": {}, "resumos": []}


@pytest.mark.parametrize("path", ["/api/v1/auth/login", "/api/v1/auth/login_usuario",
                                 "/api/v1/auth/trocar-senha", "/api/v1/admin/keys"])
def test_rotas_de_conta_nao_existem(client, path):
    assert client.post(path, json={}).status_code == 404


def test_localidades_e_diagnostico_sem_credenciais(client):
    assert client.get("/api/v1/localidades/ufs").status_code == 200
    assert client.get("/api/v1/health/stats").status_code == 200


def test_apenas_maquina_local_e_sem_confiar_em_forwarded(client):
    response = client.get("/api/v1/health", environ_overrides={"REMOTE_ADDR": "192.0.2.10"},
                          headers={"X-Forwarded-For": "127.0.0.1"})
    assert response.status_code == 403
    assert client.get("/api/v1/health", headers={"X-Forwarded-For": "192.0.2.10"}).status_code == 200


def test_levantamento_e_download_sem_usuario_ou_financeiro(client):
    with patch("backend.routes.consulta._pipeline_consulta", return_value=pipeline_result()):
        response = client.post("/api/v1/consulta/contagem", json={"ufs": ["SP"], "cidades": ["SAO PAULO"]})
    assert response.status_code == 200, response.get_json()
    token = response.get_json()["resultado_token"]
    response = client.post("/api/v1/consulta/gerar", json={"resultado_token": token, "quantidade": 1})
    assert response.status_code == 200, response.get_json()
    assert response.data.startswith(b"PK")
    assert "X-Venda-Id" not in response.headers


def test_download_direto_sem_metadados_comerciais(client):
    with patch("backend.routes.consulta._pipeline_consulta", return_value=pipeline_result()):
        response = client.post("/api/v1/consulta/download", json={"ufs": ["SP"], "cidades": ["SAO PAULO"]})
    assert response.status_code == 200, response.get_json()
    assert response.data.startswith(b"PK")
    assert "X-Venda-Id" not in response.headers


def test_job_completo_sem_credenciais(client):
    with patch("backend.routes.consulta._pipeline_consulta", return_value=pipeline_result()):
        response = client.post("/api/v1/consulta/iniciar", json={"ufs": ["SP"], "cidades": ["SAO PAULO"]})
        assert response.status_code == 202
        job_id = response.get_json()["job_id"]
        for _ in range(100):
            response = client.get(f"/api/v1/consulta/job/{job_id}")
            if response.get_json()["status"] in ("concluido", "erro"):
                break
            time.sleep(0.02)
    assert response.get_json()["status"] == "concluido", response.get_json()
    response = client.post(f"/api/v1/consulta/job/{job_id}/xlsx", json={})
    assert response.status_code == 200
    assert response.data.startswith(b"PK")


def test_enriquecimento_multipart_sem_financeiro(client):
    df = pd.DataFrame([{"NOME": "PESSOA TESTE", "CPF": "00000000000", "TELEFONE_1": "11999999999"}])
    with patch("backend.routes.enriquecimento._carregar_cpfs_sessao"), \
         patch("backend.routes.enriquecimento._conectar", return_value=MagicMock()), \
         patch("backend.routes.enriquecimento.pd.read_sql", return_value=df):
        response = client.post("/api/v1/enriquecimento", data={
            "tipo": "cpf", "arquivo": (io.BytesIO(b"00000000000\n"), "entrada.csv"),
        }, content_type="multipart/form-data")
    assert response.status_code == 200, response.get_json()
    assert response.data.startswith(b"PK")
    assert response.headers["X-Enviados"] == "1"
    assert response.headers["X-Encontrados"] == "1"


def test_token_de_resultado_ainda_e_validado(client):
    response = client.post("/api/v1/consulta/gerar", json={"resultado_token": "invalido"})
    assert response.status_code == 400
    response = client.post("/api/v1/consulta/gerar", json={"resultado_token": str(uuid.uuid4())})
    assert response.status_code == 410


def test_log_local_nao_abre_conexao_mysql(caplog):
    from backend.utils.db_logger import registrar_log_consulta
    with caplog.at_level("INFO"), patch("mysql.connector.connect") as connect:
        registrar_log_consulta(request_id="local-test", endpoint="gerar", quantidade_retornada=1)
    connect.assert_not_called()
    assert any(r.request_id == "local-test" for r in caplog.records if hasattr(r, "request_id"))

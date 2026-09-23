"""
test_progresso_contagem.py
--------------------------
Barra de progresso do levantamento: o job assíncrono publica quantos registros
já foram coletados e, ao terminar, devolve o mesmo corpo de POST /contagem.
Banco completamente mockado.
"""
import time
from unittest.mock import patch

import pandas as pd

from backend.routes.consulta import _Progresso, _meta_progresso
from backend.utils import job_store


def _linha(cpf: str) -> dict:
    return {
        "NOME": f"PESSOA {cpf}", "CPF": cpf, "TELEFONE_1": "11987654321",
        "TELEFONE_2": None, "TELEFONE_3": None, "TELEFONE_4": None,
        "TELEFONE_5": None, "TELEFONE_6": None, "GENERO": "M",
        "DATA_NASCIMENTO": "1990-01-01", "ENDERECO": "RUA A", "NUM_END": "1",
        "COMPLEMENTO": None, "BAIRRO": "CENTRO", "CIDADE": "SAO PAULO",
        "UF": "SP", "CEP": "01000000", "EMAIL_1": None, "EMAIL_2": None,
        "_ID_MAILING": 1, "_ID_COMPLEMENT": 1,
    }


def _esperar_fim(client, headers, job_id, limite_s=10):
    fim = time.time() + limite_s
    while time.time() < fim:
        corpo = client.get(f"/api/v1/consulta/contagem/job/{job_id}", headers=headers).get_json()
        if corpo["status"] in ("concluido", "erro"):
            return corpo
        time.sleep(0.02)
    raise AssertionError("job não terminou no tempo esperado")


class TestProgressoUnitario:
    def test_soma_trechos_concluidos_e_parcial(self):
        job_id = job_store.criar_job({})
        p = _Progresso(job_id, meta=100)
        p.fim_trecho(30)
        p.lote(20)
        assert job_store.obter_job(job_id)["progresso"] == {"coletados": 50, "meta": 100}

    def test_nunca_passa_da_meta(self):
        job_id = job_store.criar_job({})
        p = _Progresso(job_id, meta=10)
        p.fim_trecho(8)
        p.lote(9)
        assert job_store.obter_job(job_id)["progresso"]["coletados"] == 10

    def test_meta_simples_e_a_quantidade(self):
        assert _meta_progresso({"quantidade": 500}) == 500

    def test_meta_da_distribuicao_e_a_soma(self):
        assert _meta_progresso({"quantidade": 999, "distribuicao": [{"quantidade": 30}, {"quantidade": 20}]}) == 50

    def test_meta_indeterminada_quando_ha_item_sem_meta(self):
        assert _meta_progresso({"quantidade": 999, "distribuicao": [{"quantidade": 30}, {"quantidade": None}]}) is None


class TestContagemAssincrona:
    def test_publica_progresso_por_lote_e_conclui_com_o_corpo_de_contagem(self, client, local_headers, tmp_path):
        chamadas = []

        def _fake(sql, params, conn=None):
            chamadas.append(1)
            # Ao pedir o 2º/3º lote, o progresso do lote anterior já deve estar publicado.
            ativos = [j for j in job_store._jobs.values() if j["status"] == "processando"]
            if len(chamadas) == 2:
                assert ativos[0]["progresso"]["coletados"] == 2
            if len(chamadas) == 3:
                assert ativos[0]["progresso"]["coletados"] == 4
            if len(chamadas) > 3:
                return pd.DataFrame()
            base = (len(chamadas) - 1) * 2
            return pd.DataFrame([_linha(f"{i + 1:011d}") for i in range(base, base + 2)])

        with patch("backend.routes.consulta._executar_query", side_effect=_fake), \
             patch("backend.routes.consulta.BATCH_SIZE_DB", 2), \
             patch("backend.routes.consulta._DIR_TEMP", tmp_path):
            resp = client.post(
                "/api/v1/consulta/contagem/iniciar",
                json={"ufs": ["SP"], "cidades": ["SAO PAULO"], "quantidade": 50},
                headers=local_headers,
            )
            assert resp.status_code == 202
            job_id = resp.get_json()["job_id"]
            corpo = _esperar_fim(client, local_headers, job_id)

        assert corpo["status"] == "concluido"
        assert corpo["resultado"]["total_disponivel"] == 6
        assert corpo["resultado"]["resultado_token"]
        assert corpo["progresso"] == {"coletados": 6, "meta": 50}

    def test_erro_do_pipeline_vira_status_erro(self, client, local_headers, tmp_path):
        with patch("backend.routes.consulta._pipeline_consulta", side_effect=RuntimeError("boom")), \
             patch("backend.routes.consulta._DIR_TEMP", tmp_path):
            resp = client.post(
                "/api/v1/consulta/contagem/iniciar",
                json={"ufs": ["SP"], "cidades": ["SAO PAULO"], "quantidade": 10},
                headers=local_headers,
            )
            corpo = _esperar_fim(client, local_headers, resp.get_json()["job_id"])

        assert corpo["status"] == "erro"
        assert "boom" not in corpo["erro"]  # não vaza detalhe interno

    def test_filtros_invalidos_retornam_400(self, client, local_headers):
        resp = client.post("/api/v1/consulta/contagem/iniciar", json={"ufs": ["XX"]}, headers=local_headers)
        assert resp.status_code == 400

    def test_job_inexistente_404_e_id_invalido_400(self, client, local_headers):
        assert client.get("/api/v1/consulta/contagem/job/" + "a" * 32, headers=local_headers).status_code == 404
        assert client.get("/api/v1/consulta/contagem/job/nao-e-hex", headers=local_headers).status_code == 400

    def test_polling_nao_e_barrado_pelo_rate_limit(self, client, local_headers, monkeypatch):
        monkeypatch.setattr("backend.middleware.rate_limiter.RATE_LIMIT_ENABLED", True)
        for _ in range(80):
            resp = client.get("/api/v1/consulta/contagem/job/" + "b" * 32, headers=local_headers)
            assert resp.status_code != 429

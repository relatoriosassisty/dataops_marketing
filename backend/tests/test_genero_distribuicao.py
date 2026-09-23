"""
test_genero_distribuicao.py
----------------------------
Testes da proporção M/F explícita (genero_distribuicao) e da meta opcional
em itens de 'distribuicao' (quantidade ausente = "sem meta", pega tudo
disponível). Banco completamente mockado.
"""

from unittest.mock import patch

import pandas as pd
import pytest


def _linha(cpf: str, genero: str) -> dict:
    return {
        "NOME": f"PESSOA {cpf}", "CPF": cpf, "TELEFONE_1": "11987654321",
        "TELEFONE_2": None, "TELEFONE_3": None, "TELEFONE_4": None,
        "TELEFONE_5": None, "TELEFONE_6": None, "GENERO": genero,
        "DATA_NASCIMENTO": "1990-01-01", "ENDERECO": "RUA A", "NUM_END": "1",
        "COMPLEMENTO": None, "BAIRRO": "CENTRO", "CIDADE": "SAO PAULO",
        "UF": "SP", "CEP": "01000000", "EMAIL_1": None, "EMAIL_2": None,
        "_ID_MAILING": 1, "_ID_COMPLEMENT": 1,
    }


def _mock_query_por_genero(qtd_m: int, qtd_f: int):
    """_executar_query side_effect: inspeciona os params (LIKE '%M%'/'%F%')
    e devolve um lote só daquele gênero, com CPFs únicos entre M e F."""
    def _fake(sql, params, conn=None):
        if "%M%" in params:
            return pd.DataFrame([_linha(f"1{str(i).zfill(10)}", "M") for i in range(qtd_m)])
        if "%F%" in params:
            return pd.DataFrame([_linha(f"2{str(i).zfill(10)}", "F") for i in range(qtd_f)])
        return pd.DataFrame()
    return _fake


class TestGeneroDistribuicao:
    def test_respeita_proporcao_informada(self, client, local_headers, tmp_path):
        with patch("backend.routes.consulta._executar_query", side_effect=_mock_query_por_genero(70, 30)), \
             patch("backend.routes.consulta._DIR_TEMP", tmp_path):
            resp = client.post(
                "/api/v1/consulta/contagem",
                json={
                    "ufs": ["SP"], "cidades": ["SAO PAULO"],
                    "genero_distribuicao": {"M": 70, "F": 30},
                    "quantidade": 100,
                },
                headers=local_headers,
            )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["ok"] is True
        assert data["total_disponivel"] == 100

    def test_proporcao_zero_num_genero_busca_so_o_outro(self, client, local_headers, tmp_path):
        with patch("backend.routes.consulta._executar_query", side_effect=_mock_query_por_genero(100, 0)), \
             patch("backend.routes.consulta._DIR_TEMP", tmp_path):
            resp = client.post(
                "/api/v1/consulta/contagem",
                json={
                    "ufs": ["SP"], "cidades": ["SAO PAULO"],
                    "genero_distribuicao": {"M": 100, "F": 0},
                    "quantidade": 100,
                },
                headers=local_headers,
            )
        assert resp.status_code == 200
        assert resp.get_json()["total_disponivel"] == 100

    def test_soma_diferente_de_100_retorna_400(self, client, local_headers):
        resp = client.post(
            "/api/v1/consulta/contagem",
            json={"ufs": ["SP"], "cidades": ["SAO PAULO"], "genero_distribuicao": {"M": 70, "F": 20}},
            headers=local_headers,
        )
        assert resp.status_code == 400
        assert "genero_distribuicao" in resp.get_json()["detalhes"][0]

    def test_nao_e_objeto_retorna_400(self, client, local_headers):
        resp = client.post(
            "/api/v1/consulta/contagem",
            json={"ufs": ["SP"], "cidades": ["SAO PAULO"], "genero_distribuicao": "70/30"},
            headers=local_headers,
        )
        assert resp.status_code == 400

    def test_sem_genero_distribuicao_nao_afeta_fluxo_normal(self, client, local_headers, tmp_path):
        _df = pd.DataFrame([_linha("00000000001", "F")])
        with patch("backend.routes.consulta._executar_query", return_value=_df), \
             patch("backend.routes.consulta._DIR_TEMP", tmp_path):
            resp = client.post(
                "/api/v1/consulta/contagem",
                json={"ufs": ["SP"], "cidades": ["SAO PAULO"]},
                headers=local_headers,
            )
        assert resp.status_code == 200


class TestDistribuicaoQuantidadeOpcional:
    """Item de 'distribuicao' sem 'quantidade' = sem meta, pega tudo disponível."""

    def test_item_sem_quantidade_busca_ate_o_teto(self, client, local_headers, tmp_path, monkeypatch):
        import backend.routes.consulta as consulta_module
        monkeypatch.setattr(consulta_module, "MAX_REGISTROS_POR_CONSULTA", 50)
        _df = pd.DataFrame([_linha(f"3{str(i).zfill(10)}", "M") for i in range(10)])
        with patch("backend.routes.consulta._executar_query", return_value=_df), \
             patch("backend.routes.consulta._DIR_TEMP", tmp_path):
            resp = client.post(
                "/api/v1/consulta/contagem",
                json={
                    "ufs": ["SP"], "cidades": ["SAO PAULO"],
                    "distribuicao": [{"cidade": "SAO PAULO"}],
                },
                headers=local_headers,
            )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["ok"] is True
        # esgotou (lote de 10 < teto de 50) → pegou tudo que existia, sem erro de meta.
        assert data["total_disponivel"] == 10

    def test_item_com_quantidade_zero_ou_negativa_retorna_400(self, client, local_headers):
        resp = client.post(
            "/api/v1/consulta/contagem",
            json={"ufs": ["SP"], "cidades": ["SAO PAULO"], "distribuicao": [{"cidade": "SAO PAULO", "quantidade": 0}]},
            headers=local_headers,
        )
        assert resp.status_code == 400

    def test_item_com_quantidade_null_e_tratado_como_sem_meta(self, client, local_headers, tmp_path):
        _df = pd.DataFrame([_linha(f"4{str(i).zfill(10)}", "M") for i in range(5)])
        with patch("backend.routes.consulta._executar_query", return_value=_df), \
             patch("backend.routes.consulta._DIR_TEMP", tmp_path):
            resp = client.post(
                "/api/v1/consulta/contagem",
                json={
                    "ufs": ["SP"], "cidades": ["SAO PAULO"],
                    "distribuicao": [{"cidade": "SAO PAULO", "quantidade": None}],
                },
                headers=local_headers,
            )
        assert resp.status_code == 200
        assert resp.get_json()["total_disponivel"] == 5

"""
test_distribuicao_uf.py
-------------------------
Distribuição de quantidade por UF em itens de 'distribuicao' — mesmo
mecanismo já usado para cidade/bairro, agora também por estado. Banco
completamente mockado.
"""
from unittest.mock import patch

import pandas as pd
import pytest


def _linha(cpf: str, uf: str) -> dict:
    return {
        "NOME": f"PESSOA {cpf}", "CPF": cpf, "TELEFONE_1": "11987654321",
        "TELEFONE_2": None, "TELEFONE_3": None, "TELEFONE_4": None,
        "TELEFONE_5": None, "TELEFONE_6": None, "GENERO": "M",
        "DATA_NASCIMENTO": "1990-01-01", "ENDERECO": "RUA A", "NUM_END": "1",
        "COMPLEMENTO": None, "BAIRRO": "CENTRO", "CIDADE": "CIDADE X",
        "UF": uf, "CEP": "01000000", "EMAIL_1": None, "EMAIL_2": None,
        "_ID_MAILING": 1, "_ID_COMPLEMENT": 1,
    }


class TestDistribuicaoPorUf:
    def test_item_com_uf_filtra_so_aquela_uf(self, client, local_headers, tmp_path):
        """Cada item {uf, quantidade} deve restringir a busca só àquela UF."""
        def _fake(sql, params, conn=None):
            uf_pedida = params[0]
            if uf_pedida == "SP":
                return pd.DataFrame([_linha(f"1{str(i).zfill(10)}", "SP") for i in range(3)])
            if uf_pedida == "RJ":
                return pd.DataFrame([_linha(f"2{str(i).zfill(10)}", "RJ") for i in range(2)])
            return pd.DataFrame()

        with patch("backend.routes.consulta._executar_query", side_effect=_fake), \
             patch("backend.routes.consulta._DIR_TEMP", tmp_path):
            resp = client.post(
                "/api/v1/consulta/contagem",
                json={
                    "ufs": ["SP", "RJ"],
                    "cbos": ["225125"],  # sem cidade, a consulta exige ao menos 1 CBO
                    "distribuicao": [
                        {"uf": "SP", "quantidade": 3},
                        {"uf": "RJ", "quantidade": 2},
                    ],
                },
                headers=local_headers,
            )

        assert resp.status_code == 200
        assert resp.get_json()["total_disponivel"] == 5

    def test_item_uf_sem_quantidade_pega_tudo_disponivel(self, client, local_headers, tmp_path, monkeypatch):
        import backend.routes.consulta as consulta_module
        monkeypatch.setattr(consulta_module, "MAX_REGISTROS_POR_CONSULTA", 50)

        def _fake(sql, params, conn=None):
            return pd.DataFrame([_linha(f"3{str(i).zfill(10)}", "SP") for i in range(7)])

        with patch("backend.routes.consulta._executar_query", side_effect=_fake), \
             patch("backend.routes.consulta._DIR_TEMP", tmp_path):
            resp = client.post(
                "/api/v1/consulta/contagem",
                json={"ufs": ["SP"], "cbos": ["225125"], "distribuicao": [{"uf": "SP"}]},
                headers=local_headers,
            )

        assert resp.status_code == 200
        assert resp.get_json()["total_disponivel"] == 7

    def test_uf_invalida_no_item_retorna_400(self, client, local_headers):
        resp = client.post(
            "/api/v1/consulta/contagem",
            json={"ufs": ["SP"], "cbos": ["225125"], "distribuicao": [{"uf": "XX", "quantidade": 10}]},
            headers=local_headers,
        )
        assert resp.status_code == 400
        assert "UF inválida" in resp.get_json()["detalhes"][0]

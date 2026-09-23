"""
test_distribuicao_com_varios_cbos.py
--------------------------------------
Bug real corrigido: quando havia 'distribuicao' ativa (por UF, cidade ou
bairro) e o usuário tinha selecionado vários CBOs, a divisão "um CBO por
vez" era ignorada — todos os CBOs iam juntos num único IN(...) por fatia,
o que travava consultas amplas (medido: 11 CBOs numa fatia passou de 300s
com conexão perdida). Banco completamente mockado.
"""
from unittest.mock import patch

import pandas as pd
import pytest


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


class TestDistribuicaoDivideTambemPorCbo:
    def test_distribuicao_por_uf_com_varios_cbos_divide_um_de_cada_vez(self, client, local_headers, tmp_path):
        """Cada chamada ao banco deve ter só 1 CBO no IN(...), mesmo com distribuicao ativa."""
        cbos_vistos_por_chamada = []

        def _fake(sql, params, conn=None):
            trecho_cbo = sql.split("e.cbo IN (")[1].split(")")[0]
            cbos_vistos_por_chamada.append(trecho_cbo.count("%s"))
            return pd.DataFrame()  # esgota de imediato

        with patch("backend.routes.consulta._executar_query", side_effect=_fake), \
             patch("backend.routes.consulta._DIR_TEMP", tmp_path):
            resp = client.post(
                "/api/v1/consulta/contagem",
                json={
                    "ufs": ["SP", "RJ"],
                    "cbos": ["225125", "225124", "225225"],
                    "distribuicao": [
                        {"uf": "SP", "quantidade": 100},
                        {"uf": "RJ", "quantidade": 100},
                    ],
                },
                headers=local_headers,
            )

        assert resp.status_code == 200
        # 2 UFs x 3 CBOs = 6 chamadas, cada uma com exatamente 1 CBO.
        assert len(cbos_vistos_por_chamada) == 6
        assert all(n == 1 for n in cbos_vistos_por_chamada), \
            f"cada chamada deveria ter só 1 CBO, viu: {cbos_vistos_por_chamada}"

    def test_resultados_de_varios_cbos_dentro_de_uma_fatia_sao_somados(self, client, local_headers, tmp_path):
        respostas = {
            "225125": pd.DataFrame([_linha(f"1{str(i).zfill(10)}") for i in range(2)]),
            "225124": pd.DataFrame([_linha(f"2{str(i).zfill(10)}") for i in range(3)]),
        }

        def _fake(sql, params, conn=None):
            # cbos entram em params como int (ver query_builder.py)
            cbo_pedido = next((c for c in respostas if int(c) in params), None)
            df = respostas.get(cbo_pedido)
            if df is None:
                return pd.DataFrame()
            respostas[cbo_pedido] = None  # só devolve uma vez
            return df

        with patch("backend.routes.consulta._executar_query", side_effect=_fake), \
             patch("backend.routes.consulta._DIR_TEMP", tmp_path):
            resp = client.post(
                "/api/v1/consulta/contagem",
                json={
                    "ufs": ["SP"],
                    "cbos": ["225125", "225124"],
                    "distribuicao": [{"uf": "SP", "quantidade": 100}],
                },
                headers=local_headers,
            )

        assert resp.status_code == 200
        assert resp.get_json()["total_disponivel"] == 5  # 2 + 3

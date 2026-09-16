"""
test_integration.py
-------------------
Testes de integração: fluxos completos end-to-end.

Simula cenários reais de uso da API combinando múltiplas camadas
(auth → validação → consulta → resposta).
"""

import json
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest




class TestFluxoCompletoConsulta:
    """Testa o fluxo completo de consulta com mock do banco."""

    def _mock_df(self, n=5):
        rows = []
        for i in range(n):
            rows.append({
                "NOME": f"PESSOA {i}",
                "CPF": f"3216549870{i}",
                "TELEFONE_1": f"119876{50000+i}",
                "TELEFONE_2": None, "TELEFONE_3": None,
                "TELEFONE_4": None, "TELEFONE_5": None,
                "TELEFONE_6": None,
                "GENERO": "M" if i % 2 == 0 else "F",
                "DATA_NASCIMENTO": "1990-01-01",
                "ENDERECO": f"RUA {i}", "NUM_END": str(i),
                "COMPLEMENTO": None,
                "BAIRRO": "CENTRO", "CIDADE": "SAO PAULO",
                "UF": "SP", "CEP": "01000000",
                "EMAIL_1": f"p{i}@mail.com", "EMAIL_2": None,
            })
        return pd.DataFrame(rows)

    def test_consulta_completa_com_dados(self, client, local_headers):
        with patch("backend.routes.consulta._executar_query", return_value=self._mock_df(10)):
            resp = client.post(
                "/api/v1/consulta",
                json={
                    "ufs": ["SP"],
                    "cidades": ["SAO PAULO"],
                    "genero": "ambos",
                    "quantidade": 5,
                },
                headers=local_headers,
            )
            assert resp.status_code == 200
            data = resp.get_json()
            assert data["ok"] is True
            assert data["total_bruto_buscado"] == 10
            assert len(data["registros"]) <= 5
            assert "colunas" in data
            assert "tempo_processamento_s" in data

    def test_contagem_retorna_total_sem_dados(self, client, local_headers, tmp_path):
        with patch("backend.routes.consulta._executar_query", return_value=self._mock_df(3)), \
             patch("backend.routes.consulta._DIR_TEMP", tmp_path):
            resp = client.post(
                "/api/v1/consulta/contagem",
                json={"ufs": ["RJ"], "cidades": ["NITEROI"], "genero": "F", "idade_min": 30, "idade_max": 50},
                headers=local_headers,
            )
            assert resp.status_code == 200
            data = resp.get_json()
            assert data["ok"] is True
            assert "total_disponivel" in data
            # Contagem NÃO deve retornar registros diretamente
            assert "registros" not in data

    def test_preview_mascara_dados(self, client, local_headers):
        with patch("backend.routes.consulta._executar_query", return_value=self._mock_df(3)):
            resp = client.post(
                "/api/v1/consulta/preview",
                json={"ufs": ["SP"], "cidades": ["SAO PAULO"]},
                headers=local_headers,
            )
            assert resp.status_code == 200
            data = resp.get_json()
            assert data["ok"] is True
            assert "registros_preview" in data
            assert data["nota"] is not None

            # Verificar que dados estão mascarados
            for reg in data["registros_preview"]:
                if reg.get("CPF"):
                    assert "***" in str(reg["CPF"]), "CPF deveria estar mascarado"
                if reg.get("NOME"):
                    assert "*" in str(reg["NOME"]), "Nome deveria estar mascarado"

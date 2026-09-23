"""
test_conexao_retry.py
-----------------------
_buscar_ate_quantidade reaproveita uma única conexão entre os lotes de uma
partição (perf) e, se essa conexão cair no meio (ex.: MySQL error 2013),
reabre e repete o lote — até 3 tentativas no total — antes de desistir.
Banco completamente mockado.
"""
from unittest.mock import MagicMock, patch

import mysql.connector
import pandas as pd
import pytest

from backend.routes.consulta import _buscar_ate_quantidade


@pytest.fixture(autouse=True)
def _sem_espera_entre_tentativas(monkeypatch):
    """As tentativas de reconexão dão time.sleep(1.5); não esperar de verdade nos testes."""
    monkeypatch.setattr("backend.routes.consulta.time.sleep", lambda *_: None)


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


class TestReusoDeConexao:
    def test_uma_conexao_para_varios_lotes(self, monkeypatch):
        """Mesma conexão usada em todos os lotes de uma partição, não uma por lote."""
        conexoes_abertas = []

        def _nova_conexao():
            c = MagicMock()
            conexoes_abertas.append(c)
            return c

        monkeypatch.setattr("backend.routes.consulta._conectar_banco", _nova_conexao)

        # Dois lotes: primeiro cheio (bate no _batch), segundo esgota.
        respostas = [
            pd.DataFrame([_linha(f"1{str(i).zfill(10)}") for i in range(5)]),
            pd.DataFrame(),
        ]
        with patch("backend.routes.consulta._executar_query", side_effect=respostas):
            df, esgotou, bruto = _buscar_ate_quantidade(
                {"ufs": ["SP"], "cidades": ["SAO PAULO"]}, quantidade=100, batch_size=5,
            )

        assert len(conexoes_abertas) == 1, "deveria abrir só uma conexão para os dois lotes"
        assert conexoes_abertas[0].close.called, "deveria fechar a conexão ao final"
        assert len(df) == 5
        assert esgotou is True

    def test_reconecta_e_repete_o_lote_apos_perda_de_conexao(self, monkeypatch):
        """Erro 2013 (conexão perdida) no meio de um lote: reabre e tenta de novo."""
        conexoes_abertas = []

        def _nova_conexao():
            c = MagicMock()
            conexoes_abertas.append(c)
            return c

        monkeypatch.setattr("backend.routes.consulta._conectar_banco", _nova_conexao)

        chamadas = {"n": 0}

        def _fake_query(sql, params, conn=None):
            chamadas["n"] += 1
            if chamadas["n"] == 1:
                raise mysql.connector.errors.OperationalError(
                    "2013 (HY000): Lost connection to MySQL server during query"
                )
            if chamadas["n"] == 2:
                return pd.DataFrame([_linha(f"1{str(i).zfill(10)}") for i in range(3)])
            return pd.DataFrame()

        with patch("backend.routes.consulta._executar_query", side_effect=_fake_query):
            df, esgotou, bruto = _buscar_ate_quantidade(
                {"ufs": ["SP"], "cidades": ["SAO PAULO"]}, quantidade=100, batch_size=5,
            )

        assert len(df) == 3
        assert esgotou is True
        # 1ª conexão (perdida) + reconexão para repetir o lote = 2 aberturas.
        assert len(conexoes_abertas) == 2
        assert conexoes_abertas[0].close.called

    def test_reconecta_ate_2_vezes_antes_de_desistir(self, monkeypatch):
        """Falha 2x seguidas mas recupera na 3ª tentativa do mesmo lote."""
        conexoes_abertas = []

        def _nova_conexao():
            c = MagicMock()
            conexoes_abertas.append(c)
            return c

        monkeypatch.setattr("backend.routes.consulta._conectar_banco", _nova_conexao)

        chamadas = {"n": 0}

        def _fake_query(sql, params, conn=None):
            chamadas["n"] += 1
            if chamadas["n"] <= 2:
                raise mysql.connector.errors.OperationalError("2013 (HY000): Lost connection")
            return pd.DataFrame([_linha(f"1{str(i).zfill(10)}") for i in range(3)])

        with patch("backend.routes.consulta._executar_query", side_effect=_fake_query):
            df, esgotou, bruto = _buscar_ate_quantidade(
                {"ufs": ["SP"], "cidades": ["SAO PAULO"]}, quantidade=100, batch_size=5,
            )

        assert len(df) == 3
        assert len(conexoes_abertas) == 3, "conexão inicial + 2 reconexões"

    def test_erro_persistente_apos_3_tentativas_propaga(self, monkeypatch):
        """Se continuar caindo nas 3 tentativas, o erro sobe (não trava em loop)."""
        monkeypatch.setattr("backend.routes.consulta._conectar_banco", lambda: MagicMock())

        def _fake_query(sql, params, conn=None):
            raise mysql.connector.errors.OperationalError("2013 (HY000): Lost connection")

        with patch("backend.routes.consulta._executar_query", side_effect=_fake_query), \
             pytest.raises(mysql.connector.Error):
            _buscar_ate_quantidade({"ufs": ["SP"], "cidades": ["SAO PAULO"]}, quantidade=100)


def test_cursor_com_cbo_avanca_por_id_do_cbo():
    """Com CBO, o cursor do 2º lote deve levar (_ID_CBO, _ID_MAILING, _ID_COMPLEMENT) do último do 1º."""
    from backend.routes.consulta import _buscar_ate_quantidade

    def lote(cbo_ids):
        return pd.DataFrame([{**_linha(f"{i:011d}"), "_ID_CBO": i, "_ID_MAILING": 100 + i, "_ID_COMPLEMENT": 7}
                             for i in cbo_ids])

    chamadas = []

    def _fake(sql, params, conn=None):
        chamadas.append((sql, list(params)))
        return lote([5, 9]) if len(chamadas) == 1 else pd.DataFrame()

    with patch("backend.routes.consulta._executar_query", side_effect=_fake):
        _buscar_ate_quantidade({"ufs": ["RS"], "cbos": ["225125"]}, 100, batch_size=2)

    assert len(chamadas) == 2
    assert "(e.id, lc.ID_MAILING, lc.ID_COMPLEMENT) > (%s, %s, %s)" in chamadas[1][0]
    assert chamadas[1][1][-4:-1] == [9, 109, 7]

"""
test_exclusao_cpfs.py
----------------------
Testes do endpoint POST /api/v1/consulta/excluir-cpfs e da aplicação da
exclusão sobre o resultado de uma consulta (sem acesso real ao banco).
"""

import io
import json

import pandas as pd
import pytest

from backend.routes import consulta


def _post_exclusao(client, headers, conteudo: str, nome: str = "excluir.txt"):
    return client.post(
        "/api/v1/consulta/excluir-cpfs",
        data={"arquivo": (io.BytesIO(conteudo.encode("utf-8")), nome)},
        headers={k: v for k, v in headers.items() if k != "Content-Type"},
        content_type="multipart/form-data",
    )


class TestExcluirCpfsValidacao:
    def test_sem_arquivo_retorna_400(self, client, local_headers):
        resp = client.post(
            "/api/v1/consulta/excluir-cpfs",
            data={},
            headers={k: v for k, v in local_headers.items() if k != "Content-Type"},
            content_type="multipart/form-data",
        )
        assert resp.status_code == 400

    def test_arquivo_sem_cpfs_validos_retorna_400(self, client, local_headers):
        resp = _post_exclusao(client, local_headers, "abc\ndef\n")
        assert resp.status_code == 400

    def test_arquivo_valido_retorna_token_e_quantidade(self, client, local_headers):
        resp = _post_exclusao(client, local_headers, "091.991.949-96\n000.000.001-91\n091.991.949-96\n")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["ok"] is True
        assert data["quantidade"] == 2  # dedup
        assert len(data["exclusao_token"]) == 36  # uuid4

    def test_arquivo_muito_grande_retorna_413(self, client, local_headers, monkeypatch):
        monkeypatch.setattr(consulta, "_MAX_BYTES_EXCLUSAO", 10)
        resp = _post_exclusao(client, local_headers, "09199194996\n00000000191\n")
        assert resp.status_code == 413


class TestAplicarExclusao:
    """_aplicar_exclusao filtra o df_saida sem depender do banco."""

    def test_sem_token_nao_altera_resultado(self):
        df = pd.DataFrame([{"CPF": "09199194996"}, {"CPF": "00000000191"}])
        resultado = {"df_saida": df, "total_final": 2}
        saida = consulta._aplicar_exclusao(resultado, None)
        assert len(saida["df_saida"]) == 2

    def test_token_inexistente_levanta_erro(self):
        resultado = {"df_saida": pd.DataFrame([{"CPF": "09199194996"}]), "total_final": 1}
        with pytest.raises(ValueError):
            consulta._aplicar_exclusao(resultado, "00000000-0000-4000-8000-000000000000")

    def test_token_valido_remove_cpfs_da_lista(self, tmp_path, monkeypatch):
        monkeypatch.setattr(consulta, "_DIR_TEMP", tmp_path)
        dir_exclusao = tmp_path / "exclusoes"
        dir_exclusao.mkdir(parents=True)
        token = "11111111-1111-4111-8111-111111111111"
        (dir_exclusao / f"{token}.json").write_text(
            json.dumps(["09199194996"]), encoding="utf-8"
        )

        df = pd.DataFrame([{"CPF": "09199194996"}, {"CPF": "00000000191"}])
        resultado = {"df_saida": df, "total_final": 2}
        saida = consulta._aplicar_exclusao(resultado, token)

        assert saida["total_final"] == 1
        assert list(saida["df_saida"]["CPF"]) == ["00000000191"]

    def test_token_expirado_levanta_erro_e_remove_arquivo(self, tmp_path, monkeypatch):
        import os
        import time as time_mod

        monkeypatch.setattr(consulta, "_DIR_TEMP", tmp_path)
        dir_exclusao = tmp_path / "exclusoes"
        dir_exclusao.mkdir(parents=True)
        token = "22222222-2222-4222-8222-222222222222"
        arquivo = dir_exclusao / f"{token}.json"
        arquivo.write_text(json.dumps(["09199194996"]), encoding="utf-8")
        antigo = time_mod.time() - consulta._TOKEN_MAX_AGE - 60
        os.utime(arquivo, (antigo, antigo))

        resultado = {"df_saida": pd.DataFrame([{"CPF": "09199194996"}]), "total_final": 1}
        with pytest.raises(ValueError):
            consulta._aplicar_exclusao(resultado, token)
        assert not arquivo.exists()

    def test_exclusao_fora_da_chave_de_cache(self):
        """exclusao_token não deve alterar a chave de cache da consulta."""
        from backend.utils.cache import cache_key
        base = {"ufs": ["SP"], "cidades": ["SAO PAULO"]}
        com_token = {**base, "exclusao_token": "abc"}
        chave_sem = cache_key(base)
        chave_com = cache_key({k: v for k, v in com_token.items() if k != "exclusao_token"})
        assert chave_sem == chave_com

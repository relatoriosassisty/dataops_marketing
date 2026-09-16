"""
api/routes/localidades.py
--------------------------
Rotas de apoio para o frontend: lista cidades e bairros disponíveis no banco.

Cidades: servidas do dicionário estático do IBGE (municipios_ibge.json).
Bairros: servidos de arquivos estáticos api/utils/bairros/{UF}.json,
         gerados pelo script scripts/gerar_bairros_estatico.py.
         Zero queries no banco.
"""

import json
from pathlib import Path

from flask import Blueprint, g, jsonify, request

from backend.auth.decorators import require_auth

_UTILS = Path(__file__).parent.parent / "utils"

_MUNICIPIOS: dict[str, list[str]] = json.loads(
    (_UTILS / "municipios_ibge.json").read_text(encoding="utf-8")
)

_BAIRROS_DIR = _UTILS / "bairros"

# Cache em memória por UF (carregado sob demanda, sem TTL — arquivos estáticos)
_bairros_cache: dict[str, dict[str, list[str]]] = {}


def _bairros_uf(uf: str) -> dict[str, list[str]]:
    if uf not in _bairros_cache:
        f = _BAIRROS_DIR / f"{uf}.json"
        if not f.exists():
            _bairros_cache[uf] = {}
        else:
            _bairros_cache[uf] = json.loads(f.read_text(encoding="utf-8"))
    return _bairros_cache[uf]


_UFS: list[str] = sorted(_MUNICIPIOS.keys())

localidades_bp = Blueprint("localidades", __name__, url_prefix="/api/v1/localidades")


@localidades_bp.route("/ufs", methods=["GET"])
@require_auth
def ufs():
    """
    Retorna lista de UFs disponíveis (derivada do IBGE).

    Resposta:
      { "ufs": ["AC", "AL", ...], "total": N }
    """
    return jsonify({"ufs": _UFS, "total": len(_UFS)}), 200


@localidades_bp.route("/cidades", methods=["GET"])
@require_auth
def cidades():
    """
    Retorna municípios oficiais (IBGE) para um estado.

    Query params:
      uf  — sigla do estado (obrigatório)

    Resposta:
      { "cidades": [...], "total": N }
    """
    uf = (request.args.get("uf") or "").strip().upper()
    if not uf or len(uf) != 2:
        return jsonify({"erro": "Parâmetro 'uf' obrigatório (2 letras)."}), 400

    lista = _MUNICIPIOS.get(uf, [])
    return jsonify({"uf": uf, "cidades": lista, "total": len(lista)}), 200


@localidades_bp.route("/bairros", methods=["GET"])
@require_auth
def bairros():
    """
    Retorna bairros disponíveis para uma cidade (dados estáticos).

    Query params:
      uf     — sigla do estado (obrigatório)
      cidade — nome da cidade  (obrigatório)

    Resposta:
      { "bairros": [...], "total": N }
    """
    uf     = (request.args.get("uf")     or "").strip().upper()
    cidade = (request.args.get("cidade") or "").strip().upper()

    if not uf or len(uf) != 2:
        return jsonify({"erro": "Parâmetro 'uf' obrigatório (2 letras)."}), 400
    if not cidade:
        return jsonify({"erro": "Parâmetro 'cidade' obrigatório."}), 400

    lista = _bairros_uf(uf).get(cidade, [])
    return jsonify({"uf": uf, "cidade": cidade, "bairros": lista, "total": len(lista)}), 200


@localidades_bp.route("/alta-renda", methods=["GET"])
@require_auth
def alta_renda():
    """
    Retorna os bairros de alta renda mapeados para uma cidade.

    Query params:
      uf     — sigla do estado (obrigatório)
      cidade — nome da cidade  (obrigatório)

    Resposta:
      { "bairros": ["JARDIM EUROPA", ...], "mapeada": true|false }
    """
    uf     = (request.args.get("uf")     or "").strip().upper()
    cidade = (request.args.get("cidade") or "").strip().upper()

    if not uf or len(uf) != 2:
        return jsonify({"erro": "Parâmetro 'uf' obrigatório (2 letras)."}), 400
    if not cidade:
        return jsonify({"erro": "Parâmetro 'cidade' obrigatório."}), 400

    from backend.utils.alta_renda import buscar_bairros
    bairros_ar = buscar_bairros(uf, cidade)
    return jsonify({
        "uf": uf,
        "cidade": cidade,
        "bairros": bairros_ar,
        "mapeada": len(bairros_ar) > 0,
    }), 200


@localidades_bp.route("/cache/limpar", methods=["POST"])
@require_auth
def limpar_cache():
    """
    Recarrega os arquivos de bairros da memória.
    Requer role admin. Útil após regenerar os JSONs estáticos.
    """
    auth = g.auth_user
    if auth.get("role") != "admin":
        return jsonify({"erro": "Apenas administradores podem limpar o cache."}), 403

    uf = (request.args.get("uf") or "").strip().upper()

    if uf:
        _bairros_cache.pop(uf, None)
        removidas = 1 if uf else 0
    else:
        removidas = len(_bairros_cache)
        _bairros_cache.clear()

    return jsonify({
        "mensagem": f"{removidas} estado(s) removido(s) do cache.",
        "uf": uf or "todos",
    }), 200

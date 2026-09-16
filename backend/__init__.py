"""
API Segura — Projeto Listas PF
===============================
API REST com autenticação JWT, rate limiting, auditoria completa
e múltiplas camadas de segurança para consultas ao banco de dados.
"""

__version__ = "1.0.0"

from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env", override=False)

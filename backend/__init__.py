"""
API local — Projeto Listas PF
===============================
API REST local com limites técnicos e registro de operações
e múltiplas camadas de segurança para consultas ao banco de dados.
"""

__version__ = "1.0.0"

from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env", override=False)

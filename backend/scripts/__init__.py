"""Utilitários executados pela raiz com python -m backend.scripts.<nome>."""

from pathlib import Path

(Path(__file__).resolve().parent.parent / "output").mkdir(parents=True, exist_ok=True)

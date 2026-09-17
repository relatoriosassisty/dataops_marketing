"""Normalização e parsing de listas de CPF, compartilhados entre rotas."""
import io
import re


def normalizar_cpf(valor: str) -> str | None:
    """Retorna CPF apenas com dígitos (11), ou None se inválido."""
    cpf = re.sub(r"\D", "", str(valor))
    return cpf if len(cpf) == 11 else None


def parse_arquivo_cpfs(raw_bytes: bytes) -> list[str]:
    """
    Lê bytes de arquivo (TXT ou CSV) linha a linha e retorna lista de CPFs
    normalizados e deduplicados, preservando ordem de aparição.
    """
    try:
        stream = io.StringIO(raw_bytes.decode("utf-8"))
    except UnicodeDecodeError:
        stream = io.StringIO(raw_bytes.decode("latin-1", errors="replace"))

    seen: dict[str, None] = {}
    for line in stream:
        raw = re.split(r"[;,\t]", line)[0].strip().strip('"').strip("'")
        if not raw:
            continue
        normalized = normalizar_cpf(raw)
        if normalized and normalized not in seen:
            seen[normalized] = None
    return list(seen.keys())

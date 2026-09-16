"""Registro técnico local; não acessa tabelas de usuários ou de faturamento."""
import logging

log = logging.getLogger(__name__)


def registrar_log_consulta(*, request_id: str, endpoint: str, **metadata) -> None:
    """Registra métricas da operação no logger local, sem persistência no banco."""
    log.info("operação local", extra={
        "request_id": request_id,
        "action": endpoint,
        "details": metadata,
    })

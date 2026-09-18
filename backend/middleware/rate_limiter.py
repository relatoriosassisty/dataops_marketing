import time
import threading
from collections import defaultdict
from typing import Optional

from flask import Flask, g, jsonify, request

from backend.config import (
    RATE_LIMIT_DEFAULT,
    RATE_LIMIT_ENABLED,
)


class SlidingWindowCounter:
    """
    Contador de janela deslizante thread-safe.
    Divide a janela em sub-buckets para precisão.
    """

    def __init__(self, window_seconds: int, max_requests: int, buckets: int = 10):
        self.window = window_seconds
        self.max_requests = max_requests
        self.bucket_size = window_seconds / buckets
        self.buckets_count = buckets
        self._lock = threading.Lock()
        # {identifier: {bucket_key: count}}
        self._counters: dict[str, dict[int, int]] = defaultdict(lambda: defaultdict(int))

    def _current_bucket(self) -> int:
        return int(time.time() / self.bucket_size)

    def _prune(self, identifier: str) -> None:
        """Remove buckets expirados."""
        current = self._current_bucket()
        cutoff = current - self.buckets_count
        buckets = self._counters[identifier]
        expired = [k for k in buckets if k <= cutoff]
        for k in expired:
            del buckets[k]

    def hit(self, identifier: str) -> tuple[bool, int, int, float]:
        """
        Registra uma requisição.

        Retorna: (permitido, total_atual, limite, segundos_para_reset)
        """
        with self._lock:
            self._prune(identifier)
            current = self._current_bucket()

            # Contar total na janela
            total = sum(self._counters[identifier].values())

            if total >= self.max_requests:
                # Bloqueado — calcular tempo para reset
                oldest = min(self._counters[identifier].keys()) if self._counters[identifier] else current
                reset_at = (oldest + self.buckets_count + 1) * self.bucket_size
                retry_after = max(0, reset_at - time.time())
                return False, total, self.max_requests, retry_after

            # Permitido — registrar
            self._counters[identifier][current] += 1
            total += 1
            reset_at = (current + self.buckets_count + 1) * self.bucket_size
            remaining_time = max(0, reset_at - time.time())
            return True, total, self.max_requests, remaining_time

    def get_remaining(self, identifier: str) -> int:
        """Retorna quantas requisições restam na janela atual."""
        with self._lock:
            self._prune(identifier)
            total = sum(self._counters[identifier].values())
            return max(0, self.max_requests - total)

    def cleanup_all(self) -> int:
        """Remove todos os contadores expirados. Retorna quantidade removida."""
        with self._lock:
            cleaned = 0
            empty_ids = []
            for identifier in list(self._counters.keys()):
                self._prune(identifier)
                if not self._counters[identifier]:
                    empty_ids.append(identifier)
            for identifier in empty_ids:
                del self._counters[identifier]
                cleaned += 1
            return cleaned


class RateLimiter:
    """Limites técnicos iguais para todas as requisições, identificadas por IP."""

    def __init__(self):
        self._limiters = {
            "minute": SlidingWindowCounter(60, RATE_LIMIT_DEFAULT["requests_per_minute"]),
            "hour": SlidingWindowCounter(3600, RATE_LIMIT_DEFAULT["requests_per_hour"]),
            "day": SlidingWindowCounter(86400, RATE_LIMIT_DEFAULT["requests_per_day"]),
        }

    def check(self, identifier: str) -> dict:
        for window, limiter in self._limiters.items():
            allowed, total, limit, retry_after = limiter.hit(identifier)
            if not allowed:
                return {"allowed": False, "limit": limit, "remaining": 0,
                        "retry_after": retry_after, "window": window, "total": total}
        return {"allowed": True, "limit": RATE_LIMIT_DEFAULT["requests_per_minute"],
                "remaining": self._limiters["minute"].get_remaining(identifier),
                "retry_after": 0, "window": "minute"}


def rate_limit_middleware(app: Flask) -> None:
    limiter = RateLimiter()

    @app.before_request
    def check_rate_limit():
        if not RATE_LIMIT_ENABLED or request.method == "OPTIONS":
            return None
        # Rotas de localidades servem dados estáticos em memória (UFs, cidades,
        # bairros) e a interface dispara várias chamadas em paralelo ao marcar
        # cada estado — contra esse limite pensado para consultas ao banco,
        # isso esgotava a cota e fazia cidades "sumirem" da tela sem aviso.
        if request.method == "GET" and request.path.startswith("/api/v1/localidades/"):
            return None
        result = limiter.check(request.remote_addr or "unknown")
        g.rate_limit_info = result
        if not result["allowed"]:
            response = jsonify({"erro": "Limite técnico de requisições excedido.",
                                "tente_apos_segundos": int(result["retry_after"]) + 1})
            response.status_code = 429
            response.headers["Retry-After"] = str(int(result["retry_after"]) + 1)
            return response

    @app.after_request
    def add_rate_limit_headers(response):
        info = getattr(g, "rate_limit_info", None)
        if info:
            response.headers["X-RateLimit-Limit"] = str(info["limit"])
            response.headers["X-RateLimit-Remaining"] = str(info["remaining"])
        return response

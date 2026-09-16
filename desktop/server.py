"""Servidor HTTP local da interface e da API no mesmo endereço."""
import threading
from pathlib import Path
import sys


def resource_root():
    return Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parents[1]))


class LocalServer:
    def __init__(self):
        self.server = None
        self.thread = None
        self.url = None

    def start(self):
        from backend.app import create_app
        from werkzeug.serving import make_server
        frontend = resource_root() / "frontend" / "dist"
        if not (frontend / "index.html").exists():
            raise RuntimeError("A interface não foi incluída. Reinstale o pacote completo.")
        app = create_app(frontend_dir=frontend)
        # Porta livre escolhida pelo sistema, sem conflitar com outras aplicações.
        self.server = make_server("127.0.0.1", 0, app, threaded=True)
        self.url = f"http://127.0.0.1:{self.server.server_port}"
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        return self.url

    def stop(self):
        if self.server:
            self.server.shutdown()
            self.server.server_close()
            self.server = None

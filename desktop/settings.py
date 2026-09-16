"""Configuração local protegida com DPAPI, vinculada ao usuário do Windows."""
import ctypes
from ctypes import wintypes
import json
import os
from pathlib import Path
import sys


def _resource_root():
    return Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))


def _load_defaults():
    """Servidor, porta e banco padrão: nunca vão para o git (desktop/db_defaults.json,
    listado no .gitignore). Sem esse arquivo, host/porta/banco também são pedidos."""
    path = _resource_root() / "db_defaults.json"
    if not path.exists():
        return {"host": "", "port": 3306, "database": ""}
    values = json.loads(path.read_text(encoding="utf-8"))
    return {"host": values.get("host", ""), "port": int(values.get("port", 3306)), "database": values.get("database", "")}


_DEFAULTS = _load_defaults()
DEFAULT_HOST = _DEFAULTS["host"]
DEFAULT_PORT = _DEFAULTS["port"]
DEFAULT_DATABASE = _DEFAULTS["database"]


def data_dir():
    return Path(os.environ.get("DATAOPS_DATA_DIR") or Path(os.environ["LOCALAPPDATA"]) / "DataopsMarketing")


class Blob(ctypes.Structure):
    _fields_ = [("size", wintypes.DWORD), ("data", ctypes.POINTER(ctypes.c_char))]


def protect(raw: bytes, decrypt=False) -> bytes:
    buffer = ctypes.create_string_buffer(raw)
    source = Blob(len(raw), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_char)))
    target = Blob()
    crypt32 = ctypes.WinDLL("crypt32", use_last_error=True)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel32.LocalFree.argtypes = [ctypes.c_void_p]
    kernel32.LocalFree.restype = ctypes.c_void_p
    if decrypt:
        ok = crypt32.CryptUnprotectData(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(target))
    else:
        ok = crypt32.CryptProtectData(ctypes.byref(source), "Dataops Marketing", None, None, None, 1, ctypes.byref(target))
    if not ok:
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        return ctypes.string_at(target.data, target.size)
    finally:
        kernel32.LocalFree(ctypes.cast(target.data, ctypes.c_void_p))


def save_settings(settings, directory=None):
    directory = Path(directory) if directory else data_dir()
    directory.mkdir(parents=True, exist_ok=True)
    target = directory / "connection.bin"
    temporary = target.with_suffix(".tmp")
    temporary.write_bytes(protect(json.dumps(settings, ensure_ascii=False).encode("utf-8")))
    temporary.replace(target)


def load_settings(directory=None):
    path = (Path(directory) if directory else data_dir()) / "connection.bin"
    if not path.exists():
        return None
    return json.loads(protect(path.read_bytes(), decrypt=True).decode("utf-8"))


def validate_settings(settings):
    values = {
        "host": DEFAULT_HOST,
        "port": DEFAULT_PORT,
        "database": DEFAULT_DATABASE,
        "user": str(settings.get("user", "")).strip(),
        "password": settings.get("password", ""),
    }
    if not values["host"] or not values["database"]:
        raise ValueError("Pacote sem servidor do banco configurado. Reinstale com um pacote completo.")
    if not values["user"]:
        raise ValueError("Preencha o usuário do banco.")
    return values


def test_connection(settings):
    import mysql.connector
    values = validate_settings(settings)
    conn = mysql.connector.connect(host=values["host"], port=values["port"],
        database=values["database"], user=values["user"], password=values["password"],
        connection_timeout=10, read_timeout=10, write_timeout=10)
    try:
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        finally:
            cursor.close()
    finally:
        conn.close()
    return values


def apply_settings(settings):
    values = validate_settings(settings)
    mapping = {"host": "DB_HOST", "port": "DB_PORT", "database": "DB_NAME", "user": "DB_USER", "password": "DB_PASSWORD"}
    for field, variable in mapping.items():
        os.environ[variable] = str(values[field])
    os.environ["DB_USER_ADMIN"] = values["user"]
    os.environ["DB_PASSWORD_ADMIN"] = values["password"]
    os.environ["DATAOPS_DATA_DIR"] = str(data_dir())
    os.environ["API_ENFORCE_HTTPS"] = "false"
    os.environ["API_DEBUG"] = "false"

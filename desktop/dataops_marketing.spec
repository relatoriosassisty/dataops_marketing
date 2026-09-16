# -*- mode: python ; coding: utf-8 -*-
# Gera um único executável Windows com backend, api e interface embutidos.
# Construa com: pyinstaller desktop/dataops_marketing.spec --distpath dist --workpath build --noconfirm
import sys
from pathlib import Path

ROOT = Path(SPECPATH).resolve().parent

db_defaults = ROOT / "desktop" / "db_defaults.json"
if not db_defaults.exists():
    raise SystemExit(
        "desktop/db_defaults.json não existe. Copie desktop/db_defaults.example.json "
        "para desktop/db_defaults.json e preencha host, porta e banco antes de gerar o executável."
    )

datas = [
    (str(ROOT / "frontend" / "dist"), "frontend/dist"),
    (str(ROOT / "backend" / "utils" / "municipios_ibge.json"), "backend/utils"),
    (str(ROOT / "backend" / "utils" / "bairros"), "backend/utils/bairros"),
    (str(db_defaults), "."),
]
icon_path = ROOT / "desktop" / "app.ico"
icon = str(icon_path) if icon_path.exists() else None

hiddenimports = [
    "mysql.connector.locales.eng",
    "mysql.connector.plugins.mysql_native_password",
    "mysql.connector.plugins.caching_sha2_password",
]

a = Analysis(
    [str(ROOT / "desktop" / "main.py")],
    pathex=[str(ROOT)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="DataopsMarketing",
    console=False,
    icon=icon,
    onefile=True,
)

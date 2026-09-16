# Gera dist/DataopsMarketing.exe: um único arquivo para enviar ao usuário final.
# Execute na raiz do repositório: .\desktop\build.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

if (-not (Test-Path "desktop/db_defaults.json")) {
    Write-Host "desktop/db_defaults.json não existe." -ForegroundColor Yellow
    Write-Host "Copie desktop/db_defaults.example.json para desktop/db_defaults.json e preencha host, porta e banco." -ForegroundColor Yellow
    exit 1
}

Write-Host "Instalando dependências do backend..."
python -m pip install -r backend/requirements.txt -r desktop/requirements.txt

Write-Host "Compilando a interface (frontend/dist)..."
npm --prefix frontend ci
npm --prefix frontend run build

Write-Host "Gerando o executável..."
Remove-Item -Recurse -Force build, dist -ErrorAction SilentlyContinue
pyinstaller desktop/dataops_marketing.spec --distpath dist --workpath build --noconfirm

Write-Host ""
Write-Host "Pronto: dist/DataopsMarketing.exe"
Write-Host "Envie apenas esse arquivo ao usuário final. Ao abri-lo pela primeira vez," -ForegroundColor Cyan
Write-Host "ele se instala em %LOCALAPPDATA%, cria um atalho e depois pede os dados de conexão." -ForegroundColor Cyan

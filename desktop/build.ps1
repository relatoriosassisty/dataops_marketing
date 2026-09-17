# Gera dist/DataopsMarketing.exe: um único arquivo para enviar ao usuário final.
# Execute na raiz do repositório: .\desktop\build.ps1
#
# O build roda isolado num venv próprio (desktop/.build-venv), nunca no
# python global nem no .venv de desenvolvimento — assim as versões exatas
# de cada dependência ficam sempre as mesmas, independente do que já está
# instalado na máquina que gera o pacote. Ao final, as versões realmente
# usadas são congeladas em desktop/requirements.lock.txt (gerado, não
# editado à mão) para registrar exatamente o que foi empacotado.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Invoke-Step($description, [scriptblock]$action) {
    # Ferramentas como pip/npm/pyinstaller escrevem progresso em stderr;
    # checamos o código de saída real em vez de tratar stderr como falha.
    Write-Host $description
    & $action
    if ($LASTEXITCODE -ne 0) {
        throw "Falhou: $description (código $LASTEXITCODE)"
    }
}

if (-not (Test-Path "desktop/db_defaults.json")) {
    Write-Host "desktop/db_defaults.json não existe." -ForegroundColor Yellow
    Write-Host "Copie desktop/db_defaults.example.json para desktop/db_defaults.json e preencha host, porta e banco." -ForegroundColor Yellow
    exit 1
}

$venv = "desktop/.build-venv"
if (-not (Test-Path "$venv/Scripts/python.exe")) {
    Invoke-Step "Criando ambiente isolado para o build ($venv)..." { python -m venv $venv }
}
$venvPython = "$venv/Scripts/python.exe"

Invoke-Step "Atualizando pip no ambiente isolado..." { & $venvPython -m pip install --upgrade pip }
Invoke-Step "Instalando dependências no ambiente isolado..." {
    & $venvPython -m pip install -r backend/requirements.txt -r desktop/requirements.txt
}

Write-Host "Registrando as versões exatas usadas neste build..."
& $venvPython -m pip freeze | Out-File -Encoding utf8 desktop/requirements.lock.txt

Invoke-Step "Instalando dependências da interface..." { npm --prefix frontend ci }
Invoke-Step "Compilando a interface (frontend/dist)..." { npm --prefix frontend run build }

Write-Host "Gerando o executável..."
Remove-Item -Recurse -Force build, dist -ErrorAction SilentlyContinue
Invoke-Step "Empacotando com PyInstaller..." {
    & $venvPython -m PyInstaller desktop/dataops_marketing.spec --distpath dist --workpath build --noconfirm
}
Copy-Item desktop/LEIA-ME.txt dist/LEIA-ME.txt

Write-Host ""
Write-Host "Pronto: dist/DataopsMarketing.exe e dist/LEIA-ME.txt" -ForegroundColor Cyan
Write-Host "Envie os dois arquivos juntos ao usuário final." -ForegroundColor Cyan
Write-Host "Versões exatas usadas: desktop/requirements.lock.txt" -ForegroundColor Cyan

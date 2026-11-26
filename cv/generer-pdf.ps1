# Génère CV-Mathis-LABBE.pdf à partir de cv.html avec Chrome (ou Edge) en mode sans fenêtre.
# Utilisation : clic droit > « Exécuter avec PowerShell », ou dans un terminal :
#   powershell -ExecutionPolicy Bypass -File .\generer-pdf.ps1

$dossier = $PSScriptRoot
$source  = Join-Path $dossier "cv.html"
$sortie  = Join-Path $dossier "CV-Mathis-LABBE.pdf"

$navigateurs = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
)
$navigateur = $navigateurs | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $navigateur) {
    Write-Host "Chrome ou Edge introuvable. Ouvrez cv.html dans un navigateur et imprimez en PDF." -ForegroundColor Red
    exit 1
}

$url = "file:///" + ($source -replace '\\', '/')
$profilTemp = Join-Path $env:TEMP "cv-pdf-profil"

& $navigateur --headless=new --disable-gpu --no-pdf-header-footer `
    --user-data-dir="$profilTemp" `
    --virtual-time-budget=5000 `
    --print-to-pdf="$sortie" $url 2>$null | Out-Null

if (Test-Path $sortie) {
    Write-Host "PDF généré : $sortie" -ForegroundColor Green
} else {
    Write-Host "La génération a échoué." -ForegroundColor Red
    exit 1
}

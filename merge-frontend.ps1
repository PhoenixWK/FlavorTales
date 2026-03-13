# merge-frontend.ps1
# Merges the 'frontend' branch folder into main/frontend
# Uses robocopy: copies new & updated files, does NOT delete extras in destination

$Root   = Split-Path -Parent $PSScriptRoot
$Source = Join-Path $Root "frontend"
$Dest   = Join-Path $Root "main\frontend"

Write-Host ""
Write-Host "========================================"
Write-Host "  Merging: frontend -> main/frontend"
Write-Host "========================================"
Write-Host "  Source : $Source"
Write-Host "  Dest   : $Dest"
Write-Host ""

if (-not (Test-Path $Source)) {
    Write-Error "Source folder not found: $Source"
    exit 1
}

if (-not (Test-Path $Dest)) {
    New-Item -ItemType Directory -Path $Dest -Force | Out-Null
    Write-Host "  Created destination folder."
}

robocopy $Source $Dest /E /XD ".git" "node_modules" ".next" /NP /TEE /LOG+:"$PSScriptRoot\merge-frontend.log"

$rc = $LASTEXITCODE
if ($rc -ge 8) {
    Write-Error "robocopy failed with exit code $rc. Check merge-frontend.log for details."
    exit $rc
} else {
    Write-Host ""
    Write-Host "  Done. (robocopy exit code: $rc — success)"
    Write-Host ""
}

# merge-database.ps1
# Merges the 'database' branch folder into main/database
# Uses robocopy: copies new & updated files, does NOT delete extras in destination

$Root   = Split-Path -Parent $PSScriptRoot
$Source = Join-Path $Root "database"
$Dest   = Join-Path $Root "main\database"

Write-Host ""
Write-Host "========================================"
Write-Host "  Merging: database -> main/database"
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

robocopy $Source $Dest /E /XD ".git" /NP /TEE /LOG+:"$PSScriptRoot\merge-database.log"

$rc = $LASTEXITCODE
if ($rc -ge 8) {
    Write-Error "robocopy failed with exit code $rc. Check merge-database.log for details."
    exit $rc
} else {
    Write-Host ""
    Write-Host "  Done. (robocopy exit code: $rc — success)"
    Write-Host ""
}

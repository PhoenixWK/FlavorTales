# merge-infrastructure.ps1
# Merges the 'infrastructure' branch folder into main/infrastructure
# Excludes the merge scripts themselves to avoid polluting main/infrastructure
# Uses robocopy: copies new & updated files, does NOT delete extras in destination

$Root   = Split-Path -Parent $PSScriptRoot
$Source = $PSScriptRoot                          # infrastructure/ is the source
$Dest   = Join-Path $Root "main\infrastructure"

Write-Host ""
Write-Host "=============================================="
Write-Host "  Merging: infrastructure -> main/infrastructure"
Write-Host "=============================================="
Write-Host "  Source : $Source"
Write-Host "  Dest   : $Dest"
Write-Host ""

if (-not (Test-Path $Dest)) {
    New-Item -ItemType Directory -Path $Dest -Force | Out-Null
    Write-Host "  Created destination folder."
}

# Exclude .git and the merge scripts themselves (*.ps1 and *.log)
robocopy $Source $Dest /E /XD ".git" /XF "merge-*.ps1" "merge-*.log" /NP /TEE /LOG+:"$PSScriptRoot\merge-infrastructure.log"

$rc = $LASTEXITCODE
if ($rc -ge 8) {
    Write-Error "robocopy failed with exit code $rc. Check merge-infrastructure.log for details."
    exit $rc
} else {
    Write-Host ""
    Write-Host "  Done. (robocopy exit code: $rc — success)"
    Write-Host ""
}

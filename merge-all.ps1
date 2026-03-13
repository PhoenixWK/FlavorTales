# merge-all.ps1
# Runs all branch merge scripts in sequence.
# Each script copies new & updated files from the branch folder into main/<branch>
# without deleting any existing files in the destination (safe merge behaviour).

$ScriptDir = $PSScriptRoot
$Scripts = @(
    "merge-backend.ps1",
    "merge-database.ps1",
    "merge-frontend.ps1",
    "merge-infrastructure.ps1"
)

$Failed = @()

foreach ($script in $Scripts) {
    $scriptPath = Join-Path $ScriptDir $script
    Write-Host ""
    Write-Host ">>> Running $script ..."
    & $scriptPath
    if ($LASTEXITCODE -ge 8) {
        Write-Warning "  $script reported an error (exit code $LASTEXITCODE)."
        $Failed += $script
    }
}

Write-Host ""
Write-Host "========================================"
if ($Failed.Count -eq 0) {
    Write-Host "  All merges completed successfully."
} else {
    Write-Warning "  The following scripts reported errors:"
    foreach ($f in $Failed) { Write-Warning "    - $f" }
    Write-Host "  Check the corresponding .log files in $ScriptDir for details."
}
Write-Host "========================================"
Write-Host ""

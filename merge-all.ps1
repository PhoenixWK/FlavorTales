# merge-all.ps1
# Runs all branch merge scripts in sequence.
# Each script syncs new & updated files from the branch repo into main/<branch>,
# commits the changes into the main git repo, then pushes to origin/main.

$ScriptDir = $PSScriptRoot
$MainRepo  = Join-Path (Split-Path -Parent $ScriptDir) "main"

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
    Write-Host ""
    Write-Host "  Pushing main branch to origin..."
    git -C $MainRepo push origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Push succeeded."
    } else {
        Write-Warning "  Push failed (exit code $LASTEXITCODE)."
    }
} else {
    Write-Warning "  The following scripts reported errors:"
    foreach ($f in $Failed) { Write-Warning "    - $f" }
    Write-Host "  Check the corresponding .log files in $ScriptDir for details."
    Write-Host "  Push skipped due to errors."
}
Write-Host "========================================"
Write-Host ""

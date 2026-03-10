# merge-infrastructure.ps1
# Mirrors the infrastructure branch folder into main/infrastructure, then commits and pushes to origin/main.
#
# Layout:
#   Source Code/
#   ├── infrastructure/        ← infrastructure branch source (origin)
#   └── main/
#       └── infrastructure/   ← merged destination (this script syncs here)

$ErrorActionPreference = "Stop"

$root    = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$src     = Join-Path $root "infrastructure"
$dst     = Join-Path $root "main\infrastructure"
$mainDir = Join-Path $root "main"

$robocopyFlags = @(
    "/MIR",
    "/XD", ".git",
    "/XF", "*.docx",
    "/NFL", "/NDL", "/NJH", "/NJS"
)

Write-Host "==> Syncing infrastructure ..."
robocopy $src $dst @robocopyFlags
# robocopy exit codes 0-7 are success / informational; >= 8 is a real error
if ($LASTEXITCODE -ge 8) {
    Write-Error "robocopy failed for infrastructure (exit $LASTEXITCODE)"
}
Write-Host "    Done: infrastructure"

Write-Host "`n==> Committing and pushing main branch ..."
Set-Location $mainDir

git add infrastructure/

$changes = git status --porcelain infrastructure/
if (-not $changes) {
    Write-Host "    No changes to commit."
} else {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    $srcHash   = git -C $src rev-parse --short HEAD 2>$null
    $msg       = if ($srcHash) {
        "merge: sync infrastructure ($srcHash) into main/infrastructure [$timestamp]"
    } else {
        "merge: sync infrastructure into main/infrastructure [$timestamp]"
    }
    git commit -m $msg
    git push origin main
    Write-Host "    Pushed to origin/main."
}

Write-Host ""
Write-Host "merge-infrastructure complete."

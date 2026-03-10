# merge-backend.ps1
# Mirrors the backend branch folder into main/backend, then commits and pushes to origin/main.
#
# Layout:
#   Source Code/
#   ├── backend/        ← backend branch source (origin)
#   └── main/
#       └── backend/   ← merged destination (this script syncs here)

$ErrorActionPreference = "Stop"

$root    = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$src     = Join-Path $root "backend"
$dst     = Join-Path $root "main\backend"
$mainDir = Join-Path $root "main"

$robocopyFlags = @(
    "/MIR",
    "/XD", ".git", "target",
    "/XF", "*.docx",
    "/NFL", "/NDL", "/NJH", "/NJS"
)

Write-Host "==> Syncing backend ..."
robocopy $src $dst @robocopyFlags
# robocopy exit codes 0-7 are success / informational; >= 8 is a real error
if ($LASTEXITCODE -ge 8) {
    Write-Error "robocopy failed for backend (exit $LASTEXITCODE)"
}
Write-Host "    Done: backend"

Write-Host "`n==> Committing and pushing main branch ..."
Set-Location $mainDir

git add backend/

$changes = git status --porcelain backend/
if (-not $changes) {
    Write-Host "    No changes to commit."
} else {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    $srcHash   = git -C $src rev-parse --short HEAD 2>$null
    $msg       = if ($srcHash) {
        "merge: sync backend ($srcHash) into main/backend [$timestamp]"
    } else {
        "merge: sync backend into main/backend [$timestamp]"
    }
    git commit -m $msg
    git push origin main
    Write-Host "    Pushed to origin/main."
}

Write-Host ""
Write-Host "merge-backend complete."

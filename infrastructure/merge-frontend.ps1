# merge-frontend.ps1
# Mirrors the frontend branch folder into main/frontend, then commits and pushes to origin/main.
#
# Layout:
#   Source Code/
#   ├── frontend/        ← frontend branch source (origin)
#   └── main/
#       └── frontend/   ← merged destination (this script syncs here)

$ErrorActionPreference = "Stop"

$root    = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$src     = Join-Path $root "frontend"
$dst     = Join-Path $root "main\frontend"
$mainDir = Join-Path $root "main"

$robocopyFlags = @(
    "/MIR",
    "/XD", ".git", "node_modules", ".next",
    "/XF", "*.docx", ".env*.local",
    "/NFL", "/NDL", "/NJH", "/NJS"
)

Write-Host "==> Syncing frontend ..."
robocopy $src $dst @robocopyFlags
# robocopy exit codes 0-7 are success / informational; >= 8 is a real error
if ($LASTEXITCODE -ge 8) {
    Write-Error "robocopy failed for frontend (exit $LASTEXITCODE)"
}
Write-Host "    Done: frontend"

Write-Host "`n==> Committing and pushing main branch ..."
Set-Location $mainDir

git add frontend/

$changes = git status --porcelain frontend/
if (-not $changes) {
    Write-Host "    No changes to commit."
} else {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    $srcHash   = git -C $src rev-parse --short HEAD 2>$null
    $msg       = if ($srcHash) {
        "merge: sync frontend ($srcHash) into main/frontend [$timestamp]"
    } else {
        "merge: sync frontend into main/frontend [$timestamp]"
    }
    git commit -m $msg
    git push origin main
    Write-Host "    Pushed to origin/main."
}

Write-Host ""
Write-Host "merge-frontend complete."

# =============================================================================
# sync-frontend.ps1
# Syncs the latest code from ../frontend (seminar-chuyende / frontend branch)
# into ./frontend (FlavorTales / infrastructure branch) and commits the result.
#
# Project layout:
#   <repo-root>/
#   ├── backend/           ← synced from backend branch
#   ├── frontend/          ← synced from frontend branch (this script)
#   ├── database/          ← MySQL replication scripts
#   └── infrastructure/    ← docker-compose.yml + .env
# =============================================================================

$ErrorActionPreference = "Stop"

$ROOT       = Split-Path -Parent $PSScriptRoot
$SRC        = Join-Path $ROOT "frontend"
$DEST       = Join-Path $PSScriptRoot "frontend"
$INFRA_REPO = $PSScriptRoot

# 1. Pull latest from the frontend repo
Write-Host "`n[1/4] Pulling latest frontend branch..." -ForegroundColor Cyan
Push-Location $SRC
git checkout frontend
git pull origin frontend
Pop-Location

# 2. Mirror files into infrastructure/frontend (exclude build/git artifacts)
Write-Host "`n[2/4] Syncing files into infrastructure/frontend/..." -ForegroundColor Cyan
robocopy $SRC $DEST /MIR `
    /XD node_modules .next .git `
    /XF ".env*.local" `
    /NFL /NDL /NJH /NJS
# robocopy exit codes 0-7 are success (bit flags for files copied/skipped/etc.)
if ($LASTEXITCODE -ge 8) {
    Write-Error "robocopy failed with exit code $LASTEXITCODE"
    exit 1
}

# 3. Stage and commit in the infrastructure repo
Write-Host "`n[3/4] Committing to infrastructure branch..." -ForegroundColor Cyan
Push-Location $INFRA_REPO
git add frontend/

$STATUS = git status --porcelain frontend/
if (-not $STATUS) {
    Write-Host "Nothing changed – working tree clean." -ForegroundColor Yellow
    Pop-Location
    exit 0
}

$FRONTEND_HASH = (git -C $SRC rev-parse --short HEAD)
git commit -m "merge: sync frontend branch ($FRONTEND_HASH) into infrastructure/frontend"

# 4. Push
Write-Host "`n[4/4] Pushing to origin/infrastructure..." -ForegroundColor Cyan
git push origin infrastructure
Pop-Location

Write-Host "`n✓ Done. infrastructure/frontend is up to date." -ForegroundColor Green

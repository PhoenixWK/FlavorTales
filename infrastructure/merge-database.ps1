# merge-database.ps1
# Mirrors the database branch folder into main/database, then commits and pushes to origin/main.
#
# Layout:
#   Source Code/
#   ├── database/        ← database branch source (origin)
#   └── main/
#       └── database/   ← merged destination (this script syncs here)

$ErrorActionPreference = "Stop"

$root    = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$src     = Join-Path $root "database"
$dst     = Join-Path $root "main\database"
$mainDir = Join-Path $root "main"

$robocopyFlags = @(
    "/MIR",
    "/XD", ".git",
    "/XF", "*.docx",
    "/NFL", "/NDL", "/NJH", "/NJS"
)

Write-Host "==> Syncing database ..."
robocopy $src $dst @robocopyFlags
# robocopy exit codes 0-7 are success / informational; >= 8 is a real error
if ($LASTEXITCODE -ge 8) {
    Write-Error "robocopy failed for database (exit $LASTEXITCODE)"
}
Write-Host "    Done: database"

Write-Host "`n==> Committing and pushing main branch ..."
Set-Location $mainDir

git add database/

$changes = git status --porcelain database/
if (-not $changes) {
    Write-Host "    No changes to commit."
} else {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    $srcHash   = git -C $src rev-parse --short HEAD 2>$null
    $msg       = if ($srcHash) {
        "merge: sync database ($srcHash) into main/database [$timestamp]"
    } else {
        "merge: sync database into main/database [$timestamp]"
    }
    git commit -m $msg
    git push origin main
    Write-Host "    Pushed to origin/main."
}

Write-Host ""
Write-Host "merge-database complete."

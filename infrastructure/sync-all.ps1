# sync-all.ps1
# Syncs backend/, frontend/, database/, and infrastructure/ into the FlavorTales main
# branch folder, then commits and pushes to origin/main.
#
# Layout:
#   Source Code/
#   ├── backend/        ← seminar-chuyende backend branch
#   ├── frontend/       ← seminar-chuyende frontend branch
#   ├── database/       ← MySQL schema + replication scripts
#   ├── infrastructure/ ← FlavorTales infrastructure branch (docker-compose.yml, .env)
#   └── main/           ← FlavorTales main branch (synced here by this script)
#       ├── backend/
#       ├── frontend/
#       ├── database/
#       └── infrastructure/  ← merged from infrastructure branch

$ErrorActionPreference = "Stop"

$root      = "d:\Codes\Seminar\Source Code"
$mainDir   = "$root\main"
$robocopyFlags = @("/MIR", "/XD", ".git", "/XF", "*.docx", "/NFL", "/NDL", "/NJH", "/NJS")

function Sync-Folder {
    param([string]$src, [string]$dst, [string]$label)
    Write-Host "==> Syncing $label ..."
    robocopy $src $dst @robocopyFlags
    # robocopy exit codes 0-7 are success/warning; >= 8 is error
    if ($LASTEXITCODE -ge 8) {
        Write-Error "robocopy failed for $label (exit $LASTEXITCODE)"
    }
    Write-Host "    Done: $label"
}

# ── Sync all four source folders ─────────────────────────────────────────────
Sync-Folder "$root\backend"         "$mainDir\backend"         "backend"
Sync-Folder "$root\frontend"        "$mainDir\frontend"        "frontend"
Sync-Folder "$root\database"        "$mainDir\database"        "database"
Sync-Folder "$root\infrastructure"  "$mainDir\infrastructure"  "infrastructure"

# ── Commit and push main branch ───────────────────────────────────────────────
Write-Host "`n==> Committing and pushing main branch ..."
Set-Location $mainDir

git add -A

$changes = git status --porcelain
if (-not $changes) {
    Write-Host "    No changes to commit."
} else {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    git commit -m "sync: update backend, frontend, database, infrastructure [$timestamp]"
    git push origin main
    Write-Host "    Pushed to origin/main."
}

Write-Host ""
Write-Host "sync-all complete."

# merge-backend.ps1
# Merges the 'backend' branch repo into main/backend, then commits to the main git repo.
# Uses robocopy: copies new & updated files, does NOT delete extras in destination.

$Root     = Split-Path -Parent $PSScriptRoot
$Source   = Join-Path $Root "backend"
$Dest     = Join-Path $Root "main\backend"
$MainRepo = Join-Path $Root "main"

Write-Host ""
Write-Host "========================================"
Write-Host "  Merging: backend -> main/backend"
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

# Get HEAD commit info from the source branch repo
$SourceHash    = git -C $Source rev-parse --short HEAD 2>$null
$SourceMessage = git -C $Source log -1 --pretty=%s HEAD 2>$null
if ($SourceHash) {
    $SourceBranch = git -C $Source rev-parse --abbrev-ref HEAD 2>$null
    Write-Host "  Source HEAD   : $SourceHash"
    Write-Host "  Source Branch : $SourceBranch"
    Write-Host "  Source Commit : $SourceMessage"
} else {
    Write-Warning "  Could not read HEAD from source repo."
}
Write-Host ""

robocopy $Source $Dest /E /XD ".git" /NP /TEE /LOG+:"$PSScriptRoot\merge-backend.log"

$rc = $LASTEXITCODE
if ($rc -ge 8) {
    Write-Error "robocopy failed with exit code $rc. Check merge-backend.log for details."
    exit $rc
}
Write-Host "  Files synced. (robocopy exit code: $rc)"
Write-Host ""

# Commit and push to the main git repo
Push-Location $MainRepo
try {
    git add "backend/"
    $Changed = git status --porcelain "backend/"
    if ($Changed) {
        $CommitMsg = if ($SourceMessage) { $SourceMessage } else { "merge: sync backend into main/backend" }
        git commit -m $CommitMsg
        Write-Host ""
        Write-Host "  Committed to main: $CommitMsg"
    } else {
        Write-Host "  Nothing to commit - main/backend is already up to date."
    }
    Write-Host ""
    Write-Host "  Pushing main to origin..."
    git push origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Push succeeded."
    } else {
        Write-Warning "  Push failed (exit code $LASTEXITCODE)."
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "  Done."
Write-Host ""

# merge-frontend.ps1
# Merges the 'frontend' branch repo into main/frontend, then commits to the main git repo.
# Uses robocopy: copies new & updated files, does NOT delete extras in destination.
# Excludes node_modules and .next to avoid copying build/dependency artifacts.

$Root     = Split-Path -Parent $PSScriptRoot
$Source   = Join-Path $Root "frontend"
$Dest     = Join-Path $Root "main\frontend"
$MainRepo = Join-Path $Root "main"

Write-Host ""
Write-Host "========================================"
Write-Host "  Merging: frontend -> main/frontend"
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

robocopy $Source $Dest /E /XD ".git" "node_modules" ".next" /NP /TEE /LOG+:"$PSScriptRoot\merge-frontend.log"

$rc = $LASTEXITCODE
if ($rc -ge 8) {
    Write-Error "robocopy failed with exit code $rc. Check merge-frontend.log for details."
    exit $rc
}
Write-Host "  Files synced. (robocopy exit code: $rc)"
Write-Host ""

# Commit and push to the main git repo
Push-Location $MainRepo
try {
    git add "frontend/"
    $Changed = git status --porcelain "frontend/"
    if ($Changed) {
        $CommitMsg = if ($SourceMessage) { $SourceMessage } else { "merge: sync frontend into main/frontend" }
        git commit -m $CommitMsg
        Write-Host ""
        Write-Host "  Committed to main: $CommitMsg"
    } else {
        Write-Host "  Nothing to commit - main/frontend is already up to date."
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

# merge-infrastructure.ps1
# Merges the 'infrastructure' branch repo into main/infrastructure, then commits to the main git repo.
# Excludes the merge scripts themselves to avoid polluting main/infrastructure.
# Uses robocopy: copies new & updated files, does NOT delete extras in destination.

$Root     = Split-Path -Parent $PSScriptRoot
$Source   = $PSScriptRoot                        # infrastructure/ is the source
$Dest     = Join-Path $Root "main\infrastructure"
$MainRepo = Join-Path $Root "main"

Write-Host ""
Write-Host "=============================================="
Write-Host "  Merging: infrastructure -> main/infrastructure"
Write-Host "=============================================="
Write-Host "  Source : $Source"
Write-Host "  Dest   : $Dest"
Write-Host ""

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

# Exclude .git and the merge scripts themselves (*.ps1 and *.log)
robocopy $Source $Dest /E /XD ".git" /XF "merge-*.ps1" "merge-*.log" /NP /TEE /LOG+:"$PSScriptRoot\merge-infrastructure.log"

$rc = $LASTEXITCODE
if ($rc -ge 8) {
    Write-Error "robocopy failed with exit code $rc. Check merge-infrastructure.log for details."
    exit $rc
}
Write-Host "  Files synced. (robocopy exit code: $rc)"
Write-Host ""

# Commit and push to the main git repo
Push-Location $MainRepo
try {
    git add "infrastructure/"
    $Changed = git status --porcelain "infrastructure/"
    if ($Changed) {
        $CommitMsg = if ($SourceMessage) { $SourceMessage } else { "merge: sync infrastructure into main/infrastructure" }
        git commit -m $CommitMsg
        Write-Host ""
        Write-Host "  Committed to main: $CommitMsg"
    } else {
        Write-Host "  Nothing to commit - main/infrastructure is already up to date."
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

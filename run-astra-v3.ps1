$ErrorActionPreference = "Stop"

$repo = "C:\Users\eskew\github\AstraFocusNexus"
$deadline = (Get-Date).AddHours(2)
$maxPasses = 12
$logs = Join-Path $repo "codex-runs"

Set-Location $repo
New-Item -ItemType Directory -Force -Path $logs | Out-Null

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
    throw "Codex CLI is not installed."
}

if (-not (Test-Path ".\ASTRA_V3_AUTONOMOUS.md")) {
    throw "Missing ASTRA_V3_AUTONOMOUS.md"
}

git status --short |
    Out-File (Join-Path $logs "initial-git-status.txt")

for ($pass = 1; $pass -le $maxPasses; $pass++) {
    if ((Get-Date) -ge $deadline) {
        Write-Host "Time budget reached."
        break
    }

    Write-Host ""
    Write-Host "===================================="
    Write-Host "ASTRA 3.0 - DEVELOPMENT PASS $pass"
    Write-Host "===================================="

    $prompt = @"
You are working in $repo.

Read ASTRA_V3_AUTONOMOUS.md and follow it.

Read docs/ASTRA_V3_PROGRESS.md if it exists.

This is autonomous development pass $pass.

Inspect the repository and current Git diff.

Continue implementing the next highest-priority
unfinished milestone from the master instructions.

Do not stop after planning or auditing.
Make meaningful source-code changes.
Run relevant checks.
Fix regressions you introduce.

Prioritize visible UI improvements and genuinely
functional features.

Update docs/ASTRA_V3_PROGRESS.md with:
- What was completed
- Files changed
- Tests and results
- Remaining work
- Next milestone

Never deploy, push, commit, delete databases,
or modify resources outside this repository.

Do not ask questions about ordinary development
decisions. Use reasonable defaults.

If you cannot proceed safely, document the blocker.
Do not falsely claim completion.

Begin implementation now.
"@

    $logFile = Join-Path $logs "pass-$pass.log"

    $prompt |
        codex exec `
            --cd $repo `
            --sandbox workspace-write `
            --ask-for-approval never `
            - 2>&1 |
        Tee-Object -FilePath $logFile

    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        Write-Warning "Codex exited with code $exitCode."
        Write-Warning "Review $logFile"
        break
    }

    git status --short |
        Out-File (Join-Path $logs "status-$pass.txt")

    Write-Host "Development pass $pass finished."
}

Write-Host ""
Write-Host "AstraFocusNexus automation finished."
Write-Host "Review docs/ASTRA_V3_PROGRESS.md"
Write-Host "Logs are in $logs"

git status --short
git diff --stat

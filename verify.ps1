# ==============================================================================
# Route Agent — PowerShell Verification Pipeline (Validation Gate 6)
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Starting Route Agent Full Verification Pipeline " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Resolve pytest binary
$PytestBin = "pytest"
if (Test-Path ".venv\Scripts\pytest.exe") {
    $PytestBin = ".venv\Scripts\pytest.exe"
}

Write-Host "`n[1/4] Running Backend Test Suite (Unit, Agent, API, E2E)..." -ForegroundColor Yellow
& $PytestBin backend/tests
if ($LASTEXITCODE -ne 0) {
    Write-Error "Backend test suite failed."
    exit $LASTEXITCODE
}

Write-Host "`n[2/4] Running Frontend ESLint..." -ForegroundColor Yellow
Push-Location frontend
try {
    npm.cmd run lint
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend ESLint failed."
        exit $LASTEXITCODE
    }

    Write-Host "`n[3/4] Running Frontend TypeScript Type Check..." -ForegroundColor Yellow
    npm.cmd run type-check
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend type check failed."
        exit $LASTEXITCODE
    }

    Write-Host "`n[4/4] Running Frontend Production Build..." -ForegroundColor Yellow
    npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend build failed."
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}

Write-Host "`n==================================================" -ForegroundColor Green
Write-Host " All validation gates passed successfully!        " -ForegroundColor Green
Write-Host " Route Agent is production-ready.                 " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
exit 0

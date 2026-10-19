#!/usr/bin/env bash
# ==============================================================================
# Route Agent — Validation Gate 6 Verification Pipeline
# Executes full test suite, linting, type-checking, and build verification.
# ==============================================================================

set -euo pipefail

echo "=================================================="
echo " Starting Route Agent Full Verification Pipeline "
echo "=================================================="

# 1. Resolve Python / Pytest executable
if [ -f ".venv/Scripts/pytest.exe" ]; then
    PYTEST_BIN=".venv/Scripts/pytest.exe"
elif [ -f ".venv/bin/pytest" ]; then
    PYTEST_BIN=".venv/bin/pytest"
else
    PYTEST_BIN="pytest"
fi

echo ""
echo "[1/4] Running Backend Test Suite (Unit, Agent, API, E2E)..."
"$PYTEST_BIN" backend/tests

echo ""
echo "[2/4] Running Frontend ESLint..."
cd frontend
if command -v npm.cmd >/dev/null 2>&1; then
    NPM_BIN="npm.cmd"
else
    NPM_BIN="npm"
fi

"$NPM_BIN" run lint

echo ""
echo "[3/4] Running Frontend Strict TypeScript Type Check..."
"$NPM_BIN" run type-check

echo ""
echo "[4/4] Running Frontend Production Build..."
"$NPM_BIN" run build

cd ..

echo ""
echo "=================================================="
echo " All validation gates passed successfully!        "
echo " Route Agent is production-ready.                 "
echo "=================================================="
exit 0

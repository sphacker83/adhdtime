#!/bin/bash
set -e

cd "$CODEX_PROJECT_DIR/.codex/hooks"
cat | npx tsx skill-activation-prompt.ts

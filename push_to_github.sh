#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-davidlifschitz/lumaflow-silk-inspired}"
BRANCH="${2:-main}"

git init
git branch -M "$BRANCH"
git add .
git commit -m "Initial LumaFlow MVP" || true
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/${REPO}.git"
git push -u origin "$BRANCH"

#!/usr/bin/env bash
set -euo pipefail

OWNER="0xJonaseb11"
REPO="firex.mgt"
BRANCH="${1:-main}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: brew install gh" >&2
  exit 1
fi

if ! gh auth status -h github.com >/dev/null 2>&1; then
  echo "Log in first: gh auth login -h github.com -p ssh -w" >&2
  exit 1
fi

echo "Restricting pushes on ${OWNER}/${REPO} (${BRANCH}) to @${OWNER} only..."

gh api \
  -X PUT \
  "repos/${OWNER}/${REPO}/branches/${BRANCH}/protection" \
  -f enforce_admins=true \
  -f allow_force_pushes=false \
  -f allow_deletions=false \
  -f restrictions[users][]="${OWNER}" \
  -f restrictions[teams][]= \
  -f restrictions[apps][]=

echo "Done. Only @${OWNER} can push to ${BRANCH}."

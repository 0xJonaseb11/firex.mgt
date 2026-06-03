#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."

git config user.name "0xJonaseb11"
git config user.email "sebejaz99@gmail.com"
git config core.hooksPath ".githooks"

echo "Git identity and hooks configured for this repository."
echo "  user.name:  $(git config user.name)"
echo "  user.email: $(git config user.email)"
echo "  hooksPath:  $(git config core.hooksPath)"

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

git config user.name "0xJonaseb11"
git config user.email "sebejaz99@gmail.com"
git config core.hooksPath ".githooks"

Write-Host "Git identity and hooks configured for this repository."
Write-Host "  user.name:  $(git config user.name)"
Write-Host "  user.email: $(git config user.email)"
Write-Host "  hooksPath:  $(git config core.hooksPath)"

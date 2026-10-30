#!/usr/bin/env bash
# Fails when a file shipped under plugins/ names the dev-digest product, its
# modules or its paths. Plugins must work in any repository.
#
# Usage: scripts/check-portability.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# The marketplace name (dev-digest-ai-marketplace) does not match this pattern.
pattern='devdigest|DevDigest|reviewer-core|mcp-server|@devdigest|\.claude/skills/|arch:check|lesson-[0-9]+-lab'

if matches=$(grep -rnE "$pattern" plugins); then
  echo "$matches" >&2
  echo "✘ $(wc -l <<<"$matches" | tr -d ' ') project-specific reference(s) found in plugins/" >&2
  exit 1
fi
echo "✔ Portability check passed"

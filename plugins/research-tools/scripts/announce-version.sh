#!/usr/bin/env bash
# SessionStart hook (matcher: startup), wired from hooks/hooks.json.
# Shows the user which research-tools version this session loaded, so a
# marketplace auto-update can be confirmed at a glance.
# Informational only: any problem exits 0 with no output and never blocks the session.
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

manifest="${CLAUDE_PLUGIN_ROOT:-}/.claude-plugin/plugin.json"
[[ -f "$manifest" ]] || exit 0

version="$(jq -r '.version // empty' "$manifest" 2>/dev/null)" || exit 0
[[ -n "$version" ]] || exit 0

jq -n --arg msg "research-tools v$version loaded" '{systemMessage: $msg}'

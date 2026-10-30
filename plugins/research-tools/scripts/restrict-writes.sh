#!/usr/bin/env bash
# PreToolUse hook for Write|Edit|MultiEdit|NotebookEdit, wired from hooks/hooks.json.
# Lets research-tools:researcher write only its research note:
#   research-tools:researcher → <research_dir>/*.research.md
# Any other caller (the main session, other agents) passes through untouched.
# A blocked call exits 2, which stops the tool call and feeds stderr back to the agent.
set -euo pipefail

input="$(cat)"

if ! command -v jq >/dev/null 2>&1; then
  # Without jq we cannot parse the call. Fail closed for the agent we guard only.
  guarded='"agent_type"[[:space:]]*:[[:space:]]*"research-tools:researcher"'
  if [[ "$input" =~ $guarded ]]; then
    echo "restrict-writes: jq not found — blocking the write. Install jq to let this agent write." >&2
    exit 2
  fi
  exit 0
fi

agent_type="$(jq -r '.agent_type // empty' <<<"$input")"
[[ "$agent_type" == "research-tools:researcher" ]] || exit 0

file_path="$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")"

deny() {
  echo "restrict-writes ($agent_type): '$file_path' is outside this agent's write scope. $1" >&2
  exit 2
}

[[ -n "$file_path" ]] || deny "No file path in the tool call."

# userConfig values reach hooks only after the user saves them, so fall back to the default.
research_dir="${CLAUDE_PLUGIN_OPTION_RESEARCH_DIR:-docs/plans}"
research_dir="${research_dir#./}"
research_dir="${research_dir%/}"
[[ "$research_dir" == "." ]] && research_dir=""
case "/$research_dir/" in
  */../*) deny "The configured research_dir must not contain '..'." ;;
esac

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
root="${root%/}"
case "$file_path" in
  "$root"/*) rel="${file_path#"$root"/}" ;;
  /*) deny "Absolute paths must be inside the project ($root)." ;;
  *) rel="$file_path" ;;
esac
rel="${rel#./}"

case "/$rel/" in
  */../*|*/./*) deny "Relative segments ('..', '.') are not allowed." ;;
esac

allowed="Allowed: ${research_dir:-.}/<feature>.research.md only (research_dir)."
if [[ -z "$research_dir" ]]; then
  rest="$rel"
elif [[ "$rel" == "$research_dir"/* ]]; then
  rest="${rel#"$research_dir"/}"
else
  deny "$allowed"
fi
[[ "$rest" =~ ^[A-Za-z0-9._-]+\.research\.md$ ]] || deny "$allowed"

exit 0

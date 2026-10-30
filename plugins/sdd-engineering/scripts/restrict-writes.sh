#!/usr/bin/env bash
# PreToolUse hook for Write|Edit|MultiEdit|NotebookEdit, wired from hooks/hooks.json.
# Lets this plugin's writing agents touch only the files their role owns:
#   sdd-engineering:spec-creator           → <specs_dir>/**/*.md
#   sdd-engineering:implementation-planner → <plans_dir>/*.md (not *.research.md)
# Any other caller (the main session, other agents) passes through untouched.
# A blocked call exits 2, which stops the tool call and feeds stderr back to the agent.
set -euo pipefail

input="$(cat)"

if ! command -v jq >/dev/null 2>&1; then
  # Without jq we cannot parse the call. Fail closed for the agents we guard only.
  guarded='"agent_type"[[:space:]]*:[[:space:]]*"sdd-engineering:(spec-creator|implementation-planner)"'
  if [[ "$input" =~ $guarded ]]; then
    echo "restrict-writes: jq not found — blocking the write. Install jq to let this agent write." >&2
    exit 2
  fi
  exit 0
fi

agent_type="$(jq -r '.agent_type // empty' <<<"$input")"
case "$agent_type" in
  sdd-engineering:spec-creator) role=spec ;;
  sdd-engineering:implementation-planner) role=plan ;;
  *) exit 0 ;;
esac

file_path="$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")"

deny() {
  echo "restrict-writes ($agent_type): '$file_path' is outside this agent's write scope. $1" >&2
  exit 2
}

# userConfig values reach hooks only after the user saves them, so fall back to the defaults.
normalize_dir() {
  local dir="${1#./}"
  dir="${dir%/}"
  [[ "$dir" == "." ]] && dir=""
  case "/$dir/" in
    */../*) deny "The configured directory '$1' must not contain '..'." ;;
  esac
  printf '%s' "$dir"
}

[[ -n "$file_path" ]] || deny "No file path in the tool call."

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

# Strips "<dir>/" from rel into $rest, or denies when rel is not under dir.
under() {
  local dir="$1"
  if [[ -z "$dir" ]]; then
    rest="$rel"
  elif [[ "$rel" == "$dir"/* ]]; then
    rest="${rel#"$dir"/}"
  else
    deny "$2"
  fi
}

name='[A-Za-z0-9._-]+'
case "$role" in
  spec)
    specs_dir="$(normalize_dir "${CLAUDE_PLUGIN_OPTION_SPECS_DIR:-specs}")"
    allowed="Allowed: ${specs_dir:-.}/<name>.md or ${specs_dir:-.}/<subdir>/<name>.md (specs_dir)."
    under "$specs_dir" "$allowed"
    [[ "$rest" =~ ^($name/)*$name\.md$ ]] || deny "$allowed"
    ;;
  plan)
    plans_dir="$(normalize_dir "${CLAUDE_PLUGIN_OPTION_PLANS_DIR:-docs/plans}")"
    allowed="Allowed: ${plans_dir:-.}/<feature>.md (plans_dir). Research notes belong to the researcher."
    under "$plans_dir" "$allowed"
    [[ "$rest" =~ ^$name\.md$ && "$rest" != *.research.md ]] || deny "$allowed"
    ;;
esac

exit 0

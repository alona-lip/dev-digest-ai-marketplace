#!/usr/bin/env bash
# Shared helpers for release scripts. Source from the repository root.

catalog=".claude-plugin/marketplace.json"

die() {
  echo "✘ $1" >&2
  exit 1
}

# Prints the relative source directory of a plugin, or fails if the plugin
# is not in the catalog or is not hosted in this repository.
plugin_dir() {
  local source
  source=$(jq -r --arg n "$1" '.plugins[] | select(.name == $n) | .source | if type == "string" then . else "" end' "$catalog")
  [[ -n "$source" ]] || die "$1: not found in $catalog or not a relative-path plugin"
  [[ -d "$source" ]] || die "$1: source path $source does not exist"
  echo "${source%/}"
}

# Prints the version from a plugin.json read on stdin.
manifest_version() {
  jq -r '.version // empty'
}

plugin_version() {
  manifest_version < "$(plugin_dir "$1")/.claude-plugin/plugin.json"
}

tag_name() {
  echo "$1--v$2"
}

# bump_version 1.2.3 patch|minor|major -> 1.2.4. Pre-release suffixes are dropped.
bump_version() {
  local major minor patch
  IFS=. read -r major minor patch <<< "${1%%-*}"
  case "$2" in
    major) echo "$((major + 1)).0.0" ;;
    minor) echo "$major.$((minor + 1)).0" ;;
    patch) echo "$major.$minor.$((patch + 1))" ;;
    *) die "unknown bump \"$2\"; use patch, minor or major" ;;
  esac
}

# Succeeds when version $1 is strictly greater than $2.
version_gt() {
  [[ "$1" != "$2" && "$(printf '%s\n%s\n' "$1" "$2" | sort -V | tail -1)" == "$1" ]]
}

set_plugin_version() {
  local manifest="$1/.claude-plugin/plugin.json" tmp
  tmp=$(mktemp)
  jq --arg v "$2" '.version = $v' "$manifest" > "$tmp" && mv "$tmp" "$manifest"
}

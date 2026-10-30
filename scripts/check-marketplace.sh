#!/usr/bin/env bash
# Checks that `claude plugin validate` does not cover. Run from the repository root.
set -euo pipefail

catalog=".claude-plugin/marketplace.json"
errors=0

fail() {
  echo "✘ $1" >&2
  errors=$((errors + 1))
}

reserved='^(claude|anthropic|claude-code|claude-mods)$|^(claude-|anthropic-|anthropics-|cc-plugin-)'

while IFS=$'\t' read -r name source has_version; do
  if [[ "$name" =~ $reserved ]]; then
    fail "$name: reserved plugin name"
  fi
  if [[ ! "$name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
    fail "$name: name must be kebab-case"
  fi
  if [[ "$has_version" == "true" ]]; then
    fail "$name: remove \"version\" from the marketplace entry; it belongs in plugin.json"
  fi

  # Only relative-path sources live in this repository.
  [[ "$source" == ./* ]] || continue

  if [[ ! -d "$source" ]]; then
    fail "$name: source path $source does not exist"
    continue
  fi

  manifest="$source/.claude-plugin/plugin.json"
  if [[ ! -f "$manifest" ]]; then
    fail "$name: missing $manifest"
    continue
  fi

  manifest_name=$(jq -r '.name // empty' "$manifest")
  if [[ "$manifest_name" != "$name" ]]; then
    fail "$name: plugin.json name is \"$manifest_name\", expected \"$name\""
  fi

  for field in version description author license; do
    if [[ $(jq --arg f "$field" 'has($f)' "$manifest") != "true" ]]; then
      fail "$name: plugin.json is missing \"$field\""
    fi
  done

  version=$(jq -r '.version // empty' "$manifest")
  if [[ -n "$version" && ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
    fail "$name: version \"$version\" is not SemVer"
  fi

  for file in README.md CHANGELOG.md; do
    [[ -f "$source/$file" ]] || fail "$name: missing $source/$file"
  done

  extra=$(find "$source/.claude-plugin" -mindepth 1 ! -name plugin.json)
  if [[ -n "$extra" ]]; then
    fail "$name: only plugin.json belongs in .claude-plugin/, found: $extra"
  fi
done < <(jq -r '.plugins[] | [.name, (.source | if type == "string" then . else "" end), (has("version") | tostring)] | @tsv' "$catalog")

duplicates=$(jq -r '.plugins[].name' "$catalog" | sort | uniq -d)
if [[ -n "$duplicates" ]]; then
  fail "duplicate plugin names: $duplicates"
fi

if (( errors > 0 )); then
  echo "✘ $errors problem(s) found" >&2
  exit 1
fi
echo "✔ Marketplace checks passed"

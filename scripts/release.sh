#!/usr/bin/env bash
# Prepares a plugin release in the current branch: bumps the version in
# plugin.json and turns the CHANGELOG's [Unreleased] section into a release.
#
# Usage: scripts/release.sh <plugin> <patch|minor|major>
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/lib.sh

[[ $# -eq 2 ]] || die "usage: scripts/release.sh <plugin> <patch|minor|major>"
plugin="$1"
dir=$(plugin_dir "$plugin")
changelog="$dir/CHANGELOG.md"

current=$(plugin_version "$plugin")
[[ -n "$current" ]] || die "$plugin: plugin.json has no version"
next=$(bump_version "$current" "$2")

if git rev-parse -q --verify "refs/tags/$(tag_name "$plugin" "$next")" > /dev/null; then
  die "$plugin: tag $(tag_name "$plugin" "$next") already exists"
fi

[[ -f "$changelog" ]] || die "$plugin: missing $changelog"
grep -q '^## \[Unreleased\]' "$changelog" || die "$plugin: $changelog has no \"## [Unreleased]\" section"

# The [Unreleased] section must describe the changes being released.
unreleased=$(awk '/^## \[Unreleased\]/ { on = 1; next } /^## / { on = 0 } on && NF' "$changelog")
[[ -n "$unreleased" ]] || die "$plugin: describe the changes under \"## [Unreleased]\" in $changelog first"

tmp=$(mktemp)
awk -v heading="## [$next] - $(date +%F)" '
  /^## \[Unreleased\]/ && !done { print; print ""; print heading; done = 1; next }
  { print }
' "$changelog" > "$tmp" && mv "$tmp" "$changelog"

set_plugin_version "$dir" "$next"

echo "✔ $plugin: $current → $next"
echo
echo "Next steps:"
echo "  1. Review: git diff -- $dir"
echo "  2. Commit, open a PR and merge it to main."
echo "  3. CI tags the merge commit as $(tag_name "$plugin" "$next")."

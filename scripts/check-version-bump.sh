#!/usr/bin/env bash
# Fails when a plugin's shipped files changed since <base-ref> without a
# version bump, because users would never receive the change.
#
# Usage: scripts/check-version-bump.sh <base-ref>
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/lib.sh

[[ $# -eq 1 ]] || die "usage: scripts/check-version-bump.sh <base-ref>"
base="$1"
errors=0

for plugin in $(jq -r '.plugins[] | select(.source | type == "string") | .name' "$catalog"); do
  dir=$(plugin_dir "$plugin")

  # Changes to docs inside the plugin do not need a release.
  changed=$(git diff --name-only "$base"...HEAD -- "$dir" ":!$dir/README.md" ":!$dir/CHANGELOG.md")
  [[ -n "$changed" ]] || continue

  # New plugins have no previous version to compare against.
  base_manifest=$(git show "$base:$dir/.claude-plugin/plugin.json" 2> /dev/null) || continue

  old=$(manifest_version <<< "$base_manifest")
  new=$(plugin_version "$plugin")
  if ! version_gt "$new" "$old"; then
    echo "✘ $plugin: files changed but version is $new (was $old). Run scripts/release.sh $plugin <patch|minor|major>" >&2
    errors=$((errors + 1))
  fi
done

(( errors == 0 )) || exit 1
echo "✔ Version bumps OK"

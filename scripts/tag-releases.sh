#!/usr/bin/env bash
# Tags HEAD as <plugin>--v<version> for every plugin whose current version
# has no tag yet, then pushes the new tags. Run on main after a merge.
#
# Usage: scripts/tag-releases.sh [--dry-run]
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/lib.sh

dry_run=false
[[ "${1:-}" == "--dry-run" ]] && dry_run=true

git fetch -q --tags origin
new_tags=()

for plugin in $(jq -r '.plugins[] | select(.source | type == "string") | .name' "$catalog"); do
  tag=$(tag_name "$plugin" "$(plugin_version "$plugin")")
  git rev-parse -q --verify "refs/tags/$tag" > /dev/null && continue
  new_tags+=("$tag")
done

if [[ ${#new_tags[@]} -eq 0 ]]; then
  echo "✔ All plugin versions are already tagged"
  exit 0
fi

for tag in "${new_tags[@]}"; do
  if $dry_run; then
    echo "would tag $tag"
  else
    git tag -a "$tag" -m "Release $tag"
    echo "✔ tagged $tag"
  fi
done

$dry_run || git push -q origin "${new_tags[@]}"

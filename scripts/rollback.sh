#!/usr/bin/env bash
# Restores a plugin's files to a previously released version and publishes
# them as a new patch version, so installed copies update to the good code.
#
# Usage: scripts/rollback.sh <plugin> <good-version>
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/lib.sh

[[ $# -eq 2 ]] || die "usage: scripts/rollback.sh <plugin> <good-version>"
plugin="$1"
good="$2"
dir=$(plugin_dir "$plugin")
changelog="$dir/CHANGELOG.md"
tag=$(tag_name "$plugin" "$good")

git rev-parse -q --verify "refs/tags/$tag" > /dev/null || die "$plugin: tag $tag not found; run git fetch --tags"
[[ -z "$(git status --porcelain -- "$dir")" ]] || die "$plugin: uncommitted changes in $dir"
grep -q '^## \[Unreleased\]' "$changelog" || die "$plugin: $changelog has no \"## [Unreleased]\" section"

current=$(plugin_version "$plugin")
version_gt "$current" "$good" || die "$plugin: $good is not older than the current version $current"
next=$(bump_version "$current" patch)

# Keep the current CHANGELOG; everything else comes from the good release.
saved_changelog=$(mktemp)
cp "$changelog" "$saved_changelog"

git rm -r -q -- "$dir"
git checkout "$tag" -- "$dir"

cp "$saved_changelog" "$changelog"
set_plugin_version "$dir" "$next"

tmp=$(mktemp)
awk -v heading="## [$next] - $(date +%F)" -v note="- Rolled back to $good. Reverts the changes released in $current." '
  /^## \[Unreleased\]/ && !done { print; print ""; print heading; print ""; print "### Changed"; print ""; print note; done = 1; next }
  { print }
' "$changelog" > "$tmp" && mv "$tmp" "$changelog"

git add -- "$dir"

echo "✔ $plugin: files restored from $tag and released as $next"
echo
echo "The marketplace entry in $catalog was not changed. If the bad release"
echo "changed it, restore it by hand: git diff $tag -- $catalog"
echo
echo "Next steps:"
echo "  1. Review: git diff --cached -- $dir"
echo "  2. Commit, open a PR and merge it to main."
echo "  3. Ask users to run: claude plugin update $plugin@dev-digest-ai-marketplace"

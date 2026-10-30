# Releases

## Versioning

Each plugin is versioned on its own with [Semantic Versioning](https://semver.org/):

- **MAJOR**: breaking change, such as a renamed or removed skill, command or agent, changed hook behavior, or a new required setting
- **MINOR**: new component or option that is backward compatible
- **PATCH**: bug fix or wording change with no behavior change for users

Rules:

- `version` lives only in the plugin's `.claude-plugin/plugin.json`. Never set it in `marketplace.json`. If both are set, `plugin.json` wins silently.
- Claude Code caches each installed version under `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`. **If you change a plugin without bumping `version`, users keep the old copy.** CI blocks such PRs (`scripts/check-version-bump.sh`). Changes to only the plugin's `README.md` or `CHANGELOG.md` are exempt.
- Versions only go up. Never reuse or decrease a version, even for a rollback.
- Every PR that changes a plugin's shipped files is a release of that plugin.

## Scripts

| Script | When | What it does |
| --- | --- | --- |
| `scripts/release.sh <plugin> <patch\|minor\|major>` | In your PR branch | Bumps `version` in `plugin.json` and turns the CHANGELOG's `[Unreleased]` section into a dated release |
| `scripts/rollback.sh <plugin> <good-version>` | In a rollback branch | Restores the plugin's files from tag `<plugin>--v<good-version>` and releases them as the next patch version |
| `scripts/check-version-bump.sh <base-ref>` | CI on every PR | Fails if a plugin's files changed without a version bump |
| `scripts/tag-releases.sh [--dry-run]` | CI on push to `main` | Tags every untagged plugin version as `<plugin>--v<version>` and pushes the tags |

All scripts run from any directory and need `git` and `jq`.

## Release a new version

1. Make your changes and describe them under `## [Unreleased]` in the plugin's `CHANGELOG.md`.
2. Bump the version:

   ```
   scripts/release.sh hello-world minor
   ```

   The script refuses to run if `[Unreleased]` is empty or the new version is already tagged.
3. Commit, open a PR and merge it to `main`.
4. The **Tag releases** workflow tags the merge commit, for example `hello-world--v0.2.0`. To tag by hand instead, run `scripts/tag-releases.sh` on an up-to-date `main`.

Tags are what rollbacks restore from, so do not delete or move them.

## How users get updates

Auto-update is off by default for third-party marketplaces. Users either enable it in `/plugin` → **Marketplaces**, or projects set `autoUpdate: true` in `extraKnownMarketplaces` (see the root README).

Manual update:

```
/plugin marketplace update dev-digest-ai-marketplace
claude plugin update <plugin>@dev-digest-ai-marketplace
```

A running session keeps the versions it loaded. Run `/reload-plugins` or start a new session.

## Rollback

Users cannot be moved back to an older version number, because Claude Code only updates to what the catalog currently lists. A rollback therefore ships the old code under a new patch version.

1. Create a branch from `main` and run:

   ```
   git fetch --tags
   scripts/rollback.sh hello-world 0.1.0
   ```

   The script restores every file in the plugin's folder from tag `hello-world--v0.1.0`, keeps the current `CHANGELOG.md` with a rollback entry added, bumps to the next patch version (for example `0.2.0` → `0.2.1`) and stages the result.
2. If the bad release also changed the plugin's entry in `.claude-plugin/marketplace.json`, restore that by hand. The script prints the command to compare it.
3. Commit, open a PR and merge it. CI tags the new version.
4. Ask users who need the fix immediately to run the manual update commands above.

## Rename or remove a plugin

- **Rename**: rename the folder and entry, then add `"renames": { "<old>": "<new>" }` to `marketplace.json` so existing installs follow.
- **Remove**: delete the entry and folder, then add `"renames": { "<old>": null }`. There is no deprecation state. Announce removals in advance.

# Contributing

## Add a new plugin

1. Create `plugins/<name>/` using the structure in [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md). [plugins/hello-world](plugins/hello-world) is a minimal working example.
2. Add `plugins/<name>/.claude-plugin/plugin.json` with `name`, `version` (start at `0.1.0`), `description`, `author` and `license`.
3. Add an entry to [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json):

   ```json
   {
     "name": "<name>",
     "source": "./plugins/<name>",
     "description": "<one line>",
     "category": "<category>"
   }
   ```

   Do not put `version` in this entry. The version lives only in `plugin.json`.
4. Add `README.md` and `CHANGELOG.md` to the plugin. Start the CHANGELOG with an empty `## [Unreleased]` section above the first release; the release scripts write under it. Add a row to the plugin table in the root [README.md](README.md).
5. Add the plugin's owner to [.github/CODEOWNERS](.github/CODEOWNERS).

## Test locally

Load a single plugin for one session:

```
claude --plugin-dir ./plugins/<name>
```

Test the whole catalog as users will see it:

```
/plugin marketplace add /absolute/path/to/dev-digest-ai-marketplace
/plugin install <name>@dev-digest-ai-marketplace
```

After editing files, run `/reload-plugins`. Check `/plugin` (Installed and Errors tabs), `claude plugin details <name>` and `/mcp` if the plugin ships MCP servers. Run `claude --debug` for load logs.

## Validate

Both must pass before you open a PR. CI runs them too.

```
claude plugin validate . --strict
./scripts/check-marketplace.sh
```

`validate` does not check that relative `source` paths exist or that names match between the catalog and `plugin.json`. The script covers those.

## Change an existing plugin

1. Describe your changes under `## [Unreleased]` in the plugin's `CHANGELOG.md`.
2. Run `scripts/release.sh <plugin> <patch|minor|major>` to bump the version.

Without a version bump, users do not receive the change, and CI fails the PR. See [docs/RELEASES.md](docs/RELEASES.md).

## Pull request checklist

- [ ] `claude plugin validate . --strict` passes
- [ ] `./scripts/check-marketplace.sh` passes
- [ ] Plugin installs from the local marketplace and its components work
- [ ] Version bumped with `scripts/release.sh` (for changes to existing plugins)
- [ ] Security checklist in [docs/SECURITY.md](docs/SECURITY.md) reviewed for hooks, scripts and MCP servers
- [ ] No secrets, tokens or personal paths committed

## Review process

- Every PR needs approval from a code owner. Changes to `.claude-plugin/` always need the marketplace owner.
- New plugins and any plugin that adds hooks, scripts in `bin/` or MCP servers get a security review against [docs/SECURITY.md](docs/SECURITY.md).
- Reviewers reject plugins that duplicate an existing one, lack a clear `description`, or need access they do not justify.

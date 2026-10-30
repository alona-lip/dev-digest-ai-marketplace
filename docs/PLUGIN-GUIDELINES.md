# Plugin guidelines

Requirements for every plugin in this marketplace. They follow the official [plugin reference](https://code.claude.com/docs/en/plugins/manifest-reference) plus a few stricter team rules.

## Structure

```
plugins/<name>/
├── .claude-plugin/
│   └── plugin.json        # manifest only, nothing else in this folder
├── skills/<skill>/SKILL.md
├── agents/<agent>.md
├── commands/<command>.md  # older form; prefer skills
├── hooks/hooks.json
├── .mcp.json
├── bin/                   # executables, added to the Bash tool's PATH
├── README.md
└── CHANGELOG.md
```

Only `plugin.json` goes inside `.claude-plugin/`. Components placed there do not load. A `CLAUDE.md` at the plugin root is not loaded as context, so do not rely on one.

Include only the component folders the plugin uses.

## Naming

- Plugin names are kebab-case: lowercase letters, digits and hyphens.
- Names must not start with `claude-`, `anthropic-`, `anthropics-` or `cc-plugin-`, and must not be `claude`, `anthropic`, `claude-code` or `claude-mods`. Claude Code rejects these.
- The `name` in the marketplace entry must equal the `name` in `plugin.json`. Otherwise install fails with `Plugin "<name>" not found in marketplace`.
- To rename a plugin, add the old name to `renames` in `marketplace.json`. To change only the label users see, set `displayName`.

## Manifest (`plugin.json`)

Claude Code requires only `name`. This marketplace also requires:

| Field | Rule |
| --- | --- |
| `name` | kebab-case, see Naming |
| `version` | SemVer `MAJOR.MINOR.PATCH`, see [RELEASES.md](RELEASES.md) |
| `description` | one sentence on what the plugin does |
| `author` | object with `name`; `email` optional |
| `license` | `UNLICENSED` (default for this marketplace: source is visible but not licensed for reuse), or an SPDX identifier agreed with the marketplace owner |

Optional but recommended: `keywords`, `homepage`, `repository`.

Never set `version` in the marketplace entry as well. When both are set, `plugin.json` wins without a warning.

## Paths and variables

- Component paths in the manifest start with `./`, use forward slashes, and stay inside the plugin folder. `..` is rejected.
- Refer to plugin files as `${CLAUDE_PLUGIN_ROOT}/…`. That directory changes on every update, so treat it as read-only.
- Store persistent state in `${CLAUDE_PLUGIN_DATA}`, which survives updates.
- Quote these variables in shell commands: `"${CLAUDE_PLUGIN_ROOT}"/bin/tool.sh`.
- These variables are expanded in hook commands, MCP and LSP server config, and the Markdown body of skills, agents and commands. They are not set in the Bash tool's environment.

## Skills, agents and commands

- Every `SKILL.md` and agent file has YAML frontmatter with `name` and `description`.
- Write `description` so Claude knows when to use the component: what it does and the situations that should trigger it.
- Keep one responsibility per skill. Put long reference material in separate files next to `SKILL.md` and link to them.

## Dependencies

- Declare dependencies on other marketplace plugins in the `dependencies` field.
- List external requirements (CLIs, runtimes, environment variables, network access) in the plugin's `README.md` under **Dependencies**.
- Pin versions of anything a plugin downloads or runs (`npx pkg@1.2.3`, not `npx pkg`).
- Do not use Git LFS or git submodules. Plugin installs do not fetch LFS content.
- Plugins sourced from other repositories use a `github` or `git-subdir` source with a pinned `sha`. See [SECURITY.md](SECURITY.md).

## Documentation

Each plugin has:

- `README.md`: purpose, install command, a table of components and how to invoke them, dependencies
- `CHANGELOG.md`: one entry per released version

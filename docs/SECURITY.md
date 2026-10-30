# Security

## Threat model

Plugins run with the user's full trust. Hooks, `bin/` scripts and MCP servers execute on the developer's machine with their permissions and credentials. Claude Code does not sandbox them. Skills and agents are instructions, but they can tell Claude to run commands. Anything merged into this marketplace is effectively code running on every teammate's machine.

## Permissions

- Request the minimum a plugin needs. If a plugin does not need hooks, network access or shell scripts, it should not have them.
- The plugin `README.md` lists what the plugin accesses: files outside the project, network hosts, environment variables, external services.
- These always need a security review before merge:
  - hooks (`hooks/hooks.json`)
  - executables in `bin/` and any scripts that hooks or skills run
  - MCP servers (`.mcp.json`), especially remote or network-facing ones
  - any change to a plugin's `source`

## Secrets

- Never commit tokens, API keys, passwords or private URLs with credentials. This applies to code, config, examples and tests.
- Plugins read secrets from environment variables or from `userConfig` prompts, and document which ones they need.
- Do not log secrets or write them to `${CLAUDE_PLUGIN_DATA}` in plain text.
- The marketplace repository is public. Anything committed, including git history, is visible to everyone and stays visible after deletion.

## Public repository rules

Because anyone can read this repository and install its plugins:

- Do not commit internal hostnames, URLs, ticket links, customer names or other details of internal systems. Read them from environment variables or `userConfig` instead.
- Do not put prompts, data or examples in plugins that you would not publish.
- Plugins must be safe for an unknown user to install: no hooks or scripts that assume access to internal infrastructure, and clear errors when a required setting or service is missing.
- Review pull requests from outside contributors with extra care, especially changes to hooks, scripts, MCP servers and `.github/workflows/`.
- If a secret is committed, rotate it immediately. Removing it from git history is not enough.

## Script review checklist

Reviewers check every hook, script and MCP server command for:

- [ ] No piping downloaded content into a shell (`curl … | sh`, `wget … | bash`)
- [ ] No writes to credential or system paths (`~/.ssh`, `~/.aws`, `~/.config/gh`, `/etc`, shell rc files)
- [ ] No network calls that the README does not declare
- [ ] No reading of files outside the project and the plugin's own directories without a stated reason
- [ ] Pinned versions for every downloaded package or binary
- [ ] Variables quoted; no unescaped user input passed into shell commands
- [ ] Fails closed: errors stop the action rather than silently skipping a check

## External sources

Plugins sourced from other repositories (`github`, `url`, `git-subdir`) must pin a full 40-character `sha`. Tags and branches can move. Bumping the `sha` is a code change and goes through the same review.

## Reporting a vulnerability

Do not open a public issue. Contact the marketplace owner (@alona-lip) directly. Include the plugin name, version and steps to reproduce. Until a fix is released, the owner can remove the plugin from the catalog with a `renames` entry mapped to `null`.

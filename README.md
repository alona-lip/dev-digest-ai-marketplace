# dev-digest-ai-marketplace

[![Validate marketplace](https://github.com/alona-lip/dev-digest-ai-marketplace/actions/workflows/validate.yml/badge.svg?branch=main)](https://github.com/alona-lip/dev-digest-ai-marketplace/actions/workflows/validate.yml)
[![Catalog site](https://github.com/alona-lip/dev-digest-ai-marketplace/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/alona-lip/dev-digest-ai-marketplace/actions/workflows/pages.yml)

[Claude Code plugin marketplace](https://code.claude.com/docs/en/plugins/create-marketplace) for the Dev Digest team. It catalogs plugins (skills, agents, hooks, MCP servers) that team members can install with one command.

**Browse the catalog:** <https://alona-lip.github.io/dev-digest-ai-marketplace/> lets you search every plugin, skill, agent, command, hook and MCP server and copy its install command. The site is built from this repository; see [site/README.md](site/README.md).

## Install

Add the marketplace once. The repository is public, so no GitHub credentials are needed.

```
/plugin marketplace add alona-lip/dev-digest-ai-marketplace
```

Then install a plugin:

```
/plugin install <plugin>@dev-digest-ai-marketplace
```

The same commands work from a shell as `claude plugin marketplace add …` and `claude plugin install … --scope user|project|local`.

## Enable for a whole project

Commit this to the project's `.claude/settings.json`. Teammates get the marketplace and plugins when they trust the folder.

```json
{
  "extraKnownMarketplaces": {
    "dev-digest-ai-marketplace": {
      "source": { "source": "github", "repo": "alona-lip/dev-digest-ai-marketplace" },
      "autoUpdate": true
    }
  },
  "enabledPlugins": {
    "hello-world@dev-digest-ai-marketplace": true
  }
}
```

Auto-update is off by default for third-party marketplaces. Set `autoUpdate` as above, or turn it on in `/plugin` → **Marketplaces**. To update manually:

```
/plugin marketplace update dev-digest-ai-marketplace
/reload-plugins
```

## Plugins

| Plugin | Description |
| --- | --- |
| [hello-world](plugins/hello-world) | Example plugin that verifies the marketplace setup |

Current versions are in each plugin's `.claude-plugin/plugin.json` and `CHANGELOG.md`.

## Repository layout

```
.claude-plugin/marketplace.json   catalog of plugins
plugins/<name>/                   plugin sources
docs/                             guidelines, security and release policy
site/                             catalog website (GitHub Pages), separate from the plugins
scripts/                          validation, release and rollback scripts
```

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md): how to add or change a plugin
- [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md): plugin structure, manifest and dependency requirements
- [docs/SECURITY.md](docs/SECURITY.md): permissions, secrets policy and script review
- [docs/RELEASES.md](docs/RELEASES.md): SemVer, tags, updates and rollback
- [docs/specs/sdd-plugins.md](docs/specs/sdd-plugins.md): spec for the SDD plugins (`sdd-engineering` and its dependencies)

## License

The source is public for viewing and for installing the plugins through this marketplace, but it is not licensed for reuse or redistribution. Plugins declare `"license": "UNLICENSED"`. All rights reserved.

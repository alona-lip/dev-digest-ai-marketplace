# Catalog site

Static site for browsing and searching everything in this marketplace: plugins, skills, agents, commands, hooks and MCP servers. It is published to GitHub Pages at <https://alona-lip.github.io/dev-digest-ai-marketplace/>.

The site has no backend. At build time, `scripts/build-catalog.ts` reads the repository and writes `public/catalog.json` and `public/feed.xml`. The browser loads that JSON and searches it locally.

## Run locally

Requires Node 20 or later.

```
cd site
npm ci
npm run dev       # rebuilds the catalog, then starts Vite at http://localhost:5173
npm test          # parser and search tests
npm run build     # type-check and build into site/dist
npm run preview   # serve site/dist
```

The catalog is regenerated on every `dev` and `build`. Run `npm run catalog` to refresh it while the dev server is running.

## Where the data comes from

| Catalog field | Source |
| --- | --- |
| Plugins | `.claude-plugin/marketplace.json` entries plus each `plugins/<name>/.claude-plugin/plugin.json` |
| Keywords | `keywords` in `plugin.json` and `tags` in the marketplace entry |
| Skills | `skills/*/SKILL.md` frontmatter (`name`, `description`, `allowed-tools`) and body |
| Dependencies | `dependencies` in `plugin.json`: name, version range and marketplace |
| Agents | `agents/*.md` frontmatter (`name`, `description`, `tools`, `model`, `skills`) and body |
| Preloaded skills | an agent's `skills:` list, linked to the skill pages; each skill page lists the agents that preload it |
| Commands | `commands/*.md` |
| Hooks | `hooks/hooks.json`, one entry per event and matcher |
| MCP servers | `.mcp.json`; only environment variable names are published, never values |
| README and Changelog | `README.md` and the `## [x.y.z] - YYYY-MM-DD` sections of `CHANGELOG.md` |
| Last updated | date of the last commit that touched the plugin folder |

Custom component paths set in `plugin.json` (`skills`, `agents`, `commands`, `hooks`, `mcpServers`) are read too. Markdown is rendered at build time: raw HTML is escaped and relative links point to GitHub.

To make a plugin easier to find, give it a clear `description` and `keywords`.

## Search

Search runs in the browser with [MiniSearch](https://github.com/lucaong/minisearch). Matches in the name rank highest, then keywords, then the description, then the body. Search allows prefixes and small typos.

Queries can be natural language in English or Ukrainian:

- Filler words such as "I need a", "for" or "мені треба" are ignored. The list is in `src/lib/query.ts`.
- Kind words such as "skill", "agent", "скіл" or "агенти" filter by type.
- Ukrainian words are mapped to English terms through `src/lib/synonyms.ts`. Add a line there when a common query finds nothing.
- Every remaining word must match. When nothing matches, results that match any word are shown instead.

## Layout

```
scripts/build-catalog.ts   repository → public/catalog.json + public/feed.xml
src/App.tsx                screens, hash routing, keyboard shortcuts
src/i18n.ts                all UI text; components never contain text (test/i18n.test.ts enforces this)
src/lib/                   search, query parsing, router, catalog types
src/screens/               Home, Search, Plugin, Artifact, What's new, Getting started
src/components/            header, cards, command palette, copy box
src/styles/                design tokens, layout, rendered markdown
test/                      vitest tests with a fixture repository
```

Routes use the URL hash (`#/search?q=…`, `#/plugin/<name>`) because GitHub Pages serves static files only.

## Deployment

`.github/workflows/pages.yml` (**Catalog site**) is separate from the marketplace checks in `validate.yml`. Each job shows up as its own check in the GitHub UI:

| Job | Runs on | What it does |
| --- | --- | --- |
| **Site · tests** | PRs and pushes to `main` | `npm test` |
| **Site · build** | PRs and pushes to `main` | `npm run build` (catalog, type-check, Vite), then writes plugin and entry counts to the run summary |
| **Site · deploy** | pushes to `main` and manual runs, after both jobs above pass | publishes `site/dist` to GitHub Pages |

The workflow runs only when `site/`, `plugins/`, `.claude-plugin/` or the workflow itself changes. Run it by hand from the **Actions** tab (`workflow_dispatch`).

One-time setup: in the repository settings, open **Pages** and set **Source** to **GitHub Actions**.

The `site/` folder is not part of any plugin and does not affect the marketplace.

// Every piece of user-facing UI text. Components read it from `t`; none is written inline in them.
// To add a language, copy `en`, translate the values and choose the locale in `t`.
// Search vocabulary (filler words, Ukrainian synonyms) is data, not UI text: see lib/query.ts and lib/synonyms.ts.
import type { Kind } from './lib/types';

const en = {
  appTitle: 'Dev Digest Catalog',

  kinds: {
    label: { plugin: 'Plugin', skill: 'Skill', agent: 'Agent', command: 'Command', hook: 'Hook', mcp: 'MCP' } as Record<Kind, string>,
    plural: { plugin: 'plugins', skill: 'skills', agent: 'agents', command: 'commands', hook: 'hooks', mcp: 'MCP' } as Record<Kind, string>,
  },

  common: {
    home: '← Home',
    back: '← Back',
    viewOnGitHub: 'View on GitHub ↗',
    copyInstall: 'Copy install',
    copied: 'Copied ✓',
    notInMarketplace: 'Not in this marketplace',
    nothingFound: 'Nothing found',
  },

  app: {
    loading: 'Loading the catalog…',
    loadError: (message: string) => `Could not load the catalog (${message}). Try reloading the page.`,
    searchTitle: (q: string) => `“${q}”`,
  },

  header: {
    homeLabel: 'Catalog home',
    brand: 'Catalog',
    brandPill: 'dev-digest',
    searchPlaceholder: 'Search the catalog…',
    searchLabel: 'Search the catalog',
    paletteKey: '⌘K',
    paletteLabel: 'Open command palette',
    paletteTitle: 'Command palette (⌘K / Ctrl+K)',
    toLightTheme: 'Switch to light theme',
    toDarkTheme: 'Switch to dark theme',
    github: 'GitHub ↗',
  },

  home: {
    eyebrow: 'Marketplace of plugins · skills · agents',
    titleLine1: 'Find the right artifact',
    titleLine2: 'and install it with one copy-paste',
    sub: 'Search plugins, skills, agents, commands, hooks and MCP servers by what you need them to do.',
    searchPlaceholder: 'Describe what you need, e.g. "skill for refactoring React"',
    searchLabel: 'Describe what you need',
    emptyTitle: 'The catalog is empty',
    emptyText: 'There are no plugins yet. Add the first one and it shows up here after the next CI build.',
    gettingStarted: 'Getting started',
    contributing: 'CONTRIBUTING.md',
    statsLabel: 'Catalog statistics',
    whatsNew: "What's new",
    fullFeed: 'Full feed →',
    browseByType: 'Browse by type',
  },

  search: {
    filtersLabel: 'Filters',
    filters: 'Filters',
    reset: 'Reset',
    type: 'Type',
    keywords: 'Keywords',
    author: 'Author',
    resultsFor: (q: string) => `Results: “${q}”`,
    browse: 'Browse the catalog',
    count: (n: number) => `${n} ${n === 1 ? 'artifact' : 'artifacts'}`,
    sort: 'Sort',
    sortRelevance: 'Relevance',
    sortName: 'Name',
    sortUpdated: 'Recently updated',
    emptyText: 'Try resetting filters or changing your query.',
    resetFilters: 'Reset filters',
  },

  plugin: {
    notFound: (name: string) => `Plugin “${name}”`,
    updated: (date: string) => `updated ${date}`,
    components: 'Components',
    dependencies: 'Dependencies',
    readme: 'README',
    changelog: 'Changelog',
  },

  artifact: {
    notFound: 'This artifact',
    crumbRoot: 'Catalog',
    crumbsLabel: 'Breadcrumb',
    tools: 'Tools / permissions',
    envVars: 'Environment variables',
    handlerTypes: 'Handler types',
    model: 'Model',
    preloadedSkills: 'Preloaded skills',
    preloadedBy: 'Preloaded by agents',
    documentation: 'Documentation',
  },

  card: {
    open: 'Open',
    openLabel: (name: string) => `Open ${name}`,
  },

  palette: {
    label: 'Jump to an artifact',
    placeholder: 'Jump to an artifact…',
    escKey: 'ESC',
    pluginMeta: 'plugin',
  },

  gettingStarted: {
    title: 'Connect the marketplace',
    lead: 'Three steps. Add the marketplace as a source, then install individual plugins.',
    examplePlugin: '<plugin>',
    addTitle: 'Add the marketplace as a source',
    addDesc: 'Registers this catalog repository in your Claude Code.',
    installTitle: 'Install a plugin',
    installDesc: 'Install a specific plugin from this marketplace by name.',
    updateTitle: 'Keep it up to date',
    updateDesc: 'Refresh the marketplace now and then, then run /reload-plugins or start a new session.',
    copy: 'Copy',
    copied: '✓',
    copyLabel: (cmd: string) => `Copy: ${cmd}`,
    noteTitle: 'marketplace update vs plugin update.',
    noteText: 'The first refreshes the list of sources; the second updates the code of an installed plugin.',
  },

  whatsNew: {
    title: "What's new",
    rss: 'Subscribe · RSS',
    empty: 'No releases yet.',
  },

  notFound: {
    title: (what: string) => `${what} is not in the catalog`,
    text: 'It may have been renamed or removed.',
  },

  toast: {
    copied: 'Copied to clipboard',
  },
};

export type Strings = typeof en;

export const t: Strings = en;

// Shape of public/catalog.json. Produced by scripts/build-catalog.ts, read by the app.

export type Kind = 'plugin' | 'skill' | 'agent' | 'command' | 'hook' | 'mcp';

export const KINDS: Kind[] = ['plugin', 'skill', 'agent', 'command', 'hook', 'mcp'];

export interface ChangelogEntry {
  version: string;
  date: string;
  summary: string;
}

export interface Entry {
  id: string;
  kind: Kind;
  name: string;
  displayName: string;
  description: string;
  plugin: string;
  keywords: string[];
  author: string;
  version: string;
  updated: string;
  installText: string;
  githubUrl: string;
  invocation: string;
  tools: string[];
  model?: string;
  /** Agents only: skills preloaded through the `skills:` frontmatter, as written there. */
  skills?: string[];
  bodyText: string;
  bodyHtml: string;
}

/** An entry of `dependencies` in plugin.json. */
export interface Dependency {
  name: string;
  /** SemVer range, such as "^1.0.0". */
  version?: string;
  /** Set when the dependency comes from another marketplace. */
  marketplace?: string;
}

export interface PluginInfo {
  name: string;
  displayName: string;
  description: string;
  version: string;
  author: string;
  updated: string;
  category?: string;
  compatibility?: string;
  keywords: string[];
  deps: Dependency[];
  readmeHtml: string;
  changelog: ChangelogEntry[];
  githubUrl: string;
  installText: string;
}

export interface Catalog {
  marketplace: string;
  repo: string;
  repoUrl: string;
  siteUrl: string;
  generatedAt: string;
  entries: Entry[];
  plugins: Record<string, PluginInfo>;
}

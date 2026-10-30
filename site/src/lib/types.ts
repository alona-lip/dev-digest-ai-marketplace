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
  bodyText: string;
  bodyHtml: string;
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
  deps: string[];
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

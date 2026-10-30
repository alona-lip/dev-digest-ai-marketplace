import type { Catalog, ChangelogEntry, Kind } from './types';

export const KIND_PLURAL: Record<Kind, string> = {
  plugin: 'plugins',
  skill: 'skills',
  agent: 'agents',
  command: 'commands',
  hook: 'hooks',
  mcp: 'MCP',
};

export const KIND_LABEL: Record<Kind, string> = {
  plugin: 'Plugin',
  skill: 'Skill',
  agent: 'Agent',
  command: 'Command',
  hook: 'Hook',
  mcp: 'MCP',
};

export async function loadCatalog(): Promise<Catalog> {
  const res = await fetch('./catalog.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`catalog.json: HTTP ${res.status}`);
  return res.json();
}

export interface Release extends ChangelogEntry {
  plugin: string;
  displayName: string;
}

export function releases(catalog: Catalog): Release[] {
  return Object.values(catalog.plugins)
    .flatMap((p) => p.changelog.map((c) => ({ ...c, plugin: p.name, displayName: p.displayName })))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function countByKind(catalog: Catalog, kind: Kind): number {
  return catalog.entries.filter((e) => e.kind === kind).length;
}

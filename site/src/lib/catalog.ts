import type { Catalog, ChangelogEntry, Entry, Kind } from './types';

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

/** Entry id of a skill named in an agent's `skills:` list: "plugin:skill", or a bare name from the agent's own plugin. */
export function skillRefId(ref: string, agentPlugin: string): string {
  const i = ref.indexOf(':');
  return i === -1 ? `skill:${agentPlugin}/${ref}` : `skill:${ref.slice(0, i)}/${ref.slice(i + 1)}`;
}

/** Agents whose `skills:` list preloads the skill with this entry id. */
export function agentsPreloading(catalog: Catalog, skillId: string): Entry[] {
  return catalog.entries.filter((e) => e.kind === 'agent' && e.skills?.some((s) => skillRefId(s, e.plugin) === skillId));
}

export function countByKind(catalog: Catalog, kind: Kind): number {
  return catalog.entries.filter((e) => e.kind === kind).length;
}

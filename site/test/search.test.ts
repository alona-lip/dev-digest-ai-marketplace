import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalog } from '../scripts/build-catalog';
import { CatalogSearch, applyFacets } from '../src/lib/search';

const catalog = buildCatalog({ repoRoot: resolve(__dirname, 'fixtures', 'repo'), repo: 'acme/market', gitDate: () => '' });
const search = new CatalogSearch(catalog.entries);
const ids = (q: string) => search.search(q).map((r) => r.entry.id);

describe('CatalogSearch', () => {
  it('finds a skill from a natural-language English query', () => {
    expect(ids('I need a skill for code review')).toEqual(['skill:demo/code-review']);
  });

  it('finds a skill from a Ukrainian query through synonyms', () => {
    expect(ids("мені треба скіл для рев'ю коду")).toEqual(['skill:demo/code-review']);
  });

  it('ranks name matches first', () => {
    expect(ids('security')[0]).toBe('agent:demo/security-auditor');
  });

  it('tolerates typos', () => {
    expect(ids('vulnerabilty')).toContain('agent:demo/security-auditor');
  });

  it('falls back to OR when not every word matches', () => {
    expect(ids('postgres kubernetes')).toEqual(['mcp:demo/postgres']);
  });

  it('retries kind words as plain terms when the kind filter finds nothing', () => {
    expect(ids('changelog skill')).toContain('command:demo/changelog');
  });

  it('lists everything for an empty query and filters by kind for kind-only queries', () => {
    expect(ids('')).toHaveLength(catalog.entries.length);
    expect(ids('hooks')).toEqual(['hook:demo/PreToolUse-Bash', 'hook:demo/SessionStart']);
  });
});

describe('applyFacets', () => {
  const all = search.search('');

  it('filters by kind, keyword and author', () => {
    const r = applyFacets(all, { kinds: ['skill', 'agent'], keywords: ['security'], author: 'Fixture Team' }, 'name');
    expect(r.map((e) => e.id)).toEqual(['skill:demo/code-review', 'agent:demo/security-auditor']);
  });

  it('sorts by name', () => {
    const names = applyFacets(all, { kinds: [], keywords: [], author: null }, 'name').map((e) => e.displayName);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

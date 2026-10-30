import MiniSearch, { type Query } from 'minisearch';
import { parseQuery } from './query';
import type { Entry, Kind } from './types';

export type Sort = 'relevance' | 'name' | 'updated';

export interface Facets {
  kinds: Kind[];
  keywords: string[];
  author: string | null;
}

export interface Scored {
  entry: Entry;
  score: number;
}

// Field weights follow the design: name 5, keywords 3, description 2, body 1.
const BOOST = { displayName: 5, name: 5, keywords: 3, description: 2, bodyText: 1 };

export class CatalogSearch {
  private index: MiniSearch<Entry>;
  private byId: Map<string, Entry>;

  constructor(private entries: Entry[]) {
    this.byId = new Map(entries.map((e) => [e.id, e]));
    this.index = new MiniSearch<Entry>({
      fields: Object.keys(BOOST),
      extractField: (doc, field) => {
        const value = (doc as unknown as Record<string, unknown>)[field];
        return Array.isArray(value) ? value.join(' ') : (value as string);
      },
      searchOptions: {
        boost: BOOST,
        // Prefix matching from the first letter keeps results visible while the user types.
        prefix: true,
        fuzzy: (term) => (term.length >= 5 ? 0.2 : false),
      },
    });
    this.index.addAll(entries);
  }

  private run(groups: string[][], combineWith: 'AND' | 'OR', kinds: Kind[]): Scored[] {
    const query: Query = {
      combineWith,
      queries: groups.map((g) => ({ combineWith: 'OR', queries: g })),
    };
    return this.index
      .search(query)
      .map((r) => ({ entry: this.byId.get(r.id as string)!, score: r.score }))
      .filter((r) => !kinds.length || kinds.includes(r.entry.kind));
  }

  /**
   * Every query word must match somewhere (AND). When that finds nothing, any word may match (OR).
   * Kind words ("skill", "агент") filter by kind; if that empties the result, they are retried as plain words.
   */
  search(raw: string): Scored[] {
    const { groups, kinds, kindWords } = parseQuery(raw);
    if (!groups.length) {
      return this.entries.filter((e) => !kinds.length || kinds.includes(e.kind)).map((entry) => ({ entry, score: 0 }));
    }
    const attempt = (g: string[][], k: Kind[]) => {
      const and = this.run(g, 'AND', k);
      return and.length ? and : this.run(g, 'OR', k);
    };
    const results = attempt(groups, kinds);
    if (results.length || !kinds.length) return results;
    return attempt([...groups, ...kindWords.map((w) => [w])], []);
  }
}

export function applyFacets(results: Scored[], facets: Facets, sort: Sort): Entry[] {
  let list = results;
  if (facets.kinds.length) list = list.filter((r) => facets.kinds.includes(r.entry.kind));
  if (facets.keywords.length) list = list.filter((r) => facets.keywords.some((k) => r.entry.keywords.includes(k)));
  if (facets.author) list = list.filter((r) => r.entry.author === facets.author);
  const byName = (a: Scored, b: Scored) => a.entry.displayName.localeCompare(b.entry.displayName);
  const sorted = [...list].sort((a, b) => {
    if (sort === 'name') return byName(a, b);
    if (sort === 'updated') return b.entry.updated.localeCompare(a.entry.updated) || byName(a, b);
    return b.score - a.score || byName(a, b);
  });
  return sorted.map((r) => r.entry);
}

import { useMemo } from 'react';
import { useApp } from '../context';
import { ArtifactCard } from '../components/ArtifactCard';
import { KindDot } from '../components/Kind';
import { KIND_PLURAL, countByKind } from '../lib/catalog';
import { navigate, type SearchRoute } from '../lib/router';
import { applyFacets, type CatalogSearch, type Sort } from '../lib/search';
import { KINDS } from '../lib/types';

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export function Search({ route, search }: { route: SearchRoute; search: CatalogSearch }) {
  const { catalog } = useApp();
  const update = (patch: Partial<SearchRoute>) => navigate({ ...route, ...patch }, { replace: true });
  const reset = () => update({ q: '', kinds: [], keywords: [], author: null });

  const results = useMemo(
    () => applyFacets(search.search(route.q), { kinds: route.kinds, keywords: route.keywords, author: route.author }, route.sort),
    [search, route],
  );

  const keywords = useMemo(() => [...new Set(catalog.entries.flatMap((e) => e.keywords))].sort(), [catalog]);
  const authors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of catalog.entries) if (e.author) counts.set(e.author, (counts.get(e.author) ?? 0) + 1);
    return [...counts];
  }, [catalog]);

  return (
    <main className="page search-page">
      <aside className="facets" aria-label="Filters">
        <div className="facets-head">
          <span className="facets-title">Filters</span>
          <button type="button" className="facets-reset" onClick={reset}>
            Reset
          </button>
        </div>

        <div className="facet-label">Type</div>
        <div className="facet-list">
          {KINDS.map((k) => (
            <button
              type="button"
              key={k}
              className="facet"
              aria-pressed={route.kinds.includes(k)}
              onClick={() => update({ kinds: toggle(route.kinds, k) })}
            >
              <KindDot kind={k} />
              <span className="facet-text cap">{KIND_PLURAL[k]}</span>
              <span className="count">{countByKind(catalog, k)}</span>
            </button>
          ))}
        </div>

        {keywords.length > 0 && (
          <>
            <div className="facet-label">Keywords</div>
            <div className="kw-list">
              {keywords.map((k) => (
                <button
                  type="button"
                  key={k}
                  className="kw"
                  aria-pressed={route.keywords.includes(k)}
                  onClick={() => update({ keywords: toggle(route.keywords, k) })}
                >
                  {k}
                </button>
              ))}
            </div>
          </>
        )}

        {authors.length > 0 && (
          <>
            <div className="facet-label">Author</div>
            <div className="facet-list">
              {authors.map(([a, n]) => (
                <button
                  type="button"
                  key={a}
                  className="facet author-facet"
                  aria-pressed={route.author === a}
                  onClick={() => update({ author: route.author === a ? null : a })}
                >
                  <span className="facet-text">{a}</span>
                  <span className="count">{n}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </aside>

      <section>
        <div className="results-head">
          <div>
            <h1>{route.q ? `Results: “${route.q}”` : 'Browse the catalog'}</h1>
            <div className="results-count" aria-live="polite">
              {results.length} {results.length === 1 ? 'artifact' : 'artifacts'}
            </div>
          </div>
          <label className="sort">
            Sort
            <select value={route.sort} onChange={(e) => update({ sort: e.target.value as Sort })}>
              <option value="relevance">Relevance</option>
              <option value="name">Name</option>
              <option value="updated">Recently updated</option>
            </select>
          </label>
        </div>

        {results.length > 0 ? (
          <div className="cards">
            {results.map((e) => (
              <ArtifactCard key={e.id} entry={e} />
            ))}
          </div>
        ) : (
          <div className="empty-box">
            <div className="empty-emoji" aria-hidden="true">🔍</div>
            <h3>Nothing found</h3>
            <p>Try resetting filters or changing your query.</p>
            <button type="button" className="btn-secondary" style={{ height: 34, padding: '0 16px' }} onClick={reset}>
              Reset filters
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

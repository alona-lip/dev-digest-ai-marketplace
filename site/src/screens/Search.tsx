import { useMemo } from 'react';
import { useApp } from '../context';
import { ArtifactCard } from '../components/ArtifactCard';
import { KindDot } from '../components/Kind';
import { t } from '../i18n';
import { countByKind } from '../lib/catalog';
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
      <aside className="facets" aria-label={t.search.filtersLabel}>
        <div className="facets-head">
          <span className="facets-title">{t.search.filters}</span>
          <button type="button" className="facets-reset" onClick={reset}>
            {t.search.reset}
          </button>
        </div>

        <div className="facet-label">{t.search.type}</div>
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
              <span className="facet-text cap">{t.kinds.plural[k]}</span>
              <span className="count">{countByKind(catalog, k)}</span>
            </button>
          ))}
        </div>

        {keywords.length > 0 && (
          <>
            <div className="facet-label">{t.search.keywords}</div>
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
            <div className="facet-label">{t.search.author}</div>
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
            <h1>{route.q ? t.search.resultsFor(route.q) : t.search.browse}</h1>
            <div className="results-count" aria-live="polite">
              {t.search.count(results.length)}
            </div>
          </div>
          <label className="sort">
            {t.search.sort}
            <select value={route.sort} onChange={(e) => update({ sort: e.target.value as Sort })}>
              <option value="relevance">{t.search.sortRelevance}</option>
              <option value="name">{t.search.sortName}</option>
              <option value="updated">{t.search.sortUpdated}</option>
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
            <h3>{t.common.nothingFound}</h3>
            <p>{t.search.emptyText}</p>
            <button type="button" className="btn-secondary" style={{ height: 34, padding: '0 16px' }} onClick={reset}>
              {t.search.resetFilters}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

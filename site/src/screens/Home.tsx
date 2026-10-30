import { useApp } from '../context';
import { KindDot } from '../components/Kind';
import { t } from '../i18n';
import { countByKind, releases } from '../lib/catalog';
import { searchRoute } from '../lib/router';
import { KINDS, type Kind } from '../lib/types';

const STAT_KINDS: Kind[] = ['plugin', 'skill', 'agent', 'command', 'mcp'];

interface Props {
  query: string;
  onQuery: (value: string) => void;
  onSubmit: () => void;
}

export function Home({ query, onQuery, onSubmit }: Props) {
  const { catalog, go } = useApp();
  const empty = Object.keys(catalog.plugins).length === 0;

  const kwCount = new Map<string, number>();
  for (const e of catalog.entries) for (const k of e.keywords) kwCount.set(k, (kwCount.get(k) ?? 0) + 1);
  const topKeywords = [...kwCount.keys()].sort((a, b) => kwCount.get(b)! - kwCount.get(a)! || a.localeCompare(b)).slice(0, 7);
  const latest = releases(catalog).slice(0, 4);

  return (
    <main className="page home">
      <section className="hero">
        <div className="eyebrow">{t.home.eyebrow}</div>
        <h1>
          {t.home.titleLine1}
          <br /> {t.home.titleLine2}
        </h1>
        <p className="hero-sub">{t.home.sub}</p>
        <div className="hero-search" role="search">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            placeholder={t.home.searchPlaceholder}
            aria-label={t.home.searchLabel}
          />
        </div>
        {topKeywords.length > 0 && (
          <div className="chips">
            {topKeywords.map((k) => (
              <button type="button" key={k} className="chip" onClick={() => go(searchRoute({ keywords: [k] }))}>
                #{k}
              </button>
            ))}
          </div>
        )}
      </section>

      {empty ? (
        <section className="catalog-empty">
          <div className="emoji" aria-hidden="true">📦</div>
          <h2>{t.home.emptyTitle}</h2>
          <p>{t.home.emptyText}</p>
          <div className="btn-row">
            <button type="button" className="btn-primary" onClick={() => go({ screen: 'getting-started' })}>
              {t.home.gettingStarted}
            </button>
            <a className="btn-secondary" href={`${catalog.repoUrl}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noopener noreferrer">
              {t.home.contributing}
            </a>
          </div>
        </section>
      ) : (
        <>
          <section className="stats" aria-label={t.home.statsLabel}>
            {STAT_KINDS.map((k) => (
              <button type="button" key={k} className="stat" onClick={() => go(searchRoute({ kinds: [k] }))}>
                <div className="stat-count">{countByKind(catalog, k)}</div>
                <div className="stat-label">{t.kinds.plural[k]}</div>
              </button>
            ))}
          </section>

          {latest.length > 0 && (
            <section className="home-section">
              <div className="section-head">
                <h2>{t.home.whatsNew}</h2>
                <button type="button" className="link-dim" onClick={() => go({ screen: 'whats-new' })}>
                  {t.home.fullFeed}
                </button>
              </div>
              <div className="release-list">
                {latest.map((r) => (
                  <button
                    type="button"
                    key={r.plugin + r.version}
                    className="release-row hoverable"
                    onClick={() => go({ screen: 'plugin', name: r.plugin })}
                  >
                    <span className="version-badge">v{r.version}</span>
                    <div className="release-main">
                      <div className="release-title">{r.displayName}</div>
                      <div className="release-summary">{r.summary}</div>
                    </div>
                    <span className="release-date">{r.date}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="section-head">
              <h2>{t.home.browseByType}</h2>
            </div>
            <div className="browse">
              {KINDS.map((k) => (
                <button type="button" key={k} className="browse-btn hoverable" onClick={() => go(searchRoute({ kinds: [k] }))}>
                  <KindDot kind={k} large />
                  <span className="browse-label">{t.kinds.plural[k]}</span>
                  <span className="count">{countByKind(catalog, k)}</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

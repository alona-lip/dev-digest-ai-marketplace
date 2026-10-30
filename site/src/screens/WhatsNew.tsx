import { useApp } from '../context';
import { releases } from '../lib/catalog';

export function WhatsNew() {
  const { catalog, go } = useApp();
  const items = releases(catalog);
  return (
    <main className="page whats-new-page">
      <button type="button" className="back-link" onClick={() => go({ screen: 'home' })}>
        ← Home
      </button>
      <div className="page-head">
        <h1>What's new</h1>
        <a className="rss-link" href="./feed.xml" target="_blank" rel="noopener">
          Subscribe · RSS
        </a>
      </div>
      {items.length === 0 ? (
        <p className="muted">No releases yet.</p>
      ) : (
        <div className="feed">
          {items.map((r) => (
            <button
              type="button"
              key={r.plugin + r.version}
              className="feed-row hoverable"
              onClick={() => go({ screen: 'plugin', name: r.plugin })}
            >
              <div className="feed-when">
                <div className="feed-version">v{r.version}</div>
                <div className="feed-date">{r.date}</div>
              </div>
              <div className="feed-main">
                <div className="release-title">{r.displayName}</div>
                <div className="feed-summary">{r.summary}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}

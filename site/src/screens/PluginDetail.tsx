import { useApp } from '../context';
import { CopyBox } from '../components/CopyBox';
import { KindDot } from '../components/Kind';
import { Markdown } from '../components/Markdown';
import { t } from '../i18n';
import type { Kind } from '../lib/types';
import { NotFound } from './NotFound';

const ORDER: Kind[] = ['skill', 'agent', 'command', 'hook', 'mcp'];

/** "other-plugin" or "other-plugin:skill" → "other-plugin". */
const depPlugin = (name: string) => name.split(':')[0];

export function PluginDetail({ name }: { name: string }) {
  const { catalog, go, back } = useApp();
  const p = catalog.plugins[name];
  if (!p) return <NotFound what={t.plugin.notFound(name)} />;

  const groups = ORDER.map((kind) => ({
    kind,
    items: catalog.entries.filter((e) => e.plugin === p.name && e.kind === kind),
  })).filter((g) => g.items.length > 0);

  return (
    <main className="page plugin-page">
      <button type="button" className="back-link" onClick={back}>
        {t.common.back}
      </button>
      <div className="detail-head">
        <div className="plugin-icon" aria-hidden="true">◆</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="title-row">
            <h1>{p.displayName}</h1>
            {p.version && <span className="version-badge">v{p.version}</span>}
            {p.compatibility && <span className="compat-badge">✓ {p.compatibility}</span>}
          </div>
          {p.description && <p className="detail-desc">{p.description}</p>}
          <div className="detail-meta">
            {[p.author, p.updated && t.plugin.updated(p.updated)].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>

      <CopyBox text={p.installText} id={'p:' + p.name}>
        <a className="btn-ghost-lg" href={p.githubUrl} target="_blank" rel="noopener noreferrer">
          {t.common.viewOnGitHub}
        </a>
      </CopyBox>

      {groups.length > 0 && (
        <section className="section">
          <h2 className="section-title">{t.plugin.components}</h2>
          <div className="comp-groups">
            {groups.map((g) => (
              <div key={g.kind}>
                <div className="comp-group-head">
                  <KindDot kind={g.kind} />
                  <span className="comp-group-label">{t.kinds.plural[g.kind]}</span>
                  <span className="count">{g.items.length}</span>
                </div>
                <div className="comp-grid">
                  {g.items.map((it) => (
                    <button type="button" key={it.id} className="comp hoverable" onClick={() => go({ screen: 'artifact', id: it.id })}>
                      <div className="comp-top">
                        <span className="comp-name">{it.displayName}</span>
                        {it.invocation && <span className="comp-inv">{it.invocation}</span>}
                      </div>
                      <div className="comp-desc">{it.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {p.deps.length > 0 && (
        <section className="section">
          <h2 className="section-title">{t.plugin.dependencies}</h2>
          <div className="deps">
            {p.deps.map((d) => {
              const external = !!d.marketplace && d.marketplace !== catalog.marketplace;
              const target = external ? undefined : catalog.plugins[depPlugin(d.name)];
              const label = external ? `${d.name}@${d.marketplace}` : d.name;
              return (
                <button
                  type="button"
                  key={label}
                  className="dep hoverable"
                  disabled={!target}
                  title={target ? undefined : t.common.notInMarketplace}
                  onClick={() => target && go({ screen: 'plugin', name: target.name })}
                >
                  {label}
                  {d.version && <span className="dep-range"> {d.version}</span>}
                  {target ? ' ↗' : ''}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {p.readmeHtml && (
        <section className="section">
          <h2 className="section-title">{t.plugin.readme}</h2>
          <div className="panel doc-panel">
            <Markdown html={p.readmeHtml} />
          </div>
        </section>
      )}

      {p.changelog.length > 0 && (
        <section>
          <h2 className="section-title">{t.plugin.changelog}</h2>
          <div className="changelog">
            {p.changelog.map((c) => (
              <div key={c.version} className="changelog-item">
                <div className="changelog-top">
                  <span className="changelog-version">v{c.version}</span>
                  {c.date && <span className="changelog-date">{c.date}</span>}
                </div>
                {c.summary && <div className="changelog-summary">{c.summary}</div>}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

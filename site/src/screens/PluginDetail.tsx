import { useApp } from '../context';
import { CopyBox } from '../components/CopyBox';
import { KindDot } from '../components/Kind';
import { Markdown } from '../components/Markdown';
import { KIND_PLURAL } from '../lib/catalog';
import type { Kind } from '../lib/types';
import { NotFound } from './NotFound';

const ORDER: Kind[] = ['skill', 'agent', 'command', 'hook', 'mcp'];

/** "other-plugin", "other-plugin@market" or "other-plugin:skill" → "other-plugin". */
const depPlugin = (dep: string) => dep.split(/[:@]/)[0];

export function PluginDetail({ name }: { name: string }) {
  const { catalog, go, back } = useApp();
  const p = catalog.plugins[name];
  if (!p) return <NotFound what={`Plugin “${name}”`} />;

  const groups = ORDER.map((kind) => ({
    kind,
    items: catalog.entries.filter((e) => e.plugin === p.name && e.kind === kind),
  })).filter((g) => g.items.length > 0);

  return (
    <main className="page plugin-page">
      <button type="button" className="back-link" onClick={back}>
        ← Back
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
            {[p.author, p.updated && `updated ${p.updated}`].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>

      <CopyBox text={p.installText} id={'p:' + p.name}>
        <a className="btn-ghost-lg" href={p.githubUrl} target="_blank" rel="noopener noreferrer">
          View on GitHub ↗
        </a>
      </CopyBox>

      {groups.length > 0 && (
        <section className="section">
          <h2 className="section-title">Components</h2>
          <div className="comp-groups">
            {groups.map((g) => (
              <div key={g.kind}>
                <div className="comp-group-head">
                  <KindDot kind={g.kind} />
                  <span className="comp-group-label">{KIND_PLURAL[g.kind]}</span>
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
          <h2 className="section-title">Dependencies</h2>
          <div className="deps">
            {p.deps.map((d) => {
              const target = catalog.plugins[depPlugin(d)];
              return (
                <button
                  type="button"
                  key={d}
                  className="dep hoverable"
                  disabled={!target}
                  title={target ? undefined : 'Not in this marketplace'}
                  onClick={() => target && go({ screen: 'plugin', name: target.name })}
                >
                  {d}
                  {target ? ' ↗' : ''}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {p.readmeHtml && (
        <section className="section">
          <h2 className="section-title">README</h2>
          <div className="panel doc-panel">
            <Markdown html={p.readmeHtml} />
          </div>
        </section>
      )}

      {p.changelog.length > 0 && (
        <section>
          <h2 className="section-title">Changelog</h2>
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

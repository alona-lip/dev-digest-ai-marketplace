import { useApp } from '../context';
import { CopyBox } from '../components/CopyBox';
import { KindBadge } from '../components/Kind';
import { Markdown } from '../components/Markdown';
import { NotFound } from './NotFound';

const CHIP_LABEL = { mcp: 'Environment variables', hook: 'Handler types' } as const;

export function ArtifactDetail({ id }: { id: string }) {
  const { catalog, go, back } = useApp();
  const e = catalog.entries.find((x) => x.id === id);
  if (!e) return <NotFound what="This artifact" />;
  const parent = catalog.plugins[e.plugin];
  const chipLabel = e.kind === 'mcp' || e.kind === 'hook' ? CHIP_LABEL[e.kind] : 'Tools / permissions';

  return (
    <main className="page artifact-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <button type="button" onClick={back}>
          Catalog
        </button>
        <span className="sep"> / </span>
        <button type="button" onClick={() => go({ screen: 'plugin', name: e.plugin })}>
          {parent ? parent.displayName : e.plugin}
        </button>
        <span className="current"> / {e.name}</span>
      </nav>
      <div className="title-row" style={{ marginBottom: 6 }}>
        <KindBadge kind={e.kind} large />
        <h1>{e.displayName}</h1>
        {e.invocation && <span className="invocation-pill">{e.invocation}</span>}
      </div>
      {e.description && <p className="detail-desc">{e.description}</p>}

      {e.tools.length > 0 && (
        <div className="chip-group">
          <div className="chip-group-label">{chipLabel}</div>
          <div className="tool-chips">
            {e.tools.map((t) => (
              <span key={t} className="tool-chip">{t}</span>
            ))}
          </div>
        </div>
      )}
      {e.model && (
        <div className="chip-group">
          <div className="chip-group-label">Model</div>
          <div className="tool-chips">
            <span className="tool-chip">{e.model}</span>
          </div>
        </div>
      )}

      <CopyBox text={e.installText} id={'a:' + e.id}>
        <a className="btn-ghost-lg" href={e.githubUrl} target="_blank" rel="noopener noreferrer">
          View on GitHub ↗
        </a>
      </CopyBox>

      {e.bodyHtml && (
        <section>
          <h2 className="section-title">Documentation</h2>
          <div className="panel doc-panel">
            <Markdown html={e.bodyHtml} />
          </div>
        </section>
      )}
    </main>
  );
}

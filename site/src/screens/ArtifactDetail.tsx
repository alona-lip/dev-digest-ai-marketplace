import { useApp } from '../context';
import { CopyBox } from '../components/CopyBox';
import { KindBadge } from '../components/Kind';
import { Markdown } from '../components/Markdown';
import { t } from '../i18n';
import { agentsPreloading, skillRefId } from '../lib/catalog';
import { NotFound } from './NotFound';

const CHIP_LABEL = { mcp: t.artifact.envVars, hook: t.artifact.handlerTypes } as const;

export function ArtifactDetail({ id }: { id: string }) {
  const { catalog, go, back } = useApp();
  const e = catalog.entries.find((x) => x.id === id);
  if (!e) return <NotFound what={t.artifact.notFound} />;
  const parent = catalog.plugins[e.plugin];
  const chipLabel = e.kind === 'mcp' || e.kind === 'hook' ? CHIP_LABEL[e.kind] : t.artifact.tools;
  const preloadedBy = e.kind === 'skill' ? agentsPreloading(catalog, e.id) : [];

  return (
    <main className="page artifact-page">
      <nav className="crumbs" aria-label={t.artifact.crumbsLabel}>
        <button type="button" onClick={back}>
          {t.artifact.crumbRoot}
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
          <div className="chip-group-label">{t.artifact.model}</div>
          <div className="tool-chips">
            <span className="tool-chip">{e.model}</span>
          </div>
        </div>
      )}
      {e.skills && e.skills.length > 0 && (
        <div className="chip-group">
          <div className="chip-group-label">{t.artifact.preloadedSkills}</div>
          <div className="tool-chips">
            {e.skills.map((s) => {
              const id = skillRefId(s, e.plugin);
              return catalog.entries.some((x) => x.id === id) ? (
                <button type="button" key={s} className="tool-chip chip-link hoverable" onClick={() => go({ screen: 'artifact', id })}>
                  {s} ↗
                </button>
              ) : (
                <span key={s} className="tool-chip" title={t.common.notInMarketplace}>
                  {s}
                </span>
              );
            })}
          </div>
        </div>
      )}
      {preloadedBy.length > 0 && (
        <div className="chip-group">
          <div className="chip-group-label">{t.artifact.preloadedBy}</div>
          <div className="tool-chips">
            {preloadedBy.map((a) => (
              <button type="button" key={a.id} className="tool-chip chip-link hoverable" onClick={() => go({ screen: 'artifact', id: a.id })}>
                {a.invocation} ↗
              </button>
            ))}
          </div>
        </div>
      )}

      <CopyBox text={e.installText} id={'a:' + e.id}>
        <a className="btn-ghost-lg" href={e.githubUrl} target="_blank" rel="noopener noreferrer">
          {t.common.viewOnGitHub}
        </a>
      </CopyBox>

      {e.bodyHtml && (
        <section>
          <h2 className="section-title">{t.artifact.documentation}</h2>
          <div className="panel doc-panel">
            <Markdown html={e.bodyHtml} />
          </div>
        </section>
      )}
    </main>
  );
}

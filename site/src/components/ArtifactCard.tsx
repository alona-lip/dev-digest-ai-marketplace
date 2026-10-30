import { useApp } from '../context';
import type { Entry } from '../lib/types';
import { KindBadge } from './Kind';

export function entryRoute(e: Entry) {
  return e.kind === 'plugin' ? ({ screen: 'plugin', name: e.name } as const) : ({ screen: 'artifact', id: e.id } as const);
}

export function ArtifactCard({ entry }: { entry: Entry }) {
  const { go, copy, copiedId } = useApp();
  const copyId = 'c:' + entry.id;
  const copied = copiedId === copyId;
  const open = () => go(entryRoute(entry));
  return (
    <article className="card hoverable">
      <div className="card-body">
        <div className="card-top">
          <KindBadge kind={entry.kind} />
          {entry.version && <span className="card-version">v{entry.version}</span>}
        </div>
        <button type="button" className="card-title" onClick={open}>
          {entry.displayName}
        </button>
        <p className="card-desc">{entry.description}</p>
        {entry.keywords.length > 0 && (
          <div className="card-kws">
            {entry.keywords.slice(0, 3).map((k) => (
              <span key={k}>#{k}</span>
            ))}
          </div>
        )}
      </div>
      <div className="card-foot">
        <span className="card-meta">{entry.kind === 'plugin' ? entry.author : `${entry.plugin} · ${entry.author}`}</span>
        <div className="card-actions">
          <button
            type="button"
            className={`btn-sm${copied ? ' copied' : ''}`}
            onClick={() => copy(entry.installText, copyId)}
            title={entry.installText}
          >
            {copied ? 'Copied ✓' : 'Copy install'}
          </button>
          <button type="button" className="btn-sm primary" onClick={open} aria-label={`Open ${entry.displayName}`}>
            Open
          </button>
        </div>
      </div>
    </article>
  );
}

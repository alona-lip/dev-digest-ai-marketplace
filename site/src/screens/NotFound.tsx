import { useApp } from '../context';

export function NotFound({ what }: { what: string }) {
  const { go } = useApp();
  return (
    <main className="page" style={{ maxWidth: 720 }}>
      <div className="empty-box">
        <div className="empty-emoji" aria-hidden="true">🔍</div>
        <h3>{what} is not in the catalog</h3>
        <p>It may have been renamed or removed.</p>
        <button type="button" className="btn-secondary" onClick={() => go({ screen: 'home' })}>
          ← Home
        </button>
      </div>
    </main>
  );
}

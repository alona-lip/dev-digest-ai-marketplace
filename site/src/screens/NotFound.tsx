import { useApp } from '../context';
import { t } from '../i18n';

export function NotFound({ what }: { what: string }) {
  const { go } = useApp();
  return (
    <main className="page" style={{ maxWidth: 720 }}>
      <div className="empty-box">
        <div className="empty-emoji" aria-hidden="true">🔍</div>
        <h3>{t.notFound.title(what)}</h3>
        <p>{t.notFound.text}</p>
        <button type="button" className="btn-secondary" onClick={() => go({ screen: 'home' })}>
          {t.common.home}
        </button>
      </div>
    </main>
  );
}

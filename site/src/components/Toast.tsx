import { t } from '../i18n';

export function Toast() {
  return (
    <div className="toast" role="status">
      <span className="ok">✓</span> {t.toast.copied}
    </div>
  );
}

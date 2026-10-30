import type { ReactNode } from 'react';
import { useApp } from '../context';
import { t } from '../i18n';

/** Black terminal box with the install command, the copy button and optional extra actions. */
export function CopyBox({ text, id, children }: { text: string; id: string; children?: ReactNode }) {
  const { copy, copiedId } = useApp();
  return (
    <div className="install-row">
      <div className="terminal">
        <span className="prompt">$</span>
        <span className="cmd" title={text}>{text}</span>
      </div>
      <button type="button" className="btn-copy-lg" onClick={() => copy(text, id)}>
        {copiedId === id ? t.common.copied : t.common.copyInstall}
      </button>
      {children}
    </div>
  );
}

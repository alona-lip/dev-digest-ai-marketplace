import { forwardRef } from 'react';
import { t } from '../i18n';
import type { Theme } from '../lib/theme';

interface Props {
  query: string;
  onQuery: (value: string) => void;
  onSubmit: () => void;
  onHome: () => void;
  onOpenPalette: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  repoUrl: string;
}

export const Header = forwardRef<HTMLInputElement, Props>(function Header(
  { query, onQuery, onSubmit, onHome, onOpenPalette, theme, onToggleTheme, repoUrl },
  inputRef,
) {
  return (
    <header className="header">
      <button type="button" className="brand" onClick={onHome} aria-label={t.header.homeLabel}>
        <span className="brand-mark" aria-hidden="true">◆</span>
        <span className="brand-name">{t.header.brand}</span>
        <span className="brand-pill">{t.header.brandPill}</span>
      </button>
      <div className="header-search" role="search">
        <span className="search-icon" aria-hidden="true">⌕</span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          placeholder={t.header.searchPlaceholder}
          aria-label={t.header.searchLabel}
        />
      </div>
      <button type="button" className="icon-btn mono" onClick={onOpenPalette} aria-label={t.header.paletteLabel} title={t.header.paletteTitle}>
        {t.header.paletteKey}
      </button>
      <button
        type="button"
        className="icon-btn square"
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? t.header.toLightTheme : t.header.toDarkTheme}
      >
        {theme === 'dark' ? '☾' : '☀'}
      </button>
      <a className="header-link" href={repoUrl} target="_blank" rel="noopener noreferrer">
        {t.header.github}
      </a>
    </header>
  );
});

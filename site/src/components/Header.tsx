import { forwardRef } from 'react';
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
      <button type="button" className="brand" onClick={onHome} aria-label="Catalog home">
        <span className="brand-mark" aria-hidden="true">◆</span>
        <span className="brand-name">Catalog</span>
        <span className="brand-pill">dev-digest</span>
      </button>
      <div className="header-search" role="search">
        <span className="search-icon" aria-hidden="true">⌕</span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          placeholder="Search the catalog…"
          aria-label="Search the catalog"
        />
      </div>
      <button type="button" className="icon-btn mono" onClick={onOpenPalette} aria-label="Open command palette" title="Command palette (⌘K / Ctrl+K)">
        ⌘K
      </button>
      <button
        type="button"
        className="icon-btn square"
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {theme === 'dark' ? '☾' : '☀'}
      </button>
      <a className="header-link" href={repoUrl} target="_blank" rel="noopener noreferrer">
        GitHub ↗
      </a>
    </header>
  );
});

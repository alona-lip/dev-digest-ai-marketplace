import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context';
import { KIND_LABEL } from '../lib/catalog';
import type { CatalogSearch } from '../lib/search';
import { entryRoute } from './ArtifactCard';
import { KindDot } from './Kind';

const LIMIT = 8;

export function CommandPalette({ search, onClose }: { search: CatalogSearch; onClose: () => void }) {
  const { catalog, go } = useApp();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () => (query.trim() ? search.search(query).map((r) => r.entry) : catalog.entries).slice(0, LIMIT),
    [query, search, catalog],
  );

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const open = (i: number) => {
    const entry = results[i];
    if (!entry) return;
    onClose();
    go(entryRoute(entry));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      open(active);
    }
  };

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Jump to an artifact" onClick={(e) => e.stopPropagation()}>
        <div className="palette-input-row">
          <span className="glyph" aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to an artifact…"
            aria-label="Jump to an artifact"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results.length ? `palette-item-${active}` : undefined}
          />
          <span className="kbd">ESC</span>
        </div>
        <div className="palette-list" id="palette-list" role="listbox">
          {results.map((e, i) => (
            <button
              type="button"
              key={e.id}
              id={`palette-item-${i}`}
              role="option"
              aria-selected={i === active}
              className="palette-item"
              onMouseMove={() => setActive(i)}
              onClick={() => open(i)}
            >
              <KindDot kind={e.kind} />
              <span className="palette-item-main">
                <span className="palette-item-name">{e.displayName}</span>{' '}
                <span className="palette-item-meta">· {e.kind === 'plugin' ? 'plugin' : e.plugin}</span>
              </span>
              <span className="palette-item-kind">{KIND_LABEL[e.kind]}</span>
            </button>
          ))}
          {results.length === 0 && <div className="palette-empty">Nothing found</div>}
        </div>
      </div>
    </div>
  );
}

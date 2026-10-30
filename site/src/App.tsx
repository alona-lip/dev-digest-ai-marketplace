import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext, type AppApi } from './context';
import { CommandPalette } from './components/CommandPalette';
import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { t } from './i18n';
import { copyText } from './lib/clipboard';
import { loadCatalog } from './lib/catalog';
import { navigate, parseHash, searchRoute, toHash, useHash, type Route, type SearchRoute } from './lib/router';
import { CatalogSearch } from './lib/search';
import { currentTheme, setTheme, type Theme } from './lib/theme';
import type { Catalog } from './lib/types';
import { ArtifactDetail } from './screens/ArtifactDetail';
import { GettingStarted } from './screens/GettingStarted';
import { Home } from './screens/Home';
import { PluginDetail } from './screens/PluginDetail';
import { Search } from './screens/Search';
import { WhatsNew } from './screens/WhatsNew';

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; catalog: Catalog };

const isTyping = (el: Element | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

export function App() {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const hash = useHash();
  const route = useMemo(() => parseHash(hash), [hash]);
  const [theme, setThemeState] = useState<Theme>(currentTheme);
  const [query, setQuery] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const lastSearch = useRef<SearchRoute | null>(null);
  const headerInput = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    loadCatalog()
      .then((catalog) => setLoad({ status: 'ready', catalog }))
      .catch((err: Error) => setLoad({ status: 'error', message: err.message }));
  }, []);

  const catalog = load.status === 'ready' ? load.catalog : null;
  const search = useMemo(() => (catalog ? new CatalogSearch(catalog.entries) : null), [catalog]);

  // Keep the search box in sync with the URL (back/forward, shared links).
  useEffect(() => {
    if (route.screen === 'search') {
      setQuery(route.q);
      lastSearch.current = route;
    }
  }, [route]);

  // Scroll to the top when the screen changes, but not while refining a search.
  const screenKey = route.screen === 'search' ? 'search' : toHash(route);
  // Braces matter: newer browsers return a Promise from scrollTo, which React would treat as a cleanup.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screenKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
      } else if (e.key === '/' && !isTyping(document.activeElement)) {
        e.preventDefault();
        headerInput.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const go = useCallback((r: Route) => {
    setPaletteOpen(false);
    navigate(r);
  }, []);

  const api: AppApi | null = useMemo(
    () =>
      catalog && {
        catalog,
        go,
        back: () => go(lastSearch.current ?? { screen: 'home' }),
        copy: (text, id) => {
          void copyText(text).then(() => {
            timers.current.forEach(clearTimeout);
            setCopiedId(id);
            setToast(true);
            timers.current = [window.setTimeout(() => setCopiedId(null), 2000), window.setTimeout(() => setToast(false), 1800)];
          });
        },
        copiedId,
      },
    [catalog, go, copiedId],
  );

  const onQuery = (value: string, fromHero = false) => {
    setQuery(value);
    const onSearch = route.screen === 'search';
    navigate({ ...(onSearch ? route : searchRoute()), q: value }, { replace: onSearch });
    // The hero input unmounts once the search screen opens; keep typing in the header box.
    if (fromHero) requestAnimationFrame(() => headerInput.current?.focus());
  };
  const onSubmit = () => {
    if (route.screen !== 'search') navigate(searchRoute({ q: query }));
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  };

  useEffect(() => {
    if (!catalog) return;
    const base = t.appTitle;
    const title =
      route.screen === 'plugin'
        ? catalog.plugins[route.name]?.displayName
        : route.screen === 'artifact'
          ? catalog.entries.find((e) => e.id === route.id)?.displayName
          : route.screen === 'search' && route.q
            ? t.app.searchTitle(route.q)
            : route.screen === 'whats-new'
              ? t.whatsNew.title
              : route.screen === 'getting-started'
                ? t.home.gettingStarted
                : undefined;
    document.title = title ? `${title} · ${base}` : base;
  }, [catalog, route]);

  return (
    <div className="app">
      <Header
        ref={headerInput}
        query={query}
        onQuery={(v) => onQuery(v)}
        onSubmit={onSubmit}
        onHome={() => go({ screen: 'home' })}
        onOpenPalette={() => setPaletteOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
        repoUrl={catalog?.repoUrl ?? 'https://github.com/alona-lip/dev-digest-ai-marketplace'}
      />
      {load.status === 'loading' && <div className="status">{t.app.loading}</div>}
      {load.status === 'error' && <div className="status">{t.app.loadError(load.message)}</div>}
      {api && search && (
        <AppContext.Provider value={api}>
          {route.screen === 'home' && <Home query={query} onQuery={(v) => onQuery(v, true)} onSubmit={onSubmit} />}
          {route.screen === 'search' && <Search route={route} search={search} />}
          {route.screen === 'plugin' && <PluginDetail name={route.name} />}
          {route.screen === 'artifact' && <ArtifactDetail id={route.id} />}
          {route.screen === 'whats-new' && <WhatsNew />}
          {route.screen === 'getting-started' && <GettingStarted />}
          {paletteOpen && <CommandPalette search={search} onClose={() => setPaletteOpen(false)} />}
          {toast && <Toast />}
        </AppContext.Provider>
      )}
    </div>
  );
}

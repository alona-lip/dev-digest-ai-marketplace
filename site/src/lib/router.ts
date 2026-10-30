// Hash routing: GitHub Pages serves static files only, so every screen lives behind "#/".
import { useSyncExternalStore } from 'react';
import type { Sort } from './search';
import { KINDS, type Kind } from './types';

export interface SearchRoute {
  screen: 'search';
  q: string;
  kinds: Kind[];
  keywords: string[];
  author: string | null;
  sort: Sort;
}

export type Route =
  | { screen: 'home' }
  | SearchRoute
  | { screen: 'plugin'; name: string }
  | { screen: 'artifact'; id: string }
  | { screen: 'whats-new' }
  | { screen: 'getting-started' };

const SORTS: Sort[] = ['relevance', 'name', 'updated'];
const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);

export function searchRoute(patch: Partial<Omit<SearchRoute, 'screen'>> = {}): SearchRoute {
  return { screen: 'search', q: '', kinds: [], keywords: [], author: null, sort: 'relevance', ...patch };
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [path, qs = ''] = raw.split('?');
  const [head, ...rest] = path.split('/');
  const tail = decodeURIComponent(rest.join('/'));
  switch (head) {
    case 'search': {
      const p = new URLSearchParams(qs);
      const sort = p.get('sort') as Sort;
      return searchRoute({
        q: p.get('q') ?? '',
        kinds: list(p.get('kind')).filter((k): k is Kind => (KINDS as string[]).includes(k)),
        keywords: list(p.get('kw')),
        author: p.get('author') || null,
        sort: SORTS.includes(sort) ? sort : 'relevance',
      });
    }
    case 'plugin':
      return tail ? { screen: 'plugin', name: tail } : { screen: 'home' };
    case 'artifact':
      return tail ? { screen: 'artifact', id: tail } : { screen: 'home' };
    case 'whats-new':
      return { screen: 'whats-new' };
    case 'getting-started':
      return { screen: 'getting-started' };
    default:
      return { screen: 'home' };
  }
}

export function toHash(route: Route): string {
  switch (route.screen) {
    case 'search': {
      const p = new URLSearchParams();
      if (route.q) p.set('q', route.q);
      if (route.kinds.length) p.set('kind', route.kinds.join(','));
      if (route.keywords.length) p.set('kw', route.keywords.join(','));
      if (route.author) p.set('author', route.author);
      if (route.sort !== 'relevance') p.set('sort', route.sort);
      const qs = p.toString();
      return '#/search' + (qs ? '?' + qs : '');
    }
    case 'plugin':
      return '#/plugin/' + encodeURIComponent(route.name);
    case 'artifact':
      return '#/artifact/' + encodeURIComponent(route.id);
    case 'home':
      return '#/';
    default:
      return '#/' + route.screen;
  }
}

export function navigate(route: Route, { replace = false } = {}) {
  const hash = toHash(route);
  if (hash === window.location.hash) return;
  if (replace) window.location.replace(hash);
  else window.location.hash = hash;
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash);
}

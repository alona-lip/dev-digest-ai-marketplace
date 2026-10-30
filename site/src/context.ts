import { createContext, useContext } from 'react';
import type { Route } from './lib/router';
import type { Catalog } from './lib/types';

export interface AppApi {
  catalog: Catalog;
  /** Navigates and scrolls to the top, like the design's `_go`. */
  go: (route: Route) => void;
  /** Returns to the last search, or home when there was none. */
  back: () => void;
  copy: (text: string, id: string) => void;
  copiedId: string | null;
}

export const AppContext = createContext<AppApi | null>(null);

export function useApp(): AppApi {
  const api = useContext(AppContext);
  if (!api) throw new Error('useApp outside AppContext');
  return api;
}

import { createContext, useContext, type ComponentType } from 'react';

/** Ordem das abas no pager (mesma ordem do TabBar). */
export const TABS_ORDER = ['index', 'plano', 'historico', 'stats'] as const;
export type TabName = (typeof TABS_ORDER)[number];

export type TabScreens = Partial<Record<TabName, ComponentType>>;

/** Caminho de navegação de cada aba. */
export const TAB_PATHS: Record<TabName, string> = {
  index: '/',
  plano: '/plano',
  historico: '/historico',
  stats: '/stats',
};

/** Registry com os componentes das abas, fornecido pelo layout `(tabs)`. */
export const TabScreensContext = createContext<TabScreens>({});
export const useTabScreens = () => useContext(TabScreensContext);

/**
 * Marca a árvore de uma tela renderizada como "preview" (vizinho do swipe).
 * Previews não devem montar outros previews nem capturar gestos.
 */
export const PreviewModeContext = createContext(false);
export const useIsPreview = () => useContext(PreviewModeContext);

/** Converte o pathname atual no nome da aba. */
export function pathToTab(pathname: string): TabName {
  const first = pathname.replace(/^\//, '').split('/')[0];
  return (TABS_ORDER as readonly string[]).includes(first) ? (first as TabName) : 'index';
}

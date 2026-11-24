'use client';

import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { View } from 'react-native';
import { usePathname, router } from 'expo-router';

/**
 * Ordem das abas (índice 0 = primeira):
 * /       → Hoje (index)
 * /plano  → Plano
 * /historico → Histórico
 * /stats  → Stats
 */
const TABS: string[] = ['/', '/plano', '/historico', '/stats'];

export function SwipeableTabs({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentIndex = TABS.indexOf(pathname);

  return (
    <PanGestureHandler
      onHandlerStateChange={(event: any) => {
        if (event.nativeEvent.state === State.END) {
          const { translationX } = event.nativeEvent;
          // Só dispara se o movimento horizontal for significativo (> 50px)
          if (Math.abs(translationX) < 50) return;
          // Swipe para a direita → aba anterior
          if (translationX > 0 && currentIndex > 0) {
            (router as any).navigate(TABS[currentIndex - 1]);
          }
          // Swipe para a esquerda → próxima aba
          else if (translationX < 0 && currentIndex < TABS.length - 1) {
            (router as any).navigate(TABS[currentIndex + 1]);
          }
        }
      }}>
      <View style={{ flex: 1 }}>{children}</View>
    </PanGestureHandler>
  );
}

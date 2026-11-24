'use client';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { View } from 'react-native';
import { usePathname, router } from 'expo-router';

/**
 * Ordem das abas (índice 0 = primeira):
 * /          → Hoje (index)
 * /plano     → Plano
 * /historico → Histórico
 * /stats     → Stats
 */
const TABS = ['/', '/plano', '/historico', '/stats'] as const;

export function SwipeableTabs({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentIndex = TABS.indexOf(pathname as (typeof TABS)[number]);

  const goToTab = (index: number) => {
    if (index < 0 || index >= TABS.length) return;
    router.navigate(TABS[index]);
  };

  // activeOffsetX: só ativa se o movimento horizontal passar de 40px.
  // failOffsetY: se o dedo se mover verticalmente antes, cancela (não briga com o ScrollView).
  const swipe = Gesture.Pan()
    .activeOffsetX([-40, 40])
    .failOffsetY([-20, 20])
    .runOnJS(true)
    .onEnd((event) => {
      if (event.translationX <= -60) goToTab(currentIndex + 1);
      else if (event.translationX >= 60) goToTab(currentIndex - 1);
    });

  return (
    <GestureDetector gesture={swipe}>
      <View style={{ flex: 1 }}>{children}</View>
    </GestureDetector>
  );
}

'use client';

/*
 * Reanimated trabalha mutando `SharedValue.value` fora do render e os callbacks de
 * gesto são executados após o render — padrão que as regras do React Compiler
 * (react-hooks/immutability, react-hooks/refs, react-hooks/globals) não reconhecem.
 */
/* eslint-disable react-hooks/immutability, react-hooks/refs */

import { useCallback, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { router, useFocusEffect, useIsFocused, usePathname } from 'expo-router';

import {
  PreviewModeContext,
  TAB_PATHS,
  TABS_ORDER,
  pathToTab,
  useIsPreview,
  useTabScreens,
} from '@/components/tabs-context';
import { ARCADE_COLORS } from '@/constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
/** Distância mínima (px) para concluir a troca de aba ao soltar o dedo. */
const SWIPE_THRESHOLD = 70;
/** Duração do deslize de saída (ms). */
const SLIDE_DURATION = 170;
/** Resistência ao arrastar além da primeira/última aba. */
const EDGE_RESISTANCE = 0.35;

/**
 * Envolve o conteúdo de uma aba com o gesto de swipe.
 * As abas vizinhas ficam montadas ao lado, então o conteúdo real delas
 * aparece gradualmente durante o arrasto (sem tela vazia).
 */
export function SwipeableTabs({ children }: { children: React.ReactNode }) {
  const isPreview = useIsPreview();

  // Preview nunca monta novos previews nem captura gestos (evita recursão).
  if (isPreview) {
    return <View style={styles.page}>{children}</View>;
  }

  return <SwipeContainer>{children}</SwipeContainer>;
}

function SwipeContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFocused = useIsFocused();
  const screens = useTabScreens();

  const tabIndex = TABS_ORDER.indexOf(pathToTab(pathname));
  const translateX = useSharedValue(0);
  const navigating = useRef(false);

  // Ao perder o foco, zera o deslocamento para a aba não reaparecer deslocada.
  useFocusEffect(
    useCallback(() => {
      return () => {
        translateX.value = 0;
      };
    }, [translateX]),
  );

  const navigateTo = useCallback((targetIndex: number) => {
    if (navigating.current) return;
    navigating.current = true;
    // Espera a tela atual terminar de deslizar para fora antes de trocar.
    setTimeout(() => {
      router.navigate(TAB_PATHS[TABS_ORDER[targetIndex]] as never);
      navigating.current = false;
    }, SLIDE_DURATION);
  }, []);

  const swipe = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .failOffsetY([-16, 16])
    .runOnJS(true)
    .onUpdate((event) => {
      const atStart = tabIndex === 0 && event.translationX > 0;
      const atEnd = tabIndex === TABS_ORDER.length - 1 && event.translationX < 0;
      // Nas pontas, a tela resiste em vez de sair da área.
      translateX.value =
        atStart || atEnd ? event.translationX * EDGE_RESISTANCE : event.translationX;
    })
    .onEnd((event) => {
      const canNext = tabIndex < TABS_ORDER.length - 1;
      const canPrev = tabIndex > 0;

      if (event.translationX <= -SWIPE_THRESHOLD && canNext) {
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: SLIDE_DURATION });
        navigateTo(tabIndex + 1);
      } else if (event.translationX >= SWIPE_THRESHOLD && canPrev) {
        translateX.value = withTiming(SCREEN_WIDTH, { duration: SLIDE_DURATION });
        navigateTo(tabIndex - 1);
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 220 });
      }
    });

  // Tela atual, vizinha da esquerda e vizinha da direita compartilham o mesmo deslocamento.
  const currentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const prevStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value - SCREEN_WIDTH }],
  }));
  const nextStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value + SCREEN_WIDTH }],
  }));

  const PrevScreen = isFocused && tabIndex > 0 ? screens[TABS_ORDER[tabIndex - 1]] : undefined;
  const NextScreen =
    isFocused && tabIndex < TABS_ORDER.length - 1
      ? screens[TABS_ORDER[tabIndex + 1]]
      : undefined;

  return (
    <View style={styles.container}>
      <GestureDetector gesture={swipe}>
        <Animated.View style={[styles.page, currentStyle]}>{children}</Animated.View>
      </GestureDetector>

      {PrevScreen ? (
        <Animated.View style={[styles.page, prevStyle]} pointerEvents="none">
          <PreviewModeContext.Provider value={true}>
            <PrevScreen />
          </PreviewModeContext.Provider>
        </Animated.View>
      ) : null}

      {NextScreen ? (
        <Animated.View style={[styles.page, nextStyle]} pointerEvents="none">
          <PreviewModeContext.Provider value={true}>
            <NextScreen />
          </PreviewModeContext.Provider>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  page: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: ARCADE_COLORS.bgApp,
  },
});

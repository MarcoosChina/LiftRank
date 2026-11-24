'use client';

/*
 * Reanimated trabalha mutando `SharedValue.value` fora do render e os callbacks de
 * gesto são executados após o render — padrão que as regras do React Compiler
 * (react-hooks/immutability, react-hooks/refs, react-hooks/globals) não reconhecem.
 */
/* eslint-disable react-hooks/immutability, react-hooks/refs, react-hooks/globals */

import { useCallback, useRef } from 'react';
import { Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { router, useFocusEffect, usePathname } from 'expo-router';

/**
 * Ordem das abas (índice 0 = primeira):
 * /          → Hoje (index)
 * /plano     → Plano
 * /historico → Histórico
 * /stats     → Stats
 */
const TABS = ['/', '/plano', '/historico', '/stats'] as const;

const SCREEN_WIDTH = Dimensions.get('window').width;
/** Distância mínima (px) para concluir a troca de aba ao soltar o dedo. */
const SWIPE_THRESHOLD = 70;
/** Duração do deslize de saída/entrada (ms). */
const SLIDE_DURATION = 170;
/** Resistência ao arrastar além da primeira/última aba. */
const EDGE_RESISTANCE = 0.35;

/**
 * Direção com que a próxima aba deve entrar em cena:
 * 1 = vem da direita (avançou), -1 = vem da esquerda (voltou), 0 = sem animação.
 */
let nextEnterDirection: 0 | 1 | -1 = 0;

export function SwipeableTabs({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentIndex = TABS.indexOf(pathname as (typeof TABS)[number]);

  const translateX = useSharedValue(0);
  const navigating = useRef(false);

  // Ao ganhar foco, a aba entra deslizando (continuação visual do swipe anterior).
  useFocusEffect(
    useCallback(() => {
      if (nextEnterDirection !== 0) {
        const from = nextEnterDirection;
        nextEnterDirection = 0;
        translateX.value = from * SCREEN_WIDTH;
        translateX.value = withTiming(0, { duration: SLIDE_DURATION + 30 });
      } else {
        translateX.value = 0;
      }
    }, [translateX]),
  );

  const navigateTo = useCallback((index: number) => {
    if (navigating.current) return;
    navigating.current = true;
    // Espera a tela atual terminar de deslizar para fora antes de trocar.
    setTimeout(() => {
      router.navigate(TABS[index] as (typeof TABS)[number]);
      navigating.current = false;
    }, SLIDE_DURATION);
  }, []);

  const swipe = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .failOffsetY([-16, 16])
    .runOnJS(true)
    .onUpdate((event) => {
      const atStart = currentIndex === 0 && event.translationX > 0;
      const atEnd = currentIndex === TABS.length - 1 && event.translationX < 0;
      // Nas pontas, a tela resiste em vez de sair da área.
      translateX.value =
        atStart || atEnd ? event.translationX * EDGE_RESISTANCE : event.translationX;
    })
    .onEnd((event) => {
      const canNext = currentIndex < TABS.length - 1;
      const canPrev = currentIndex > 0;

      if (event.translationX <= -SWIPE_THRESHOLD && canNext) {
        nextEnterDirection = 1;
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: SLIDE_DURATION });
        navigateTo(currentIndex + 1);
      } else if (event.translationX >= SWIPE_THRESHOLD && canPrev) {
        nextEnterDirection = -1;
        translateX.value = withTiming(SCREEN_WIDTH, { duration: SLIDE_DURATION });
        navigateTo(currentIndex - 1);
      } else {
        // Não passou do limite: volta com mola para o lugar.
        translateX.value = withSpring(0, { damping: 20, stiffness: 220 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}

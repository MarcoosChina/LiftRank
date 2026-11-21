import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Image, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ARCADE_COLORS } from '@/constants/theme';

const TAB_ICONS: Record<string, number> = {
  index: require('../../../assets/images/icones/ico-home.png'),
  plano: require('../../../assets/images/icones/ico-plano.png'),
  historico: require('../../../assets/images/icones/ico-historico.png'),
  stats: require('../../../assets/images/icones/ico-stats.png'),
};

const TABS: { name: string; label: string }[] = [
  { name: 'index', label: 'Hoje' },
  { name: 'plano', label: 'Plano' },
  { name: 'historico', label: 'Histórico' },
  { name: 'stats', label: 'Stats' },
];

function TabBar({ state, insets, navigateToTab }: BottomTabBarProps) {
  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {TABS.map((tab, index) => {
        const focused = state.routes[state.index]?.name === tab.name;
        // skill.md §5.1: aba ativa em dourado (Início) ou roxo vibrante; inativas cinza-lilás.
        const tint = focused
          ? tab.name === 'index'
            ? ARCADE_COLORS.accent
            : ARCADE_COLORS.primary
          : ARCADE_COLORS.textSecondary;
        return (
          <Pressable
            key={tab.name}
            style={styles.tab}
            onPress={() => navigateToTab(state.routes[index].key)}>
            <Image source={TAB_ICONS[tab.name]} style={{ width: 24, height: 24, tintColor: tint }} />
            <ThemedText type="smallBold" style={{ color: tint }} numberOfLines={1}>
              {tab.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Hoje' }} />
      <Tabs.Screen name="plano" options={{ title: 'Plano' }} />
      <Tabs.Screen name="historico" options={{ title: 'Histórico' }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2B2119',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
});

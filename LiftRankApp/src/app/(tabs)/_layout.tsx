import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

const TABS: { name: string; label: string }[] = [
  { name: 'index', label: 'Hoje' },
  { name: 'plano', label: 'Plano' },
  { name: 'historico', label: 'Histórico' },
  { name: 'stats', label: 'Stats' },
];

function TabBar({ state, insets, navigateToTab }: BottomTabBarProps) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {TABS.map((tab, index) => {
        const focused = state.routes[state.index]?.name === tab.name;
        return (
          <Pressable
            key={tab.name}
            style={styles.tab}
            onPress={() => navigateToTab(state.routes[index].key)}>
            <View style={[styles.dot, focused && { backgroundColor: theme.accent }]} />
            <ThemedText
              type="smallBold"
              style={{ color: focused ? theme.text : theme.textSecondary }}
              numberOfLines={1}>
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
    borderTopColor: '#23262D',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 18,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
});

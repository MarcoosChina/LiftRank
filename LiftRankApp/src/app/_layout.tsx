import { ThemeProvider, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Suspense, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';

import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts } from '@/constants/theme';
import { migrateDbIfNeeded } from '@/db/migrate';

SplashScreen.preventAutoHideAsync();

const navTheme = {
  dark: true,
  colors: {
    primary: Colors.dark.accent,
    background: Colors.dark.background,
    card: Colors.dark.backgroundElement,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.accent,
  },
  fonts: {
    regular: { fontFamily: Fonts.body, fontWeight: '400' },
    medium: { fontFamily: Fonts.sans, fontWeight: '500' },
    bold: { fontFamily: Fonts.bold, fontWeight: '700' },
    heavy: { fontFamily: Fonts.displayBold, fontWeight: '800' },
  },
} as const;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="liftrank.db" onInit={migrateDbIfNeeded} useSuspense>
        <Suspense
          fallback={
            <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={Colors.dark.accent} />
            </ThemedView>
          }>
          <ThemeProvider value={navTheme}>
            <StatusBar style="light" />
            <Stack>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </ThemeProvider>
        </Suspense>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

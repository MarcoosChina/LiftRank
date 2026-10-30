import * as Haptics from 'expo-haptics';
import { Link, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { loginUser } from '@/db/repo';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export default function LoginScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    const res = await loginUser(db, email, password);
    if (!res.success) {
      setError(res.error ?? 'E-mail ou senha inválidos.');
      return;
    }
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(tabs)');
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <ThemedText type="title" style={{ fontSize: 36 }}>
                LiftRank
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Entre para sincronizar e acompanhar seus treinos
              </ThemedText>
            </View>

            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="subtitle">Entrar</ThemedText>

              {Boolean(error) && (
                <ThemedText type="smallBold" style={{ color: theme.danger }}>
                  {error}
                </ThemedText>
              )}

              <View style={styles.inputGroup}>
                <ThemedText type="small" style={styles.label}>
                  E-mail
                </ThemedText>
                <TextField
                  placeholder="seu@email.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" style={styles.label}>
                  Senha
                </ThemedText>
                <TextField
                  placeholder="Sua senha"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <Link href="./forgot-password" asChild>
                <Pressable style={styles.forgotLink}>
                  <ThemedText type="small" style={{ color: theme.accent }}>
                    Esqueceu a senha?
                  </ThemedText>
                </Pressable>
              </Link>

              <PrimaryButton label="ENTRAR" onPress={handleLogin} />

              <View style={styles.footerRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Não tem uma conta?{' '}
                </ThemedText>
                <Link href="./signup" asChild>
                  <Pressable>
                    <ThemedText type="smallBold" style={{ color: theme.accent }}>
                      Cadastre-se
                    </ThemedText>
                  </Pressable>
                </Link>
              </View>
            </ThemedView>

            <Pressable
              style={styles.guestButton}
              onPress={() => router.replace('/(tabs)')}>
              <ThemedText type="smallBold" style={{ color: theme.textSecondary, textAlign: 'center' }}>
                Entrar sem conta (Modo Local)
              </ThemedText>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    gap: Spacing.four,
    justifyContent: 'center',
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  card: {
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    color: '#A89C8F',
  },
  forgotLink: {
    alignSelf: 'flex-end',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  guestButton: {
    padding: 12,
    alignItems: 'center',
  },
});

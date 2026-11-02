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
import { registerUser } from '@/db/repo';
import { useAuthStore } from '@/store/auth-store';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export default function SignupScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSignup() {
    if (!name || !email || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    const res = await registerUser(db, name, email, password);
    if (!res.success || !res.userId) {
      setError(res.error ?? 'Erro ao cadastrar.');
      return;
    }
    useAuthStore.getState().setSession({ id: res.userId, name, email });
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
                Crie sua conta e comece a evoluir
              </ThemedText>
            </View>

            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="subtitle">Criar Conta</ThemedText>

              {Boolean(error) && (
                <ThemedText type="smallBold" style={{ color: theme.danger }}>
                  {error}
                </ThemedText>
              )}

              <View style={styles.inputGroup}>
                <ThemedText type="small" style={styles.label}>
                  Nome
                </ThemedText>
                <TextField
                  placeholder="Seu nome"
                  value={name}
                  onChangeText={setName}
                />
              </View>

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
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <PrimaryButton label="CADASTRAR" onPress={handleSignup} />

              <View style={styles.footerRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Já tem uma conta?{' '}
                </ThemedText>
                <Link href="./login" asChild>
                  <Pressable>
                    <ThemedText type="smallBold" style={{ color: theme.accent }}>
                      Entrar
                    </ThemedText>
                  </Pressable>
                </Link>
              </View>
            </ThemedView>
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
});

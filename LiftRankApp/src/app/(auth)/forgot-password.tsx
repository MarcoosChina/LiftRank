import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { resetPassword } from '@/db/repo';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (loading) {
      return;
    }
    if (!email || !password || !confirm) {
      setError('Preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      setError('A senha precisa ter ao menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    const res = await resetPassword(db, email, password);
    setLoading(false);

    if (!res.success) {
      setError(res.error ?? 'Não foi possível redefinir a senha.');
      return;
    }
    setError('');
    setSuccess(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
                Recuperação de acesso
              </ThemedText>
            </View>

            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="subtitle">Esqueceu a senha?</ThemedText>

              {success ? (
                <View style={{ gap: Spacing.three }}>
                  <ThemedText type="small" style={{ color: theme.accent, lineHeight: 20 }}>
                    Senha redefinida neste dispositivo. Entre com a nova senha para acessar sua conta.
                  </ThemedText>
                  <PrimaryButton label="VOLTAR AO LOGIN" onPress={() => router.replace('./login')} />
                </View>
              ) : (
                <>
                  <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 20 }}>
                    Sua conta fica apenas neste dispositivo, então não há envio de e-mail. Confirme o
                    e-mail cadastrado e defina uma nova senha.
                  </ThemedText>

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
                      Nova senha
                    </ThemedText>
                    <TextField
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText type="small" style={styles.label}>
                      Confirmar nova senha
                    </ThemedText>
                    <TextField
                      placeholder="Repita a nova senha"
                      value={confirm}
                      onChangeText={setConfirm}
                      secureTextEntry
                    />
                  </View>

                  <PrimaryButton
                    label={loading ? 'REDEFININDO...' : 'REDEFINIR SENHA'}
                    onPress={handleReset}
                    disabled={loading}
                  />

                  <Pressable
                    style={{ alignSelf: 'center', marginTop: 8 }}
                    onPress={() => router.back()}>
                    <ThemedText type="smallBold" style={{ color: theme.accent }}>
                      Voltar ao login
                    </ThemedText>
                  </Pressable>
                </>
              )}
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
});

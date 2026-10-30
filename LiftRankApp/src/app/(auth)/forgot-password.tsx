import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  function handleReset() {
    if (!email) {
      setError('Informe seu e-mail.');
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
                    Enviamos instruções de recuperação para <ThemedText type="smallBold">{email}</ThemedText>. Verifique sua caixa de entrada.
                  </ThemedText>
                  <PrimaryButton label="VOLTAR AO LOGIN" onPress={() => router.replace('./login')} />
                </View>
              ) : (
                <>
                  <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 20 }}>
                    Digite o e-mail cadastrado e enviaremos um link para você redefinir sua senha.
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

                  <PrimaryButton label="ENVIAR INSTRUÇÕES" onPress={handleReset} />

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

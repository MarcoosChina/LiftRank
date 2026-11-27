import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  /** Aceita texto ou nós (ex.: trechos em negrito com `ThemedText`). */
  message: ReactNode;
  /** Rótulo do botão de confirmação, já em caixa alta. */
  confirmLabel: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Diálogo de confirmação no visual do app (centralizado, fundo escuro e ação
 * destrutiva em vermelho). Usado pelo Plano e pelo Histórico para manter os
 * dois popups idênticos.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Fechar confirmação"
        />

        <ThemedView
          type="backgroundElement"
          style={styles.card}
          accessibilityViewIsModal
          importantForAccessibility="yes">
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>

          <ThemedText type="small" style={styles.message}>
            {message}
          </ThemedText>

          <View style={styles.buttons}>
            <Pressable
              style={styles.button}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}>
              <ThemedView type="backgroundSelected" style={styles.cancelButton}>
                <ThemedText type="smallBold">{cancelLabel}</ThemedText>
              </ThemedView>
            </Pressable>

            <Pressable
              style={styles.button}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}>
              <ThemedView style={[styles.confirmButton, { backgroundColor: theme.danger }]}>
                <ThemedText
                  type="smallBold"
                  style={[styles.confirmLabel, { color: theme.accentInk }]}>
                  {confirmLabel}
                </ThemedText>
              </ThemedView>
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  message: {
    color: '#A89C8F',
    lineHeight: 21,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flex: 1,
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#FF4D4D',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  confirmLabel: {
    letterSpacing: 2,
  },
});

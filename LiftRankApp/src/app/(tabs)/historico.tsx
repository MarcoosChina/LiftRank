import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  deleteSession,
  getSessionDetail,
  getSessions,
  strToDate,
  type SessionDetail,
} from '@/db/repo';
import { formatNumber, useQuery } from '@/hooks/use-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuthStore } from '@/store/auth-store';
import { useTheme } from '@/hooks/use-theme';
import { SwipeableTabs } from '@/components/swipeable-tabs';
import { ARCADE_COLORS, Fonts, Spacing } from '@/constants/theme';

const ICO_HISTORICO = require('../../../assets/images/icones/ico-historico.png');

export default function HistoricoScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const userId = useAuthStore((s) => s.userId) ?? 1;
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; date: string } | null>(null);

  const sessions = useQuery(() => getSessions(db, userId));

  async function toggleExpand(sessionId: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (expandedId === sessionId) {
      setExpandedId(null);
      setSessionDetail(null);
      setLoadingDetail(false);
      return;
    }
    setExpandedId(sessionId);
    setLoadingDetail(true);
    const detail = await getSessionDetail(db, sessionId);
    setSessionDetail(detail);
    setLoadingDetail(false);
  }

  const grouped = useMemo(() => {
    if (expandedId === null || !sessionDetail) return null;
    const byExercise = new Map<string, { volume: number; series: number; rows: string[] }>();
    for (const set of sessionDetail.sets) {
      const key = set.exercise_name;
      const item = byExercise.get(key) ?? { volume: 0, series: 0, rows: [] };
      item.series += 1;
      item.volume += set.weight * set.reps;
      item.rows.push(`${formatNumber(set.weight, set.weight % 1 === 0 ? 0 : 1)}kg × ${set.reps}`);
      byExercise.set(key, item);
    }
    const cardio = sessionDetail.cardio.map((c) => ({
      name: c.exercise_name,
      minutes: c.minutes,
    }));
    return { byExercise: [...byExercise.entries()], cardio };
  }, [expandedId, sessionDetail]);

  return (
    <SwipeableTabs>
      <ThemedView style={[styles.flex, { backgroundColor: '#0E0B1E' }]}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image
                source={ICO_HISTORICO}
                style={{ width: 24, height: 24, tintColor: ARCADE_COLORS.primary }}
              />
              <ThemedText type="title" style={{ color: ARCADE_COLORS.textPrimary }}>Histórico</ThemedText>
              <View style={{ backgroundColor: ARCADE_COLORS.bgCard, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: ARCADE_COLORS.primary }}>
                <ThemedText type="code" style={{ color: ARCADE_COLORS.primary, fontSize: 10 }}>[ADVENTURE LOG]</ThemedText>
              </View>
            </View>
            <ThemedText type="small" style={{ color: ARCADE_COLORS.textSecondary, marginTop: 2 }}>
              {sessions.data?.length ?? 0} jornadas concluídas
            </ThemedText>
          </View>

          {(sessions.data ?? []).length === 0 && (
            <ThemedText type="small" style={{ color: ARCADE_COLORS.textSecondary }}>
              Nada por aqui ainda. Registre séries na aba Hoje.
            </ThemedText>
          )}

          {(sessions.data ?? []).map((session) => {
            const expanded = expandedId === session.id;
            const d = strToDate(session.date);
            const progressPercent = Math.min(100, Math.round(((session.reps ?? 0) / Math.max(session.volume ?? 1, 1)) * 100));
            return (
              <ThemedView key={session.id} style={[styles.sessionCard, { backgroundColor: ARCADE_COLORS.bgCard, borderColor: ARCADE_COLORS.border }]}>
                <Pressable
                  onPress={() => toggleExpand(session.id)}>
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionDate}>
                      <ThemedText type="subtitle" style={[styles.dayNumber, { color: ARCADE_COLORS.textPrimary }]}>
                        {format(d, 'dd')}
                      </ThemedText>
                      <View>
                        <ThemedText type="smallBold" style={{ color: ARCADE_COLORS.textPrimary }}>{format(d, 'MMMM', { locale: ptBR })}</ThemedText>
                        <ThemedText type="small" style={{ color: ARCADE_COLORS.textSecondary }}>
                          {format(d, 'EEEE', { locale: ptBR })}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.sessionStats}>
                      <ThemedText type="smallBold" style={{ color: ARCADE_COLORS.textPrimary }}>{formatNumber(session.volume)} kg</ThemedText>
                      <ThemedText type="small" style={{ color: ARCADE_COLORS.textSecondary }}>
                        {formatNumber(session.reps)} reps · {formatNumber(session.cardio_minutes, session.cardio_minutes % 1 === 0 ? 0 : 1)} min cardio
                      </ThemedText>
                      <ThemedText type="code" style={{ color: ARCADE_COLORS.success, fontSize: 10, marginTop: 4 }}>
                        {progressPercent}% PROGRESSO
                      </ThemedText>
                    </View>
                  </View>
                </Pressable>

                {expanded && (
                  <View style={[styles.detail, { borderTopColor: ARCADE_COLORS.border }]}>
                    {loadingDetail && (
                      <ActivityIndicator color={theme.accent} style={{ marginVertical: 8 }} />
                    )}
                    {!loadingDetail && grouped && (
                      <>
                        {grouped.byExercise.map(([name, info]) => (
                          <View key={name} style={styles.exerciseBlock}>
                            <View style={styles.exerciseRow}>
                              <ThemedText type="smallBold" style={{ color: ARCADE_COLORS.textPrimary }}>{name}</ThemedText>
                              <ThemedText type="small" style={{ color: ARCADE_COLORS.textSecondary }}>
                                {info.series} séries · {formatNumber(info.volume)} kg
                              </ThemedText>
                            </View>
                            <ThemedText type="small" style={{ color: ARCADE_COLORS.textSecondary }}>
                              {info.rows.join('  ·  ')}
                            </ThemedText>
                            <ThemedView type="backgroundElement" style={[styles.progressTrack, { borderColor: ARCADE_COLORS.border }]}>
                              <ThemedView type="backgroundElement" style={[styles.progressFill, { width: `${Math.min(100, Math.round((info.volume / session.volume) * 100))}%` }]} />
                            </ThemedView>
                          </View>
                        ))}
                        {grouped.cardio.map((c) => (
                          <View key={c.name} style={styles.exerciseRow}>
                            <ThemedText type="smallBold" style={{ color: ARCADE_COLORS.textPrimary }}>⏱ {c.name}</ThemedText>
                            <ThemedText type="small" style={{ color: ARCADE_COLORS.textSecondary }}>
                              {formatNumber(c.minutes, c.minutes % 1 === 0 ? 0 : 1)} min
                            </ThemedText>
                          </View>
                        ))}
                      </>
                    )}
                    <Pressable
                      hitSlop={6}
                      onPress={() => {
                        setConfirmDelete({ id: session.id, date: session.date });
                      }}>
                      <ThemedText type="smallBold" style={{ color: theme.danger }}>
                        Apagar treino
                      </ThemedText>
                    </Pressable>
                  </View>
                )}
              </ThemedView>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={confirmDelete !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setConfirmDelete(null)} />
          <ThemedView type="backgroundElement" style={styles.modalCard}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Apagar treino?
            </ThemedText>
            <ThemedText type="small" style={styles.modalMessage}>
              O treino de{' '}
              <ThemedText type="smallBold">
                {confirmDelete ? format(strToDate(confirmDelete.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : ''}
              </ThemedText>{' '}
              será apagado permanentemente, junto com todas as séries e cardio registrados.
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setConfirmDelete(null);
                }}>
                <ThemedView type="backgroundSelected" style={styles.cancelButton}>
                  <ThemedText type="smallBold">Cancelar</ThemedText>
                </ThemedView>
              </Pressable>
              <Pressable
                style={styles.modalButton}
                onPress={() => {
                  if (!confirmDelete) return;
                  deleteSession(db, confirmDelete.id).then(() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    setExpandedId(null);
                    setSessionDetail(null);
                    setConfirmDelete(null);
                    sessions.reload();
                  });
                }}>
                <ThemedView style={[styles.deleteButton, { backgroundColor: theme.danger }]}>
                  <ThemedText type="smallBold" style={{ color: theme.accentInk, letterSpacing: 2 }}>
                    APAGAR
                  </ThemedText>
                </ThemedView>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>
      </ThemedView>
    </SwipeableTabs>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: 120,
    gap: Spacing.three,
  },
  subtitle: {
    color: '#A89C8F',
    marginTop: 2,
  },
  sessionCard: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
    backgroundColor: '#1A1631',
    borderWidth: 1,
    borderColor: 'rgba(124, 77, 255, 0.25)',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dayNumber: {
    fontSize: 30,
    lineHeight: 34,
    fontFamily: Fonts.monoBold,
    color: '#FFFFFF',
  },
  sessionStats: {
    alignItems: 'flex-end',
  },
  detail: {
    gap: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 77, 255, 0.25)',
    paddingTop: Spacing.two,
  },
  exerciseBlock: {
    gap: 2,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
    width: '100%',
  },
  progressFill: {
    height: 4,
    backgroundColor: ARCADE_COLORS.success,
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalTitle: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalMessage: {
    color: '#A89C8F',
    lineHeight: 21,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modalButton: {
    flex: 1,
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#FF4D4D',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});

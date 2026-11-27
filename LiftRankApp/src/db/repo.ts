import type { SQLiteDatabase } from 'expo-sqlite';

import { constantTimeEquals, hashPassword, verifyPassword } from './password';

export type ExerciseKind = 'strength' | 'cardio';

export interface Exercise {
  id: number;
  name: string;
  kind: ExerciseKind;
}

export interface PlanEntry {
  id: number;
  weekday: number;
  exercise_id: number;
  name: string;
  kind: ExerciseKind;
}

export interface SetEntry {
  id: number;
  exercise_id: number;
  exercise_name: string;
  weight: number;
  reps: number;
}

export interface CardioEntry {
  id: number;
  exercise_id: number;
  exercise_name: string;
  minutes: number;
}

export interface SessionSummary {
  id: number;
  date: string;
  volume: number;
  reps: number;
  cardio_minutes: number;
}

export interface Stats {
  volume: number;
  reps: number;
  cardioMinutes: number;
  sessions: number;
  perExercise: {
    name: string;
    series: number;
    volume: number;
    maxWeight: number;
  }[];
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export function todayStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dateToStr(date: Date) {
  return todayStr(date);
}

export function strToDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export async function listExercises(db: SQLiteDatabase): Promise<Exercise[]> {
  return db.getAllAsync<Exercise>('SELECT id, name, kind FROM exercises ORDER BY kind DESC, name COLLATE NOCASE ASC');
}

export async function createExercise(db: SQLiteDatabase, name: string, kind: ExerciseKind): Promise<number> {
  const result = await db.runAsync(
    'INSERT OR IGNORE INTO exercises (name, kind) VALUES (?, ?)',
    name.trim(),
    kind,
  );
  if (result.changes === 0) {
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM exercises WHERE name = ? COLLATE NOCASE',
      name.trim(),
    );
    return existing?.id ?? -1;
  }
  return result.lastInsertRowId;
}

export async function getPlan(db: SQLiteDatabase, weekday: number, userId = 1): Promise<PlanEntry[]> {
  return db.getAllAsync<PlanEntry>(
    `SELECT p.id, p.weekday, p.exercise_id, e.name, e.kind
     FROM plan p JOIN exercises e ON e.id = p.exercise_id
     WHERE p.weekday = ? AND p.user_id = ?
     ORDER BY e.kind DESC, e.name COLLATE NOCASE ASC`,
    weekday,
    userId,
  );
}

export async function addToPlan(
  db: SQLiteDatabase,
  weekday: number,
  exerciseId: number,
  userId = 1,
): Promise<boolean> {
  const result = await db.runAsync(
    'INSERT OR IGNORE INTO plan (user_id, weekday, exercise_id) VALUES (?, ?, ?)',
    userId,
    weekday,
    exerciseId,
  );
  return result.changes > 0;
}

export async function removeFromPlan(db: SQLiteDatabase, planId: number) {
  await db.runAsync('DELETE FROM plan WHERE id = ?', planId);
}

/** Item do rascunho de um dia: `planId` é `null` quando ainda não foi salvo. */
export interface PlanDraftItem {
  planId: number | null;
  exercise_id: number;
}

export interface PlanChanges {
  removedPlanIds: number[];
  addedExerciseIds: number[];
}

/** Calcula o que precisa ser removido/inserido para o rascunho virar o plano salvo. */
export function planDiff(original: PlanDraftItem[], draft: PlanDraftItem[]): PlanChanges {
  const draftPlanIds = new Set(
    draft.map((item) => item.planId).filter((id): id is number => id !== null),
  );
  const removedPlanIds = original
    .map((item) => item.planId)
    .filter((id): id is number => id !== null && !draftPlanIds.has(id));

  // Só consideramos "já presente" o exercício cuja linha continua no rascunho;
  // remover e re-adicionar o mesmo exercício precisa de um INSERT novo.
  const keptExerciseIds = new Set(
    original
      .filter((item) => item.planId !== null && draftPlanIds.has(item.planId))
      .map((item) => item.exercise_id),
  );
  const addedExerciseIds = [
    ...new Set(
      draft
        .filter((item) => item.planId === null)
        .map((item) => item.exercise_id)
        .filter((id) => !keptExerciseIds.has(id)),
    ),
  ];

  return { removedPlanIds, addedExerciseIds };
}

export interface PlanDayChanges {
  weekday: number;
  changes: PlanChanges;
}

export interface PlanDaySnapshot {
  weekday: number;
  exerciseIds: number[];
}

/**
 * Compara o estado esperado com o que realmente ficou gravado no banco.
 * Retorna os dias divergentes — útil para não descartar mudanças em silêncio.
 */
export function findUnsavedWeekdays(
  expected: PlanDaySnapshot[],
  actual: PlanDaySnapshot[],
): number[] {
  const actualByDay = new Map(
    actual.map((day) => [day.weekday, new Set(day.exerciseIds)]),
  );

  return expected
    .filter((day) => {
      const saved = actualByDay.get(day.weekday);
      const expectedIds = new Set(day.exerciseIds);
      if (!saved || saved.size !== expectedIds.size) return true;
      return [...expectedIds].some((exerciseId) => !saved.has(exerciseId));
    })
    .map((day) => day.weekday);
}

/** Aplica as mudanças de vários dias em uma única transação. */
export async function savePlanChanges(
  db: SQLiteDatabase,
  days: PlanDayChanges[],
  userId = 1,
): Promise<void> {
  const pending = days.filter(
    (day) =>
      day.changes.removedPlanIds.length > 0 || day.changes.addedExerciseIds.length > 0,
  );
  if (pending.length === 0) return;

  await db.withExclusiveTransactionAsync(async (txn) => {
    const expected: PlanDaySnapshot[] = [];

    for (const { weekday, changes } of pending) {
      const before = await txn.getAllAsync<{ id: number; exercise_id: number }>(
        'SELECT id, exercise_id FROM plan WHERE user_id = ? AND weekday = ?',
        userId,
        weekday,
      );
      const expectedIds = new Set(before.map((row) => row.exercise_id));
      for (const planId of changes.removedPlanIds) {
        const row = before.find((entry) => entry.id === planId);
        if (row) expectedIds.delete(row.exercise_id);
      }
      for (const exerciseId of changes.addedExerciseIds) {
        expectedIds.add(exerciseId);
      }

      for (const planId of changes.removedPlanIds) {
        await removeFromPlan(txn, planId);
      }
      for (const exerciseId of changes.addedExerciseIds) {
        await addToPlan(txn, weekday, exerciseId, userId);
      }

      expected.push({ weekday, exerciseIds: [...expectedIds] });
    }

    // Confere dentro da transação: se alguma constraint antiga bloquear um
    // INSERT, a transação inteira é desfeita e o rascunho permanece na tela.
    const actual: PlanDaySnapshot[] = [];
    for (const { weekday } of pending) {
      const rows = await txn.getAllAsync<{ exercise_id: number }>(
        'SELECT exercise_id FROM plan WHERE user_id = ? AND weekday = ?',
        userId,
        weekday,
      );
      actual.push({ weekday, exerciseIds: rows.map((row) => row.exercise_id) });
    }

    const failed = findUnsavedWeekdays(expected, actual);
    if (failed.length > 0) {
      throw new Error(
        `O plano não foi gravado por completo (dias: ${failed.join(', ')}).`,
      );
    }
  });
}

async function getOrCreateSessionId(db: SQLiteDatabase, date: string, userId = 1): Promise<number> {
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM sessions WHERE date = ? AND user_id = ?',
    date,
    userId,
  );
  if (existing) return existing.id;
  const result = await db.runAsync(
    'INSERT INTO sessions (user_id, date, created_at) VALUES (?, ?, ?)',
    userId,
    date,
    Date.now(),
  );
  return result.lastInsertRowId;
}

export async function addSet(
  db: SQLiteDatabase,
  date: string,
  exerciseId: number,
  weight: number,
  reps: number,
  userId = 1,
) {
  await db.withTransactionAsync(async () => {
    const sessionId = await getOrCreateSessionId(db, date, userId);
    await db.runAsync(
      'INSERT INTO sets (session_id, exercise_id, weight, reps, created_at) VALUES (?, ?, ?, ?, ?)',
      sessionId,
      exerciseId,
      weight,
      reps,
      Date.now(),
    );
  });
}

export async function addCardio(db: SQLiteDatabase, date: string, exerciseId: number, minutes: number, userId = 1) {
  await db.withTransactionAsync(async () => {
    const sessionId = await getOrCreateSessionId(db, date, userId);
    await db.runAsync(
      'INSERT INTO cardio (session_id, exercise_id, minutes, created_at) VALUES (?, ?, ?, ?)',
      sessionId,
      exerciseId,
      minutes,
      Date.now(),
    );
  });
}

export async function getSetsForDay(db: SQLiteDatabase, date: string, userId = 1): Promise<SetEntry[]> {
  return db.getAllAsync<SetEntry>(
    `SELECT s.id, s.exercise_id, e.name AS exercise_name, s.weight, s.reps
     FROM sets s JOIN exercises e ON e.id = s.exercise_id
     WHERE s.session_id = (SELECT id FROM sessions WHERE date = ? AND user_id = ?)
     ORDER BY s.created_at ASC`,
    date,
    userId,
  );
}

export async function getCardioForDay(db: SQLiteDatabase, date: string, userId = 1): Promise<CardioEntry[]> {
  return db.getAllAsync<CardioEntry>(
    `SELECT c.id, c.exercise_id, e.name AS exercise_name, c.minutes
     FROM cardio c JOIN exercises e ON e.id = c.exercise_id
     WHERE c.session_id = (SELECT id FROM sessions WHERE date = ? AND user_id = ?)
     ORDER BY c.created_at ASC`,
    date,
    userId,
  );
}

export async function deleteSet(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM sets WHERE id = ?', id);
}

export async function deleteCardio(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM cardio WHERE id = ?', id);
}

export async function getLastSet(db: SQLiteDatabase, exerciseId: number, userId = 1) {
  return db.getFirstAsync<{ weight: number; reps: number }>(
    `SELECT s.weight, s.reps FROM sets s
     JOIN sessions se ON se.id = s.session_id
     WHERE s.exercise_id = ? AND se.user_id = ?
     ORDER BY s.created_at DESC LIMIT 1`,
    exerciseId,
    userId,
  );
}

export async function getSessions(db: SQLiteDatabase, userId = 1): Promise<SessionSummary[]> {
  return db.getAllAsync<SessionSummary>(
    `SELECT s.id, s.date,
       COALESCE((SELECT SUM(weight * reps) FROM sets WHERE session_id = s.id), 0) AS volume,
       COALESCE((SELECT SUM(reps) FROM sets WHERE session_id = s.id), 0) AS reps,
       COALESCE((SELECT SUM(minutes) FROM cardio WHERE session_id = s.id), 0) AS cardio_minutes
     FROM sessions s
     WHERE s.user_id = ?
     ORDER BY s.date DESC`,
    userId,
  );
}

export interface SessionDetail {
  sets: SetEntry[];
  cardio: CardioEntry[];
}

export async function getSessionDetail(db: SQLiteDatabase, sessionId: number): Promise<SessionDetail> {
  const sets = await db.getAllAsync<SetEntry>(
    `SELECT s.id, s.exercise_id, e.name AS exercise_name, s.weight, s.reps
     FROM sets s JOIN exercises e ON e.id = s.exercise_id
     WHERE s.session_id = ?
     ORDER BY s.created_at ASC`,
    sessionId,
  );
  const cardio = await db.getAllAsync<CardioEntry>(
    `SELECT c.id, c.exercise_id, e.name AS exercise_name, c.minutes
     FROM cardio c JOIN exercises e ON e.id = c.exercise_id
     WHERE c.session_id = ?
     ORDER BY c.created_at ASC`,
    sessionId,
  );
  return { sets, cardio };
}

export async function deleteSession(db: SQLiteDatabase, sessionId: number) {
  await db.runAsync('DELETE FROM sessions WHERE id = ?', sessionId);
}

export async function getStats(db: SQLiteDatabase, fromDate: string | null, userId = 1): Promise<Stats> {
  const params = [fromDate, fromDate, userId];
  const totals = await db.getFirstAsync<{ volume: number; reps: number }>(
    `SELECT COALESCE(SUM(s.weight * s.reps), 0) AS volume, COALESCE(SUM(s.reps), 0) AS reps
     FROM sets s JOIN sessions se ON se.id = s.session_id
     WHERE (? IS NULL OR se.date >= ?) AND se.user_id = ?`,
    params,
  );
  const cardio = await db.getFirstAsync<{ minutes: number }>(
    `SELECT COALESCE(SUM(c.minutes), 0) AS minutes
     FROM cardio c JOIN sessions se ON se.id = c.session_id
     WHERE (? IS NULL OR se.date >= ?) AND se.user_id = ?`,
    params,
  );
  const sessionCount = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM sessions WHERE (? IS NULL OR date >= ?) AND user_id = ?',
    params,
  );
  const perExercise = await db.getAllAsync<{
    name: string;
    series: number;
    volume: number;
    maxWeight: number;
  }>(
    `SELECT e.name, COUNT(*) AS series,
        COALESCE(SUM(s.weight * s.reps), 0) AS volume,
        MAX(s.weight) AS maxWeight
      FROM sets s
      JOIN sessions se ON se.id = s.session_id
      JOIN exercises e ON e.id = s.exercise_id
      WHERE (? IS NULL OR se.date >= ?) AND se.user_id = ?
      GROUP BY e.id
      ORDER BY volume DESC`,
    params,
  );

  return {
    volume: totals?.volume ?? 0,
    reps: totals?.reps ?? 0,
    cardioMinutes: cardio?.minutes ?? 0,
    sessions: sessionCount?.n ?? 0,
    perExercise,
  };
}

export interface DailyVolume {
  date: string;
  volume: number;
}

export async function getDailyVolume(db: SQLiteDatabase, fromDate: string, toDate: string, userId = 1): Promise<DailyVolume[]> {
  return db.getAllAsync<DailyVolume>(
    `SELECT se.date, COALESCE(SUM(s.weight * s.reps), 0) AS volume
     FROM sessions se
     LEFT JOIN sets s ON s.session_id = se.id
     WHERE se.date BETWEEN ? AND ? AND se.user_id = ?
     GROUP BY se.date`,
    fromDate,
    toDate,
    userId,
  );
}

export interface WeeklySummary {
  workouts: number;
  plannedDays: number;
  /** Percentual 0–100 de dias treinados sobre os dias planejados (fallback: 7 dias). */
  consistency: number;
  /** Variação percentual de volume vs semana anterior; `null` quando não há base. */
  strengthDelta: number | null;
}

export function computeWeeklySummary({
  trainedDays,
  plannedDays,
  currentVolume,
  previousVolume,
}: {
  trainedDays: number;
  plannedDays: number;
  currentVolume: number;
  previousVolume: number;
}): WeeklySummary {
  const goal = plannedDays > 0 ? plannedDays : 7;
  const consistency = Math.min(Math.round((trainedDays / goal) * 100), 100);
  const strengthDelta =
    previousVolume > 0
      ? Math.round(((currentVolume - previousVolume) / previousVolume) * 100)
      : null;

  return { workouts: trainedDays, plannedDays, consistency, strengthDelta };
}

export async function getWeeklySummary(
  db: SQLiteDatabase,
  weekStart: string,
  userId = 1,
): Promise<WeeklySummary> {
  const start = strToDate(weekStart);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const previousStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 7);
  const previousEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);

  const [trained, planned, current, previous] = await Promise.all([
    db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(DISTINCT date) AS n FROM sessions WHERE date BETWEEN ? AND ? AND user_id = ?',
      todayStr(start),
      todayStr(end),
      userId,
    ),
    db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(DISTINCT weekday) AS n FROM plan WHERE user_id = ?',
      userId,
    ),
    db.getFirstAsync<{ v: number }>(
      `SELECT COALESCE(SUM(s.weight * s.reps), 0) AS v
       FROM sets s JOIN sessions se ON se.id = s.session_id
       WHERE se.date BETWEEN ? AND ? AND se.user_id = ?`,
      todayStr(start),
      todayStr(end),
      userId,
    ),
    db.getFirstAsync<{ v: number }>(
      `SELECT COALESCE(SUM(s.weight * s.reps), 0) AS v
       FROM sets s JOIN sessions se ON se.id = s.session_id
       WHERE se.date BETWEEN ? AND ? AND se.user_id = ?`,
      todayStr(previousStart),
      todayStr(previousEnd),
      userId,
    ),
  ]);

  return computeWeeklySummary({
    trainedDays: trained?.n ?? 0,
    plannedDays: planned?.n ?? 0,
    currentVolume: current?.v ?? 0,
    previousVolume: previous?.v ?? 0,
  });
}

export async function registerUser(
  db: SQLiteDatabase,
  name: string,
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string; userId?: number }> {
  try {
    const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM users WHERE email = ? COLLATE NOCASE', email.trim());
    if (existing) {
      return { success: false, error: 'E-mail já cadastrado.' };
    }
    const { hash, salt, algo } = await hashPassword(password);
    const result = await db.runAsync(
      `INSERT INTO users (name, email, password, password_hash, password_salt, password_algo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      name.trim(),
      email.trim().toLowerCase(),
      '',
      hash,
      salt,
      algo,
      Date.now(),
    );
    return { success: true, userId: result.lastInsertRowId };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Erro ao cadastrar usuário.' };
  }
}

export async function loginUser(
  db: SQLiteDatabase,
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const user = await db.getFirstAsync<
      User & {
        password: string;
        password_hash: string;
        password_salt: string;
        password_algo: string;
      }
    >(
      `SELECT id, name, email, password, password_hash, password_salt, password_algo
       FROM users WHERE email = ? COLLATE NOCASE`,
      email.trim().toLowerCase(),
    );
    if (!user) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    let valid = false;
    if (user.password_hash) {
      valid = await verifyPassword(password, {
        hash: user.password_hash,
        salt: user.password_salt,
        algo: user.password_algo,
      });
    } else if (user.password) {
      // Conta legada que ainda não passou pela migração de hash.
      valid = constantTimeEquals(user.password, password);
      if (valid) {
        const upgraded = await hashPassword(password);
        await db.runAsync(
          `UPDATE users SET password_hash = ?, password_salt = ?, password_algo = ?, password = ''
           WHERE id = ?`,
          upgraded.hash,
          upgraded.salt,
          upgraded.algo,
          user.id,
        );
      }
    }

    if (!valid) {
      return { success: false, error: 'Senha incorreta.' };
    }
    return {
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
    };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Erro ao realizar login.' };
  }
}

export async function resetPassword(
  db: SQLiteDatabase,
  email: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM users WHERE email = ? COLLATE NOCASE',
      email.trim().toLowerCase(),
    );
    if (!user) {
      return { success: false, error: 'Nenhuma conta encontrada com este e-mail.' };
    }
    const { hash, salt, algo } = await hashPassword(newPassword);
    await db.runAsync(
      `UPDATE users SET password_hash = ?, password_salt = ?, password_algo = ?, password = ''
       WHERE id = ?`,
      hash,
      salt,
      algo,
      user.id,
    );
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Erro ao redefinir a senha.' };
  }
}

export async function getMaxWeightForExercise(db: SQLiteDatabase, exerciseId: number, userId = 1): Promise<number> {
  const result = await db.getFirstAsync<{ maxWeight: number | null }>(
    `SELECT MAX(s.weight) AS maxWeight FROM sets s
     JOIN sessions se ON se.id = s.session_id
     WHERE s.exercise_id = ? AND se.user_id = ?`,
    exerciseId,
    userId,
  );
  return result?.maxWeight ?? 0;
}

export interface ExerciseProgression {
  date: string;
  maxWeight: number;
  totalVolume: number;
}

export async function getExerciseProgression(
  db: SQLiteDatabase,
  exerciseId: number,
  userId = 1,
): Promise<ExerciseProgression[]> {
  return db.getAllAsync<ExerciseProgression>(
    `SELECT se.date, MAX(s.weight) AS maxWeight, SUM(s.weight * s.reps) AS totalVolume
     FROM sets s
     JOIN sessions se ON se.id = s.session_id
     WHERE s.exercise_id = ? AND se.user_id = ?
     GROUP BY se.date
     ORDER BY se.date ASC`,
    exerciseId,
    userId,
  );
}

export async function exportDatabaseBackup(db: SQLiteDatabase, userId = 1): Promise<string> {
  const exercises = await db.getAllAsync('SELECT * FROM exercises');
  const plan = await db.getAllAsync('SELECT * FROM plan WHERE user_id = ?', userId);
  const sessions = await db.getAllAsync('SELECT * FROM sessions WHERE user_id = ?', userId);
  const sets = await db.getAllAsync(
    `SELECT s.* FROM sets s JOIN sessions se ON se.id = s.session_id WHERE se.user_id = ?`,
    userId,
  );
  const cardio = await db.getAllAsync(
    `SELECT c.* FROM cardio c JOIN sessions se ON se.id = c.session_id WHERE se.user_id = ?`,
    userId,
  );
  const users = await db.getAllAsync('SELECT id, name, email, created_at FROM users WHERE id = ?', userId);

  const backup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      exercises,
      plan,
      sessions,
      sets,
      cardio,
      users,
    },
  };

  return JSON.stringify(backup, null, 2);
}

export async function exportWorkoutsCsv(db: SQLiteDatabase, userId = 1): Promise<string> {
  const setsData = await db.getAllAsync<{
    date: string;
    exercise_name: string;
    kind: string;
    weight: number;
    reps: number;
  }>(
    `SELECT se.date, e.name AS exercise_name, e.kind, s.weight, s.reps
     FROM sets s
     JOIN sessions se ON se.id = s.session_id
     JOIN exercises e ON e.id = s.exercise_id
     WHERE se.user_id = ?
     ORDER BY se.date DESC, s.created_at ASC`,
    userId,
  );

  const cardioData = await db.getAllAsync<{
    date: string;
    exercise_name: string;
    kind: string;
    minutes: number;
  }>(
    `SELECT se.date, e.name AS exercise_name, e.kind, c.minutes
     FROM cardio c
     JOIN sessions se ON se.id = c.session_id
     JOIN exercises e ON e.id = c.exercise_id
     WHERE se.user_id = ?
     ORDER BY se.date DESC, c.created_at ASC`,
    userId,
  );

  const rows = ['Data,Exercício,Tipo,Peso (kg),Repetições,Duração (min)'];

  for (const row of setsData) {
    rows.push(`"${row.date}","${row.exercise_name}","${row.kind}",${row.weight},${row.reps},`);
  }

  for (const row of cardioData) {
    rows.push(`"${row.date}","${row.exercise_name}","${row.kind}",,,${row.minutes}`);
  }

  return rows.join('\n');
}

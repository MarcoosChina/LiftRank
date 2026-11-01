import type { SQLiteDatabase } from 'expo-sqlite';

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

export async function getPlan(db: SQLiteDatabase, weekday: number): Promise<PlanEntry[]> {
  return db.getAllAsync<PlanEntry>(
    `SELECT p.id, p.weekday, p.exercise_id, e.name, e.kind
     FROM plan p JOIN exercises e ON e.id = p.exercise_id
     WHERE p.weekday = ?
     ORDER BY e.kind DESC, e.name COLLATE NOCASE ASC`,
    weekday,
  );
}

export async function addToPlan(db: SQLiteDatabase, weekday: number, exerciseId: number) {
  await db.runAsync('INSERT OR IGNORE INTO plan (weekday, exercise_id) VALUES (?, ?)', weekday, exerciseId);
}

export async function removeFromPlan(db: SQLiteDatabase, planId: number) {
  await db.runAsync('DELETE FROM plan WHERE id = ?', planId);
}

async function getOrCreateSessionId(db: SQLiteDatabase, date: string): Promise<number> {
  const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM sessions WHERE date = ?', date);
  if (existing) return existing.id;
  const result = await db.runAsync('INSERT INTO sessions (date, created_at) VALUES (?, ?)', date, Date.now());
  return result.lastInsertRowId;
}

export async function addSet(
  db: SQLiteDatabase,
  date: string,
  exerciseId: number,
  weight: number,
  reps: number,
) {
  await db.withTransactionAsync(async () => {
    const sessionId = await getOrCreateSessionId(db, date);
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

export async function addCardio(db: SQLiteDatabase, date: string, exerciseId: number, minutes: number) {
  await db.withTransactionAsync(async () => {
    const sessionId = await getOrCreateSessionId(db, date);
    await db.runAsync(
      'INSERT INTO cardio (session_id, exercise_id, minutes, created_at) VALUES (?, ?, ?, ?)',
      sessionId,
      exerciseId,
      minutes,
      Date.now(),
    );
  });
}

export async function getSetsForDay(db: SQLiteDatabase, date: string): Promise<SetEntry[]> {
  return db.getAllAsync<SetEntry>(
    `SELECT s.id, s.exercise_id, e.name AS exercise_name, s.weight, s.reps
     FROM sets s JOIN exercises e ON e.id = s.exercise_id
     WHERE s.session_id = (SELECT id FROM sessions WHERE date = ?)
     ORDER BY s.created_at ASC`,
    date,
  );
}

export async function getCardioForDay(db: SQLiteDatabase, date: string): Promise<CardioEntry[]> {
  return db.getAllAsync<CardioEntry>(
    `SELECT c.id, c.exercise_id, e.name AS exercise_name, c.minutes
     FROM cardio c JOIN exercises e ON e.id = c.exercise_id
     WHERE c.session_id = (SELECT id FROM sessions WHERE date = ?)
     ORDER BY c.created_at ASC`,
    date,
  );
}

export async function deleteSet(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM sets WHERE id = ?', id);
}

export async function deleteCardio(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM cardio WHERE id = ?', id);
}

export async function getLastSet(db: SQLiteDatabase, exerciseId: number) {
  return db.getFirstAsync<{ weight: number; reps: number }>(
    'SELECT weight, reps FROM sets WHERE exercise_id = ? ORDER BY created_at DESC LIMIT 1',
    exerciseId,
  );
}

export async function getSessions(db: SQLiteDatabase): Promise<SessionSummary[]> {
  return db.getAllAsync<SessionSummary>(
    `SELECT s.id, s.date,
       COALESCE((SELECT SUM(weight * reps) FROM sets WHERE session_id = s.id), 0) AS volume,
       COALESCE((SELECT SUM(reps) FROM sets WHERE session_id = s.id), 0) AS reps,
       COALESCE((SELECT SUM(minutes) FROM cardio WHERE session_id = s.id), 0) AS cardio_minutes
     FROM sessions s
     ORDER BY s.date DESC`,
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

export async function getStats(db: SQLiteDatabase, fromDate: string | null): Promise<Stats> {
  const params = [fromDate, fromDate];
  const totals = await db.getFirstAsync<{ volume: number; reps: number }>(
    `SELECT COALESCE(SUM(s.weight * s.reps), 0) AS volume, COALESCE(SUM(s.reps), 0) AS reps
     FROM sets s JOIN sessions se ON se.id = s.session_id
     WHERE (? IS NULL OR se.date >= ?)`,
    params,
  );
  const cardio = await db.getFirstAsync<{ minutes: number }>(
    `SELECT COALESCE(SUM(c.minutes), 0) AS minutes
     FROM cardio c JOIN sessions se ON se.id = c.session_id
     WHERE (? IS NULL OR se.date >= ?)`,
    params,
  );
  const sessionCount = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM sessions WHERE (? IS NULL OR date >= ?)',
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
      WHERE (? IS NULL OR se.date >= ?)
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

export async function getDailyVolume(db: SQLiteDatabase, fromDate: string, toDate: string): Promise<DailyVolume[]> {
  return db.getAllAsync<DailyVolume>(
    `SELECT se.date, COALESCE(SUM(s.weight * s.reps), 0) AS volume
     FROM sessions se
     LEFT JOIN sets s ON s.session_id = se.id
     WHERE se.date BETWEEN ? AND ?
     GROUP BY se.date`,
    fromDate,
    toDate,
  );
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
    const result = await db.runAsync(
      'INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, ?)',
      name.trim(),
      email.trim().toLowerCase(),
      password,
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
    const user = await db.getFirstAsync<User & { password: string }>(
      'SELECT id, name, email, password FROM users WHERE email = ? COLLATE NOCASE',
      email.trim().toLowerCase(),
    );
    if (!user) {
      return { success: false, error: 'Usuário não encontrado.' };
    }
    if (user.password !== password) {
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

export async function getMaxWeightForExercise(db: SQLiteDatabase, exerciseId: number): Promise<number> {
  const result = await db.getFirstAsync<{ maxWeight: number | null }>(
    'SELECT MAX(weight) AS maxWeight FROM sets WHERE exercise_id = ?',
    exerciseId,
  );
  return result?.maxWeight ?? 0;
}

export async function exportDatabaseBackup(db: SQLiteDatabase): Promise<string> {
  const exercises = await db.getAllAsync('SELECT * FROM exercises');
  const plan = await db.getAllAsync('SELECT * FROM plan');
  const sessions = await db.getAllAsync('SELECT * FROM sessions');
  const sets = await db.getAllAsync('SELECT * FROM sets');
  const cardio = await db.getAllAsync('SELECT * FROM cardio');
  const users = await db.getAllAsync('SELECT id, name, email, created_at FROM users');

  const backup = {
    version: 1,
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

export async function exportWorkoutsCsv(db: SQLiteDatabase): Promise<string> {
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
     ORDER BY se.date DESC, s.created_at ASC`,
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
     ORDER BY se.date DESC, c.created_at ASC`,
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

export interface ExerciseProgression {
  date: string;
  maxWeight: number;
  totalVolume: number;
}

export async function getExerciseProgression(
  db: SQLiteDatabase,
  exerciseId: number,
): Promise<ExerciseProgression[]> {
  return db.getAllAsync<ExerciseProgression>(
    `SELECT se.date, MAX(s.weight) AS maxWeight, SUM(s.weight * s.reps) AS totalVolume
     FROM sets s
     JOIN sessions se ON se.id = s.session_id
     WHERE s.exercise_id = ?
     GROUP BY se.date
     ORDER BY se.date ASC`,
    exerciseId,
  );
}

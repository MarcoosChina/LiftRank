import type { SQLiteDatabase } from 'expo-sqlite';

const SEED_EXERCISES: [string, 'strength' | 'cardio'][] = [
  ['Supino Reto', 'strength'],
  ['Supino Inclinado', 'strength'],
  ['Crucifixo', 'strength'],
  ['Desenvolvimento', 'strength'],
  ['Elevação Lateral', 'strength'],
  ['Rosca Direta', 'strength'],
  ['Rosca Alternada', 'strength'],
  ['Rosca Martelo', 'strength'],
  ['Tríceps Corda', 'strength'],
  ['Tríceps Testa', 'strength'],
  ['Tríceps Francês', 'strength'],
  ['Puxada Frontal', 'strength'],
  ['Remada Curvada', 'strength'],
  ['Remada Baixa', 'strength'],
  ['Levantamento Terra', 'strength'],
  ['Agachamento Livre', 'strength'],
  ['Leg Press', 'strength'],
  ['Cadeira Extensora', 'strength'],
  ['Cadeira Flexora', 'strength'],
  ['Panturrilha em Pé', 'strength'],
  ['Abdominal', 'strength'],
  ['Esteira', 'cardio'],
  ['Bike', 'cardio'],
  ['Elíptico', 'cardio'],
  ['Escada', 'cardio'],
  ['Remo', 'cardio'],
  ['Pular Corda', 'cardio'],
];

const DATABASE_VERSION = 2;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        kind TEXT NOT NULL DEFAULT 'strength' CHECK (kind IN ('strength', 'cardio'))
      );

      CREATE TABLE IF NOT EXISTS plan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
        exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        UNIQUE (weekday, exercise_id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        weight REAL NOT NULL,
        reps INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cardio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        minutes REAL NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sets_session ON sets(session_id);
      CREATE INDEX IF NOT EXISTS idx_cardio_session ON cardio(session_id);
    `);

    const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM exercises');
    if ((count?.n ?? 0) === 0) {
      for (const [name, kind] of SEED_EXERCISES) {
        await db.runAsync('INSERT OR IGNORE INTO exercises (name, kind) VALUES (?, ?)', name, kind);
      }
    }

    currentDbVersion = 1;
  }

  if (currentDbVersion === 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
    currentDbVersion = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

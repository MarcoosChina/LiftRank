import type { SQLiteDatabase } from 'expo-sqlite';

import { hashPassword } from './password';

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

const DATABASE_VERSION = 5;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    await logSchemaDiagnostics(db);
    return;
  }

  if (currentDbVersion < 1) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        kind TEXT NOT NULL DEFAULT 'strength' CHECK (kind IN ('strength', 'cardio'))
      );

      CREATE TABLE IF NOT EXISTS plan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
        weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
        exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        UNIQUE (user_id, weekday, exercise_id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE (user_id, date)
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

      CREATE INDEX IF NOT EXISTS idx_sets_session ON sets(session_id);
      CREATE INDEX IF NOT EXISTS idx_cardio_session ON cardio(session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_plan_user ON plan(user_id);
    `);

    const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM exercises');
    if ((count?.n ?? 0) === 0) {
      for (const [name, kind] of SEED_EXERCISES) {
        await db.runAsync('INSERT OR IGNORE INTO exercises (name, kind) VALUES (?, ?)', name, kind);
      }
    }

    currentDbVersion = 1;
  }

  if (currentDbVersion < 2) {
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

  if (currentDbVersion < 3) {
    const tableInfoPlan = await db.getAllAsync<{ name: string }>('PRAGMA table_info(plan)');
    const hasUserIdPlan = tableInfoPlan.some((col) => col.name === 'user_id');

    if (!hasUserIdPlan) {
      await db.execAsync(`
        ALTER TABLE plan ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;
        CREATE INDEX IF NOT EXISTS idx_plan_user ON plan(user_id);
      `);
    }

    const tableInfoSessions = await db.getAllAsync<{ name: string }>('PRAGMA table_info(sessions)');
    const hasUserIdSessions = tableInfoSessions.some((col) => col.name === 'user_id');

    if (!hasUserIdSessions) {
      await db.execAsync(`
        ALTER TABLE sessions ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      `);
    }

    currentDbVersion = 3;
  }

  if (currentDbVersion < 4) {
    const tableInfoUsers = await db.getAllAsync<{ name: string }>('PRAGMA table_info(users)');
    const userColumns = new Set(tableInfoUsers.map((col) => col.name));

    const hashColumns: [string, string][] = [
      ['password_hash', "TEXT NOT NULL DEFAULT ''"],
      ['password_salt', "TEXT NOT NULL DEFAULT ''"],
      ['password_algo', "TEXT NOT NULL DEFAULT ''"],
    ];
    for (const [name, definition] of hashColumns) {
      if (!userColumns.has(name)) {
        await db.execAsync(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
      }
    }

    // Migra contas antigas de senha em texto puro para hash + salt.
    // A coluna legada `password` é mantida (vazia) por compatibilidade.
    const legacyUsers = await db.getAllAsync<{ id: number; password: string }>(
      "SELECT id, password FROM users WHERE password <> ''",
    );
    for (const user of legacyUsers) {
      const { hash, salt, algo } = await hashPassword(user.password);
      await db.runAsync(
        `UPDATE users SET password_hash = ?, password_salt = ?, password_algo = ?, password = ''
         WHERE id = ?`,
        hash,
        salt,
        algo,
        user.id,
      );
    }

    currentDbVersion = 4;
  }

  if (currentDbVersion < 5) {
    await rebuildPlanAndSessions(db);
    currentDbVersion = 5;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  await logSchemaDiagnostics(db);
}

/**
 * v5: bancos criados antes do multi-usuário (T2.3) mantêm as constraints
 * `UNIQUE (weekday, exercise_id)` em `plan` e `UNIQUE (date)` em `sessions`,
 * porque a migração v3 apenas adicionou a coluna `user_id` via `ALTER TABLE`.
 * Essas constraints ignoram o usuário e fazem o `INSERT OR IGNORE` descartar
 * silenciosamente exercícios de outra conta. Reconstruímos as tabelas
 * preservando ids e dados (os `sets`/`cardio` continuam apontando para os
 * mesmos `session_id`).
 */
async function rebuildPlanAndSessions(db: SQLiteDatabase) {
  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('plan', 'sessions')",
  );
  const existing = new Set(tables.map((table) => table.name));
  if (!existing.has('plan') || !existing.has('sessions')) return;

  // `PRAGMA foreign_keys` só tem efeito fora de uma transação.
  await db.execAsync('PRAGMA foreign_keys = OFF');
  try {
    await db.execAsync(`
      BEGIN;

      CREATE TABLE plan_v5 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
        weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
        exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        UNIQUE (user_id, weekday, exercise_id)
      );

      INSERT OR IGNORE INTO plan_v5 (id, user_id, weekday, exercise_id)
        SELECT id, COALESCE(user_id, 1), weekday, exercise_id FROM plan;

      DROP TABLE plan;
      ALTER TABLE plan_v5 RENAME TO plan;
      CREATE INDEX IF NOT EXISTS idx_plan_user ON plan(user_id);

      CREATE TABLE sessions_v5 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE (user_id, date)
      );

      INSERT OR IGNORE INTO sessions_v5 (id, user_id, date, created_at)
        SELECT id, COALESCE(user_id, 1), date, created_at FROM sessions;

      DROP TABLE sessions;
      ALTER TABLE sessions_v5 RENAME TO sessions;
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

      COMMIT;
    `);
  } catch (error) {
    try {
      await db.execAsync('ROLLBACK');
    } catch {
      // SQLite pode já ter desfeito a transação.
    }
    throw error;
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON');
  }
}

/** Loga o schema real em desenvolvimento para confirmar as constraints únicas. */
async function logSchemaDiagnostics(db: SQLiteDatabase) {
  if (!__DEV__) return;

  const rows = await db.getAllAsync<{ name: string; sql: string }>(
    "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name IN ('plan', 'sessions')",
  );
  for (const row of rows) {
    console.log(`[db] schema ${row.name}: ${row.sql}`);
  }

  const planSql = rows.find((row) => row.name === 'plan')?.sql ?? '';
  const sessionsSql = rows.find((row) => row.name === 'sessions')?.sql ?? '';
  const legacyPlan = /UNIQUE\s*\(\s*weekday\s*,\s*exercise_id\s*\)/i.test(planSql);
  const legacySessions = /UNIQUE\s*\(\s*date\s*\)/i.test(sessionsSql);

  if (legacyPlan || legacySessions) {
    console.warn('[db] constraints legadas ainda presentes', { legacyPlan, legacySessions });
  }
}

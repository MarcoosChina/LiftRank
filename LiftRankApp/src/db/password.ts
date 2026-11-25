import {
  CryptoDigestAlgorithm,
  CryptoEncoding,
  digestStringAsync,
  getRandomBytesAsync,
} from 'expo-crypto';

/**
 * Versionamento do algoritmo de hash. Novos formatos devem usar um novo
 * identificador para permitir rehash transparente no login.
 */
export const PASSWORD_ALGO = 'sha256-salt-v1';

/** 16 bytes de salt aleatório (32 caracteres em hex). */
export const SALT_BYTES = 16;

export interface PasswordHash {
  hash: string;
  salt: string;
  algo: string;
}

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, '0');
  }
  return out;
}

export async function generateSalt(): Promise<string> {
  const bytes = await getRandomBytesAsync(SALT_BYTES);
  return toHex(bytes);
}

function digest(algo: string, salt: string, password: string): Promise<string> {
  return digestStringAsync(
    CryptoDigestAlgorithm.SHA256,
    `${algo}:${salt}:${password}`,
    { encoding: CryptoEncoding.HEX },
  );
}

/**
 * Gera o hash de uma senha. Sem salt informado, um salt novo é criado —
 * necessário em cadastro e em troca de senha.
 */
export async function hashPassword(
  password: string,
  salt?: string,
  algo: string = PASSWORD_ALGO,
): Promise<PasswordHash> {
  const usedSalt = salt ?? (await generateSalt());
  const hash = await digest(algo, usedSalt, password);
  return { hash, salt: usedSalt, algo };
}

/** Comparação em tempo constante para não vazar informação por timing. */
export function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Valida uma senha contra um hash armazenado. */
export async function verifyPassword(
  password: string,
  stored: PasswordHash,
): Promise<boolean> {
  if (!stored.hash || !stored.salt || !stored.algo) {
    return false;
  }
  const computed = await digest(stored.algo, stored.salt, password);
  return constantTimeEquals(computed, stored.hash);
}

import { verifyPassword } from './password';
import { resetPassword } from './repo';

jest.mock('expo-crypto', () => {
  const nodeCrypto = jest.requireActual('crypto');

  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    CryptoEncoding: { HEX: 'hex' },
    digestStringAsync: async (_algorithm: string, data: string) =>
      nodeCrypto.createHash('sha256').update(data, 'utf8').digest('hex'),
    getRandomBytesAsync: async (byteCount: number) =>
      new Uint8Array(nodeCrypto.randomBytes(byteCount)),
  };
});

function makeDb(user: { id: number } | null) {
  const getFirstAsync = jest.fn().mockResolvedValue(user);
  const runAsync = jest.fn().mockResolvedValue({ lastInsertRowId: 0, changes: 1 });
  return {
    db: { getFirstAsync, runAsync } as never,
    getFirstAsync,
    runAsync,
  };
}

describe('resetPassword', () => {
  it('recusa e-mail sem conta cadastrada', async () => {
    const { db, runAsync } = makeDb(null);

    const result = await resetPassword(db, 'ninguem@liftrank.app', 'nova-senha');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Nenhuma conta encontrada com este e-mail.');
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('grava apenas o hash da nova senha e limpa a coluna legada', async () => {
    const { db, runAsync } = makeDb({ id: 7 });

    const result = await resetPassword(db, '  USER@LiftRank.app ', 'nova-senha');

    expect(result.success).toBe(true);
    expect(runAsync).toHaveBeenCalledTimes(1);

    const [sql, hash, salt, algo, userId] = runAsync.mock.calls[0] as [
      string,
      string,
      string,
      string,
      number,
    ];

    expect(sql).toContain('password = \'\'');
    expect(userId).toBe(7);
    expect(hash).not.toContain('nova-senha');
    expect(await verifyPassword('nova-senha', { hash, salt, algo })).toBe(true);
    expect(await verifyPassword('outra-senha', { hash, salt, algo })).toBe(false);
  });

  it('normaliza o e-mail na busca', async () => {
    const { db, getFirstAsync } = makeDb({ id: 1 });

    await resetPassword(db, '  USER@LiftRank.app ', 'nova-senha');

    expect(getFirstAsync).toHaveBeenCalledWith(expect.any(String), 'user@liftrank.app');
  });
});

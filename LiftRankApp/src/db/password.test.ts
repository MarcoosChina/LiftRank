import {
  constantTimeEquals,
  generateSalt,
  hashPassword,
  PASSWORD_ALGO,
  SALT_BYTES,
  verifyPassword,
} from './password';

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

describe('password hashing', () => {
  it('valida a senha correta', async () => {
    const stored = await hashPassword('senha-secreta');

    await expect(verifyPassword('senha-secreta', stored)).resolves.toBe(true);
  });

  it('rejeita a senha incorreta', async () => {
    const stored = await hashPassword('senha-secreta');

    await expect(verifyPassword('senha-errada', stored)).resolves.toBe(false);
  });

  it('não armazena a senha em texto puro', async () => {
    const stored = await hashPassword('senha-secreta');

    expect(stored.hash).not.toContain('senha-secreta');
    expect(stored.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.algo).toBe(PASSWORD_ALGO);
  });

  it('gera hashes diferentes para a mesma senha com salts diferentes', async () => {
    const first = await hashPassword('mesma-senha');
    const second = await hashPassword('mesma-senha');

    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
  });

  it('é determinístico quando o salt é informado', async () => {
    const salt = '0123456789abcdef0123456789abcdef';
    const first = await hashPassword('mesma-senha', salt);
    const second = await hashPassword('mesma-senha', salt);

    expect(first.hash).toBe(second.hash);
    expect(first.salt).toBe(salt);
  });

  it('rejeita hash com algoritmo desconhecido', async () => {
    const stored = await hashPassword('senha-secreta');

    await expect(
      verifyPassword('senha-secreta', { ...stored, algo: 'algo-inexistente' }),
    ).resolves.toBe(false);
  });

  it('rejeita hash ausente', async () => {
    await expect(
      verifyPassword('senha-secreta', { hash: '', salt: '', algo: '' }),
    ).resolves.toBe(false);
  });
});

describe('generateSalt', () => {
  it('retorna o tamanho esperado em hexadecimal e valores distintos', async () => {
    const first = await generateSalt();
    const second = await generateSalt();

    expect(first).toMatch(new RegExp(`^[0-9a-f]{${SALT_BYTES * 2}}$`));
    expect(first).not.toBe(second);
  });
});

describe('constantTimeEquals', () => {
  it('compara strings iguais e diferentes', () => {
    expect(constantTimeEquals('abc', 'abc')).toBe(true);
    expect(constantTimeEquals('abc', 'abd')).toBe(false);
    expect(constantTimeEquals('abc', 'abcd')).toBe(false);
  });
});

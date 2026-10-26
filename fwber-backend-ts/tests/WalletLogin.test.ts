import { jest } from '@jest/globals';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Test-local base58 encoder (the lib only decodes; wallet addresses arrive
// bs58-encoded from the Solana wallet adapter, so tests must encode).
// ---------------------------------------------------------------------------
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58Encode(buf: Buffer): string {
  let zeros = 0;
  while (zeros < buf.length && buf[zeros] === 0) zeros++;
  const digits = [0];
  for (const byte of buf) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = '1'.repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) out += B58[digits[i]];
  return out;
}

/** Generate a Solana-shaped keypair: raw 32-byte pubkey + bs58 forms. */
function makeWallet() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const spki = publicKey.export({ format: 'der', type: 'spki' }) as Buffer;
  const pubRaw = spki.subarray(spki.length - 32); // strip 12-byte SPKI prefix
  return {
    publicKeyRaw: pubRaw,
    address: base58Encode(pubRaw),
    privateKey,
    sign(message: string): string {
      const sig = crypto.sign(null, Buffer.from(message, 'utf8'), privateKey);
      return base58Encode(sig);
    },
    makeMessage(ts: number = Date.now()): string {
      return `Sign this message to login to fwber.\n\nWallet: ${base58Encode(pubRaw)}\nTimestamp: ${ts}`;
    },
  };
}

// ---------------------------------------------------------------------------
// Prisma / module mocks (mirrors tests/AuthService.test.ts)
// ---------------------------------------------------------------------------
const mockCreate = jest.fn();
const mockFindUnique = jest.fn();
const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();
const mockCount = jest.fn();

const mockPrisma = {
  users: {
    findUnique: mockFindUnique,
    findFirst: mockFindFirst,
    create: mockCreate,
    update: mockUpdate,
    count: mockCount,
  },
  user_profiles: { create: jest.fn() },
  wallet_transactions: { create: jest.fn() },
  notification_preferences: { createMany: jest.fn() },
  password_reset_tokens: {
    upsert: jest.fn(), deleteMany: jest.fn(), delete: jest.fn().mockResolvedValue({}), findFirst: mockFindFirst,
  },
};

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: mockPrisma, serialize: (obj: any) => obj, sanitizeUser: (obj: any) => obj,
}));
jest.unstable_mockModule('../src/services/AutonomousDecisionEngine.js', () => ({
  AutonomousDecisionEngine: { evaluateAction: jest.fn().mockResolvedValue({ decision: 'Allow' }) },
  ProposedAction: {},
}));
jest.unstable_mockModule('../src/services/AutonomousService.js', () => ({
  AutonomousService: { logAction: jest.fn().mockResolvedValue(undefined), isAdjustmentEnabled: jest.fn().mockResolvedValue(true) },
}));
jest.unstable_mockModule('../src/services/ProtocolVerificationService.js', () => ({
  ProtocolVerificationService: { verifyProtocol: jest.fn().mockResolvedValue({ score: 100, passed: true }) },
}));
jest.unstable_mockModule('../src/lib/email.js', () => ({
  sendVerificationEmail: jest.fn(), sendPasswordResetEmail: jest.fn(),
}));
jest.unstable_mockModule('../src/lib/verification-store.js', () => ({
  createVerificationToken: jest.fn(),
}));

const { AuthService, parseWalletLoginMessage, verifyEd25519 } = await import('../src/services/AuthService.js');
const { base58Decode } = await import('../src/lib/base58.js');

const EXISTING_USER = {
  id: 7n,
  name: 'Test Wallet',
  email: 'existing@wallet.fwber.local',
  password: 'hashed',
  role: 'user',
  wallet_address: null as string | null,
};

describe('base58', () => {
  it('round-trips random buffers', () => {
    for (let i = 0; i < 20; i++) {
      const raw = crypto.randomBytes(1 + (i % 64));
      const decoded = base58Decode(base58Encode(raw));
      expect(decoded?.equals(raw)).toBe(true);
    }
  });

  it('preserves leading zero bytes', () => {
    const raw = Buffer.from([0, 0, 1, 2, 3]);
    expect(base58Decode(base58Encode(raw))?.equals(raw)).toBe(true);
  });

  it('returns null on invalid characters', () => {
    expect(base58Decode('0OIl')).toBeNull(); // excluded alphabet chars
  });
});

describe('parseWalletLoginMessage', () => {
  it('parses a well-formed message', () => {
    const w = makeWallet();
    const parsed = parseWalletLoginMessage(w.makeMessage(1700000000000));
    expect(parsed).toEqual({ address: w.address, timestamp: 1700000000000 });
  });

  it('rejects wrong prefix, extra lines, bad timestamp, missing blank line', () => {
    const w = makeWallet();
    expect(parseWalletLoginMessage(w.makeMessage().replace('Sign this message', 'Sign THAT message'))).toBeNull();
    expect(parseWalletLoginMessage(w.makeMessage() + '\nextra')).toBeNull();
    expect(parseWalletLoginMessage(w.makeMessage().replace(/Timestamp: \d+/, 'Timestamp: soon'))).toBeNull();
    expect(parseWalletLoginMessage(w.makeMessage().replace('\n\nWallet', '\nWallet'))).toBeNull();
    expect(parseWalletLoginMessage('')).toBeNull();
  });
});

describe('verifyEd25519', () => {
  it('verifies a real signature and rejects tampering/wrong keys', () => {
    const w = makeWallet();
    const msg = 'Sign this message to login to fwber.\n\nWallet: x\nTimestamp: 1';
    const sigRaw = crypto.sign(null, Buffer.from(msg, 'utf8'), w.privateKey);
    expect(verifyEd25519(w.publicKeyRaw, Buffer.from(msg, 'utf8'), sigRaw)).toBe(true);
    expect(verifyEd25519(w.publicKeyRaw, Buffer.from(msg + '!', 'utf8'), sigRaw)).toBe(false);

    const other = makeWallet();
    expect(verifyEd25519(other.publicKeyRaw, Buffer.from(msg, 'utf8'), sigRaw)).toBe(false);

    expect(verifyEd25519(Buffer.alloc(31), Buffer.from(msg), sigRaw)).toBe(false);
    expect(verifyEd25519(w.publicKeyRaw, Buffer.from(msg), Buffer.alloc(63))).toBe(false);
  });
});

describe('AuthService.loginUserWithWallet', () => {
  let authService: InstanceType<typeof AuthService>;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
  });

  function primeExistingUser(user: any) {
    mockFindFirst.mockResolvedValue(user);
    mockCount.mockResolvedValue(0);
    mockFindUnique.mockResolvedValue(user);
  }

  it('logs in an existing wallet user without creating anything', async () => {
    const w = makeWallet();
    const msg = w.makeMessage(); // build ONCE: ms ticks between calls would break the signature
    primeExistingUser({ ...EXISTING_USER, wallet_address: w.address });

    const result = await authService.loginUserWithWallet({
      wallet_address: w.address,
      signature: w.sign(msg),
      message: msg,
    });

    expect(result.user.email).toBe(EXISTING_USER.email);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('auto-provisions a new wallet user (create + profile + welcome bonus)', async () => {
    const w = makeWallet();
    const msg = w.makeMessage();
    mockFindFirst.mockResolvedValueOnce(null); // wallet lookup miss
    mockCreate.mockResolvedValueOnce({ ...EXISTING_USER, wallet_address: w.address });
    mockCount.mockResolvedValue(0);
    mockFindUnique.mockResolvedValue({ ...EXISTING_USER, wallet_address: w.address });

    await authService.loginUserWithWallet({
      wallet_address: w.address,
      signature: w.sign(msg),
      message: msg,
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const created = (mockCreate.mock.calls[0] as any[])[0].data;
    expect(created.wallet_address).toBe(w.address);
    expect(created.email).toBe(`${w.address}@wallet.fwber.local`);
    // Password must be a hash of an unguessable random (not a known value).
    expect(created.password).toMatch(/^\$2[aby]\$/);
  });

  it('rejects a replayed signature', async () => {
    const w = makeWallet();
    const msg = w.makeMessage();
    primeExistingUser({ ...EXISTING_USER, wallet_address: w.address });
    const body = { wallet_address: w.address, signature: w.sign(msg), message: msg };

    await authService.loginUserWithWallet(body);
    await expect(authService.loginUserWithWallet(body)).rejects.toThrow(/already used/i);
  });

  it('rejects stale and future timestamps', async () => {
    const w = makeWallet();
    primeExistingUser({ ...EXISTING_USER, wallet_address: w.address });

    const stale = w.makeMessage(Date.now() - 10 * 60 * 1000);
    await expect(authService.loginUserWithWallet({
      wallet_address: w.address, signature: w.sign(stale), message: stale,
    })).rejects.toThrow(/expired/i);

    const future = w.makeMessage(Date.now() + 10 * 60 * 1000);
    await expect(authService.loginUserWithWallet({
      wallet_address: w.address, signature: w.sign(future), message: future,
    })).rejects.toThrow(/expired/i);
  });

  it('rejects wallet mismatch and forged signatures', async () => {
    const w = makeWallet();
    const other = makeWallet();
    primeExistingUser(EXISTING_USER);
    const msg = w.makeMessage();

    await expect(authService.loginUserWithWallet({
      wallet_address: other.address, signature: w.sign(msg), message: msg,
    })).rejects.toThrow(/does not match/i);

    // Signature produced by a DIFFERENT key than the message claims.
    const forged = other.sign(msg);
    await expect(authService.loginUserWithWallet({
      wallet_address: w.address, signature: forged, message: msg,
    })).rejects.toThrow(/Invalid signature/i);
  });
});

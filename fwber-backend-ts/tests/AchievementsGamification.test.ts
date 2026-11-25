import { jest } from '@jest/globals';

// Gamification engine: the catalog is code-defined and mirrored into the
// achievements table, locked achievements expose progress, unlocks pay
// the token reward exactly once, and every unlock leaves a notification.

(BigInt.prototype as any).toJSON = function () { return Number(this); };

const state = {
  stats: { matches: 0, messages: 0, gifts: 0, photos: 0, friends: 0, quests: 0, answers: 0 },
  achievementRows: [] as any[],
  userAchievements: [] as any[],
  notifications: [] as any[],
  walletTx: [] as any[],
  tokenBalance: 0,
  seq: 1n,
};

const mockPrisma: any = {
  achievements: {
    upsert: jest.fn(async (args: any) => {
      const slug = args.where.slug;
      let row = state.achievementRows.find((r) => r.slug === slug);
      if (!row) {
        row = { id: state.seq++, slug, ...args.create };
        state.achievementRows.push(row);
      } else {
        Object.assign(row, args.update);
      }
      return row;
    }),
    findMany: jest.fn(async (args: any) => {
      if (args?.select?.slug && args?.select?.id && !args?.select?.name) {
        return state.achievementRows.map((r) => ({ id: r.id, slug: r.slug }));
      }
      return state.achievementRows;
    }),
  },
  user_achievements: {
    findMany: jest.fn(async () => state.userAchievements),
    create: jest.fn(async (args: any) => {
      const row = { id: state.seq++, ...args.data };
      state.userAchievements.push(row);
      return row;
    }),
  },
  matches: { count: jest.fn(async () => state.stats.matches) },
  messages: { count: jest.fn(async () => state.stats.messages) },
  user_gifts: { count: jest.fn(async () => state.stats.gifts) },
  photos: { count: jest.fn(async () => state.stats.photos) },
  friends: { count: jest.fn(async () => state.stats.friends) },
  user_quests: { count: jest.fn(async () => state.stats.quests) },
  user_matching_answers: { count: jest.fn(async () => state.stats.answers) },
  user_profiles: { findFirst: jest.fn(async () => null) },
  users: {
    findUnique: jest.fn(async () => ({ email_verified_at: null, current_streak: 0, last_daily_bonus_at: null })),
    update: jest.fn(async (args: any) => {
      state.tokenBalance += args.data.token_balance.increment;
      return {};
    }),
  },
  wallet_transactions: {
    create: jest.fn(async (args: any) => { state.walletTx.push(args.data); return args.data; }),
  },
  notifications: {
    create: jest.fn(async (args: any) => { state.notifications.push(args.data); return args.data; }),
  },
  $queryRaw: jest.fn(async () => [{ count: 0 }]),
};

jest.unstable_mockModule('../src/lib/prisma.js', () => ({ default: mockPrisma }));

const { ACHIEVEMENT_CATALOG, checkAndUnlockAchievements, getAchievementProgress, computeLevel } =
  await import('../src/lib/achievements.js');

describe('achievements gamification engine', () => {
  beforeEach(() => {
    state.stats = { matches: 0, messages: 0, gifts: 0, photos: 0, friends: 0, quests: 0, answers: 0 };
    // achievementRows intentionally persist across tests: the engine
    // ensures the catalog once per process, exactly like production.
    state.userAchievements = [];
    state.notifications = [];
    state.walletTx = [];
    state.tokenBalance = 0;
    jest.clearAllMocks();
  });

  it('serves the full 30-item catalog with progress and level 1 for a fresh user', async () => {
    const progress = await getAchievementProgress(1n);
    expect(ACHIEVEMENT_CATALOG).toHaveLength(30);
    expect(progress.total).toBe(30);
    expect(progress.earned).toBe(0);
    expect(progress.xp).toBe(0);
    expect(progress.level.level).toBe(1);
    const firstMessage = progress.achievements.find((a: any) => a.slug === 'first_message');
    expect(firstMessage.progress).toEqual({ current: 0, target: 1, pct: 0 });
    expect(firstMessage.category).toBe('Conversation');
    // Catalog mirrored into the table for FK integrity.
    expect(state.achievementRows).toHaveLength(30);
  });

  it('shows partial progress toward tiered achievements', async () => {
    state.stats.messages = 40;
    const progress = await getAchievementProgress(1n);
    const chatter = progress.achievements.find((a: any) => a.slug === 'chatter_100');
    expect(chatter.progress).toEqual({ current: 40, target: 100, pct: 40 });
  });

  it('unlocks first_message once: pays reward, writes wallet tx and notification', async () => {
    state.stats.messages = 1;
    const unlocked = await checkAndUnlockAchievements(1n);
    expect(unlocked).toContain('first_message');
    expect(state.tokenBalance).toBe(10);
    expect(state.walletTx).toHaveLength(1);
    expect(state.walletTx[0].description).toContain('Icebreaker');
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].title).toContain('Achievement Unlocked');
    expect(state.notifications[0].body).toContain('Icebreaker');

    const again = await checkAndUnlockAchievements(1n);
    expect(again).not.toContain('first_message');
    expect(state.tokenBalance).toBe(10);
    expect(state.notifications).toHaveLength(1);
  });

  it('does not unlock below threshold', async () => {
    state.stats.messages = 24;
    const unlocked = await checkAndUnlockAchievements(1n);
    expect(unlocked).not.toContain('chatter_25');
    expect(unlocked).toContain('first_message');
  });

  it('computeLevel walks thresholds and caps at max', () => {
    expect(computeLevel(0).level).toBe(1);
    expect(computeLevel(40).level).toBe(2);
    expect(computeLevel(1150).level).toBe(10);
    expect(computeLevel(99999).progress_pct).toBe(100);
    expect(computeLevel(70).progress_pct).toBe(50); // halfway 40 -> 100
  });
});

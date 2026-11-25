import prisma from './prisma.js';

/**
 * Gamification: achievement catalog, progress, levels, unlock engine.
 *
 * The catalog below is the single source of truth. Rows in the
 * `achievements` table are mirrors of it (see ensureAchievementCatalog):
 * the table gives user_achievements a real FK target and lets rewards be
 * inspected in SQL, but code never depends on hand-seeded rows again —
 * before this, the API silently fell back to 3 static entries whenever
 * the table was empty, and locked achievements showed no progress.
 *
 * Unlocks are evaluated by checkAndUnlockAchievements(), which route
 * handlers call fire-and-forget after key actions (match, message, gift,
 * friend, journal, quest, profile, onboarding). On unlock the user gets
 * the token reward (wallet_transactions 'reward') and a durable
 * notifications row — the bell/list surface is how the unlock is seen;
 * NotificationListener already toasts `achievement_unlocked` payloads.
 */

export interface AchievementDef {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  token_reward: number;
  metric: string;
  target: number;
}

export const ACHIEVEMENT_CATALOG: AchievementDef[] = [
  // Profile
  { slug: 'profile_verified', name: 'Verified Human', description: 'Verify your email address', icon: '✅', category: 'Profile', token_reward: 50, metric: 'email_verified', target: 1 },
  { slug: 'verified_email', name: 'Inbox Zero Hero', description: 'Confirm you own your inbox', icon: '📧', category: 'Profile', token_reward: 10, metric: 'email_verified', target: 1 },
  { slug: 'profile_complete', name: 'Open Book', description: 'Complete 75% of your profile', icon: '📖', category: 'Profile', token_reward: 30, metric: 'profile_pct', target: 75 },
  { slug: 'profile_perfect', name: 'Open Book: Final Chapter', description: 'Complete 100% of your profile', icon: '🏅', category: 'Profile', token_reward: 50, metric: 'profile_pct', target: 100 },
  { slug: 'first_photo', name: 'Camera Ready', description: 'Upload your first photo', icon: '📸', category: 'Profile', token_reward: 10, metric: 'photos', target: 1 },
  { slug: 'photo_5', name: 'Gallery Curator', description: 'Upload 5 photos', icon: '🖼️', category: 'Profile', token_reward: 30, metric: 'photos', target: 5 },
  // Matches
  { slug: 'first_match', name: 'First Connection', description: 'Make your first match', icon: '🤝', category: 'Matches', token_reward: 10, metric: 'matches', target: 1 },
  { slug: 'five_matches', name: 'High Five', description: 'Make 5 matches', icon: '🖐️', category: 'Matches', token_reward: 25, metric: 'matches', target: 5 },
  { slug: 'ten_matches', name: 'Perfect Ten', description: 'Make 10 matches', icon: '🔟', category: 'Matches', token_reward: 50, metric: 'matches', target: 10 },
  { slug: 'twentyfive_matches', name: 'Quarter Century Club', description: 'Make 25 matches', icon: '🎯', category: 'Matches', token_reward: 100, metric: 'matches', target: 25 },
  // Conversation
  { slug: 'first_message', name: 'Icebreaker', description: 'Send your first message', icon: '💬', category: 'Conversation', token_reward: 10, metric: 'messages', target: 1 },
  { slug: 'chatter_25', name: 'Smooth Talker', description: 'Send 25 messages', icon: '🗣️', category: 'Conversation', token_reward: 25, metric: 'messages', target: 25 },
  { slug: 'chatter_100', name: 'Centurion of Chat', description: 'Send 100 messages', icon: '💯', category: 'Conversation', token_reward: 75, metric: 'messages', target: 100 },
  // Generosity
  { slug: 'first_gift', name: 'Generous Spirit', description: 'Send your first gift', icon: '🎁', category: 'Generosity', token_reward: 10, metric: 'gifts_sent', target: 1 },
  { slug: 'gift_sent_5', name: 'Gift Giver', description: 'Send 5 gifts', icon: '🎀', category: 'Generosity', token_reward: 25, metric: 'gifts_sent', target: 5 },
  { slug: 'gift_sent_20', name: 'Secret Santa', description: 'Send 20 gifts', icon: '🎅', category: 'Generosity', token_reward: 75, metric: 'gifts_sent', target: 20 },
  // Friends
  { slug: 'first_friend', name: 'First Friend', description: 'Connect with your first friend', icon: '👋', category: 'Social', token_reward: 10, metric: 'friends', target: 1 },
  { slug: 'friend_5', name: 'Inner Circle', description: 'Connect with 5 friends', icon: '⭕', category: 'Social', token_reward: 25, metric: 'friends', target: 5 },
  { slug: 'friend_20', name: 'Social Butterfly', description: 'Connect with 20 friends', icon: '🦋', category: 'Social', token_reward: 75, metric: 'friends', target: 20 },
  // Journal
  { slug: 'journal_entry', name: 'Dear Diary', description: 'Write your first journal entry', icon: '📓', category: 'Journal', token_reward: 10, metric: 'journal_entries', target: 1 },
  { slug: 'journal_5', name: 'Chronicler', description: 'Write 5 journal entries', icon: '📚', category: 'Journal', token_reward: 25, metric: 'journal_entries', target: 5 },
  { slug: 'journal_20', name: 'Memoirist', description: 'Write 20 journal entries', icon: '✒️', category: 'Journal', token_reward: 60, metric: 'journal_entries', target: 20 },
  // Quests
  { slug: 'quest_1', name: 'Quest Accepted', description: 'Complete your first quest', icon: '🗺️', category: 'Quests', token_reward: 15, metric: 'quests_completed', target: 1 },
  { slug: 'quest_5', name: 'Quest Master', description: 'Complete 5 quests', icon: '⚔️', category: 'Quests', token_reward: 50, metric: 'quests_completed', target: 5 },
  // Matching
  { slug: 'answers_10', name: 'Getting Personal', description: 'Answer 10 matching questions', icon: '❓', category: 'Matching', token_reward: 15, metric: 'matching_answers', target: 10 },
  { slug: 'answers_50', name: 'Deep Diver', description: 'Answer 50 matching questions', icon: '🤿', category: 'Matching', token_reward: 40, metric: 'matching_answers', target: 50 },
  { slug: 'answers_105', name: 'Full Disclosure', description: 'Answer all 105 matching questions', icon: '🔓', category: 'Matching', token_reward: 100, metric: 'matching_answers', target: 105 },
  // Dedication
  { slug: 'daily_checkin', name: 'Checking In', description: 'Claim your first daily bonus', icon: '📅', category: 'Dedication', token_reward: 10, metric: 'checkin', target: 1 },
  { slug: 'streak_7', name: 'Week on Fire', description: '7-day login streak', icon: '🔥', category: 'Dedication', token_reward: 100, metric: 'streak', target: 7 },
  { slug: 'streak_30', name: 'Unstoppable', description: '30-day login streak', icon: '⚡', category: 'Dedication', token_reward: 250, metric: 'streak', target: 30 },
];

// XP is the sum of token rewards earned. Thresholds sit below the
// catalog total (~1,370) so the top level is reachable but earned.
export const LEVEL_THRESHOLDS = [0, 40, 100, 180, 280, 400, 550, 720, 920, 1150];
export const LEVEL_TITLES = ['Newcomer', 'Explorer', 'Socializer', 'Connector', 'Insider', 'Influencer', 'Star', 'Icon', 'Legend', 'Mythic'];

export function computeLevel(xp: number) {
  let idx = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= (LEVEL_THRESHOLDS[i] ?? 0)) idx = i;
  }
  const nextXp = idx + 1 < LEVEL_THRESHOLDS.length ? (LEVEL_THRESHOLDS[idx + 1] ?? null) : null;
  const floorXp = LEVEL_THRESHOLDS[idx] ?? 0;
  return {
    level: idx + 1,
    title: LEVEL_TITLES[idx] ?? 'Newcomer',
    xp,
    floor_xp: floorXp,
    next_level_xp: nextXp,
    progress_pct: nextXp ? Math.min(100, Math.round(((xp - floorXp) / (nextXp - floorXp)) * 100)) : 100,
  };
}

let catalogEnsured = false;

/** Mirror the code catalog into the achievements table (idempotent). */
export async function ensureAchievementCatalog(): Promise<void> {
  if (catalogEnsured) return;
  for (const def of ACHIEVEMENT_CATALOG) {
    const criteria = { metric: def.metric, target: def.target, category: def.category };
    await prisma.achievements.upsert({
      where: { slug: def.slug },
      create: { slug: def.slug, name: def.name, description: def.description, icon: def.icon, token_reward: def.token_reward, criteria },
      update: { name: def.name, description: def.description, icon: def.icon, token_reward: def.token_reward, criteria },
    });
  }
  catalogEnsured = true;
}

export async function getUserStats(userId: bigint): Promise<Record<string, number>> {
  const [
    matchCount,
    messageCount,
    giftSentCount,
    photoCount,
    friendCount,
    journalCount,
    questCount,
    answerCount,
    profile,
    user,
  ] = await Promise.all([
    prisma.matches.count({ where: { OR: [{ user1_id: userId }, { user2_id: userId }], status: 'accepted' } }).catch(() => 0),
    prisma.messages.count({ where: { sender_id: userId } }).catch(() => 0),
    prisma.user_gifts.count({ where: { sender_id: userId } }).catch(() => 0),
    prisma.photos.count({ where: { user_id: userId } }).catch(() => 0),
    prisma.friends.count({ where: { OR: [{ user_id: userId }, { friend_id: userId }], status: 'accepted' } }).catch(() => 0),
    prisma.$queryRaw`SELECT COUNT(*) as count FROM journal_entries WHERE user_id = ${userId}`.then((r: any) => Number(r[0]?.count || 0)).catch(() => 0),
    prisma.user_quests.count({ where: { user_id: userId, status: { in: ['completed', 'claimed'] } } }).catch(() => 0),
    prisma.user_matching_answers.count({ where: { user_id: userId } }).catch(() => 0),
    prisma.user_profiles.findFirst({ where: { user_id: userId } }).catch(() => null as any),
    prisma.users.findUnique({ where: { id: userId }, select: { email_verified_at: true, current_streak: true, last_daily_bonus_at: true } }).catch(() => null as any),
  ]);

  let completenessPct = 0;
  if (profile) {
    let filled = 0;
    const total = 10;
    if (profile.bio && profile.bio !== 'No bio yet.' && profile.bio.length > 5) filled++;
    if (profile.gender) filled++;
    if (profile.date_of_birth) filled++;
    if (profile.location_description) filled++;
    if (profile.interests) filled++;
    if (profile.occupation) filled++;
    if (profile.education) filled++;
    if (profile.height_cm) filled++;
    if (profile.looking_for) filled++;
    if (profile.avatar_url) filled++;
    completenessPct = Math.round((filled / total) * 100);
  }

  return {
    matches: matchCount,
    messages: messageCount,
    gifts_sent: giftSentCount,
    photos: photoCount,
    friends: friendCount,
    journal_entries: journalCount,
    quests_completed: questCount,
    matching_answers: answerCount,
    profile_pct: completenessPct,
    email_verified: user?.email_verified_at ? 1 : 0,
    checkin: user?.last_daily_bonus_at ? 1 : 0,
    streak: user?.current_streak || 0,
  };
}

export async function getAchievementProgress(userId: bigint) {
  await ensureAchievementCatalog();
  const stats = await getUserStats(userId);
  const earned = await prisma.user_achievements.findMany({ where: { user_id: userId } });

  // Earned state is keyed by achievement row id, so resolve slugs via rows.
  const rows = await prisma.achievements.findMany({ select: { id: true, slug: true } });
  const slugById = new Map(rows.map((r) => [r.id.toString(), r.slug]));
  const earnedAtBySlug = new Map<string, Date | null>();
  for (const e of earned) {
    const slug = slugById.get(e.achievement_id.toString());
    if (slug) earnedAtBySlug.set(slug, e.unlocked_at ? new Date(e.unlocked_at) : null);
  }

  const idBySlug = new Map(rows.map((r) => [r.slug, Number(r.id)]));
  let xp = 0;
  const items = ACHIEVEMENT_CATALOG.map((def) => {
    const current = Math.min(stats[def.metric] ?? 0, def.target);
    const isEarned = earnedAtBySlug.has(def.slug);
    if (isEarned) xp += def.token_reward;
    return {
      id: idBySlug.get(def.slug) ?? 0,
      slug: def.slug,
      name: def.name,
      description: def.description,
      icon: def.icon,
      category: def.category,
      token_reward: def.token_reward,
      earned: isEarned,
      earned_at: isEarned ? (earnedAtBySlug.get(def.slug)?.toISOString() ?? null) : null,
      progress: { current, target: def.target, pct: Math.min(100, Math.round((current / def.target) * 100)) },
    };
  });

  return {
    achievements: items,
    total: items.length,
    earned: items.filter((i) => i.earned).length,
    xp,
    level: computeLevel(xp),
  };
}

/**
 * Check and unlock achievements for a user based on their current stats.
 * Called after key actions: match, message, gift, checkin, profile update,
 * photo upload, etc. Returns array of newly unlocked achievement slugs.
 */
export async function checkAndUnlockAchievements(userId: bigint): Promise<string[]> {
  const newlyUnlocked: string[] = [];

  try {
    await ensureAchievementCatalog();
    const stats = await getUserStats(userId);

    const existing = await prisma.user_achievements.findMany({
      where: { user_id: userId },
      select: { achievement_id: true },
    });
    const rows = await prisma.achievements.findMany({ select: { id: true, slug: true, name: true, token_reward: true } });
    const rowBySlug = new Map(rows.map((r) => [r.slug, r]));
    const earnedIds = new Set(existing.map((e) => e.achievement_id.toString()));

    for (const def of ACHIEVEMENT_CATALOG) {
      const row = rowBySlug.get(def.slug);
      if (!row || earnedIds.has(row.id.toString())) continue;
      if ((stats[def.metric] ?? 0) < def.target) continue;

      try {
        await prisma.user_achievements.create({
          data: { user_id: userId, achievement_id: row.id, unlocked_at: new Date() },
        });

        if (def.token_reward > 0) {
          await prisma.users.update({
            where: { id: userId },
            data: { token_balance: { increment: def.token_reward } },
          });
          try {
            await prisma.wallet_transactions.create({
              data: {
                user_id: userId,
                amount: def.token_reward,
                type: 'reward',
                description: `Achievement unlocked: ${def.name}`,
                created_at: new Date(),
              },
            });
          } catch (_) {}
        }

        // Durable unlock feedback: a notifications row the bell/list show.
        try {
          await prisma.notifications.create({
            data: {
              user_id: userId,
              title: 'Achievement Unlocked! 🏆',
              body: `You earned "${def.name}"${def.token_reward > 0 ? ` (+${def.token_reward} FWB)` : ''} — ${def.description}`,
              created_at: new Date(),
              updated_at: new Date(),
            },
          });
        } catch (_) {}

        newlyUnlocked.push(def.slug);
      } catch (e: any) {
        // Duplicate key — already unlocked by another concurrent request
        if (!e.message?.includes('Unique')) {
          console.error('[Achievements] Unlock error:', e.message);
        }
      }
    }

    if (newlyUnlocked.length > 0) {
      console.log(`[Achievements] User ${userId.toString()} unlocked: ${newlyUnlocked.join(', ')}`);
    }
  } catch (error: any) {
    console.error('[Achievements] checkAndUnlock error:', error.message);
  }

  return newlyUnlocked;
}

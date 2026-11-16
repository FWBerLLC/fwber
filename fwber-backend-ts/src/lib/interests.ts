import prisma from './prisma.js';
import { createNotification } from '../routes/notifications.js';

/**
 * Pillar 5 — No Rejection State (VISION, Robert 2026-11-16).
 *
 * fwber has no friend requests. Interest is unilateral and private:
 * expressing interest in someone tells them NOTHING. Only when interest
 * is mutual does a connection unlock (friends list, messaging context,
 * face reveals) — and only then are both sides notified. There is no
 * pending state, no ignored request, and no rejection signal, ever.
 *
 * Storage: directed rows in `friend_requests` (string status, no schema
 * migration): `{ user_id: admirer, friend_id: target, status:
 * 'interested' }`. Grandfathered `friends` rows with status 'accepted'
 * (from the retired request flow) count as connections forever.
 */

export const INTEREST_STATUS = 'interested';

async function findDirectedInterest(fromId: bigint, toId: bigint) {
  return prisma.friend_requests.findFirst({
    where: { user_id: fromId, friend_id: toId, status: INTEREST_STATUS },
  });
}

export async function isMutualInterest(a: bigint, b: bigint): Promise<boolean> {
  const [ab, ba] = await Promise.all([
    findDirectedInterest(a, b),
    findDirectedInterest(b, a),
  ]);
  return Boolean(ab && ba);
}

export async function isGrandfatheredConnection(a: bigint, b: bigint): Promise<boolean> {
  const row = await prisma.friends.findFirst({
    where: {
      status: 'accepted',
      OR: [
        { user_id: a, friend_id: b },
        { user_id: b, friend_id: a },
      ],
    },
  });
  return Boolean(row);
}

/** Connected = mutual interest OR a grandfathered accepted friendship. */
export async function isConnected(a: bigint, b: bigint): Promise<boolean> {
  if (await isGrandfatheredConnection(a, b)) return true;
  return isMutualInterest(a, b);
}

export type ExpressResult =
  | { ok: true; mutual: boolean }
  | { ok: false; status: number; message: string };

export async function expressInterest(userId: bigint, targetId: bigint): Promise<ExpressResult> {
  if (userId === targetId) {
    return { ok: false, status: 400, message: 'Cannot express interest in yourself' };
  }

  const target = await prisma.users.findUnique({ where: { id: targetId } });
  if (!target) return { ok: false, status: 404, message: 'User not found' };

  // A block in either direction forbids interest entirely (and stays silent).
  const blocked = await prisma.blocks.findFirst({
    where: {
      OR: [
        { blocker_id: userId, blocked_id: targetId },
        { blocker_id: targetId, blocked_id: userId },
      ],
    },
  });
  if (blocked) return { ok: false, status: 400, message: 'Cannot express interest in this user' };

  if (await isConnected(userId, targetId)) {
    return { ok: true, mutual: true }; // already connected; idempotent
  }

  const existing = await findDirectedInterest(userId, targetId);
  if (!existing) {
    await prisma.friend_requests.create({
      data: { user_id: userId, friend_id: targetId, status: INTEREST_STATUS },
    });
  }

  const mutual = await isMutualInterest(userId, targetId);
  if (mutual) {
    // Unlock moment: materialize the connection and tell BOTH sides.
    // This is the only notification interest ever produces.
    await prisma.friends.create({
      data: { user_id: userId, friend_id: targetId, status: 'accepted' },
    }).catch(() => {});
    const [me, them] = await Promise.all([
      prisma.users.findUnique({ where: { id: userId }, select: { name: true } }),
      prisma.users.findUnique({ where: { id: targetId }, select: { name: true } }),
    ]);
    await createNotification(targetId, 'New Connection',
      `You and ${me?.name || 'someone'} are now connected — your mutual interest unlocked messaging and reveals.`).catch(() => {});
    await createNotification(userId, 'New Connection',
      `You and ${them?.name || 'someone'} are now connected — your mutual interest unlocked messaging and reveals.`).catch(() => {});
  }

  return { ok: true, mutual };
}

/** Withdraw interest silently. Never notifies, never signals. */
export async function withdrawInterest(userId: bigint, targetId: bigint): Promise<void> {
  await prisma.friend_requests.deleteMany({
    where: { user_id: userId, friend_id: targetId, status: INTEREST_STATUS },
  });
  // If the pair had materialized a mutual connection, sever it too —
  // withdrawing is the only way to un-connect, and it stays silent.
  await prisma.friends.deleteMany({
    where: {
      status: 'accepted',
      OR: [
        { user_id: userId, friend_id: targetId },
        { user_id: targetId, friend_id: userId },
      ],
    },
  });
}

/** My outgoing interests (private to me — nobody else can list these). */
export async function listMyInterestIds(userId: bigint): Promise<bigint[]> {
  const rows = await prisma.friend_requests.findMany({
    where: { user_id: userId, status: INTEREST_STATUS },
    select: { friend_id: true },
  });
  return rows.map((r: any) => r.friend_id as bigint);
}

/** Partner IDs I am connected with (accepted friendships ∪ mutual interests). */
export async function listConnectionIds(userId: bigint): Promise<Set<string>> {
  const ids = new Set<string>();
  const friendships = await prisma.friends.findMany({
    where: { status: 'accepted', OR: [{ user_id: userId }, { friend_id: userId }] },
    select: { user_id: true, friend_id: true },
  });
  for (const f of friendships as any[]) {
    ids.add((f.user_id.toString() === userId.toString() ? f.friend_id : f.user_id).toString());
  }
  // Mutual interests that have not materialized into a friends row yet
  // (defensive: unlock normally materializes, but never hide a connection).
  const outgoing = await listMyInterestIds(userId);
  for (const targetId of outgoing) {
    if (await findDirectedInterest(targetId, userId)) ids.add(targetId.toString());
  }
  return ids;
}

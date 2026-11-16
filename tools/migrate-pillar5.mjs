#!/usr/bin/env node
/**
 * Pillar 5 data migration (run once on the server, from fwber-backend-ts):
 *   node ../tools/migrate-pillar5.mjs
 *
 * - friend_requests status 'pending'  -> 'interested' (the sender's
 *   unilateral interest survives; the receiver simply never sees a
 *   pending state — exactly the Pillar 5 semantics).
 * - friend_requests status 'rejected' -> DELETED (a recorded rejection
 *   must not persist as a legible "no" anywhere in the system).
 * - 'accepted' request rows and all `friends` rows are untouched:
 *   existing friendships are grandfathered connections.
 *
 * Idempotent: safe to re-run (second run finds nothing to do).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const converted = await prisma.friend_requests.updateMany({
  where: { status: 'pending' },
  data: { status: 'interested' },
});
console.log(`pending -> interested: ${converted.count}`);

const erased = await prisma.friend_requests.deleteMany({
  where: { status: 'rejected' },
});
console.log(`rejected erased: ${erased.count}`);

const remaining = await prisma.friend_requests.groupBy({
  by: ['status'],
  _count: true,
});
console.log('friend_requests by status:', remaining);

await prisma.$disconnect();
console.log('PILLAR5 MIGRATION DONE');

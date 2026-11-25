#!/usr/bin/env node
/**
 * fwber production battery — consolidated, secret-free, self-contained.
 *
 * Consolidates the ad-hoc loop batteries (auth, two-user Pillar 5 flow,
 * economy, venue/group/burner lifecycles, guards, security boundaries)
 * into one runnable tool. Every run registers a FRESH pair of QA users
 * (@example.com), so no credentials live in this file and runs are
 * independent. Assertions check lifecycle STATE, not just status codes —
 * the /api catch-all answers `success: true` to unmatched mutations, so
 * status-only checks can false-positive (learned in HANDOFF cont. 20).
 *
 * Usage:
 *   node tools/battery/prod-battery.mjs [--base https://fwber.online]
 *
 * Env: FWBER_BASE_URL overrides the default base. Exit code 0 = all pass.
 * QA residue: each run adds 2 users (+ any rooms/events created). Prune
 * with the future admin QA-cleanup endpoint (IDEAS) — accounts are named
 * qa-battery-*@example.com for easy identification.
 */

const BASE = (process.env.FWBER_BASE_URL || 'https://fwber.online').replace(/\/$/, '');
const API = `${BASE}/api`;

let pass = 0;
let fail = 0;
const failures = [];
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { fail++; failures.push(name); console.log(`FAIL ${name} ${extra}`); }
}

async function call(method, path, token, body) {
  const r = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch { /* non-JSON */ }
  return { status: r.status, data };
}

async function freshUser(tag, stamp) {
  const email = `qa-battery-${tag}-${stamp}@example.com`;
  const reg = await call('POST', '/auth/register', null, {
    name: `QA Battery ${tag}`, email, password: 'QaBattery!234',
    date_of_birth: '1995-01-01', gender: 'female',
  });
  const token = reg.data?.token || reg.data?.access_token;
  const me = token ? await call('GET', '/auth/me', token) : { data: null };
  return { token, id: me.data?.id || me.data?.user?.id, email };
}

const stamp = Date.now().toString(36);
console.log(`fwber prod battery @ ${BASE} (run ${stamp})`);

// ── Health + version ────────────────────────────────────────────────────────
const health = await call('GET', '/health', null);
check('api health ok', health.status === 200 && health.data?.status === 'ok', `got ${health.status}`);

// ── Fresh pair ──────────────────────────────────────────────────────────────
const A = await freshUser('a', stamp);
const B = await freshUser('b', stamp);
check('fresh pair registered', !!A.token && !!B.token && !!A.id && !!B.id, `A=${A.id} B=${B.id}`);
if (!A.token || !B.token) {
  console.log(`RESULT pass=${pass} fail=${fail} (aborting: no auth)`);
  process.exit(1);
}

// ── Dashboard functions ─────────────────────────────────────────────────────
for (const [name, path] of [
  ['dashboard stats', '/dashboard/stats'],
  ['matching questions', '/matching/questions'],
  ['premium status', '/premium/status'],
  ['wallet', '/wallet'],
  ['referrals summary', '/referrals/summary'],
  ['bulletin boards', '/bulletin-boards'],
  ['audio rooms list', '/audio-rooms'],
  ['venues list', '/venues'],
  ['events list', '/events'],
]) {
  const r = await call('GET', path, A.token);
  check(name, r.status === 200, `got ${r.status}`);
}

// ── Pillar 5 flow: silent interest -> mutual -> DM -> block -> 403 ─────────
const i1 = await call('POST', '/friends/interest', A.token, { friend_id: B.id });
check('one-way interest silent (not mutual)', i1.status < 300 && i1.data?.mutual !== true, `got ${i1.status}`);
const bFriendsBefore = await call('GET', '/friends', B.token);
check('target blind before mutual', !JSON.stringify(bFriendsBefore.data).includes(String(A.id)), '');
const tomb = await call('POST', '/friends/request', A.token, { friend_id: B.id });
check('legacy friend-request flow 410', tomb.status === 410, `got ${tomb.status}`);
const i2 = await call('POST', '/friends/interest', B.token, { friend_id: A.id });
check('mutual interest connects', i2.data?.mutual === true || i2.data?.connected === true, JSON.stringify(i2.data).slice(0, 90));
const dm = await call('POST', '/messages', A.token, { receiver_id: B.id, content: 'battery hello' });
check('DM between connections', dm.status === 200 || dm.status === 201, `got ${dm.status}`);
const blk = await call('POST', '/blocks', B.token, { blocked_id: A.id });
check('block records', blk.status === 200 || blk.status === 201, `got ${blk.status}`);
const dm2 = await call('POST', '/messages', A.token, { receiver_id: B.id, content: 'blocked?' });
check('DM while blocked 403', dm2.status === 403, `got ${dm2.status}`);

// ── Gamification: catalog, progress, unlock, level ──────────────────────────
// Unlocks run fire-and-forget after the triggering action, so poll briefly.
let ach = null;
for (let attempt = 0; attempt < 6; attempt++) {
  ach = await call('GET', '/achievements', A.token);
  const fm = ach.data?.achievements?.find((a) => a.slug === 'first_message');
  if (fm?.earned) break;
  await new Promise((r) => setTimeout(r, 700));
}
const achList = ach?.data?.achievements || [];
check('achievements catalog expanded (30)', ach?.status === 200 && achList.length >= 30, `got ${ach?.status} n=${achList.length}`);
check('first_message unlocked by DM', achList.find((a) => a.slug === 'first_message')?.earned === true, '');
const locked = achList.find((a) => a.slug === 'chatter_100');
check('locked achievement exposes progress', !!locked && locked.progress?.target === 100 && locked.progress?.current >= 1, JSON.stringify(locked?.progress));
check('level computed', (ach?.data?.level?.level || 0) >= 1 && typeof ach?.data?.xp === 'number', JSON.stringify(ach?.data?.level));
const notifs = await call('GET', '/notifications', A.token);
const notifList = notifs.data?.notifications || notifs.data || [];
check('unlock notification delivered', Array.isArray(notifList) && notifList.some((n) => String(n.title || '').includes('Achievement Unlocked')), `n=${Array.isArray(notifList) ? notifList.length : '?'}`);

// ── Economy: referral credit is exact ───────────────────────────────────────
const sumA = await call('GET', '/referrals/summary', A.token);
const code = sumA.data?.referral_code || sumA.data?.summary?.referral_code;
const balBefore = Number((await call('GET', '/wallet', A.token)).data?.balance ?? NaN);
check('referral code issued', !!code, JSON.stringify(sumA.data).slice(0, 90));
if (code) {
  const apply = await call('POST', '/referrals/apply', B.token, { code });
  check('referral apply accepted', apply.status === 200 || apply.status === 201, `got ${apply.status}`);
  const balAfter = Number((await call('GET', '/wallet', A.token)).data?.balance ?? NaN);
  check('referrer credited exactly +50', balAfter === balBefore + 50, `before=${balBefore} after=${balAfter}`);
}

// ── Lifecycles: audio room, safety walk ─────────────────────────────────────
const room = await call('POST', '/audio-rooms', A.token, { name: `Battery Room ${stamp}` });
const roomId = room.data?.id || room.data?.room?.id || room.data?.data?.id;
check('audio room create (state: id)', [200, 201].includes(room.status) && !!roomId, `got ${room.status}`);
if (roomId) {
  check('audio room join', [200, 201].includes((await call('POST', `/audio-rooms/${roomId}/join`, B.token)).status), '');
  check('audio room leave', (await call('POST', `/audio-rooms/${roomId}/leave`, B.token)).status === 200, '');
}
const walk = await call('POST', '/safety/walk/start', A.token, { destination: 'Battery Park', start_lat: 42.33, start_lng: -83.04 });
const walkId = walk.data?.walk?.id;
check('safety walk start (state: walk id)', walk.status === 200 && !!walkId, `got ${walk.status}`);
if (walkId) {
  const active = await call('GET', '/safety/walk/active', A.token);
  check('active walk reflects start', active.data?.walk?.id === walkId, JSON.stringify(active.data).slice(0, 90));
  check('walk end', (await call('POST', `/safety/walk/${walkId}/end`, A.token, {})).status === 200, '');
  const after = await call('GET', '/safety/walk/active', A.token);
  check('no active walk after end', after.data?.walk === null, JSON.stringify(after.data).slice(0, 80));
}

// ── Guards: bogus ids must 4xx, never 500 ───────────────────────────────────
for (const [name, method, path, body] of [
  ['quest accept bogus', 'POST', '/quests/999999/accept', {}],
  ['chatroom invalid type', 'POST', '/chatrooms', { name: 'x', type: 'standard' }],
  ['video status bogus', 'PUT', '/video/999999/status', { status: 'ended' }],
  ['audio signal bogus room', 'POST', '/audio-rooms/999999/signal', { type: 'offer', target_user_id: B.id, sdp: 'x' }],
]) {
  const r = await call(method, path, A.token, body);
  check(`${name} -> 4xx`, r.status >= 400 && r.status < 500, `got ${r.status}`);
}

// ── Security boundaries ─────────────────────────────────────────────────────
for (const p of ['/auth/me', '/wallet', '/friends', '/notifications']) {
  const r = await call('GET', p, null);
  check(`unauth ${p} 401`, r.status === 401, `got ${r.status}`);
}
const probe = await fetch(`${BASE}/.env`);
check('scanner /.env 404', probe.status === 404, `got ${probe.status}`);

console.log(`RESULT pass=${pass} fail=${fail}${failures.length ? ` failures: ${failures.join('; ')}` : ''} A=${A.id} B=${B.id}`);
process.exit(fail ? 1 : 0);

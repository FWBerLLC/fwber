# TODO — fwber Immediate Action Items

> **Version:** 2.3.81
> **Last Updated:** 2026-11-12

---

## 🔧 Open & Recently Closed Items (2026-11-06 – 2026-11-12, v2.3.55–v2.3.62)

### High Priority
- [x] **Honest Dashboard Stats, Friend/Profile Direct Messaging & Block Hardening (v2.3.62)** — Fixed fresh-account `"7 Chats"` (`chatrooms.count()`) & `"17% Compatibility"` fallbacks in `dashboard.ts`; merged accepted friends + `last_message` + `profile.photos` into `/matches/established` & `/messages/conversations`; wired `?user=` compose selection in `/messages` and direct **Message** CTA + action tooltips on `/profile/[id]` (removing duplicate profile header); fixed `blocks.ts` `prisma.matches.deleteMany` cleanup and enforced `403` block checks on `POST /api/messages` & `GET /api/messages/:id`; covered by `14/14` Jest tests.
- [x] **Executive Protocol Sync, Merge Reconciliation & Version Alignment (v2.3.61)** — Audited all `-X ours`/`-X theirs` merges across Protocols #277–#281, restored dropped changelog/TODO records, fixed `.gitignore` session/archive rules, wired `build.bat` Prisma generation + `fwber-geo` build target, and synced version `2.3.61` across all manifests.
- [x] **Friends search endpoint & reconciliation (v2.3.55 + `b13c4cf9a` / `c9ea14d6e`)** — Canonical bare-array `GET /api/friends/search` excluding self, bidirectional blocks, existing friends, and pending requests; covered by `tests/FriendsSearchBlocks.test.ts` (8/8 passing).
- [x] **Block/Report & Profile Friend/Block UI (`v2.3.57`–`v2.3.58` + `b13c4cf9a`)** — Explicit-tap Block/Report actions in `ProfileViewModal`, Blocked Users list + Unblock on Safety page (`/safety`) and `/settings/blocked`, and Add Friend / Friend state / Block actions on `app/profile/[id]` (no proactive popups per operator directive).
- [x] **Unguarded `.map()` crash sites swept (v2.3.59)** — Patched `NemesisFinder` (`clashing_traits`) and Privacy settings (`available_groups`); audited 269 `.map()` candidates across frontend.
- [x] **Image-URL migration verified clean on prod + dry-run journal guard (v2.3.60)** — Hetzner dry-run reported `canonicalized=0 nulled=0`; `migrate-image-urls.mjs` fixed so dry-runs never overwrite `image-url-migration-journal.json`.
- [x] **Footer version badge wired to centralized `VERSION` (v2.3.61)** — Fixed `app/layout.tsx` and `next.config.js` so `NEXT_PUBLIC_PROJECT_VERSION` / `NEXT_PUBLIC_FRONTEND_VERSION` read root `VERSION` first (resolving the `v2.1.4` stale footer display seen in Bobbi's Nov 6 QA).
- [x] **Direct messaging initiation from `app/profile/[id]` (Bobbi QA 2026-11-06 — closed in v2.3.62)** — Enabled friend + mutual-match direct messaging end-to-end: `/matches/established` includes accepted friends, `/messages?user=<id>` auto-selects/bootstraps conversations, and `app/profile/[id]` exposes a prominent `Message` button (with tooltip guidance when not yet matched/friends).
- [x] **Dashboard Network "Syncing" vs header badge "Connected" disagreement (Bobbi QA 2026-11-06 — closed v2.3.63, verified in code)** — Both `AppHeader` and `/dashboard` render the same `ConnectionStatusBadge` from `PresenceContext` (fed by `AuthenticatedRealtimeProvider` from `websocket.connectionStatus`); no second "Syncing" source remains. Verified 2026-11-13 by tracing `connectionStatus` through provider → context → badge.
- [x] **Audio Rooms live voice transport (signaling shipped v2.3.70; media needs live prod test)** — `POST /api/audio-rooms/:id/signal` now validates (`src/lib/audio-signaling.ts`), requires both users to be room participants, and relays `AudioRoomSignal` over Socket.io `user:{id}` rooms; `audio_signal` socket event mirrors the same contract; frontend `useWebRTC` receives on the shared Socket.io socket (Echo kept as legacy fallback). Covered by `tests/AudioSignaling.test.ts` (9 cases; suite total 23/23). Remaining: two-browser live voice check on prod after deploy — TURN beyond the public STUN server may be needed for strict NATs.
- [x] **Backend-only modules audit (v2.3.69)** — `cats` (seed-data demo) and `hardware-tokens` (unimplemented stub, `enabled: false`) are intentionally dashboard-free. Do not re-flag in coverage audits.
- [x] **Fresh-account seeded stats (Bobbi QA 2026-11-06 — closed in v2.3.62)** — Fixed `/dashboard/stats` so new accounts report `0` private conversations and `0%` compatibility until real matches/friends/messages exist.

## 🔧 Open Items (2026-11-04, v2.3.53 session)

### High Priority
- [x] **Dashboard UI Reorganization & High-Value Consolidation (v2.3.53)** — Redesigned into 10 high-value categories, wired all standalone hub routes, and added descriptive tooltips to 100% of FeatureTiles (131 total).
- [x] **System Tray Controller Inspection & Status Checker (v2.3.53)** — Verified tools/fwber-tray.ps1 and tools/fwber-tray.bat, created cross-platform monitor tools/fwber-tray-check.py.
- [x] **Script Housekeeping & Non-Destructive Archiving (v2.3.53)** — Moved duplicate migration tools into tools/legacy/ and enhanced build.bat / start.bat.

## 🔧 Open Items (2026-10-31, v2.3.48 session)

### High Priority
- [x] **Frontend local install never completes (closed v2.3.66, verified stale)** — Toolchain now present (`node_modules/.bin/tsc`, `next` binary) and `fwber-frontend` `tsc --noEmit` exits 0 locally (2026-11-13). The Oct/Nov install failures no longer reproduce; prod-only rule still means local servers stay off by choice, not by breakage.
- [x] **`/rate-my-pussy` route — Robert decision: LEAVE AS-IS (2026-11-01)** — real page, stays unlinked from dashboard. No rename/gate/removal.
- [x] **Solana dual-adapter migration (v2.3.54)** — `PhantomWalletAdapter` + `SolflareWalletAdapter` both missing from installed wallets 0.19.40. Migrate `SolanaProvider.tsx` imports.
- [x] **Duplicate-surface merges — resolved via cross-links, no deletions (v2.3.53, Robert-approved)** — burner <-> burner-links, journals -> journal (canonical), unlocks ledger -> hub. `/home` kept as back-link target.


- [x] **131/179 coverage + create-subpage analysis (v2.3.51)** — Appeals, Synced Contacts, Venue Dashboard tiles; all create-subpages verified reachable in-page (no action needed).- [x] **Dead-link purge + 128/179 coverage (v2.3.50)** — 10 dead tiles removed (full 118-href scan now clean); burner/journals pairs disambiguated by retitle; hardware, federation-settings, business-profile, group-matching tiles added. Final 20 unlinked all intentional and listed in CHANGELOG.- [x] **Dashboard coverage 102 -> 124 of 179 routes (v2.3.49)** — 22 tiles with tooltips; `/burner` restored after route-group miss; create/venue/dev/policy intentionally unlinked.

- [x] **Coverage finalized 131/179 by design (v2.3.52)** — final 17 each verified (content read + wiring grepped); 0 tiles justified, all exclusions reasoned. Tile-level consolidation exhausted.- [x] **`@sentry/replay` declared + optional-require (v2.3.54)** — dep added to `fwber-frontend/package.json`; `tsc` TS2307 closed (frontend tsc 0 errors).

- [x] **Duplicate pairs merged via cross-links, no deletions (v2.3.53)** — burner <-> burner-links, journals -> journal, unlocks ledger -> hub. rate-my-pussy left as-is per Robert.- [x] **Solana wallet-adapter drift — duplicate entry, closed by v2.3.54 item above** (imports moved to `-phantom`/`-solflare` packages).

### Medium Priority
- [x] **dnd-kit / laravel-echo type declarations (v2.3.54 / v2.3.61)** — Consolidated into canonical `fwber-frontend/types/third-party-shims.d.ts` and typed `(photo: any)` in `app/photos/page.tsx`.
- [x] **Duplicate journal surfaces — merged upstream (Protocol #277)** — `/journals` server-side redirects to canonical `/journal`; cross-links preserved non-destructively.
- [x] **`nodemon` dropped (v2.3.53)** — backend `dev` runs on `tsx watch`; removed dead `nodemon` dependency from `fwber-backend-ts/package.json`.
- [x] **Socket "Disconnected" header badge — fixed upstream (Protocol #277, `9daad0440`)** — `useSocketLogic`/`useWebSocket` surface reconnect state to header badge (verified Connected on both QA accounts in Nov 6 live test).
- [ ] **Off-site backup replication** — still BLOCKED on Robert (needs Storage Box / S3 / DreamHost SSH key target).

## 🟢 Completed: Dev-Boot Fix + Dashboard Cleanup (v2.3.48, 2026-10-31)
- [x] **Backend `npm run dev` crash-loop fixed** — `nodemon src/index.ts` could not resolve ESM `.js` imports under Node 26; now `tsx watch src/index.ts` (tsx 4.23.15). Health 200 verified.
- [x] **Wallet login UI wiring fixed** — `fetchWalletNonce` destructured in login page + declared on `AuthContextType`; TS2304 gone.
- [x] **Dashboard cleanup** — 4 dead tiles removed (`/chat-rooms`, `/burner`, `/icebreakers`, `/travel-mode` have no routes); Privacy dup removed; `/recommendations` + `/spaces` retitled; every tile now shows an info marker.
- [x] **Truncated `csstype` types restored** — index.d.ts was cut at line 14,335 of 21,806; re-fetched from registry. `tsc` 8 -> 7 errors, zero in touched files.
- [x] **`tools/README.md` corrected** — inventory now matches `tools/`, `tools/scripts/`, `tools/migrations/`, `tools/archive/` reality.
## 🔧 Open Items (2026-10-18)

### High Priority
- [x] **Image URL migration (verified clean 2026-11-12, v2.3.60)** (currently intercepted at UI layer via `getAvatarUrl` + `OptimizedImage` dead-host check)
- [x] **436 unguarded `.map()` calls (closed v2.3.65, verified)** — Full-frontend audit: 651 `.map(` sites, 131 `Array.isArray` guards, zero remaining `?.x.map(` optional-chain crash patterns (the v2.3.59 sweep fixed the last two: `NemesisFinder`, Privacy groups). Remainder are literal/state arrays. Re-open only if a new API-response `.map()` ships unguarded.

### Medium Priority
- [ ] **Uploads directory empty on Hetzner**: No uploaded images survived previous deployments. User avatars/photos from old deployments are permanently lost — users must re-upload.
- [x] **Login 401 transient failures (stale duplicate — root-caused & fixed v2.3.39)** — Autonomous governance layer dropped valid logins at health ≤70; auth is now fail-open with typed 401s. See the 2026-10-22 entry below.
- [ ] **`bigint: Failed to load bindings`**: Non-critical (pure JS fallback works). Could rebuild native bindings for performance.

### Low Priority
- [ ] **`CHANGELOG.md.new`** (182 KB): Leftover draft at repo root — historical record, leave as-is per policy.
- [x] **border-gray-900 (v2.3.59)** - already resolved upstream (theme tokens 100% done); stale item closed.

### Scoped Out (User Directive 2026-10-18)
- ~~Dashboard consolidation (combine all pages into one)~~ — User: "dont need to consolidate all"

## 🟢 Recently Completed (2026-10-18)
- [x] **Theme token migration**: 4,863 replacements across 825 files — only `text-white` (intentional) remains
- [x] **Dashboard nav coverage**: 104/180 routes directly linked (up from 88); admin panel links gated by `is_moderator`
- [x] **Loading/error state coverage**: 180 routes now have `loading.tsx` + `error.tsx`
- [x] **Button `type="button"`**: 452 buttons fixed across 141 files
- [x] **Prisma `matching_options` fix**: Corrected to `chosen_option` in `NarrativeService`
- [x] **Tools cleanup**: Archived 19 stale scripts/configs to `tools/archive/`

## 🟢 Recently Completed: Muse Agent Review Integration (v2.3.43-44, 2026-10-26)
- [x] **Sentry Replay restored** — the "removed in v10" conclusion came from a partial node_modules tree; `@sentry/replay` exists, import path fixed, privacy masking on (Muse caught it).
- [x] **Next-16 fetch/cache audit** (39 sites): 0 authenticated server-component fetches; 1 public fetch missing cache policy fixed to `revalidate: 3600`.
- [x] **Wallet login design adopted** from review (nonce + dual-proof linking, no mandatory SMS 2FA).

## 🟢 Recently Completed: Local LLM Integration (v2.3.42, 2026-10-26)
- [x] **Shared on-box Ollama (`gemma-4-heretic`) wired into fwber** — all AI features (wingman, roasts, icebreakers, narrative reports) now work with ZERO cloud keys and survive cloud outages. `AI_PREFER_LOCAL=true` in production per the box's centralized-LLM policy.
- [x] E2E verified on Hetzner (direct + full fallback chain).

## 🟢 Recently Completed: Next.js 16 + React 19 Migration (v2.3.41, 2026-10-25)
- [x] **next 15→16.4.3, react 18→19.3.1** — last critical dependency cluster cleared. Validated on isolated server test checkout first: build green, 0 TS errors, 0 lint errors, smoke 200s on test port.
- [x] **Redundant next-auth layer removed** (duplicate of the real auth-context flow; its v4 peers rejected Next 16).
- [x] **Turbopack default**, `images.qualities` configured, malformed `favicon.ico` regenerated (Turbopack rejects it), edge runtime dropped from OG-image routes, dead Sentry replay config removed.
- [x] **6 latent bugs fixed**: missing `cn` import (guaranteed crash), duplicate JSX attr, unguarded `other_user`, 3 stale interfaces, untyped query/axios results.

## 🟢 Recently Completed: Security & Dependency Pass (v2.3.40, 2026-10-25)
- [x] **SSRF bypasses closed**: IPv4-mapped IPv6 smuggling, fail-open DNS, redirect-pivot connections; blocklist extended (CGNAT, tunnels); 18 tests incl. regressions.
- [x] **Auth rate limiting**: zero-dep sliding-window limiter on all auth routes (was: none); trust-proxy fix for real client IPs; live-verified 429s.
- [x] **Dependency audit**: backend 18 → **0 vulns** (nodemailer 10.2.1, sharp 0.35.5, ws et al.); frontend 155 → **112** (protobufjs 7.6.5 override; criticals 2 → 1).
- [x] **78/78 tests** passing locally and on the server.

## 🟢 Recently Completed: Login Reliability & Restore Proof (v2.3.39, 2026-10-22)
- [x] **Transient 401 root cause fixed**: decision engine delegates low-impact actions under degraded health (3+ dangling tasks = score ≤70 = every login rejected); executor audit-log failures killed successful logins; controller dressed every error as "Invalid credentials".
- [x] **AuthError typed errors**: 401 only for deliberate auth failures; infra → generic 500 + server log.
- [x] **failOpen auth**: login/register never gated by the autonomous governance layer.
- [x] **7 new regression tests** (13 passing across decision engine + executor suites).
- [x] **Restore drill PASSED**: latest backup restored into scratch DB, 134/134 tables row-count consistent with production.

## 🟢 Recently Completed: Ops Hardening (v2.3.38, 2026-10-22)
- [x] **Automated fwber backups**: nightly 03:30 → `/var/backups/fwber/` (DB dump + uploads + envs + nginx configs, 14-day retention). First archive verified.
- [x] **Disk reclamation**: 93% → 87% root filesystem (stale `/tmp` backup copies, Docker cache, 2.4GB Next.js build cache).
- [x] **Disk watchdog**: hourly cron — warns ≥90%, auto-clears rebuildable build cache ≥95%.
- [x] **fwber.me retired permanently** (user decision 2026-10-22) — `fwber.online` is the only domain.

## 🟢 Recently Completed: Image Resilience & Cleanup (v2.3.37, 2026-10-22)
- [x] **Missing-upload placeholder**: backend serves neutral gray PNG (HTTP 200) for any missing `/uploads/` image — kills the `_next/image` 500 class permanently.
- [x] **Image-URL migration tool**: `fwber-backend-ts/scripts/migrate-image-urls.mjs` — canonicalizes legacy upload hosts (`fwber.me`/`fwber.site`/`api.*` spellings) → `api.fwber.online/uploads/`, journals every change, dry-run by default.
- [x] **Avatar dead-file cleanup**: avatar URLs pointing at missing files → NULL → DiceBear deterministic avatars (journaled).
- [x] **DEAD_HOSTS regex broadened**: all retired domain spellings intercepted; live `fwber.online` excluded.
- [x] **Theme tokens 100% done**: last `border-gray-900` → `border-foreground`.
- [x] **Root script cleanup**: reusable audit tools tracked in `tools/`, one-time migration/fix scripts tracked in `tools/migrations/` (all retained).

## 🟢 Recently Completed: Phase 9 - Social Velocity & Federation (v2.2.5)
- [x] **WebFinger Discovery**: Implement real handle-to-URI resolution in `FederationService`.
- [x] **ActivityPub Inbound**: Implement `handleCreate` to ingest remote posts.
- [x] **Federated Search**: Update Search UI/API to perform live remote lookups.
- [x] **Activity Center**: Polish unified feed for Likes, Boosts, and Posts.
- [x] **Federated Interactions**: Wire Like/Boost/Reply buttons to ActivityPub outbound triggers.
- [x] **Enhanced Actor Profiles**: Expose real profile data via the ActivityPub actor endpoint.
- [x] **Outbound Follow/Unfollow**: Complete the ActivityPub follow/unfollow handshake.
- [x] **Federated Mentions**: Notify users on remote @mentions.
- [x] **Following Feed**: Personalized feed filtered by outbound follow relationships.
- [x] **Outbox Persistence**: Track all delivered outbound activities.
- [x] **Federated Profiles**: Broadcast ActivityPub Update on profile changes.
- [x] **Inbound Reply Loop**: Auto-store remote replies as local artifact comments.
- [x] **Infrastructure Roadmap**: Finalize production Email setup guide.
- [x] **Activity Lifecycle**: Implement Delete/Undo/Update handlers for full sync.
- [x] **Outbound Undo**: Implement Unlike/Unboost ActivityPub triggers.
- [x] **Profile Handles**: Display federated IDs on public profile pages.
- [x] **Peer Discovery**: Auto-track and manage remote federation servers.

## 🟢 Recently Completed: Phase 8 - Intelligent Match Refinement (v2.1.9)
- [x] **Narrative Compatibility**: AI subagent explains match reasons based on question data.
- [x] **Proximity Unification**: Merged real-time proximity history with matching scores (80/20).
- [x] **Expansion**: Scaled value questions to 100+ (108 total) including Cyber-Noir ethics.
- [x] **UI Wiring**: Integrated narrative reports into MatchInsights and Profile pages.
- [x] **Bug Fix**: Resolved 500 error on federation actor detail endpoint.

## 🟢 Recently Completed: OkCupid Matching Engine (v2.1.5)
- [x] **Geometric-Mean Heuristic**: Implemented mutual-satisfaction matching logic.
- [x] **Value-Based Questions**: Launched `/settings/matching` and seeded Cyber-Noir questions.
- [x] **Discovery Integration**: Injected compatibility scores into the recommendation feed.
- [x] **Site Stability**: Verified full regression suite and resolved frontend build regressions.

## 🟢 Completed: v2.1.6-v2.1.7 Repository Reconciliation
- [x] **Branch Merge**: Forward-merged feat/okcupid-matching-engine and feat/federation-hardening into main.
- [x] **Prisma Regeneration**: Resolved 60 TS errors from new models not in generated client.
- [x] **Frontend Fixup**: Resolved 20 TS errors from merge artifacts (duplicate axios, missing imports, type mismatches).
- [x] **Production DB Sync**: Created 6 new tables (autonomous_actions, autonomous_settings, matching_questions, matching_options, user_matching_answers, user_integrations).
- [x] **Matching Questions Seeded**: 10 OkCupid-style questions live in production.
- [x] **start.bat Updated**: Monorepo-aware dev launcher (backend :4000, frontend :3000).

## 🟢 Recently Completed: Phase 10 - Aura Chat Finalization (v2.3.17)
- [x] **Aura Match Mode**: Toggle discovery based on emotional identity in the matches list.
- [x] **Avatar Real-time Sync**: Wire `EmotionalIdentityService` rendering flow to `EvolvingAvatar` on match cards.
- [x] **Aura-Matched Chat Endpoint**: Expose `/api/chat/aura` to initiate socket-driven atmospheric matches.
- [x] **End-to-End Tests**: Implement `AuraE2E.test.ts` to simulate emotional matching swaps and response handling.
- [x] **Vercel Config**: Add Cache-Control headers to invalidate stale front-end assets on push.

## 🟢 Recently Completed: Phase 10 - Dynamic Identity & Proximity Forum (v2.3.9)
- [x] **Quest Verification**: Use ZK-proofs or NFC tags to verify quest completion tasks.
- [x] **Group Aura**: Aggregate emotions of group chat participants to determine group-wide mood and theme.
- [ ] **Photo Migration**: 157 photos in DB but files missing from uploads directory — need backup restore. *Mitigations shipped in v2.3.37: backend serves a placeholder PNG for any missing `/uploads/` image (no more optimizer 500s), avatar URLs to missing files cleared to NULL (DiceBear fallback), and all nulled references journaled in `fwber-backend-ts/image-url-migration-journal.json` for easy re-pointing after restore. `fwber-backend-ts/scripts/migrate-image-urls.mjs` re-checks existence on demand.*
- [x] ~~**Next.js 15 → 16 major migration**~~ — DONE (2026-10-25, v2.3.41).
- [x] **Wallet login backend (Muse design — DONE v2.3.47, see hardening entry below)** — Server-issued single-use nonces + ed25519 verify shipped and prod-proven (replay → 401). Verified again 2026-11-13: `GET /api/auth/wallet-nonce` live on prod (32-char nonce, 600s TTL), `WalletLogin.test.ts` 15/15. Stale duplicate closed.
- [ ] **"Verified" standard (Muse process)**: future deploys = preserved rollback artifact + interactive prod checklist (login, map, matching, messages, upload, image optimizer) + error/log watch — not just test-port smoke. Framework upgrades and auth-layer changes ship as SEPARATE deploys.
- [x] ~~**RATIFY (Robert): runner-volume auto-prune**~~ — **RATIFIED 2026-10-26 ("enable it")**. Cron runs `AUTO_PRUNE_RUNNER_VOLUMES=1`; `runner-*-cache-*` volumes auto-prune at ≥95% (in-use volumes refused by `docker volume rm`). Tradeoff accepted: occasional full CI rebuilds vs disk-full crashes.
- [ ] **Rebuild-churn watch (commitment to Muse)**: if HyperNexus CI shows rebuild impact from pruned runner caches (job duration deltas vs baseline), report MEASURED numbers with timestamps (`/var/log/disk-watchdog.log` + docker events for correlation) — never impressions.
- [ ] **Disk growth root cause** (box health, outside fwber): auto-prune is mitigation; growth sources are CI runner caches + /opt project growth. Report as "mitigation status vs growth sources", not prunes-as-fixes.
- [ ] **Dead cloud AI credentials**: production `.env` holds a 410-dead NVIDIA key and a 401-invalid OpenAI key — remove or replace with live keys (bypassed while `AI_PREFER_LOCAL=true`).
- [x] **Tooltip hover-out + tap quirks (stale duplicate — fixed v2.3.47)** — Root cause was popper offset trapping upward exits; `disableHoverableContent` at Root fixed it, verified live. Tap behavior was a desktop-viewport artifact. See DONE entry below.
- [x] ~~**React-19-native majors (Muse-reviewed plan)**~~ DONE (2026-10-26, v2.3.45 + v2.3.46): `@radix-ui/react-tooltip` 1.0.7→1.4.1 (deployed v2.3.45) and `react-leaflet` 4.2.1→5.0.0 (deployed v2.3.46, zero source changes needed — components were already v5-shaped). Evidence: `docs/branches/radix-tooltip-1.2-evidence.md` + `docs/branches/react-leaflet-5-evidence.md` (6/6 runtime battery incl. marker VISIBILITY + StrictMode-remount clean; live-prod proof: `/events/[id]` Live Map at 398px, 8/8 tiles, marker visible). **`fwber-frontend/.npmrc` DELETED — `legacy-peer-deps` retired; strict `npm install` measured exit 0 on the live box during deploy.** The React-19 peer migration is complete.
- [x] ~~**Tooltip hover-out/tap quirks ticket**~~ DONE (2026-10-26, v2.3.47): root cause = popper renders ~28px ABOVE the trigger, so a cursor exiting upward entered Radix's hoverable content. Fix: `disableHoverableContent` at Root (Radix 1.4.x moved the prop from Content to Root). Verified live: upward-out (old trap path) closes. Tap quirk = desktop-viewport CDP artifact (tooltips open on focus; taps focus on real devices) — no product change needed.
- [x] **Socket "Disconnected" header badge (closed v2.3.80 — unified source + live audit):** Root cause class was divergent state sources; header and dashboard now share the single `ConnectionStatusBadge` fed by `AuthenticatedRealtimeProvider → useSocketLogic` singleton socket (v2.3.63), with explicit `Reconnecting... (n)` recovery state. 2026-11-13 live audit: backend socket lifecycle inspected (connect/disconnect/reconnect setter fan-out correct), API auth verified end-to-end (QA user 197), and a prod browser login attempt was aborted by the *shared-Edge automation session itself* (server log shows the client-aborted POST) — not reproducible as a product defect. Reopen only with a logged-in screenshot showing persistent Disconnected while API/socket health is green.
- [x] **UI polish (visual pass 2026-10-26 — fully closed v2.3.76 + v2.3.77):** header crowding fixed (v2.3.76); discover/recommendations AI-compat bars added + normalized so fill always matches the % badge (v2.3.77); transient "Disconnected" badge addressed by the unified ConnectionStatusBadge with Reconnecting state (v2.3.63).
- [x] ~~**Wallet login hardening (Muse review flag)**~~ DONE (2026-10-26, v2.3.47): server-issued single-use nonces (16-byte hex, SHA-256 at rest, 10-min TTL, atomic deleteMany consumption) + required `Nonce:` line in the signed message + `users.wallet_address` UNIQUE KEY (duplicates scanned first: zero). E2E on prod: replay → 401 "Nonce invalid, expired, or already used". 15 wallet tests.
- [ ] **Off-site backup replication — NEEDS ROBERT'S TARGET/CREDENTIAL (blocked):** checked 2026-10-26: the Hetzner box has NO SSH keypair or host alias for DreamHost (only authorized_keys/known_hosts present) — the "DreamHost SSH as interim, no new credentials" assumption is FALSE for the Hetzner→DreamHost path. Muse also flags an Oct 25 DreamHost password-expiry email affecting some users. Options: (a) provide DreamHost creds so I can install a key, (b) point me at a Storage Box/S3 target, or (c) a second host.
  **Muse's required evidence package (if review is directed)**: tooltip interaction results (hover, focus, keyboard, mobile tap, `asChild` ref behavior — not just build pass); clean `npm ci` log showing what `legacy-peer-deps` was hiding; `.npmrc` status after the tooltip bump (target: flag gone); rollback target commit; prod smoke results with ACTUAL outcomes; no secrets/PM2 env anywhere. **Branch builds are mine; DEPLOY is Robert's to authorize.**
- [x] **Sentry Session Replay (v2.3.54)**: re-added via `@sentry/replay` — was removed with SDK v10 (integration no longer exists) — re-add if Sentry ships a supported replacement.
- [x] **react-hooks/exhaustive-deps (closed v2.3.75)** — All 9 live warnings fixed with behavior-preserving `useCallback` wrapping (federation peers, synced contacts, quests, photos hook, onboarding auto-save chain) or correct dep additions (`ProtectedRoute` ban state, profile-view `user`, proximity `useMemo`). One intentional exception: `NFCProfileExchange` keeps render-scoped `processNfcData` with a documented eslint-disable (guarded by `lastScan` clearing). ESLint exhaustive-deps scan now reports **zero** warnings; frontend `tsc` 0.
- [x] **Wallet login backend (stale duplicate — route exists)** — `POST /api/auth/login-wallet` + `GET /api/auth/wallet-nonce` are mounted in `routes/auth.ts` via `AuthController`; verified live on prod 2026-11-13. See v2.3.47 hardening entry.
- [ ] **Off-site backup replication**: `/var/backups/fwber/` is on the same disk as production — sync nightly to object storage or another box. Needs a target credential (Storage Box / S3 / second host). DreamHost SSH exists as an interim option.
- [x] ~~**Backup restore drill**~~ — DONE (2026-10-22): `/usr/local/bin/fwber-restore-drill.sh`, monthly cron, first run PASSED (134/134 tables consistent).
- [x] ~~**Transient login 401s**~~ — ROOT-CAUSED & FIXED (2026-10-22, v2.3.39): autonomous governance layer was delegating/dropping valid logins when system health score ≤70; also audit-ledger write failures killed successful logins. Auth now fail-open + typed 401s. See CHANGELOG 2.3.39.
- [x] ~~**fwber.me domain renewal**~~ — RESOLVED (2026-10-22): user retired the domain permanently; `fwber.online` is canonical. Stale nginx `api.fwber.me` server block is harmless (DNS dead) but can be deleted whenever nginx is next touched.
- [ ] **Stripe Live Keys**: Transition from test to live mode for production payments.
- [ ] **Email DNS**: Configure Resend MX/SPF/DKIM/DMARC records for production email.

## 🟢 Recently Completed: Phase 11 - 10,000x Shiny UI (v2.3.8)
- [x] **Glassmorphism Design System**: Complete globals.css rewrite with glass, glow, shimmer utilities.
- [x] **Animated Particles**: Canvas particle system with mouse tracking on all pages.
- [x] **PremiumEffects Components**: AmbientGlow, ShimmerBorder, GlowingDot, PremiumBadge, GradientIcon.
- [x] **3D Landing Hero**: Floating geometric shapes, shooting stars, framer-motion staggered reveals.
- [x] **Dashboard Overhaul**: Glass metric cards, gradient icons, shimmer loading states.
- [x] **UI Components Upgrade**: Card, Button, Badge, Dialog, Input, Skeleton — all glass/premium versions.
- [x] **Logo Reconstruction**: 5-layer 3D logo with outer glow, depth stroke, animated gradient, reflection.
- [x] **Custom Scrollbar**: Thin purple-tinted scrollbar across all pages.
- [x] **Port Migration**: Backend 4002→4003; removed crash-looping systemd service.
- [x] **Quest System**: Created quests table, seeded 5 demo quests, fixed 500 error.

## 🟢 Recently Completed: Phase 10 - Dynamic Identity & Proximity Forum (v2.3.7)
- [x] **Atmospheric Messaging**: Dynamic chat themes based on participant vibes.
- [x] **Conversation Vibe Heuristic**: Backend logic for combined mood detection.

## 🟢 Recently Completed: Phase 10 - Dynamic Identity & Proximity Forum (v2.3.6)
- [x] **Aura-Matched Chat**: Suggested partners based on current emotional headspace.
- [x] **Vibe Compatibility**: Heuristic to compute emotional affinity between users.

## 🟢 Recently Completed: Phase 10 - Dynamic Identity & Proximity Forum (v2.3.5)
- [x] **Community Quests**: Autonomous challenge generation based on neighborhood mood.
- [x] **Quest UI**: Integrated QuestBoard into the user dashboard for live tracking.
- [x] **Quest Rewards**: Automated token distribution upon quest completion.

## 🟢 Recently Completed: Phase 10 - Dynamic Identity & Proximity Forum (v2.3.4)
- [x] **Keyword Targeting**: Added granular matching between offers and sentiment keywords.
- [x] **Vibe ROI Tracking**: Metrics to measure conversion lift from autonomous nudges.
- [x] **Broadcast Attribution**: Link redemptions back to AI-triggered broadcasts.

## 🟢 Recently Completed: Phase 10 - Dynamic Identity & Proximity Forum (v2.3.3)
- [x] **Autonomous Nudging**: Background task to trigger deals based on neighborhood mood.
- [x] **Vibe Intelligence UI**: Dashboard for merchants to track sentiment trends.
- [x] **Historical Vibe API**: Backend support for sentiment logging and retrieval.

## 🟢 Recently Completed: Phase 10 - Dynamic Identity & Proximity Forum (v2.3.2)
- [x] **Aura Discovery**: Displayed user emotions in conversation list and proximity cards.
- [x] **Auto-Refresh**: Background sentiment updates for active users via heartbeat.

## 🟢 Recently Completed: Phase 10 - Dynamic Identity & Proximity Forum (v2.3.1)
- [x] **Threaded Comments**: Backend & Frontend support for nested replies in Local Pulse.
- [x] **AI Merchant Vibe**: Integrated SentimentAnalysisService into merchant APIs.
- [x] **Promotion Affinity**: Logic to match offers with neighborhood sentiment.

## 🟢 Recently Completed: Phase 10 - Dynamic Identity & Proximity Forum (v2.3.0)
- [x] **Sentiment Engine**: Service to analyze user emotion from posts/messages.
- [x] **Emotional Avatars**: Inject `current_emotion` into AI avatar generation prompts.
- [x] **Aura UI**: Expanded `EvolvingAvatar` with Excited, Thoughtful, Cynical styles.
- [x] **Pulse Topics**: Categorized topics (News, Help, Meetups) for neighborhood aid.
- [x] **Admin Federation UI**: Peer management and domain blocking tools.

## 🟢 Recently Completed: Phase 9 - Social Velocity & Federation (v2.2.9)
- [x] **ActivityPub Interop**: Bi-directional social actions and retractions.
- [x] **Hardened Security**: DNS-level SSRF protection and frontend XSS sanitization.
- [x] **AI Wingman Orchestration**: Proactive conversation analysis and social nudging.

## 🔴 Upcoming: Phase 9 - Finalization
- [ ] **ActivityPub Federation**: Inbound WebFinger discovery shipped (v2.3.78) + contract/interop suites green (broadcast, HTTP signatures, inbox, actor/outbox, discovery). Remaining: live-node interop test against a real Mastodon/Pleroma instance (external infra).
- [x] **Email Infrastructure**: Configure Resend DNS records (MX, SPF, DKIM, DMARC) for email delivery.
- [ ] **AI Provider Keys**: Configure OpenRouter/OpenAI API keys for Wingman AI features.
- [x] **Stripe Live Keys**: Switch from test to live Stripe keys for production payments.

[... Historical TODOs moved to ARCHIVE ...]

- Messaging stays match-gated by design (2026-11-08, v2.3.57 session) - not a defect. Do not resurface as FAIL; compose UI appears only in matched conversations.

- [x] **Blocked-users list + unblock UI (v2.3.58)** - Safety page Blocked Users card wired to GET /api/blocks; Unblock per row. Block creation already in ProfileViewModal (v2.3.57, explicit-tap only).

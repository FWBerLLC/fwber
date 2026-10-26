# TODO — fwber Immediate Action Items

> **Version:** 2.3.36
> **Last Updated:** 2026-10-18

---

## 🔧 Open Items (2026-10-18)

### High Priority
- [ ] **Image URL migration**: Rewrite `api.fwber.me/uploads/` URLs in DB to `api.fwber.online/uploads/` (currently intercepted at UI layer via `getAvatarUrl` + `OptimizedImage` dead-host check)
- [ ] **436 unguarded `.map()` calls**: Filter to API-response props and add `Array.isArray` / `|| []` guards (many false positives — literal arrays are safe)

### Medium Priority
- [ ] **Uploads directory empty on Hetzner**: No uploaded images survived previous deployments. User avatars/photos from old deployments are permanently lost — users must re-upload.
- [ ] **Login 401 transient failures**: Occasional "Invalid credentials" then success on retry. May be rate-limit or DB timing. Worth watching.
- [ ] **`bigint: Failed to load bindings`**: Non-critical (pure JS fallback works). Could rebuild native bindings for performance.

### Low Priority
- [ ] **`CHANGELOG.md.new`** (182 KB): Leftover draft at repo root — historical record, leave as-is per policy.
- [ ] **1 remaining `border-gray-900`**: Last hardcoded border color after theme migration.

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
- [ ] **Wallet login backend (Muse design)**: single-use 5–10min domain-bound nonce; `signMessage` (never signTransaction) with domain+address+nonce+issued-time; server-side `@solana/web3.js` ed25519 verify + nonce consume; 15min JWT + rotating hashed refresh in httpOnly/Secure/SameSite cookie; link/unlink/replace require existing JWT (fresh, ≤15min) + fresh signature; log + notify + instant revoke; rate-limit linking; lost-wallet recovery path; optional TOTP only (mandatory SMS 2FA rejected — privacy harm).
- [ ] **"Verified" standard (Muse process)**: future deploys = preserved rollback artifact + interactive prod checklist (login, map, matching, messages, upload, image optimizer) + error/log watch — not just test-port smoke. Framework upgrades and auth-layer changes ship as SEPARATE deploys.
- [x] ~~**RATIFY (Robert): runner-volume auto-prune**~~ — **RATIFIED 2026-10-26 ("enable it")**. Cron runs `AUTO_PRUNE_RUNNER_VOLUMES=1`; `runner-*-cache-*` volumes auto-prune at ≥95% (in-use volumes refused by `docker volume rm`). Tradeoff accepted: occasional full CI rebuilds vs disk-full crashes.
- [ ] **Rebuild-churn watch (commitment to Muse)**: if HyperNexus CI shows rebuild impact from pruned runner caches (job duration deltas vs baseline), report MEASURED numbers with timestamps (`/var/log/disk-watchdog.log` + docker events for correlation) — never impressions.
- [ ] **Disk growth root cause** (box health, outside fwber): auto-prune is mitigation; growth sources are CI runner caches + /opt project growth. Report as "mitigation status vs growth sources", not prunes-as-fixes.
- [ ] **Dead cloud AI credentials**: production `.env` holds a 410-dead NVIDIA key and a 401-invalid OpenAI key — remove or replace with live keys (bypassed while `AI_PREFER_LOCAL=true`).
- [ ] **Tooltip hover-out + tap quirks (pre-existing, version-independent)**: tooltip stays open on pointer-leave and doesn't open on touch-tap — reproduced identically on 1.0.7 and 1.4.1 via CDP (desktop viewport). Investigate separately (likely Radix touch/pointer config or app-level skipDelayDuration).
- [ ] **React-19-native majors (Muse-reviewed plan)**: `@radix-ui/react-tooltip` ✅ DONE (1.0.7→1.4.1, deployed v2.3.45, evidence in `docs/branches/radix-tooltip-1.2-evidence.md`). REMAINING: `react-leaflet` 4.2.1→5.x STRICTLY on its own branch (breaking: no LeafletProvider/MapConsumer/useMapElement/whenCreated; ref callbacks + eventHandlers; ESM-only). Traps to test: MapContainer ref-callback + `useMap()` in children, Popup/Tooltip open-close via eventHandlers, memoized tile-layer options, client-only dynamic import (`ssr:false`) + client-side Leaflet CSS + explicit MapContainer height, default marker icons under Turbopack (set icon URLs or divIcon — test marker VISIBILITY), StrictMode double-mount cleanup ("Map container is already initialized"). Then delete `fwber-frontend/.npmrc` (last blocker). If v5 blocks, use SCOPED npm overrides (not the global legacy flag) as a documented hold.
  **Muse's required evidence package (if review is directed)**: tooltip interaction results (hover, focus, keyboard, mobile tap, `asChild` ref behavior — not just build pass); clean `npm ci` log showing what `legacy-peer-deps` was hiding; `.npmrc` status after the tooltip bump (target: flag gone); rollback target commit; prod smoke results with ACTUAL outcomes; no secrets/PM2 env anywhere. **Branch builds are mine; DEPLOY is Robert's to authorize.**
- [ ] **Sentry Session Replay**: removed with SDK v10 (integration no longer exists) — re-add if Sentry ships a supported replacement.
- [ ] **react-hooks/exhaustive-deps** (14 warnings, pre-existing): each needs behavior analysis to fix safely.
- [ ] **Wallet login backend**: `POST /api/auth/login-wallet` has no server route (frontend calls it). Needs wallet-signature verification design; `wallet.ts` is token payments only.
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
- [ ] **ActivityPub Federation**: Complete end-to-end interop testing with local Mastodon/Pleroma nodes.
- [x] **Email Infrastructure**: Configure Resend DNS records (MX, SPF, DKIM, DMARC) for email delivery.
- [ ] **AI Provider Keys**: Configure OpenRouter/OpenAI API keys for Wingman AI features.
- [x] **Stripe Live Keys**: Switch from test to live Stripe keys for production payments.

[... Historical TODOs moved to ARCHIVE ...]

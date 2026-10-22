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
- [ ] **Off-site backup replication**: `/var/backups/fwber/` is on the same disk as production — sync nightly to object storage or another box for real disaster recovery.
- [ ] **Backup restore drill**: periodically restore a backup archive into a scratch DB to prove the backups actually work.
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

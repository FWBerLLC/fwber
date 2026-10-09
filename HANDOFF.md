# HANDOFF.md — Session Summary

> **Date:** 2026-10-07
> **Agent:** MiMo (Autonomous Cycle v2.3.34)
> **Version:** 2.3.34

---

## Session 2026-10-07 — Dev Stack Bring-Up + Crash Fixes

### What was broken and is now fixed

1. **Backend would not boot at all** (two independent crashes):
   - `src/routes/wingman.ts` called `new OpenAI(...)` at module load. With no
     `OPENAI_API_KEY`/`OPENROUTER_API_KEY` set, the OpenAI SDK throws during
     import and takes the entire API down. Now lazy via `getOpenAI()` with a
     clear "set OPENROUTER_API_KEY or OPENAI_API_KEY" message — matches the
     pattern `NarrativeService` and `lib/wingman-ai.ts` already used.
   - Prisma client had never been generated → `PrismaClient` was not exported
     from `@prisma/client`. Fixed with `npx prisma generate` (v6.4.1). This also
     cleared 82 of 83 `tsc` errors (only 1 remains).

2. **ESM `.js` → `.ts` resolution broken on modern Node.** The codebase uses
   TypeScript `nodenext` imports (`import x from './auth.js'` → `auth.ts`).
   ts-node 10.x no longer remaps these under Node 26, so `npm run dev` crashed
   on the very first route import. Added `fwber-backend-ts/scripts/ts-js-resolve.mjs`,
   a zero-dependency resolve hook that restores the remap.

3. **`npm install` in `fwber-frontend` silently truncated several packages.**
   Network timeouts left partial extractions that only surface at runtime:
   - `next` (229 files vs 6790) → missing `dist/server/require-hook`
   - `caniuse-lite` (168 vs 839) → missing `dist/unpacker/agents`
   - `@next/swc-win32-x64-msvc` (0.9 MB stub, not a valid Win32 app) → forced
     slow WASM SWC fallback
   - `@rollup/rollup-win32-x64-msvc` (854 KB stub) → `ModuleBuildError` 500s

   Fixed by curling the exact tarballs from the npm registry and extracting over
   the broken trees. Native SWC took compile from 381s → 32s.

### What is running now

| Component | Port | PID | Status |
|-----------|------|-----|--------|
| Backend `dist/index.js` | 4003 | 18228 | **Healthy** — HTTP 200 on `/` |
| Frontend `next dev` | 3010 | 760 | Compiling (see note below) |

**Port 3010, not 3000**: port 3000 is held by another workspace project's
`next start` (PID 8816), as are 3001/3003/3005. Those are not fwber processes
and were left alone. fwber dev runs on 3010 locally until 3000 frees up.

**Frontend first-compile is very slow** (worker PID 4816, 1.2 GB RSS). The app
has ~170 routes and `Sentry` wraps every module. Not wedged — just heavy.

### New tooling added

- `tools/fwber-tray.ps1` + `tools/fwber-tray.bat` — Windows tray icon that
  starts/stops/opens the dev stack and can quit the servers cleanly. Answers the
  long-standing "where is the system tray icon?" question: there was none. Kept
  as a minimal WinForms helper rather than an Electron wrapper.
- `build.bat` — unified build entrypoint (backend/frontend/mobile targets).

### Still broken / needs a human

1. **No local MySQL** — `DATABASE_URL` is unset (`no mysql service found`).
   Backend starts and serves `/`, but every Prisma call fails with
   `Environment variable not found: DATABASE_URL`. Created
   `fwber-backend-ts/.env` from `.env.example` as a placeholder.
2. **`.bin` links are missing** in `fwber-frontend/node_modules` (npm died
   before linking). `next` is invoked by path instead. A future `npm install`
   should restore them.
3. **`typescript` resolution confuses Next.js** — package is present and valid,
   but Next intermittently runs `npm install --save-dev typescript` at boot.
4. **Port 3000 collision** with an unrelated project — see above.
5. **DNS/certbot for `fwber.site`** still outstanding (carried from 2.3.33).

---

## Prior session (2026-09-30) — v2.3.33

## Completed Work

### 1. Working Tree Recovery (Critical)

- **Issue**: Entire working tree was staged for deletion (5246 files). Index emptied; only `.git` and `.mimocode` remained on disk.
- **Root cause**: Accidental mass staging of deletions (likely a tooling mishap prior to session).
- **Fix**: `git reset --hard HEAD` restored all 5246 tracked files from commit `e333e48`. Verified clean status, zero untracked/stash loss.
- **Result**: Full monorepo intact — `fwber-backend-ts/`, `fwber-frontend/`, `fwber-geo/`, `fwber-wasm/`, `mobile/`, `docs/`, `tools/`, all root documentation.

### 2. Repository Migration to FWBerLLC/fwber

- **Git remote** retargeted: `robertpelloni/fwber` → `https://github.com/FWBerLLC/fwber.git`
- **All live code & doc references updated**:
  - `fwber-frontend/components/landing/LandingVariantA.tsx` — footer GitHub link
  - `fwber-frontend/components/landing/LandingVariantB.tsx` — open-source badge link
  - `tools/deployment/deploy-production.sh` — `REPO_URL`
  - `docs/deployment/DEPLOYMENT_GUIDE.md` — clone URLs + issues link
  - `docs/SUBMODULE_DASHBOARD.md` — topology remote column
  - `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` — fork reference
  - `SUBMODULE_INVENTORY.md` — repo column
- **Historical logs preserved**: `.tormentnexus/agent_memory/memories.json` retains original `robertpelloni` strings as historical record.

### 2b. Domain Migration: fwber.me → fwber.site

- **106+ tracked files updated** across frontend, backend, mobile, ops, docs, tests
- **Nginx configs renamed**: `fwber.site.conf`, `api.fwber.site.conf`, `geo.fwber.site.conf`, `ws.fwber.site.conf`
- **SSL cert paths**: `/etc/letsencrypt/live/fwber.site/` (certs must be reissued for new domain)
- **Key config surfaces**: `vercel.json`, `next.config.js` (CSP, image domains, rewrites), `.env.example` files, federation handles (`@user@api.fwber.site`), service workers, PWA manifest, mobile `TARGET_DOMAIN`
- **DNS still points to** `5.161.250.43` — DNS records for `fwber.site` must be created/updated at registrar

### 3. Repository Sync & Branch Reconciliation

- `git fetch --all --tags` attempted; large-repo network timeout on pack download (remote refs verified via `git ls-remote` instead).
- **Remote FWBerLLC/fwber**: single branch `main` at `e333e48`. No feature branches outstanding.
- **Local**: single branch `main`, clean working tree. No stashes. No submodules (monorepo).
- **Forward/reverse merge**: Nothing to reconcile — all prior feature branches (including `feat-group-aura-chatroom`) already merged in v2.3.32.
- **Tags on remote**: `v0.3.20`, `v0.3.25`, `v1.0.0-rc1` (legacy).

### 4. Version Governance

- `VERSION` bumped: `2.3.32` → `2.3.33`
- `CHANGELOG.md` entry added for 2.3.33 (migration + recovery)
- `SUBMODULE_DASHBOARD.md` and `SUBMODULE_INVENTORY.md` refreshed

---

## Architecture (v2.3.33)

```
https://fwber.site          → Nginx → localhost:3000 (Next.js)
https://www.fwber.site      → Nginx → localhost:3000 (Next.js)
https://api.fwber.site      → Nginx → localhost:4003 (Express/TS)
https://geo.fwber.site      → Nginx → localhost:8081 (Rust)
https://ws.fwber.site       → Nginx → localhost:4003 (Socket.io)
```

All on Hetzner VPS `5.161.250.43`. Zero cross-origin latency.
Repository: `https://github.com/FWBerLLC/fwber` (monorepo, no submodules).

---

## Next Steps

1. **DNS for fwber.site**: Create A records (`fwber.site`, `www`, `api`, `geo`, `ws`) → `5.161.250.43`
2. **SSL reissue**: Run certbot for `fwber.site` + all subdomains on Hetzner
3. **Nginx reload**: Deploy renamed `*.fwber.site.conf` files and reload nginx
4. **Bing Webmaster Tools**: Submit `https://fwber.site/sitemap.xml`
5. **Stripe Live Keys**: Transition from test to live mode
6. **Email DNS**: Configure Resend MX/SPF/DKIM/DMARC records for `fwber.site`
7. **Cargo Upgrade**: Update Rust toolchain on Hetzner for geo rebuild
8. **Landing Variant B**: Apply glassmorphism/framer-motion treatment
9. **VibePromotionService**: Fix missing `type` field in quest creation (TS warning)
10. **GitHub Actions deploy URLs**: Verify workflows still resolve after org migration (secrets/vars may need re-authorization under FWBerLLC)

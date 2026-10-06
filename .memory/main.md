# fwber — Project Memory

> **Last updated:** 2026-06-22
> **Version:** 2.1.9

---

## Project Purpose

fwber is a privacy-first, proximity-based social platform. It replaces swipe-based dating with AI avatar profiles, fuzzy location proximity matching, and value-based compatibility scoring. The goal is to get users off their phones and into real-world connections.

---

## Current State

### Deployed Topology

| Component | Location | Status |
|-----------|----------|--------|
| **Frontend** | Vercel (fwber.site) | ✅ Deployed |
| **Backend (Express/TS)** | Hetzner VPS `5.161.250.43` port `:4002` | ✅ PM2 online v2.1.5 |
| **Geo Service (Rust)** | Hetzner VPS port `:8081` | ✅ systemd active |
| **Database** | MySQL on Hetzner | ✅ Connected |
| **nginx** | Hetzner reverse proxy `:443` | ✅ Proxying api/ws/geo subdomains |
| **PM2 startup** | `pm2-root.service` | ✅ Enabled for auto-reboot |

### Infrastructure Details

- **Server:** Ubuntu 24.04, 5.161.250.43
- **Node.js:** 24.14.1
- **Rust:** 1.94.1 (via rustup)
- **PHP:** 8.4.19 (legacy, not used)
- **PM2:** Process 0 — `fwber-backend-ts`, pid tracked automatically
- **Uploads directory:** Exists but empty (157 photos in DB reference missing files)
- **Other sites on same server:** bobsgame.com, robertpelloni.com, hypernexus.site, tormentnexus.site, aimoneymachine, sales.fwber.site — none disturbed by fwber deploys
- Port 4000 is occupied by `freellm` (unrelated process)

### Port Registry

| Port | Service | System |
|------|---------|--------|
| 4003 | fwber-backend-ts | `/etc/services` + Windows `services` |
| 8081 | fwber-geo | `/etc/services` + Windows `services` |
| 8080 | freellm-dashboard (not fwber) | taken — fwber-reverb was removed |
| 4000 | freellm | taken — unrelated |

### Deploy Script

`ops/hetzner/scripts/deploy-backend-ts.sh` handles:
- `git pull origin main`
- Full `npm install` (include dev types for build)
- Auto-baseline Prisma migrations if missing
- `npx prisma migrate deploy`
- `npm run build` (tsc)
- `npm prune --production`
- `pm2 restart` + `pm2 save`
- `cargo build --release` for fwber-geo
- `systemctl restart fwber-geo`
- `systemctl reload nginx`

---

## Key Decisions Made

1. **TypeScript backend over PHP Laravel** — The old `fwber-backend` (PHP Laravel) was deprecated. Only `fwber-backend-ts` is active. PHP service files (`fwber-queue`, `fwber-reverb`) were stopped & disabled.
2. **Hetzner VPS + Vercel frontend** — Backend on bare-metal VPS, frontend on Vercel with Next.js rewrites proxying `/api/*` to `https://api.fwber.site`.
3. **Port 4002 instead of 4000** — Changed from 4000 to 4002 to avoid conflict with `freellm` process.
4. **PM2 over systemd** — Backend managed via PM2 with systemd integration for auto-startup.
5. **Prisma baseline migration** — Database was created outside Prisma migrations. A `0000_initial` baseline was created and applied, with deploy script handling re-apply gracefully.

---

## Milestones

### Completed
- v2.1.9 — Intelligent Match Refinement: Narrative compatibility reports, proximity-enhanced matching, 108 matching questions
- v2.1.5 — OkCupid Matching Engine: Geometric-mean heuristic, value-based questions, discovery integration
- v2.1.4 — Federation hardening, auth integration
- Hetzner backend migration — Full production stack running on Hetzner VPS
- Deploy script hardened — Auto-baseline migrations, geo rebuild, PM2 config save

### Planned / In Progress
- Phase 9: Social Velocity & Federation — ActivityPub interop testing with Mastodon/Pleroma
- Email DNS — Configure Resend records for production delivery
- Stripe Live — Transition from test to live keys
- Photo migration — 157 photos in DB but files missing from uploads directory
- Fix Upload dir — Address h.map error from stale frontend chunks (Vercel redeploy triggered)

---

## Known Issues

1. **Avatar photo 404s** — User 137 has a local avatar URL pointing to `/uploads/1778007604927-zsf4wy.png` that doesn't exist on disk. Other 157 profiles use DiceBear (external/working).
2. **Frontend chunk mismatch** — Old dashboard chunk may still be cached; Vercel redeploy was triggered to ship fresh build.
3. **Deleted PHP services** — `fwber-queue` and `fwber-reverb` systemd units disabled (legacy, no PHP app files).
4. **No webhook/smoke notification configured** — `FWBER_SMOKE_NOTIFY_WEBHOOK_URL` not set.

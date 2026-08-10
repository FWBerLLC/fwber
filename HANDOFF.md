# HANDOFF.md — Session Summary

> **Date:** 2026-07-17
> **Agent:** MiMo (Cross-Review Session)
> **Version:** 2.3.32

---

## Completed Work

### 1. Frontend Migration: Vercel → Hetzner

- **`output: 'standalone'`** added to `next.config.js` for self-contained server build
- **PM2 process** `fwber-frontend` running on port 3000
- **Nginx** serves `fwber.me` and `www.fwber.me` → localhost:3000
- **API proxy** `/api/` → localhost:4003 (sub-millisecond latency, was 100-200ms via Vercel)
- **GitHub Action** `deploy-frontend.yml` created for automated Hetzner deployment

### 2. SSL Certificates

- Let's Encrypt cert for `fwber.me` + `www.fwber.me` (single cert, both domains)
- Valid until Oct 15, 2026, auto-renew via certbot cron
- All subdomains already had valid certs (`api`, `geo`, `ws`)

### 3. DNS

- `fwber.me` → `5.161.250.43` (Hetzner)
- `www.fwber.me` → `5.161.250.43` (Hetzner)
- Both resolving correctly via Google DNS and ISP

### 4. Sitemap & SEO

- **sitemap.xml**: 32 public-facing URLs with priorities and change frequencies
- **robots.txt**: Explicit allow/disallow for all routes, sitemap reference
- Ready for Bing Webmaster Tools submission

### 5. Repository Sync

- All feature branches verified fully merged into main
- `feat-group-aura-chatroom` confirmed merged (commit `5460b650d`)
- No unique commits on any branch
- No submodules in this repo
- Upstream (`fwber-code/fwber`) is legacy PHP — diverged completely

### 6. Bug Fixes (from earlier sessions)

- `/api/quests/active` 500 → Fixed (created `quests` table + seeds)
- `/api/topics?featured=true` 403 → Fixed (made endpoints public)
- Photo 404 fallback → `UserAvatar` now falls back to DiceBear on error
- `fwber-api.service` crash-loop (15,966×) → Deleted
- Backend port 4002→4003 migration

---

## Architecture (v2.3.32)

```
https://fwber.me          → Nginx → localhost:3000 (Next.js standalone)
https://www.fwber.me      → Nginx → localhost:3000 (Next.js standalone)
https://api.fwber.me      → Nginx → localhost:4003 (Express/TS)
https://geo.fwber.me      → Nginx → localhost:8081 (Rust)
https://ws.fwber.me       → Nginx → localhost:4003 (Socket.io)
```

All on single Hetzner VPS `5.161.250.43`. Zero cross-origin latency.

---

## Next Steps

1. **Bing Webmaster Tools**: Submit `https://fwber.me/sitemap.xml`
2. **Stripe Live Keys**: Transition from test to live mode
3. **Email DNS**: Configure Resend MX/SPF/DKIM/DMARC records
4. **Cargo Upgrade**: Update Rust toolchain on Hetzner for geo rebuild
5. **Landing Variant B**: Apply glassmorphism/framer-motion treatment
6. **Remove Vercel project**: Clean up Vercel integration (no longer needed)

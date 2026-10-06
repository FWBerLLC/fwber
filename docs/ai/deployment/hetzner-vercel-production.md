# Hetzner + Vercel Production Blueprint

> **Version:** 1.5.3
> **Status:** Recommended deployment topology for restored fwber stack

This document captures the production topology now recommended for fwber after the phased restoration of:
- AI Wingman / Roast
- Premium / Billing
- Merchant / Marketplace

## 1. Topology

### Vercel
Hosts:
- `fwber.site`
- `www.fwber.site`

Role:
- Next.js frontend only

### Hetzner VPS
Hosts:
- `api.fwber.site` → Laravel backend
- `ws.fwber.site` → Reverb websocket server
- `geo.fwber.site` → Rust geo service

Role:
- API
- queue workers
- scheduler
- Redis
- MySQL
- Stripe webhook processing
- restored AI/premium/merchant runtime

## 2. Suggested Hetzner Sizes

### Recommended practical target
- 4–8 vCPU
- 8–16 GB RAM
- 80–160+ GB NVMe

### Stronger shared-host target
If the same machine may also host `bobsgame.com` services:
- 8 vCPU
- 16 GB RAM
- 160+ GB NVMe

### Minimum starter
- 2 vCPU
- 8 GB RAM

This minimum can work, but may require resizing sooner if realtime traffic, builds, workers, and geo indexing increase together.

## 3. DNS

Create records:
- `fwber.site` → Vercel
- `www.fwber.site` → Vercel
- `api.fwber.site` → Hetzner VPS IP
- `ws.fwber.site` → Hetzner VPS IP
- `geo.fwber.site` → Hetzner VPS IP

## 4. Services on the VPS

Install:
- Nginx
- PHP 8.4 + PHP-FPM
- Composer
- Node.js LTS
- MySQL
- Redis
- Rust toolchain
- Certbot
- systemd-managed services

## 5. systemd Services

Use dedicated service units for:
- `fwber-queue`
- `fwber-reverb`
- `fwber-geo`

This is preferred over ad-hoc `nohup` background processes because production should survive shell disconnects and system reboots predictably.

Copy-ready templates now exist in:
- `ops/hetzner/systemd/fwber-queue.service`
- `ops/hetzner/systemd/fwber-reverb.service`
- `ops/hetzner/systemd/fwber-geo.service`

## 6. Environment Variable Split

### Vercel frontend env
```env
NEXT_PUBLIC_APP_URL=https://fwber.site
NEXT_PUBLIC_API_URL=https://api.fwber.site
NEXT_PUBLIC_REVERB_HOST=ws.fwber.site
NEXT_PUBLIC_REVERB_SCHEME=https
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Backend env
```env
APP_URL=https://api.fwber.site
FRONTEND_URL=https://fwber.site
QUEUE_CONNECTION=redis
CACHE_STORE=redis
SESSION_DRIVER=redis
PAYMENT_DRIVER=stripe
STRIPE_SECRET=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
GEO_SCREENER_ENABLED=true
GEO_SCREENER_URL=https://geo.fwber.site
```

## 7. Deployment Order

Copy-ready bootstrap and deploy scripts now exist in:
- `ops/hetzner/scripts/bootstrap-ubuntu.sh`
- `ops/hetzner/scripts/deploy-backend.sh`
- `ops/hetzner/scripts/smoke-check.sh`
- timestamped smoke-check reports under `logs/deploy-reports/` when `FWBER_RUN_SMOKE_CHECK=1`

Nginx virtual host templates exist in:
- `ops/hetzner/nginx/api.fwber.site.conf`
- `ops/hetzner/nginx/ws.fwber.site.conf`
- `ops/hetzner/nginx/geo.fwber.site.conf`


1. Provision Hetzner VPS
2. Secure SSH + firewall
3. Install stack
4. Clone repo
5. Configure backend env
6. Run migrations
7. Build and run geo service
8. Start workers/reverb/scheduler
9. Configure Nginx and TLS
10. Configure Vercel env + frontend deploy
11. Run `php artisan deploy:verify`
12. Run `ops/hetzner/scripts/smoke-check.sh`
13. Validate restored surfaces (`/roast`, `/premium`, `/merchant/*`, marketplace purchases)

## 8. Validation Checklist

After cutover:
- [ ] `php artisan deploy:verify` reports healthy critical services
- [ ] `ops/hetzner/scripts/smoke-check.sh` passes with the appropriate env tokens/keys
- [ ] JSON/Markdown smoke-check reports are archived for the cutover run
- [ ] smoke-check diagnostics are reviewed and any flagged remediation items are addressed before sign-off
- [ ] endpoint fingerprint rows are reviewed so server headers / remote IPs match the expected Hetzner-Vercel topology
- [ ] DNS appendix rows are reviewed so host resolution matches the intended Hetzner/Vercel split
- [ ] drift-diff artifacts are reviewed against the previous smoke report when a prior deploy report exists
- [ ] notification artifacts/webhook output are reviewed if deploy notifications are enabled
- [ ] `/api/health`, `/api/health/liveness`, and `/api/health/readiness` respond correctly
- [ ] auth routes behave correctly
- [ ] websocket connection succeeds
- [ ] geo endpoint is reachable
- [ ] premium purchase path works
- [ ] merchant registration works
- [ ] storefront purchase creates receipt + redemption code
- [ ] migrations complete cleanly with existing column/index drift guards

## 9. Why This Topology

This topology is recommended because fwber is no longer just a simple frontend + PHP site. It now again contains:
- realtime sockets
- queue workers
- billing
- merchant purchases
- geo microservice
- phased restored feature surfaces requiring stronger backend control

That makes **Vercel frontend + Hetzner VPS backend** a better operational fit than legacy shared hosting guidance.

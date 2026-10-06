# DEPLOY.md — The fwber Operations Guide

> **Last Updated:** 2026-05-31
> **Version:** 2.1.4

This document is the operational source of truth for deploying the active fwber stack after the restoration phases. The recommended topology is now:

- **Frontend:** Vercel
- **Backend / Realtime / Geo / Data:** Hetzner VPS

This replaces the older DreamHost-centered production recommendation.

---

## 1. Recommended Production Topology

### Frontend (`fwber.site`)
Deploy `fwber-frontend` to **Vercel**.

### Hetzner VPS
Host the following on a single production VPS initially:
- `api.fwber.site` → Laravel backend
- `ws.fwber.site` → Laravel Reverb websocket server
- `geo.fwber.site` → Rust `fwber-geo` microservice
- MySQL
- Redis
- queue workers
- scheduler / cron

### Suggested VPS Size
- **Preferred:** 4–8 vCPU, 8–16 GB RAM, 80–160+ GB NVMe
- **Best practical target:** 8 vCPU / 16 GB when sharing capacity with other projects like `bobsgame.com`
- **Minimum acceptable starter:** 2 vCPU / 8 GB, with the expectation that you may resize upward later

---

## 2. DNS Layout

Point domains as follows:

- `fwber.site` → Vercel
- `www.fwber.site` → Vercel
- `api.fwber.site` → Hetzner VPS public IP
- `ws.fwber.site` → Hetzner VPS public IP
- `geo.fwber.site` → Hetzner VPS public IP

---

## 3. Vercel Frontend Configuration

### Vercel Project
- **Root Directory:** `fwber-frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `.next`

### Required Environment Variables
```env
NEXT_PUBLIC_APP_URL=https://fwber.site
NEXT_PUBLIC_API_URL=https://api.fwber.site
NEXT_PUBLIC_REVERB_HOST=ws.fwber.site
NEXT_PUBLIC_REVERB_SCHEME=https
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_FRONTEND_VERSION=<current frontend version>
NEXT_PUBLIC_PROJECT_VERSION=<current root version>
```

### Notes
- Do **not** append `/api` to `NEXT_PUBLIC_API_URL`
- Let Vercel own the apex/frontend DNS records
- Keep backend-only secrets out of Vercel

---

## 4. Hetzner Backend Stack

Install and configure the following on Ubuntu 24.04 LTS:
- Nginx
- PHP 8.4 + PHP-FPM
- Composer
- Node.js LTS (for build tooling where needed)
- MySQL
- Redis
- Rust toolchain (or deploy prebuilt geo binary)
- systemd services for workers/reverb/geo
- Certbot TLS certificates

### Directory Convention
Suggested path:
```bash
/var/www/fwber/repo/
```

Repository layout beneath it:
- `/var/www/fwber/repo/fwber-backend`
- `/var/www/fwber/repo/fwber-frontend`
- `/var/www/fwber/repo/fwber-geo`

---

## 5. Backend Environment (`fwber-backend/.env`)

Use a production-oriented shape like:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.fwber.site
FRONTEND_URL=https://fwber.site
SESSION_DOMAIN=.fwber.site
SANCTUM_STATEFUL_DOMAINS=fwber.site,www.fwber.site

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fwber
DB_USERNAME=fwber
DB_PASSWORD=CHANGE_ME

CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

BROADCAST_CONNECTION=reverb
REVERB_APP_ID=fwber
REVERB_APP_KEY=CHANGE_ME
REVERB_APP_SECRET=CHANGE_ME
REVERB_HOST=ws.fwber.site
REVERB_PORT=443
REVERB_SCHEME=https

GEO_SCREENER_ENABLED=true
GEO_SCREENER_URL=https://geo.fwber.site

PAYMENT_DRIVER=stripe
STRIPE_KEY=sk_live_...
STRIPE_SECRET=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Important Notes
- `QUEUE_CONNECTION=redis` is now preferred over older database-queue guidance
- `CACHE_STORE=redis` and `SESSION_DRIVER=redis` are the production recommendation
- backend production should assume active restored systems exist: AI, premium billing, merchant marketplace, websockets, geo

---

## 6. Deployment Commands

### Initial Backend Bring-Up
```bash
cd /var/www/fwber/repo/fwber-backend
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --force
php artisan storage:link
php artisan optimize:clear
php artisan optimize
```

### Re-Deploy Sequence
Use the in-repo deploy script for the repeatable path. Note that there are separate scripts for the PHP and TypeScript backends.

#### TypeScript Backend (fwber-backend-ts)
GitHub Actions deployment for the TS backend targets Hetzner via `.github/workflows/deploy-backend.yml` (Main/Production) and `.github/workflows/deploy-staging.yml` (Staging).

To manually deploy the TS backend:
```bash
# Deploy main (Production)
/var/www/fwber/repo/ops/hetzner/scripts/deploy-backend-ts.sh main

# Deploy staging
/var/www/fwber/repo/ops/hetzner/scripts/deploy-backend-ts.sh staging
```

#### PHP Backend (fwber-backend)
GitHub Actions backend deployment should now target Hetzner as well, using `.github/workflows/deploy-backend.yml` plus repository secrets:
- note: the deploy script now explicitly sources rustup Cargo from `~/.cargo/env` / `~/.cargo/bin` so `fwber-geo` builds correctly in non-login CI SSH sessions as well as manual shells
- validated: the GitHub `Deploy Backend (Hetzner)` workflow has now completed successfully end-to-end after secrets setup and the rustup-path fix
- supporting CI workflows were also trimmed/aligned so backend/frontend verification no longer competes with stale duplicate pipelines
- frontend CI lockfile drift was resolved by resyncing `fwber-frontend/package-lock.json`, which should allow the dedicated frontend workflow to install/build cleanly again
- shared log write access on Hetzner is now handled via ACLs on `storage/logs` rather than Monolog chmod attempts, preventing deploy-time artisan failures against rotated `www-data` log files
- the dedicated frontend GitHub build now targets Node.js 24 so CI uses the same runtime family as the locally verified lockfile/build flow
- public discovery routes like `/nodeinfo/2.0` must also be guarded against optional federation-era schema drift, even when federation is not the active feature focus
- `HETZNER_HOST`
- `HETZNER_USERNAME`
- `HETZNER_SSH_KEY`
- optional `HETZNER_PROJECT_PATH`
- optional `HETZNER_REVERB_APP_KEY`


```bash
FWBER_RUN_SMOKE_CHECK=1 /var/www/fwber/repo/ops/hetzner/scripts/deploy-backend.sh
```

That path now writes timestamped smoke-check reports under:

```bash
/var/www/fwber/repo/logs/deploy-reports/<timestamp>/
```

Override the report root if needed:

```bash
FWBER_DEPLOY_REPORT_DIR=/var/log/fwber-deploy-reports \
FWBER_RUN_SMOKE_CHECK=1 /var/www/fwber/repo/ops/hetzner/scripts/deploy-backend.sh
```

If you need the manual equivalent, it remains:

```bash
cd /var/www/fwber/repo
git pull origin main

cd fwber-backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize:clear
php artisan optimize
php artisan deploy:verify

cd ../fwber-geo
cargo build --release

sudo systemctl restart fwber-queue
sudo systemctl restart fwber-reverb
sudo systemctl restart fwber-geo
sudo systemctl reload nginx
/var/www/fwber/repo/ops/hetzner/scripts/smoke-check.sh
```

---

## 7. Long-Running Services

Run the following under `systemd`:

### Queue Worker
```bash
php artisan queue:work --sleep=3 --tries=3 --timeout=120
```

### Reverb
```bash
php artisan reverb:start --host=127.0.0.1 --port=8080
```

### Geo Service
```bash
/var/www/fwber/repo/fwber-geo/target/release/fwber-geo
```

### Scheduler
Use cron or a persistent scheduler process:
```cron
* * * * * cd /var/www/fwber/repo/fwber-backend && /usr/bin/php artisan schedule:run >> /var/log/fwber-scheduler.log 2>&1
```

---

## 8. Nginx Proxy Layout

### `api.fwber.site`
- Serve Laravel `public/`
- Pass PHP to `php8.4-fpm`

### `ws.fwber.site`
- Reverse proxy to Reverb on `127.0.0.1:8080`
- Ensure websocket upgrade headers are passed through

### `geo.fwber.site`
- Reverse proxy to Rust geo service on `127.0.0.1:8081`

The detailed Hetzner/Vercel production blueprint lives in:
- `docs/ai/deployment/hetzner-vercel-production.md`

Ready-to-copy infrastructure templates also live in:
- `ops/hetzner/nginx/`
- `ops/hetzner/systemd/`
- `ops/hetzner/scripts/`

---

## 9. Post-Deployment Verification

Always verify the following after a major version bump or infrastructure move:

Automation support now exists in:
- `ops/hetzner/scripts/smoke-check.sh`
- `ops/hetzner/scripts/deploy-backend.sh` (`FWBER_RUN_SMOKE_CHECK=1`)
- timestamped smoke-check report artifacts under `logs/deploy-reports/` (or `FWBER_DEPLOY_REPORT_DIR`)
- remediation-oriented diagnostics inside the generated smoke-check reports
- endpoint fingerprints inside the generated smoke-check reports (remote IP, server header, redirects, body excerpts)
- DNS resolution appendix inside the generated smoke-check reports (resolved addresses per public host)
- drift-diff artifacts comparing the newest smoke report with the previous one when available
- compact notification artifacts (and optional webhook publishing) summarizing smoke + drift state
- live Hetzner backend execution with local MySQL import and active queue/reverb/geo services
- privilege-safe deploy execution when run as `deploy` rather than only `root`
- corrected websocket smoke probing so post-cutover websocket validation no longer false-fails on an invalid test key

1. [ ] Frontend Vercel deploy is green
2. [ ] `php artisan deploy:verify` returns healthy or only expected non-critical degradations
3. [ ] `https://api.fwber.site/api/health` reports expected version and service state
4. [ ] `https://api.fwber.site/api/auth/login` returns expected validation/auth behavior
5. [ ] `/roast` works against the live API
6. [ ] `/premium` upgrade initiation works
7. [ ] `/merchant/register` and `/merchant/dashboard` work
8. [ ] `wss://ws.fwber.site` accepts websocket traffic
9. [ ] `https://geo.fwber.site` responds successfully
10. [ ] queue workers are processing jobs
11. [ ] scheduler is firing recurring tasks
12. [ ] migrations complete without duplicate-index or missing-column drift failures

---

## 10. Stripe Billing Go-Live Checklist

Run this checklist before enabling live billing:

1. [ ] Confirm frontend Vercel env contains `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
2. [ ] Confirm backend `.env` contains `PAYMENT_DRIVER=stripe`, `STRIPE_SECRET`, and `STRIPE_WEBHOOK_SECRET`
3. [ ] Register the production Stripe webhook endpoint: `https://api.fwber.site/api/stripe/webhook`
4. [ ] Subscribe to premium and commerce relevant events:
   - `payment_intent.succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. [ ] Verify `/premium` opens Stripe checkout when configured
6. [ ] Verify marketplace purchases stop using mock mode and require real payment confirmation in production
7. [ ] Complete one live/test premium purchase and one marketplace purchase
8. [ ] Verify webhook-driven state changes are reflected in premium status and merchant payment history

---

## 11. Legacy Note

Earlier DreamHost deployment guidance should now be treated as **legacy reference only**. fwber’s active production recommendation is **Hetzner VPS + Vercel frontend**.

### Autonomous Monitoring
To enable real-time monitoring of the autonomous protocol, ensure the `autonomous_actions` and `autonomous_settings` tables are migrated. The dashboard is available at `/admin/monitoring` for users with the `is_moderator` flag.

### OkCupid Matching Engine (v2.1.5+)
The new matching engine requires additional Prisma models. Ensure you run `npx prisma generate` in `fwber-backend-ts` after deployment.
- **Required Tables**: `matching_questions`, `matching_options`, `user_matching_answers`.
- **Seeding**: Run `node dist/lib/seeds/matching-questions.js` (or use the provided seed script via the backend maintenance console) to populate initial value-based questions.

### Staging Operations
The platform supports a dedicated staging environment for pre-production validation.

**Staging Deployment**:
1. Push changes to the `staging` branch.
2. The GitHub Action `Deploy Backend (Hetzner Staging)` will automatically trigger.
3. To manually deploy from the Hetzner terminal:
   ```bash
   /var/www/fwber/repo/ops/hetzner/scripts/deploy-backend-ts.sh staging
   ```

**Staging Validation**:
1. Check staging health: `https://api-staging.fwber.site/api/health`
2. Run automated regression: `cd fwber-backend-ts && npm run test`
3. Verify matching engine UI at `/settings/matching` on the staging frontend.

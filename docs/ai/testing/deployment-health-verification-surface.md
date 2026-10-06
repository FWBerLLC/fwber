# Deployment Health & Verification Surface — Testing Notes

**Date:** 2026-04-04  
**Version:** 1.4.6

## Scope
This testing pass validates the new deployment-readiness surface added for Hetzner/Vercel production rollout:
- `GET /api/health`
- `GET /api/health/liveness`
- `GET /api/health/readiness`
- `GET /api/health/metrics`
- `php artisan deploy:verify`

## Automated Validation
Executed from `fwber-backend/`:

```bash
php artisan test tests/Feature/HealthEndpointsTest.php \
  tests/Feature/MerchantTrustModerationTest.php \
  tests/Feature/MerchantRestoreTest.php \
  tests/Feature/PremiumRestoreTest.php \
  tests/Feature/AiWingmanRestoreTest.php \
  tests/Feature/CoreDatingFlowTest.php \
  tests/Feature/OptimizeCoreIndexesMigrationTest.php
```

### Result
- **34 tests passed**
- **112 assertions**

## Focused Assertions
`HealthEndpointsTest.php` verifies:
- `/api/health` returns a structured payload containing version, environment, checks, and metrics
- `/api/health/liveness` returns `200` with `status=alive`
- `/api/health/readiness` returns `200` with `status=ready` in the local validated configuration
- `/api/health/metrics` returns structured `redis` and `database` keys

## Manual / CLI Validation
Executed:

```bash
php artisan deploy:verify --json
```

### Observed Result
- overall status: **healthy**
- local workstation showed **non-critical Redis degradation** because the active config does not require Redis-backed services in this environment

## Expected Production Usage
After Hetzner provisioning, operators should validate:
1. `php artisan deploy:verify`
2. `curl https://api.fwber.site/api/health`
3. `curl https://api.fwber.site/api/health/readiness`
4. Nginx/systemd service status for backend queue, Reverb, and geo-service

## Risk Notes
- Redis health is intentionally treated as critical only when the active runtime configuration depends on Redis-backed services. This reduces false negatives in lean or local environments.
- Readiness can still fail legitimately in production if DB/cache/storage are unavailable or if Redis-backed runtime features are required but misconfigured.

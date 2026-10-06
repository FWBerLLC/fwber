# Rollback Procedures

Purpose: Safe and repeatable rollback process for fwber.site production deployments.

Last updated: 2025-11-15

---

## When to Rollback vs. Hotfix

Rollback if any of the following are true:
- Impact: Critical outage or P0 user-facing issue
- Scope: Widespread errors impacting core flows (auth, profile, matches, messaging)
- Risk: Hotfix would be risky, untested, or time-consuming

Consider a hotfix if:
- The issue is isolated and low-risk to patch quickly
- A clear, minimal fix is known and validated in staging

---

## Prerequisites

- Access to production server (SSH)
- Git history up-to-date
- Backups are recent (<4 hours) if database changes were deployed
- Team notified in incident channel

---

## Rollback Script Overview

- Script: `fwber-backend/rollback.sh`
- Capabilities:
  - Roll back to a specific commit (`--to-commit <sha>`) or previous commit (default)
  - Optional database migration rollback (`--with-db`)
  - Dry-run mode
  - Composer reinstall and cache rebuild

---

## Standard Rollback (Application Only)

Use when database schema did not change or can remain as-is.

```bash
# Preview
./rollback.sh --dry-run

# Execute rollback to previous commit
./rollback.sh
```

Verification:
- `php artisan about` returns without errors
- Health endpoint: `GET /health` returns status `ok`
- Smoke test critical flows

---

## Rollback Including Database Migrations

Use when migrations were applied and the previous code expects the prior schema.

```bash
# Preview
./rollback.sh --with-db --dry-run

# Execute
./rollback.sh --with-db
```

Notes:
- If migrations are not reversible, restore database from pre-deploy backup instead (see Disaster Recovery in `DATABASE_BACKUP_STRATEGY.md`).
- Confirm data loss implications before proceeding.

---

## Rollback to a Specific Commit

```bash
# Preview changes to be rolled back
./rollback.sh --to-commit <target-commit> --dry-run

# Execute
./rollback.sh --to-commit <target-commit>
```

Find commit:
```bash
git log --oneline -n 10
```

---

## Communication & Coordination

- Announce start of rollback in incident channel
- Pin the current and target commit SHA
- Assign roles: Driver (runs command), Scribe (notes timeline), Verifier (smoke tests)
- Post updates at each milestone:
  - Entering maintenance mode
  - Code checkout complete
  - Dependencies installed
  - Caches rebuilt
  - Health checks passed
  - Smoke tests passed
- Close the incident after validation; file a post-mortem

---

## Validation Checklist

- [ ] `php artisan about` succeeds
- [ ] `php artisan route:list` shows expected routes
- [ ] Health checks `/health`, `/health/readiness` pass
- [ ] Redis and DB connectivity verified (from health)
- [ ] Queue workers restarted: `php artisan queue:restart`
- [ ] Storage symlink present: `php artisan storage:link` (if needed)
- [ ] API smoke tests: auth, profile, matches, messaging
- [ ] No error spikes in logs (Sentry, `storage/logs/*.log`)

---

## Failure Handling

If rollback fails:
- Re-run with `--dry-run` to understand failure point
- If composer install fails: clear vendor and reinstall
- If config issues: `php artisan config:clear && php artisan config:cache`
- If migrations not reversible: restore database from pre-deploy backup
- As last resort: roll forward with an emergency hotfix

---

## Appendices

### Smoke Test Commands (Examples)

```bash
# Health
curl -fsS http://localhost:8000/health | jq .

# Auth
curl -sX POST http://localhost:8000/api/login -d '{"email":"test@example.com","password":"secret"}' -H "Content-Type: application/json"

# Profiles
curl -fsS http://localhost:8000/api/profile -H "Authorization: Bearer <token>"
```

### References
- `deploy.sh` – deployment with pre-migration backup
- `rollback.sh` – rollback automation
- `docs/operations/DATABASE_BACKUP_STRATEGY.md` – backup & restore procedures
- `docs/operations/HEALTH_CHECK_GUIDE.md` – health endpoints and monitoring

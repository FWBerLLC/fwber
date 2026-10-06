# Smoke Check Report Artifacts — Testing Notes

**Date:** 2026-04-04  
**Version:** 1.4.8

## Scope
This testing pass validates the report-artifact extension added to:
- `ops/hetzner/scripts/smoke-check.sh`
- `ops/hetzner/scripts/deploy-backend.sh`

## Static Validation
Executed from repo root:

```bash
bash -n ops/hetzner/scripts/smoke-check.sh
bash -n ops/hetzner/scripts/deploy-backend.sh
```

### Result
- syntax passed for both scripts

## Live Smoke Validation
Executed:

```bash
FWBER_SKIP_LOCAL_ARTISAN=1 \
FWBER_SKIP_WEBSOCKET=1 \
FWBER_REPORT_DIR=<tmp> \
bash ops/hetzner/scripts/smoke-check.sh
```

## Observed Result
The script correctly:
- emitted console output
- returned non-zero on real failures
- wrote `smoke-check-summary.json`
- wrote `smoke-check-summary.md`

### Public-domain findings from that run
Passes:
- frontend reachability (`307`)
- invalid-login contract (`422`)
- public roast preview (`200`)

Failures:
- `/api/health` → `404`
- `/api/health/liveness` → `404`
- `/api/health/readiness` → `404`
- `geo.fwber.site/nearby` → `404` with Vercel deployment-not-found message

Warnings:
- local artisan check skipped intentionally
- websocket probe skipped intentionally
- authenticated smoke probes skipped because no tokens were supplied

## Regression Found and Fixed During Testing
The first report-writing run exposed a Markdown generation bug caused by dash-prefixed `printf` format strings.

Fix applied:
- switched report-writer format calls to `printf -- ...`

After the fix:
- both JSON and Markdown reports generated successfully even on a failing smoke run

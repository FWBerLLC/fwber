# Smoke Check Diagnostics & Remediation Hints — Testing Notes

**Date:** 2026-04-04  
**Version:** 1.4.9

## Scope
This testing pass validates the new diagnostics/remediation layer added to:
- `ops/hetzner/scripts/smoke-check.sh`

## Validation Performed
### Static validation
Executed:

```bash
bash -n ops/hetzner/scripts/smoke-check.sh
```

### Live report validation
Executed:

```bash
FWBER_SKIP_LOCAL_ARTISAN=1 \
FWBER_SKIP_WEBSOCKET=1 \
FWBER_REPORT_DIR=<tmp> \
bash ops/hetzner/scripts/smoke-check.sh
```

## Observed Result
The generated reports now include diagnostics with remediation hints.

Validated diagnostics from the live public-domain run:
- backend route drift on `api.fwber.site`
- geo domain still pointing at Vercel or a missing Vercel target
- authenticated smoke coverage incomplete
- partial-health narrowing hint

## Why This Validation Matters
The key behavior is not just that the smoke script still fails correctly when the live deployment is drifted. It now also explains **why** the failure pattern likely happened and **what to check next**.

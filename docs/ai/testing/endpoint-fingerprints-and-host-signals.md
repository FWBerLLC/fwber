# Endpoint Fingerprints & Host Signals — Testing Notes

**Date:** 2026-04-04  
**Version:** 1.5.0

## Scope
This testing pass validates the endpoint-fingerprinting layer added to:
- `ops/hetzner/scripts/smoke-check.sh`

## Validation Performed
### Static validation
Executed:

```bash
bash -n ops/hetzner/scripts/smoke-check.sh
```

### Live validation
Executed:

```bash
FWBER_SKIP_LOCAL_ARTISAN=1 \
FWBER_SKIP_WEBSOCKET=1 \
FWBER_REPORT_DIR=<tmp> \
bash ops/hetzner/scripts/smoke-check.sh
```

## Validated Outcomes
The generated JSON report now includes a `snapshots` array, and the Markdown report now includes an `Endpoint Fingerprints` section.

Confirmed from the current public-domain run:
- frontend fingerprint: `Vercel`, redirecting to `https://www.fwber.site/`
- API health fingerprint: `Apache`, remote IP `75.119.202.57`, body indicates route missing
- geo fingerprint: `Vercel`, remote IP `64.29.17.1`, body indicates deployment-not-found

## Regression Found and Fixed During Implementation
Snapshot fields with empty values caused tab-delimited parsing drift in reports because empty whitespace-delimited fields are not preserved reliably in Bash `read` loops.

Fix applied:
- normalize empty snapshot values to `—` before writing them to the snapshot log

After the fix:
- JSON snapshot fields rendered correctly
- Markdown endpoint-fingerprint rows rendered correctly

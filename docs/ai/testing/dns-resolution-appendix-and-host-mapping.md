# DNS Resolution Appendix & Host Mapping — Testing Notes

**Date:** 2026-04-04  
**Version:** 1.5.1

## Scope
This testing pass validates the DNS appendix layer added to:
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
The generated reports now include:
- `dns_records` in JSON
- `DNS Resolution Appendix` in Markdown

Confirmed from the current public-domain run:
- `fwber.site` resolved to `216.198.79.1|216.198.79.65`
- `api.fwber.site` resolved to `75.119.202.57`
- `geo.fwber.site` resolved to `216.198.79.65|64.29.17.1`
- `ws.fwber.site` resolved to `69.163.180.228`

## Why This Matters
The smoke report can now connect three layers at once:
1. hostname resolution
2. actual HTTP responder fingerprint
3. remediation guidance

That makes live routing drift easier to prove without additional ad-hoc DNS debugging commands.

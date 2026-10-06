# Deploying fwber to Hetzner + Vercel

This document replaces the old DreamHost-first recommendation for current production planning.

## Recommended Layout
- **Vercel:** `fwber-frontend`
- **Hetzner VPS:** `fwber-backend`, `fwber-geo`, MySQL, Redis, workers, Reverb

## Minimum Steps
1. Provision Hetzner VPS (Ubuntu 24.04)
2. Point `api.fwber.site`, `ws.fwber.site`, and `geo.fwber.site` to the VPS IP
3. Configure Vercel project for `fwber-frontend`
4. Install backend stack on the VPS
5. Configure Laravel `.env`
6. Run migrations and optimize caches
7. Start queue, reverb, and geo services under `systemd`
8. Issue TLS certificates
9. Run `php artisan deploy:verify`
10. Run `ops/hetzner/scripts/smoke-check.sh` (with env tokens/keys if needed)
11. Archive the generated JSON/Markdown smoke-check reports for the cutover run
12. Review the smoke-check diagnostics/recommended actions before sign-off
13. Review endpoint fingerprints (remote IP, server header, redirect/location behavior)
14. Review DNS appendix rows for `fwber.site`, `api.fwber.site`, `geo.fwber.site`, and `ws.fwber.site`
15. Review drift-diff artifacts against the previous smoke run when available
16. Review notification artifacts or webhook output if notification publishing is enabled
17. Validate auth, roast, premium, merchant, websocket, and health endpoints

## See Also
- `DEPLOY.md`
- `docs/ai/deployment/hetzner-vercel-production.md`

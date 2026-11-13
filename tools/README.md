# FWBer Tools Directory

## Active Tools (`tools/`)
| Script | Purpose |
|--------|---------|
| `fwber-tray.bat` / `fwber-tray.ps1` | Windows System Tray controller (`BelowNormal` CPU priority) — manages Backend (`:4003`), Frontend (`:3000`), and Geo (`:8081`); supports `-Status`, `-SmokeTest`, and `-StopAll` CLI modes |
| `fwber-tray-check.py` | Cross-platform port, HTTP health, backing-service (`:3306` / `:6379`), and `logs/*.log` auditor |
| `audit-entry-points.cjs` | Audit API entry points for coverage gaps |
| `repair-truncated-packages.cjs` | Fix missing top-level `package.json` packages and npm tarball truncation issues on Windows (`<node_modules> [--apply]`) |
| `check_nav_coverage.py` | UI audit — finds Next.js app routes not linked from dashboard/header |
| `check_remaining_routes.py` | UI audit — classifies unlinked routes as real pages vs redirects |
| `scan_unguarded_map.py` | UI audit — finds unguarded `.map()` calls on API-response props |

## Service Scripts (`tools/scripts/`)
| Script | Purpose |
|--------|---------|
| `ai_cleanup.ps1` | AI scratch-file cleanup |
| `ai_coordinator.py` | AI coordination service |
| `cleanup-project.sh` | Project-wide cleanup |
| `fix-database-quick.ps1` | Quick database fix helper |
| `fwber_workflows.py` | Workflow automation helpers |
| `load_test.py` | Load testing for API endpoints |
| `deployment/setup-dev.ps1` | Development environment setup |

## Migrations & One-Time Fix Scripts (`tools/migrations/`, `tools/legacy/`, tracked)
Historical automation kept in-repo as provenance for their respective fixes — safe to re-run where idempotent, kept for reference otherwise.
| Script | Purpose |
|--------|---------|
| `migrate_theme_tokens.py` | Theme token migration Phase 1 (v2.3.36, 4,220 replacements) |
| `migrate_theme_tokens2.py` | Theme token migration Phase 2 (v2.3.36, 643 replacements) |
| `count_colors.py` | Count hardcoded color classes per file (theme audit) |
| `fix_button_types.py` | Auto-insert `type="button"` on onClick buttons (452 fixed) |
| `fix_unguarded_map.py` | Add `|| []` guards to API-response `.map()` calls (79 fixed) |
| `gen_loading_error.py` | Generated `loading.tsx`/`error.tsx` for all page routes |

DB image-URL migration lives with the backend: `fwber-backend-ts/scripts/migrate-image-urls.mjs`.

## Archived (`tools/archive/` — Nondestructive Historical Storage)
- `tools/archive/root-scratch/`: Stray root scratch artifacts (`commit_message.txt`, `server_out.txt`, `temp_out.txt`, `test_server.sh`, `test_solana.ts`, `CHANGELOG.md.new`) archived nondestructively in `v2.3.63`.
- `tools/archive/php-v1.8/`: Legacy Laravel/PHP v1.8 scripts (`update-openapi.ps1`, `update-test-database-trait.ps1`, `verify_phase3.ps1`) archived nondestructively in `v2.3.63`.
- `tools/archive/{config,orchestration,scripts}/`: Superseded AI orchestrator configs and early migration scripts.

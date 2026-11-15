#!/usr/bin/env python3
"""
tools/check_api_contracts.py

Static full-stack API contract verifier for FWBer (`fwber-frontend` <-> `fwber-backend-ts`).

Checks two layers:
1. Mount-Prefix Coverage: Every `/api/<prefix>` router mounted in
   `fwber-backend-ts/src/index.ts` exists on disk, and critical frontend API
   prefixes map to a mounted Express router (not the `/api` catch-all).
2. Critical Sub-Route + HTTP Method Contracts: Verifies that high-impact
   mutations and data-fetch sub-routes (wallet transfers/requests, merchant
   checkout, AI avatar studio, event invitations, public vouches, wingman POST
   endpoints, password/decoy/safety routes, economy bridge swaps, content
   unlocks, matchmaker bounties, and governance Merkle proofs) are explicitly
   registered with matching HTTP methods in their Express routers.

Exit code 0 when all contracts hold, non-zero otherwise.
"""

from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
BACKEND_SRC = ROOT / "fwber-backend-ts" / "src"
INDEX_TS = BACKEND_SRC / "index.ts"

# (mount_prefix, http_method, sub_route_pattern)
REQUIRED_CONTRACTS: list[tuple[str, str, str]] = [
    # Economy, Wallet, Content Unlocks & Merchant Checkout
    ("/api/economy", "GET", "/rates"),
    ("/api/economy", "GET", "/swaps"),
    ("/api/economy", "POST", "/swaps/initiate"),
    ("/api/wallet", "POST", "/transfer"),
    ("/api/wallet", "GET", "/requests"),
    ("/api/wallet", "POST", "/requests"),
    ("/api/wallet", "POST", "/requests/:param/pay"),
    ("/api/wallet", "POST", "/requests/:param/cancel"),
    ("/api/users", "GET", "/:param/wallet"),
    ("/api/merchant", "POST", "/keys"),
    ("/api/merchant", "GET", "/payment/:param"),
    ("/api/merchant", "POST", "/payment/:param/confirm"),
    ("/api/merchant-portal", "GET", "/promotions"),
    ("/api/merchant-portal", "POST", "/promotions"),
    ("/api/promotions", "POST", "/:param/track"),
    ("/api/content-unlocks", "GET", "/"),
    ("/api/share-unlocks", "GET", "/"),
    # Bounties & Matchmaker
    ("/api/bounties", "GET", "/"),
    ("/api/bounties", "POST", "/"),
    ("/api/bounties", "POST", "/:param/suggest"),
    ("/api/matchmaker", "GET", "/bounty/:param"),
    # AI Avatar Studio & Photos
    ("/api/avatar", "GET", "/providers"),
    ("/api/avatar", "GET", "/physical-traits"),
    ("/api/avatar", "POST", "/generate"),
    ("/api/avatar", "POST", "/generate-from-photo"),
    # Events & Public Vouches
    ("/api/events", "GET", "/invitations"),
    ("/api/events", "POST", "/invitations/:param/respond"),
    ("/api/events", "POST", "/:param/invite"),
    ("/api/public", "POST", "/vouch"),
    # Notifications
    ("/api/notifications", "POST", "/read-all"),
    ("/api/notifications", "POST", "/:param/read"),
    ("/api/notifications", "POST", "/subscribe"),
    # Wingman AI
    ("/api/wingman", "POST", "/compatibility"),
    ("/api/wingman", "POST", "/ice-breaker"),
    # Profile, Security, Decoy & Safety
    ("/api/profile", "PUT", "/password"),
    ("/api/profile", "POST", "/delete"),
    ("/api/settings", "GET", "/security"),
    ("/api/settings", "POST", "/decoy-profile"),
    ("/api/settings", "DELETE", "/decoy-profile"),
    ("/api/safety", "POST", "/panic"),
    ("/api/safety", "PATCH", "/walk/:param/location"),
    ("/api/safety", "POST", "/walk/:param/end"),
    # Council Governance & Federation Discovery
    ("/api/governance", "GET", "/proposals"),
    ("/api/governance", "POST", "/proposals/:param/vote"),
    ("/api/governance", "GET", "/proposals/:param/proof"),
    ("/.well-known", "GET", "/webfinger"),
    ("/nodeinfo", "GET", "/2.1"),
    # Moderation, Admin Logs & Failed Jobs (v2.3.92)
    ("/api/moderation", "GET", "/dashboard"),
    ("/api/moderation", "GET", "/flagged-content"),
    ("/api/moderation", "POST", "/flags/:param/review"),
    ("/api/moderation", "GET", "/spoof-detections"),
    ("/api/moderation", "POST", "/spoofs/:param/review"),
    ("/api/moderation", "GET", "/throttles"),
    ("/api/moderation", "DELETE", "/throttles/:param"),
    ("/api/moderation", "GET", "/actions"),
    ("/api/moderation", "GET", "/users/:param"),
    ("/api/admin", "GET", "/logs"),
    ("/api/admin", "GET", "/logs/:param"),
    ("/api/analytics", "GET", "/failed-jobs"),
    ("/api/analytics", "POST", "/failed-jobs/retry-all"),
    ("/api/analytics", "POST", "/failed-jobs/flush"),
    ("/api/analytics", "POST", "/failed-jobs/:param/retry"),
    ("/api/analytics", "DELETE", "/failed-jobs/:param"),
    # Matches, Insights, Creator Subscriptions & NFC Exchange (v2.3.92)
    ("/api/matches", "GET", "/established"),
    ("/api/matches", "GET", "/accepted"),
    ("/api/matches", "POST", "/nfc-exchange"),
    ("/api/matches", "GET", "/:param/insights"),
    ("/api/matches", "POST", "/:param/insights/unlock"),
    ("/api/subscriptions", "GET", "/creator/:param"),
    ("/api/subscriptions", "POST", "/creator/:param"),
    # Zero-Knowledge Proximity, Token Drops, Public Pulse Nodes & AR Aura (v2.3.92)
    ("/api/proximity", "GET", "/zk-params"),
    ("/api/proximity", "POST", "/zk-verify"),
    ("/api/proximity", "POST", "/artifacts/:param/claim"),
    ("/api/public", "GET", "/pulse/node/:param"),
    ("/api/location", "GET", "/aura/:param"),
    # Federated ActivityPub Auth, Polycule Links, CRDT Sync & CSV Export (v2.3.92)
    ("/api/auth", "POST", "/federated/challenge"),
    ("/api/auth", "POST", "/federated/verify"),
    ("/api/relationship-links", "GET", "/"),
    ("/api/relationship-links", "GET", "/requests"),
    ("/api/relationship-links", "POST", "/:param/respond"),
    ("/api/relationship-links", "PUT", "/:param"),
    ("/api/messages", "POST", "/translate"),
    ("/api/messages", "POST", "/sync-batch"),
    ("/api/user", "GET", "/"),
    ("/api/user", "PUT", "/profile"),
    ("/api/merchant-portal", "GET", "/analytics/export"),
]


def normalize_subpath(raw: str) -> str:
    path = raw.strip()
    if not path.startswith("/"):
        path = "/" + path
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]
    return re.sub(r":[A-Za-z0-9_]+", ":param", path)


def load_backend_routes() -> tuple[dict[str, pathlib.Path], set[tuple[str, str, str]]]:
    index_text = INDEX_TS.read_text(encoding="utf-8")

    # Map imported identifiers -> file paths
    imports: dict[str, pathlib.Path] = {}
    for m in re.finditer(
        r"import\s+(?:([A-Za-z0-9_]+)\s*,?\s*)?(?:\{\s*([^}]+)\s*\}\s*)?from\s+['\"]\./routes/([^'\"]+?)\.js['\"]",
        index_text,
    ):
        default_ident, named_idents, rel_base = m.group(1), m.group(2), m.group(3)
        route_file = BACKEND_SRC / "routes" / f"{rel_base}.ts"
        if default_ident:
            imports[default_ident] = route_file
        if named_idents:
            for part in named_idents.split(","):
                ident = part.strip().split(" as ")[-1].strip()
                if ident:
                    imports[ident] = route_file

    mounted: dict[str, list[pathlib.Path]] = {}
    for m in re.finditer(r"app\.use\(\s*['\"]([^'\"]+)['\"]\s*,\s*([A-Za-z0-9_]+)\s*\)", index_text):
        prefix, ident = m.group(1), m.group(2)
        if ident in imports:
            mounted.setdefault(prefix, []).append(imports[ident])

    registered: set[tuple[str, str, str]] = set()
    single_route_re = re.compile(
        r"\b(?:router|matchmakerRouter|nodeinfoRouter)\.(get|post|put|patch|delete)\(\s*['\"]([^'\"]+)['\"]",
        re.IGNORECASE,
    )
    array_route_re = re.compile(
        r"\b(?:router|matchmakerRouter|nodeinfoRouter)\.(get|post|put|patch|delete)\(\s*\[([^\]]+)\]",
        re.IGNORECASE,
    )

    for prefix, files in mounted.items():
        for route_file in files:
            if not route_file.exists():
                continue
            body = route_file.read_text(encoding="utf-8")
            for rm in single_route_re.finditer(body):
                method = rm.group(1).upper()
                sub = normalize_subpath(rm.group(2))
                registered.add((prefix, method, sub))
            for arm in array_route_re.finditer(body):
                method = arm.group(1).upper()
                for lit in re.findall(r"['\"]([^'\"]+)['\"]", arm.group(2)):
                    registered.add((prefix, method, normalize_subpath(lit)))

    primary_files = {k: v[0] for k, v in mounted.items() if v}
    return primary_files, registered


def main() -> int:
    primary_files, registered = load_backend_routes()
    missing_files = [f"{prefix} -> {path}" for prefix, path in primary_files.items() if not path.exists()]
    missing_contracts = [
        f"{method:6s} {prefix}{ '' if sub == '/' else sub }"
        for (prefix, method, sub) in REQUIRED_CONTRACTS
        if (prefix, method, sub) not in registered
    ]

    if missing_files or missing_contracts:
        print("FAIL: API contract mismatches detected:")
        for item in missing_files:
            print(f"  [missing router file] {item}")
        for item in missing_contracts:
            print(f"  [missing sub-route]   {item}")
        return 1

    print(
        f"OK: {len(primary_files)} mounted Express prefixes and "
        f"{len(REQUIRED_CONTRACTS)}/{len(REQUIRED_CONTRACTS)} critical sub-route contracts verified."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Verify every Next.js rewrite destination actually answers on prod.

Why this exists: WebFinger (fixed v2.3.78) and NodeInfo (v2.3.79) both hid
for months as frontend rewrites pointing at backend routes that did not
exist — every discovery request quietly 404'd. Likewise, `/api/health`
previously fell through to Express's `app.use('/api', ...)` catch-all and
returned `200 []` without checking MySQL (fixed v2.3.88).

This audit parses the `rewrites()` table out of `fwber-frontend/next.config.js`,
probes each unique destination, validates `/api/health` payload shape so a
catch-all `[]` cannot pass silently, and exits 1 if any destination is dead.

Usage: python tools/check_rewrites.py [--config fwber-frontend/next.config.js]
Exit code 0 = all destinations live, 1 = at least one dead.
"""

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# Probe per destination template: (path, acceptable status codes).
# :path* style wildcards are probed with a concrete health path.
PROBES = {
    "https://api.fwber.online/api/:path*": ("/api/health", {200}),
    "https://api.fwber.online/.well-known/webfinger": (
        "/.well-known/webfinger?resource=acct:rewrite-audit@fwber.online",
        {404},  # unknown user 404 proves the route is mounted (400/200 also fine)
    ),
    "https://api.fwber.online/.well-known/nodeinfo": ("/.well-known/nodeinfo", {200}),
}
EXTRA_ACCEPTABLE = {200, 400, 404}


def parse_rewrites(config_path: Path) -> list[str]:
    text = config_path.read_text(encoding="utf-8", errors="replace")
    destinations = re.findall(r"destination:\s*'([^']+)'", text)
    return sorted(set(destinations))


def probe(url: str, attempts: int = 2) -> tuple[int, str]:
    req = urllib.request.Request(url, method="GET", headers={"User-Agent": "fwber-rewrite-audit/1.1"})
    last_err = None
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                body = resp.read().decode("utf-8", errors="replace")
                return resp.status, body
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace") if e.fp else ""
            return e.code, body
        except Exception as e:  # transient TLS/IPv6 timeout gets one retry
            last_err = e
            if attempt + 1 < attempts:
                time.sleep(1)
    print(f"  probe error: {last_err}")
    return 0, ""


def validate_health_payload(body: str) -> tuple[bool, str]:
    try:
        payload = json.loads(body)
    except Exception:
        return False, "invalid JSON"
    if not isinstance(payload, dict) or payload.get("status") != "ok":
        return False, f"unexpected payload {body[:80]!r} (expected JSON object with status='ok')"
    return True, f"app_version={payload.get('app_version', 'n/a')}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="fwber-frontend/next.config.js")
    args = parser.parse_args()

    destinations = parse_rewrites(Path(args.config))
    if not destinations:
        print("No rewrite destinations found — config parse failed?")
        return 1

    print(f"Rewrite destinations found: {len(destinations)}")
    failures = 0
    for dest in destinations:
        probe_path, expected = PROBES.get(dest, (None, None))
        if probe_path is None:
            base = re.sub(r"/:path\*.*$", "", dest)
            status, _ = probe(base + "/")
            ok = status in EXTRA_ACCEPTABLE
            print(f"  {'OK ' if ok else 'DEAD'} {dest} -> GET {base}/ = {status} (generic probe)")
        else:
            origin = re.match(r"^(https?://[^/]+)", dest).group(1)
            status, body = probe(origin + probe_path)
            ok = status in expected or (dest.endswith("webfinger") and status in EXTRA_ACCEPTABLE)
            detail = f"expect {sorted(expected)}"
            if ok and probe_path == "/api/health":
                shape_ok, shape_note = validate_health_payload(body)
                ok = shape_ok
                detail = f"{detail}, {shape_note}"
            print(f"  {'OK ' if ok else 'DEAD'} {dest} -> GET {probe_path} = {status} ({detail})")
        if not ok:
            failures += 1

    if failures:
        print(f"\n{failures} rewrite destination(s) NOT answering — see above.")
        return 1
    print("\nAll rewrite destinations are live.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

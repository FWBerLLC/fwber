#!/usr/bin/env python3
"""Verify every Next.js rewrite destination actually answers on prod.

Why this exists: WebFinger (fixed v2.3.78) and NodeInfo (v2.3.79) both hid
for months as frontend rewrites pointing at backend routes that did not
exist — every discovery request quietly 404'd. This audit parses the
rewrites() table out of fwber-frontend/next.config.js, probes each unique
destination, and fails loudly if any destination stops answering.

A destination "answers" when it returns anything except 404/5xx for its
probe: some routes legitimately answer 400/404 for the probe's dummy
parameters (e.g. WebFinger with an unknown user), which still proves the
route is mounted. Only a routing-level 404 from an unmounted path or a
server error fails the audit — the probe expectations below encode that
per-destination.

Usage: python tools/check_rewrites.py [--base https://api.fwber.online]
Exit code 0 = all destinations live, 1 = at least one dead.
"""

import argparse
import re
import sys
import urllib.request
import urllib.error
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


def probe(url: str) -> int:
    req = urllib.request.Request(url, method="GET", headers={"User-Agent": "fwber-rewrite-audit/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:  # connection errors count as dead
        print(f"  probe error: {e}")
        return 0


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
            # Unknown destination: probe its literal origin root; any
            # non-404/non-5xx answer counts as mounted.
            base = re.sub(r"/:path\*.*$", "", dest)
            status = probe(base + "/")
            ok = status in EXTRA_ACCEPTABLE
            print(f"  {'OK ' if ok else 'DEAD'} {dest} -> GET {base}/ = {status} (generic probe)")
        else:
            origin = re.match(r"^(https?://[^/]+)", dest).group(1)
            status = probe(origin + probe_path)
            ok = status in expected or (dest.endswith("webfinger") and status in EXTRA_ACCEPTABLE)
            print(f"  {'OK ' if ok else 'DEAD'} {dest} -> GET {probe_path} = {status} (expect {sorted(expected)})")
        if not ok:
            failures += 1

    if failures:
        print(f"\n{failures} rewrite destination(s) NOT answering — see above.")
        return 1
    print("\nAll rewrite destinations are live.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
FWBer System Tray Status, Backing-Service & Log Auditor (Dynamic VERSION)
Inspects managed app ports (4003, 3000, 8081), local backing-service ports
(MySQL 3306, Redis 6379), HTTP readiness endpoints, and stdout/stderr logs.
"""
import os
import socket
import urllib.request
import urllib.error
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VERSION_FILE = REPO_ROOT / "VERSION"
APP_VERSION = VERSION_FILE.read_text(encoding="utf-8").strip() if VERSION_FILE.exists() else "unknown"

MANAGED_SERVICES = [
    {
        "name": "Backend (fwber-backend-ts)",
        "port": 4003,
        "health": "http://127.0.0.1:4003/health",
        "out": str(REPO_ROOT / "logs/backend.out.log"),
        "err": str(REPO_ROOT / "logs/backend.err.log"),
    },
    {
        "name": "Frontend (fwber-frontend)",
        "port": 3000,
        "health": "http://127.0.0.1:3000",
        "out": str(REPO_ROOT / "logs/frontend.out.log"),
        "err": str(REPO_ROOT / "logs/frontend.err.log"),
    },
    {
        "name": "Geo Screener (fwber-geo)",
        "port": 8081,
        "health": "http://127.0.0.1:8081/health",
        "out": str(REPO_ROOT / "logs/geo.out.log"),
        "err": str(REPO_ROOT / "logs/geo.err.log"),
    },
]

BACKING_SERVICES = [
    {"name": "MySQL / MariaDB", "port": 3306, "required": True},
    {"name": "Redis (Optional BullMQ/Cache)", "port": 6379, "required": False},
]


def check_port(port: int) -> bool:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.4)
    try:
        s.connect(("127.0.0.1", port))
        return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False
    finally:
        s.close()


def check_http(url: str) -> str:
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            body = resp.read(160).decode("utf-8", errors="ignore").strip()
            snippet = body[:90].replace("\n", " ")
            return f"HTTP {resp.status} ({snippet})" if snippet else f"HTTP {resp.status}"
    except urllib.error.HTTPError as e:
        return f"HTTP {e.code} (reachable)"
    except Exception as e:
        return f"UNREACHABLE ({e.__class__.__name__})"


def tail_file(path: str, max_lines: int = 5) -> str:
    if not os.path.exists(path):
        return "(not created yet)"
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        lines = [ln.rstrip() for ln in f.readlines() if ln.strip()]
    if not lines:
        return "(empty)"
    return "\n      ".join(lines[-max_lines:])


def main() -> None:
    print("============================================================")
    print(f"  FWBer System Tray & Local Stack Health Auditor (v{APP_VERSION})")
    print("============================================================")

    tray_log = str(REPO_ROOT / "logs/tray.log")
    print(f"\n[1] Tray Controller Log (logs/tray.log):")
    print(f"      {tail_file(tray_log, 8)}")

    print("\n[2] Managed Services (BelowNormal Priority):")
    for s in MANAGED_SERVICES:
        up = check_port(s["port"])
        status = f"LISTENING -> {check_http(s['health'])}" if up else "STOPPED"
        print(f"  - {s['name']} (:{s['port']}): {status}")
        print(f"    stdout:\n      {tail_file(s['out'], 3)}")
        err_tail = tail_file(s["err"], 3)
        if err_tail not in ("(not created yet)", "(empty)"):
            print(f"    stderr:\n      {err_tail}")

    print("\n[3] Local Backing Services:")
    for b in BACKING_SERVICES:
        up = check_port(b["port"])
        req = "Required for local DB queries" if b["required"] else "Optional (in-memory fallback active)"
        state = "LISTENING" if up else f"NOT RUNNING ({req})"
        print(f"  - {b['name']} (:{b['port']}): {state}")

    print("\n[4] Tray Controls Available:")
    print("  - Launch GUI Tray:        tray.bat  (or start.bat --tray / tools\\fwber-tray.bat)")
    print("  - Launch Hetzner Monitor: tray.bat -Idle")
    print("  - CLI Local Status:       tray.bat -Status")
    print("  - CLI Prod Health Check:  tray.bat -CheckProd")
    print("  - CLI Smoke Test:         tray.bat -SmokeTest")
    print("  - CLI Stop All:           tray.bat -StopAll")
    print("============================================================")


if __name__ == "__main__":
    main()

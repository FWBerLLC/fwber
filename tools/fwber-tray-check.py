#!/usr/bin/env python3
"""
FWBer System Tray Status & Port Checker (Cross-Platform)
Inspects log files and port availability for services managed by fwber-tray.
"""
import os
import sys
import socket

SERVICES = [
    {"name": "Backend", "port": 4003, "log": "logs/backend.out.log", "err": "logs/backend.err.log"},
    {"name": "Frontend", "port": 3000, "log": "logs/frontend.out.log", "err": "logs/frontend.err.log"},
]

def check_port(port: int) -> bool:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.5)
    try:
        s.connect(("127.0.0.1", port))
        s.close()
        return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False

def inspect_logs(log_path: str, max_lines: int = 5):
    if not os.path.exists(log_path):
        return f"Log file {log_path} not found (service may not have been launched via tray)."
    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        if not lines:
            return f"Log file {log_path} is currently empty."
        return "".join(lines[-max_lines:])

def main():
    print("==================================================")
    print("  FWBer Tray & Service Health Checker")
    print("==================================================")

    tray_log = "logs/tray.log"
    if os.path.exists(tray_log):
        print(f"\n[Tray Log: {tray_log}] (last 5 lines)")
        print(inspect_logs(tray_log))
    else:
        print(f"\n[Tray Log] {tray_log} not present yet.")

    print("\n[Service Port Status]")
    for s in SERVICES:
        active = check_port(s["port"])
        status_str = "LISTENING (Active)" if active else "STOPPED / NOT LISTENING"
        print(f" - {s['name']} (Port {s['port']}): {status_str}")
        if active:
            print(f"   Recent stdout: {inspect_logs(s['log'], 2).strip()}")

    print("\nTray launcher capabilities:")
    print(" - Start All Services (Backend: 4003, Frontend: 3000)")
    print(" - Stop All Services (reclaims specific listening ports)")
    print(" - Quit Servers & Tray (gracefully tears down child node processes)")
    print("==================================================")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Verify zero UTF-8 BOMs across source/config/manifest files and check VERSION sync.

Why this exists: PowerShell `Set-Content -Encoding UTF8` writes a 3-byte UTF-8 BOM
(`\\xef\\xbb\\xbf`) that breaks `JSON.parse()` on `package.json`, Cargo `include_str!("../../VERSION")`,
and Next.js config loaders. Running this script in CI and pre-commit guarantees zero BOMs
and verifies root `VERSION` matches `fwber-backend-ts/VERSION`, `fwber-frontend/VERSION`,
`package.json`, and `fwber-geo/Cargo.toml`.
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

TEXT_EXTS = {
    ".json",
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".cjs",
    ".toml",
    ".yml",
    ".yaml",
    ".md",
    ".py",
    ".sh",
    ".rs",
}
VERSION_FILES = [
    "VERSION",
    "VERSION.md",
    "fwber-backend-ts/VERSION",
    "fwber-frontend/VERSION",
]


def get_candidate_files(repo_root: Path) -> list[Path]:
    try:
        res = subprocess.run(
            ["git", "ls-files"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=True,
        )
        paths = [repo_root / line.strip() for line in res.stdout.splitlines() if line.strip()]
    except Exception:
        paths = []
        skip_dirs = {"node_modules", ".git", ".next", ".standalone-live", "target", "vendor", "dist"}
        for root, dirs, files in os.walk(repo_root):
            dirs[:] = [d for d in dirs if d not in skip_dirs]
            for name in files:
                paths.append(Path(root) / name)
    return paths


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    bom_files: list[str] = []

    for path in get_candidate_files(repo_root):
        rel = path.relative_to(repo_root).as_posix()
        if rel.startswith("ARCHIVE_v1_8_php_legacy/") or not path.is_file():
            continue
        if path.suffix.lower() not in TEXT_EXTS and rel not in VERSION_FILES:
            continue
        try:
            with path.open("rb") as fh:
                head = fh.read(3)
            if head == b"\xef\xbb\xbf":
                bom_files.append(rel)
        except OSError:
            continue

    if bom_files:
        print(f"FAIL: UTF-8 BOM detected in {len(bom_files)} file(s):")
        for f in bom_files:
            print(f"  - {f}")
        return 1

    root_ver = (repo_root / "VERSION").read_text(encoding="utf-8").strip()
    mismatches: list[str] = []
    for vf in VERSION_FILES[1:]:
        p = repo_root / vf
        if p.exists():
            v = p.read_text(encoding="utf-8").strip()
            if v != root_ver:
                mismatches.append(f"{vf}={v} (expected {root_ver})")

    for pkg_rel in ["package.json", "fwber-backend-ts/package.json", "fwber-frontend/package.json"]:
        pkg_path = repo_root / pkg_rel
        if pkg_path.exists():
            pkg_ver = json.loads(pkg_path.read_text(encoding="utf-8")).get("version")
            if pkg_ver != root_ver:
                mismatches.append(f"{pkg_rel}={pkg_ver} (expected {root_ver})")

    cargo_path = repo_root / "fwber-geo/Cargo.toml"
    if cargo_path.exists():
        m = re.search(r'^version\s*=\s*"([^"]+)"', cargo_path.read_text(encoding="utf-8"), flags=re.M)
        if m and m.group(1) != root_ver:
            mismatches.append(f"fwber-geo/Cargo.toml={m.group(1)} (expected {root_ver})")

    if mismatches:
        print("FAIL: Version manifest drift detected:")
        for item in mismatches:
            print(f"  - {item}")
        return 1

    print(f"OK: 0 UTF-8 BOMs and all core manifests synchronized at v{root_ver}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

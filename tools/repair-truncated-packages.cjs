// Systematic repair for npm packages left half-extracted by interrupted
// installs. Reads package-lock.json, finds every package whose declared entry
// point is missing on disk, then re-downloads just those tarballs and extracts
// them over the broken tree.
//
// Why not `npm install`: it hangs on this network and re-runs the whole tree.
// curl + tar is reliable here and touches only what is actually broken.
//
// Usage: node tools/repair-truncated-packages.cjs <node_modules dir> [--apply]
//        Without --apply it only reports what it would do.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const nmDir = path.resolve(process.argv[2] || 'node_modules');
const apply = process.argv.includes('--apply');
const projectRoot = path.dirname(nmDir);
const lockPath = path.join(projectRoot, 'package-lock.json');

if (!fs.existsSync(lockPath)) {
  console.error('No package-lock.json next to', nmDir);
  process.exit(1);
}

const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

// ---- lockfile lookup ------------------------------------------------------
// npm v2/v3 lockfiles index packages as "node_modules/<name>" keys.
function lockEntryFor(name) {
  const key = `node_modules/${name}`;
  const entry = (lock.packages || {})[key];
  if (entry && entry.resolved) return entry;
  return null;
}

// ---- detection (mirrors audit-entry-points.cjs) ---------------------------
function resolvesLikeNode(pkgDir, entry) {
  const target = path.join(pkgDir, entry);
  if (fs.existsSync(target)) {
    try {
      if (fs.statSync(target).isDirectory()) {
        return ['index.js', 'index.json', 'index.node', 'index.mjs', 'index.cjs']
          .some((f) => fs.existsSync(path.join(target, f)));
      }
      return true;
    } catch { return true; }
  }
  for (const ext of ['.js', '.json', '.node', '.mjs', '.cjs']) {
    if (fs.existsSync(target + ext)) return true;
  }
  return false;
}

function isBroken(pkgDir) {
  const pj = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(pj)) return 'corrupt package.json';
  let j;
  try { j = JSON.parse(fs.readFileSync(pj, 'utf8')); } catch { return 'corrupt package.json'; }
  for (const field of ['main', 'module']) {
    const v = j[field];
    if (typeof v !== 'string' || v.trim() === '') continue;
    if (v.startsWith('http') || v.includes('*')) continue;
    if (!resolvesLikeNode(pkgDir, v)) return `missing ${field} -> ${v}`;
  }
  return null;
}

// ---- walk node_modules ----------------------------------------------------
const broken = [];
function walk(dir, labelPrefix) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const full = path.join(dir, e.name);
    if (e.name.startsWith('@')) {
      let scoped;
      try { scoped = fs.readdirSync(full, { withFileTypes: true }); } catch { continue; }
      for (const s of scoped) {
        if (!s.isDirectory()) continue;
        const name = `${e.name}/${s.name}`;
        const why = isBroken(path.join(full, s.name));
        if (why) broken.push({ name, dir: path.join(full, s.name), why });
      }
      continue;
    }
    const why = isBroken(full);
    if (why) broken.push({ name: e.name, dir: full, why });
    // Nested node_modules (hoisting leftovers) — check one level down.
    const nested = path.join(full, 'node_modules');
    if (fs.existsSync(nested)) walk(nested);
  }
}

walk(nmDir);

console.log(`Found ${broken.length} broken package(s).`);
if (!broken.length) process.exit(0);

// ---- repair ---------------------------------------------------------------
const staging = path.join(projectRoot, '_repair_staging');
for (const b of broken) {
  const entry = lockEntryFor(b.name);
  if (!entry) {
    console.log(`  SKIP ${b.name} (${b.why}) — not in lockfile`);
    continue;
  }
  console.log(`  ${apply ? 'FIX ' : 'PLAN'} ${b.name} @${entry.version} (${b.why})`);
  if (!apply) continue;

  const tgz = path.join(staging, 'pkg.tgz');
  const ext = path.join(staging, 'ext');
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(ext, { recursive: true });

  try {
    execFileSync('curl.exe', ['-sL', '-m', '300', '-o', tgz, entry.resolved], { stdio: 'inherit' });
    execFileSync('tar', ['-xzf', tgz, '-C', ext], { stdio: 'inherit' });
    const src = path.join(ext, 'package');
    if (!fs.existsSync(src)) {
      console.log(`    !! tarball had no package/ dir`);
      continue;
    }
    fs.rmSync(b.dir, { recursive: true, force: true });
    // Move the fresh tree into place at the original nested location.
    fs.mkdirSync(path.dirname(b.dir), { recursive: true });
    fs.renameSync(src, b.dir);
    const why2 = isBroken(b.dir);
    console.log(why2 ? `    still broken: ${why2}` : '    ok');
  } catch (err) {
    console.log(`    !! failed: ${err.message}`);
  }
}

if (apply) {
  fs.rmSync(staging, { recursive: true, force: true });
  console.log('Repair pass complete.');
}

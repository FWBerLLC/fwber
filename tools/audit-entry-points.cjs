// One-shot audit: find every node_modules package whose declared entry point
// (main / module) is missing on disk. npm's interrupted installs left several
// packages half-extracted; the only symptom is a runtime "Can't resolve" much
// later, so this surfaces them all at once.
const fs = require('fs');
const path = require('path');

const root = process.argv[2] || 'node_modules';
const broken = [];

function scanDir(dir, label) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const pkgDir = path.join(dir, e.name);
    if (e.name.startsWith('@')) {
      // scoped: scan one level deeper
      scanScope(pkgDir, e.name);
      continue;
    }
    checkPkg(pkgDir, e.name);
  }
}

function scanScope(scopeDir, scopeName) {
  let entries;
  try { entries = fs.readdirSync(scopeDir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    checkPkg(path.join(scopeDir, e.name), `${scopeName}/${e.name}`);
  }
}

function checkPkg(pkgDir, label) {
  const pj = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(pj)) return;
  let j;
  try { j = JSON.parse(fs.readFileSync(pj, 'utf8')); } catch {
    broken.push(`${label} : corrupt package.json`);
    return;
  }
  for (const field of ['main', 'module']) {
    const v = j[field];
    if (typeof v !== 'string') continue;
    // DefinitelyTyped packages legitimately declare main: "".
    if (v.trim() === '') continue;
    // Only relative entry points can be checked against the package tree.
    if (v.startsWith('http') || v.includes('*')) continue;
    if (!resolvesLikeNode(pkgDir, v)) {
      // `main` is what Node and most bundlers fall back to, so a missing main
      // is fatal; a missing `module` is often recoverable via main.
      const fatal = field === 'main';
      broken.push(`${fatal ? 'MAIN ' : 'module'}  ${label} : missing ${field} -> ${v}`);
    }
  }
}

// Node resolves './index' to index.js / index.json / index.node / index/index.js.
// A naive existsSync() check reports every extensionless entry as broken.
function resolvesLikeNode(pkgDir, entry) {
  const target = path.join(pkgDir, entry);
  if (fs.existsSync(target)) {
    // A bare directory entry still has to resolve to a file inside it.
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

scanDir(root);
console.log(`BROKEN ENTRY POINTS: ${broken.length}`);
for (const b of broken) console.log(' ', b);

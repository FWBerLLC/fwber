import os, re

app_root = 'fwber-frontend/app'
routes = set()
for dirpath, dirnames, filenames in os.walk(app_root):
    if 'page.tsx' not in filenames and 'page.js' not in filenames:
        continue
    rel = os.path.relpath(dirpath, app_root).replace(os.sep, '/')
    if rel == '.':
        continue
    if rel.startswith('api/'):
        continue
    if rel.startswith('('):
        rel = rel.split(')', 1)[-1].lstrip('/')
    if rel.startswith('api/'):
        continue
    routes.add('/' + rel)

with open(os.path.join(app_root, 'dashboard', 'page.tsx'), 'r', encoding='utf-8') as f:
    dashboard = f.read()

hrefs = set(re.findall(r'href="([^"]+)"', dashboard))
hrefs.update(re.findall(r"href='([^']+)'", dashboard))

with open(os.path.join('fwber-frontend', 'components', 'AppHeader.tsx'), 'r', encoding='utf-8') as f:
    header = f.read()
header_hrefs = set(re.findall(r"href:\s*'([^']+)'", header))
header_hrefs.update(re.findall(r'href:\s*"([^"]+)"', header))

all_linked = hrefs | header_hrefs
missing = sorted(routes - all_linked)

# Filter out dynamic routes, auth pages, and detail pages
real_missing = []
for m in missing:
    if '[' in m:
        continue  # dynamic route
    if any(m.startswith(p) for p in ['/auth/', '/dev-auth', '/forgot-password', '/reset-password', '/verify', '/register', '/login', '/test-auth', '/api-test', '/sentry-test', '/tier-demo', '/public/']):
        continue
    real_missing.append(m)

print(f'Total page routes: {len(routes)}')
print(f'Linked from dashboard/header: {len(routes & all_linked)}')
print(f'Not linked (static, non-auth): {len(real_missing)}')
for m in real_missing:
    print(f'  {m}')

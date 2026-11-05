import os, re

app_root = 'fwber-frontend'
pattern = re.compile(r'text-gray-[0-9]+|bg-gray-[0-9]+|text-white|bg-white|border-gray-[0-9]+')
counts = {}

for dp, dn, fn in os.walk(app_root):
    if 'node_modules' in dp or '.next' in dp:
        continue
    for f in fn:
        if not f.endswith(('.tsx', '.ts')):
            continue
        path = os.path.join(dp, f)
        try:
            with open(path, encoding='utf-8', errors='replace') as fh:
                content = fh.read()
            n = len(pattern.findall(content))
            if n > 0:
                counts[path] = n
        except:
            pass

top = sorted(counts.items(), key=lambda x: -x[1])[:25]
total = sum(counts.values())
print(f"Total hardcoded color matches: {total} across {len(counts)} files")
print()
for k, v in top:
    print(f"{v:4d} {k}")

import os, re

# Find unguarded .map() calls on API-response props only
# Focus: variables assigned from useState/useQuery/fetch responses

app_root = 'fwber-frontend'
issues = []

# Pattern for .map() calls
map_pattern = re.compile(r'(\w+)\s*\.\s*map\s*\(')

# Pattern for API-response variable declarations
api_var_pattern = re.compile(r'(?:const|let)\s+\[?\s*(\w+).*?(?:useState|useQuery|fetch|api\.get|api\.post|\.then\()')

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
                lines = content.split('\n')
        except:
            continue
        
        # Find API-response variables
        api_vars = set()
        for m in api_var_pattern.finditer(content):
            api_vars.add(m.group(1))
        
        if not api_vars:
            continue
        
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
                continue
            
            for m in map_pattern.finditer(line):
                var = m.group(1)
                # Only check API-response variables
                if var not in api_vars:
                    continue
                
                # Build context
                context = line
                if i > 1:
                    context = lines[i-2] + line
                if i < len(lines):
                    context = context + lines[i]
                
                # Check for guard patterns
                if 'Array.isArray(' + var + ')' in context:
                    continue
                if var + '?.' in context and 'map' in context:
                    continue
                if var + ' || []' in context:
                    continue
                if var + ' || [' in context:
                    continue
                
                issues.append((path, i, var, stripped[:100]))

print(f"Found {len(issues)} unguarded .map() calls on API-response props")
print()
for path, line, var, preview in issues[:30]:
    print(f"{path}:{line} [{var}] {preview}")

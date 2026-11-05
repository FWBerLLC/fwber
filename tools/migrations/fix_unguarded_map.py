import os, re

# Fix unguarded .map() calls on API-response props
# Strategy: add || [] guard before .map()

app_root = 'fwber-frontend'
fixed = 0

# Pattern: var.map( -> (var || []).map(
# Only for API-response variables
map_pattern = re.compile(r'(\w+)\s*\.\s*map\s*\(')
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
        
        new_lines = []
        changed = False
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
                new_lines.append(line)
                continue
            
            new_line = line
            for m in map_pattern.finditer(line):
                var = m.group(1)
                if var not in api_vars:
                    continue
                
                # Build context
                context = line
                if i > 0:
                    context = lines[i-1] + line
                if i < len(lines) - 1:
                    context = context + lines[i+1]
                
                # Skip if already guarded
                if 'Array.isArray(' + var + ')' in context:
                    continue
                if var + '?.' in context and 'map' in context:
                    continue
                if var + ' || []' in context:
                    continue
                if var + ' || [' in context:
                    continue
                
                # Add guard: var.map( -> (var || []).map(
                old = var + '.map('
                new = '(' + var + ' || []).map('
                if old in new_line:
                    new_line = new_line.replace(old, new, 1)
                    changed = True
                    fixed += 1
            
            new_lines.append(new_line)
        
        if changed:
            with open(path, 'w', encoding='utf-8') as fh:
                fh.write('\n'.join(new_lines))

print(f"Fixed {fixed} unguarded .map() calls")

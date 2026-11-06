import os, re

# Phase 2: remaining hardcoded colors
# text-white is intentional (MEMORY.md exception)

MAPPINGS = [
    # Dark backgrounds
    (r'(?<![\w-])bg-gray-800(?![\w-])', 'dark:bg-card'),
    (r'(?<![\w-])bg-gray-700(?![\w-])', 'dark:bg-muted'),
    (r'(?<![\w-])bg-gray-900(?![\w-])', 'dark:bg-background'),
    (r'(?<![\w-])bg-gray-950(?![\w-])', 'dark:bg-background'),
    (r'(?<![\w-])bg-gray-600(?![\w-])', 'dark:bg-muted'),
    # Light backgrounds
    (r'(?<![\w-])bg-gray-50(?![\w-])', 'bg-muted'),
    (r'(?<![\w-])bg-gray-100(?![\w-])', 'bg-muted'),
    (r'(?<![\w-])bg-gray-200(?![\w-])', 'bg-muted'),
    (r'(?<![\w-])bg-gray-300(?![\w-])', 'bg-muted'),
    (r'(?<![\w-])bg-gray-400(?![\w-])', 'bg-muted'),
    (r'(?<![\w-])bg-gray-500(?![\w-])', 'bg-muted'),
    (r'(?<![\w-])bg-white(?![\w-])', 'bg-card'),
    # Borders
    (r'(?<![\w-])border-gray-50(?![\w-])', 'border-border'),
    (r'(?<![\w-])border-gray-100(?![\w-])', 'border-border'),
    (r'(?<![\w-])border-gray-200(?![\w-])', 'border-border'),
    (r'(?<![\w-])border-gray-300(?![\w-])', 'border-border'),
    (r'(?<![\w-])border-gray-400(?![\w-])', 'border-border'),
    (r'(?<![\w-])border-gray-500(?![\w-])', 'border-border'),
    (r'(?<![\w-])border-gray-600(?![\w-])', 'dark:border-border'),
    (r'(?<![\w-])border-gray-700(?![\w-])', 'dark:border-border'),
    (r'(?<![\w-])border-gray-800(?![\w-])', 'dark:border-border'),
    # Text
    (r'(?<![\w-])text-gray-200(?![\w-])', 'dark:text-foreground'),
    (r'(?<![\w-])text-gray-300(?![\w-])', 'dark:text-muted-foreground'),
]

app_root = 'fwber-frontend'
changed_files = 0
total_replacements = 0

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
        except:
            continue
        
        new_content = content
        file_count = 0
        for pattern, replacement in MAPPINGS:
            new_content, n = re.subn(pattern, replacement, new_content)
            file_count += n
        
        if file_count > 0 and new_content != content:
            with open(path, 'w', encoding='utf-8') as fh:
                fh.write(new_content)
            changed_files += 1
            total_replacements += file_count

print(f"Changed {changed_files} files, {total_replacements} replacements")

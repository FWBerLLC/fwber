import os, re

# Theme token migration: hardcoded colors -> semantic tokens
# Rule from MEMORY.md: "All colors use theme tokens, never hardcoded"
# Exceptions: text-white on colored buttons, bg-black overlays

MAPPINGS = [
    # Backgrounds
    (r'bg-white(?![/\w])', 'bg-card'),
    (r'bg-gray-50(?![/\w])', 'bg-muted'),
    (r'bg-gray-100(?![/\w])', 'bg-muted'),
    (r'bg-gray-200(?![/\w])', 'bg-muted'),
    (r'dark:bg-gray-800(?![/\w])', 'dark:bg-card'),
    (r'dark:bg-gray-900(?![/\w])', 'dark:bg-background'),
    (r'dark:bg-gray-950(?![/\w])', 'dark:bg-background'),
    # Text
    (r'text-gray-900(?![/\w])', 'text-foreground'),
    (r'text-gray-800(?![/\w])', 'text-foreground'),
    (r'text-gray-700(?![/\w])', 'text-foreground'),
    (r'text-gray-600(?![/\w])', 'text-muted-foreground'),
    (r'text-gray-500(?![/\w])', 'text-muted-foreground'),
    (r'text-gray-400(?![/\w])', 'text-muted-foreground'),
    (r'text-gray-300(?![/\w])', 'text-muted-foreground'),
    (r'dark:text-white(?![/\w])', 'dark:text-foreground'),
    (r'dark:text-gray-100(?![/\w])', 'dark:text-foreground'),
    (r'dark:text-gray-200(?![/\w])', 'dark:text-foreground'),
    (r'dark:text-gray-300(?![/\w])', 'dark:text-muted-foreground'),
    (r'dark:text-gray-400(?![/\w])', 'dark:text-muted-foreground'),
    # Borders
    (r'border-gray-200(?![/\w])', 'border-border'),
    (r'border-gray-300(?![/\w])', 'border-border'),
    (r'dark:border-gray-700(?![/\w])', 'dark:border-border'),
    (r'dark:border-gray-600(?![/\w])', 'dark:border-border'),
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

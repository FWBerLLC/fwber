import os, re

app_root = os.path.join(os.path.dirname(__file__), 'fwber-frontend')
fixed = 0

for scan_dir in ['app', 'components']:
    for dirpath, dirnames, filenames in os.walk(os.path.join(app_root, scan_dir)):
        for fname in filenames:
            if not fname.endswith('.tsx'):
                continue
            fpath = os.path.join(dirpath, fname)
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            lines = content.split('\n')
            modified = False
            
            for i, line in enumerate(lines):
                if '<button' not in line:
                    continue
                if 'type=' in line:
                    continue
                
                # Check if next few lines have onClick and no type=
                chunk = '\n'.join(lines[i:min(i+6, len(lines))])
                if 'onClick' not in chunk:
                    continue
                if 'type=' in chunk:
                    continue
                
                # Find the end of the <button tag to insert type="button"
                # Strategy: insert type="button" right after <button or <button className=...
                # Actually, insert right after '<button' word boundary
                
                # Find the position of '<button' in the line
                btn_pos = line.find('<button')
                if btn_pos == -1:
                    continue
                
                # Check if there's a space or attribute right after <button
                after_btn = line[btn_pos + 7:]  # after '<button'
                
                # Insert type="button" after <button
                # Handle cases: <button>, <button className=..., <button\n
                if after_btn.startswith('>'):
                    lines[i] = line[:btn_pos + 7] + ' type="button"' + after_btn
                elif after_btn.startswith(' '):
                    lines[i] = line[:btn_pos + 7] + ' type="button"' + after_btn
                elif after_btn.startswith('\n') or after_btn.strip() == '':
                    lines[i] = line[:btn_pos + 7] + ' type="button"' + after_btn
                else:
                    # <button className=... without space? unlikely but handle
                    lines[i] = line[:btn_pos + 7] + ' type="button" ' + after_btn
                
                modified = True
                fixed += 1
            
            if modified:
                with open(fpath, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(lines))

print(f'Fixed {fixed} buttons')

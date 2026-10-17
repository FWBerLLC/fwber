import os
routes_to_check = ['/chatrooms', '/home', '/onboarding', '/websocket', '/rate-my-pussy', '/matching/nfc', '/matches/dashboard', '/wingman', '/gifts/send', '/gifts/history']
for route in routes_to_check:
    path = f'fwber-frontend/app{route}/page.tsx'
    if os.path.exists(path):
        with open(path, encoding='utf-8', errors='replace') as f:
            content = f.read(600)
        # Check if it's a redirect
        is_redirect = 'redirect(' in content
        is_wrapper = 'export default' in content and len(content) < 400
        print(f'{route}: redirect={is_redirect} small={is_wrapper} | {content[:150].replace(chr(10), " ")}')
    else:
        print(f'{route}: NOT FOUND')

# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.5.x   | ✅ Current |
| < 0.5.0 | ❌ Legacy  |

## Reporting a Vulnerability

If you discover a security vulnerability in fwber, please report it responsibly:

1. **Do NOT open a public issue.**
2. Email **security@fwber.site** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
3. You will receive a response within 48 hours.

## Security Practices

- All authentication uses Laravel Sanctum with bcrypt password hashing.
- CSRF protection on all forms.
- Rate limiting on authentication endpoints.
- Content sanitization on all user input.
- HTTPS/TLS enforced in production.
- No secrets are committed to version control.
- Feature flags gate experimental functionality via `config/features.php`.

## Scope

This policy applies to the `fwber` repository and the `fwber.site` production deployment.

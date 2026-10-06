# DNS Records for fwber.site — Email Delivery Setup

## Current State
- ✅ Postfix running on Hetzner (5.161.250.43)
- ✅ OpenDKIM signing emails
- ✅ Backend sends verification/password-reset emails via local SMTP
- ❌ DNS records not configured — emails stuck in queue

## Required DNS Records (via Vercel Dashboard)

### 1. MX Record — Route email to Hetzner
| Type | Name | Value | Priority |
|------|------|-------|----------|
| MX | `@` | `mail.fwber.site` | 10 |

### 2. A Record — Mail server
| Type | Name | Value |
|------|------|-------|
| A | `mail` | `5.161.250.43` |

### 3. SPF — Authorize our server to send
| Type | Name | Value |
|------|------|-------|
| TXT | `@` | `v=spf1 ip4:5.161.250.43 ~all` |

### 4. DKIM — Sign emails cryptographically
| Type | Name | Value |
|------|------|-------|
| TXT | `default._domainkey` | `v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsK6G2dBXQheXKnXFi6ywFsdPtPxG+rxRk4BMGP76CVMMMieasIIV1QKLnVepYB8g9DORSOyL1ogfPNtggY3tN3YMPcp1kWs9yFBSINZJw2LEOHvKKsCSU3m4FN2D6GqGK+vIdex/5GGuGtNaQBjzp0cpOBUJPoxoOU74OsXd8up5NkHU7jOQh5YqV9FdpRlxc6DD+0okcye154tpp8HvK5OnpfGOW00Vyn+lnIfQoFaNzzMOwCMoyV7SSwPFQaCpEMbSOHHl9ESjl+vKFdIACc0t75phlFlC3EKD7BeOUe145ytG7BNQ+8eITTaMryK/PwgexzNtSJja6jt17kuQtwIDAQAB` |

### 5. DMARC — Policy for failed authentication
| Type | Name | Value |
|------|------|-------|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@fwber.site` |

## How to Add These Records

1. Go to https://vercel.com → fwber project → Settings → Domains
2. Add each record above as a DNS record
3. Wait 5-30 minutes for propagation

## Verify After Adding
```bash
dig MX fwber.site +short          # Should show: 10 mail.fwber.site
dig TXT fwber.site +short         # Should show: v=spf1 ip4:5.161.250.43 ~all
dig TXT default._domainkey.fwber.site +short  # Should show DKIM key
dig TXT _dmarc.fwber.site +short  # Should show: v=DMARC1; p=none; ...
```

## Test Email Delivery
After DNS propagates, register a new account and check if the verification email arrives.

## Alternative: Resend.com (Recommended for Production)
If DNS setup is complex, use Resend.com (free 100 emails/day):
1. Sign up at https://resend.com
2. Add domain fwber.site in Resend dashboard
3. Add the DNS records Resend provides
4. Add `RESEND_API_KEY=re_xxx` to the backend `.env`
5. Restart: `pm2 restart fwber-backend-ts`

Resend handles SPF/DKIM/DMARC automatically and has better deliverability to Gmail/Outlook.

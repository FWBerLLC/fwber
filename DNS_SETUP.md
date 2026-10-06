# DNS Records for fwber.site Email Delivery

These DNS records must be added through **Vercel Dashboard → fwber.site → Settings → DNS**.

## Required Records

### 1. MX Record (tells other servers where to deliver mail for fwber.site)
| Type | Name | Value | Priority |
|------|------|-------|----------|
| MX | `@` | `mail.fwber.site` | 10 |

### 2. A Record for mail server
| Type | Name | Value |
|------|------|-------|
| A | `mail` | `5.161.250.43` |

### 3. SPF Record (authorizes our server to send email)
| Type | Name | Value |
|------|------|-------|
| TXT | `@` | `v=spf1 ip4:5.161.250.43 ~all` |

### 4. DKIM Record (signs outgoing emails cryptographically)
| Type | Name | Value |
|------|------|-------|
| TXT | `default._domainkey` | `v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsK6G2dBXQheXKnXFi6ywFsdPtPxG+rxRk4BMGP76CVMMMieasIIV1QKLnVepYB8g9DORSOyL1ogfPNtggY3tN3YMPcp1kWs9yFBSINZJw2LEOHvKKsCSU3m4FN2D6GqGK+vIdex/5GGuGtNaQBjzp0cpOBUJPoxoOU74OsXd8up5NkHU7jOQh5YqV9FdpRlxc6DD+0okcye154tpp8HvK5OnpfGOW00Vyn+lnIfQoFaNzzMOwCMoyV7SSwPFQaCpEMbSOHHl9ESjl+vKFdIACc0t75phlFlC3EKD7BeOUe145ytG7BNQ+8eITTaMryK/PwgexzNtSJja6jt17kuQtwIDAQAB` |

### 5. DMARC Record (tells receivers what to do with unauthenticated mail)
| Type | Name | Value |
|------|------|-------|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@fwber.site` |

## Verification

After adding all records, verify with:
```bash
dig MX fwber.site +short          # Should show: 10 mail.fwber.site
dig TXT fwber.site +short         # Should show: v=spf1 ip4:5.161.250.43 ~all
dig TXT default._domainkey.fwber.site +short  # Should show DKIM key
dig TXT _dmarc.fwber.site +short  # Should show: v=DMARC1; p=none; ...
```

## Current Status
- ✅ Postfix installed and running (localhost:25)
- ✅ OpenDKIM installed and signing emails
- ✅ App sends via local SMTP relay
- ⏳ DNS records need to be added (this doc)
- ⏳ After DNS: test with a real email address

## Note on Email Deliverability
Even with all DNS records, initial deliverability to Gmail/Outlook may be limited
due to the server's IP reputation. For production, consider:
1. **Resend.com** (free 100 emails/day, great deliverability)
2. **Amazon SES** (low cost, high volume)
3. Warming up the IP by sending small volumes first

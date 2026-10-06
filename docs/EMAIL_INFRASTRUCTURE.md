# Production Email Infrastructure: Resend Configuration

This document outlines the required configuration for moving `fwber.site` to production-grade email delivery via Resend.

## 1. DNS Configuration (Vercel/Cloudflare)

To ensure high deliverability (preventing Spam folders), the following records must be added to the `fwber.site` DNS zone.

### SPF (Sender Policy Framework)
**Type:** TXT
**Host:** `@`
**Value:** `v=spf1 include:resend.com ~all`

### DKIM (DomainKeys Identified Mail)
*Note: Resend provides 3 CNAME records for DKIM during domain verification.*
1. **Host:** `resend._domainkey` | **Value:** `resend.dkim.resend.com`
2. **Host:** `resend2._domainkey` | **Value:** `resend2.dkim.resend.com`
3. **Host:** `resend3._domainkey` | **Value:** `resend3.dkim.resend.com`

### DMARC (Domain-based Message Authentication, Reporting, and Conformance)
**Type:** TXT
**Host:** `_dmarc`
**Value:** `v=DMARC1; p=quarantine; rua=mailto:admin@fwber.site`

---

## 2. Server Configuration (`fwber-backend-ts`)

Once DNS is verified, update the production `.env` file on the Hetzner server:

```env
# Email Primary (Resend)
RESEND_API_KEY=re_123456789...
MAIL_FROM=notifications@fwber.site

# Fallback SMTP (DreamHost)
MAIL_HOST=smtp.dreamhost.com
MAIL_PORT=587
MAIL_USER=notifications@fwber.site
MAIL_PASS=********
```

---

## 3. Implementation Details

The system uses a tiered delivery strategy (`src/lib/email.ts`):
1. **Resend API**: Primary method. Fast, handles tracking, and provides high reputation.
2. **SMTP**: Automatic fallback if Resend fails or is unconfigured.
3. **Console**: Final fallback for development/emergency, logging URLs to stdout.

## 4. Verification Checklist
- [ ] Domain `fwber.site` marked as **Verified** in Resend Dashboard.
- [ ] DNS propagation check (use `dig -t txt fwber.site`).
- [ ] Test verification email sent to a real Gmail/Outlook address.
- [ ] Check DMARC reports for any alignment issues.

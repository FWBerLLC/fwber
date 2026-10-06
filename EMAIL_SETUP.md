# Email Setup Guide for fwber

## Current Status
- SMTP (DreamHost): ❌ Password invalid — credentials need to be reset at DreamHost panel
- Resend API: ❌ Not configured — needs API key and DNS records
- Console fallback: ✅ Active — verification URLs logged to PM2 stdout

## Option 1: Fix DreamHost SMTP (Quickest)
1. Log into DreamHost panel → Mail → Manage Email
2. Reset password for `notifications@fwber.site` 
3. Update the password on the server:
   ```bash
   ssh root@5.161.250.43
   sed -i 's/MAIL_PASS=.*/MAIL_PASS=YOUR_NEW_PASSWORD/' /var/www/fwber/repo/fwber-backend-ts/.env
   cd /var/www/fwber/repo/fwber-backend-ts && pm2 restart fwber-backend-ts
   ```

## Option 2: Set up Resend (Recommended — Free 100 emails/day)
1. Sign up at https://resend.com
2. Add your domain `fwber.site` in the Resend dashboard
3. Add the DNS records Resend provides (through Vercel DNS panel):
   - Go to https://vercel.com → fwber project → Settings → Domains → DNS
   - Add SPF TXT record for `fwber.site`
   - Add DKIM CNAME record 
   - Add DMARC TXT record for `_dmarc.fwber.site`
4. Get your API key from Resend dashboard
5. Add it to the server:
   ```bash
   ssh root@5.161.250.43
   echo 'RESEND_API_KEY=re_YOUR_KEY_HERE' >> /var/www/fwber/repo/fwber-backend-ts/.env
   cd /var/www/fwber/repo/fwber-backend-ts && pm2 restart fwber-backend-ts
   ```

## How Email Works Now (Without Configuration)
- User registers → email verification token generated → logged to console
- User can still use the app fully without email verification
- Email verification is optional, not required for login
- The verification link appears in PM2 logs and can be used manually:
  ```bash
  pm2 logs fwber-backend-ts --lines 50 | grep 'Verification URL'
  ```

## Architecture
The email system (`src/lib/email.ts`) supports 3 transport methods with automatic failover:
1. **Resend API** (if `RESEND_API_KEY` is set) — primary
2. **SMTP** (if `MAIL_HOST/USER/PASS` are set) — secondary  
3. **Console fallback** — always available, logs verification URL to stdout

# FWBER Platform — External Service Setup Guide

This document covers the external services and DNS records needed to make
all platform features fully operational. The codebase is complete and deployed;
only these infrastructure items remain.

## 1. Email Delivery (Resend)

Email is currently non-functional. All verification emails appear only in PM2 logs.

### Steps:
1. Create account at https://resend.com
2. Add and verify the domain `fwber.site`
3. Add the following DNS records at your DNS provider:

```
# MX record (required by Resend)
Type: MX
Host: fwber.site
Value: feedback-smtp.resend.com
Priority: 10

# SPF record
Type: TXT
Host: fwber.site
Value: v=spf1 include:resend.com ~all

# DKIM record (Resend provides the specific value)
Type: TXT
Host: resend._domainkey.fwber.site
Value: (provided by Resend dashboard)

# DMARC record
Type: TXT
Host: _dmarc.fwber.site
Value: v=DMARC1; p=none; rua=mailto:dmarc@fwber.site
```

4. Copy the Resend API key and set it on the server:
```bash
ssh root@5.161.250.43
cd /var/www/fwber/repo/fwber-backend-ts
echo "RESEND_API_KEY=re_xxxxxxxxxxxx" >> .env
pm2 restart fwber-backend-ts --update-env
```

## 2. AI Provider Keys (Wingman Features)

All three AI providers are currently non-functional. Wingman features serve static fallbacks.

### OpenRouter (Recommended - cheapest, multi-model)
1. Create account at https://openrouter.ai
2. Generate API key
3. Set on server:
```bash
ssh root@5.161.250.43
cd /var/www/fwber/repo/fwber-backend-ts
# Edit .env and replace the OPENROUTER_API_KEY value
sed -i 's/OPENROUTER_API_KEY=.*/OPENROUTER_API_KEY=sk-or-v1-xxxxx/' .env
pm2 restart fwber-backend-ts --update-env
```

### OpenAI (Alternative)
1. Create account at https://platform.openai.com
2. Generate API key
3. Set on server:
```bash
sed -i 's/OPENAI_API_KEY=.*/OPENAI_API_KEY=sk-proj-xxxxx/' .env
pm2 restart fwber-backend-ts --update-env
```

## 3. Stripe Payments (Premium Subscriptions)

Payments are currently in test mode with no live keys.

### Steps:
1. Create Stripe account at https://stripe.com
2. Get live API keys from the Stripe Dashboard
3. Set on server:
```bash
sed -i 's/STRIPE_SECRET_KEY=.*/STRIPE_SECRET_KEY=sk_live_xxxxx/' .env
sed -i 's/STRIPE_PUBLISHABLE_KEY=.*/STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx/' .env
sed -i 's/STRIPE_WEBHOOK_SECRET=.*/STRIPE_WEBHOOK_SECRET=whsec_xxxxx/' .env
pm2 restart fwber-backend-ts --update-env
```

4. Also set `NEXT_PUBLIC_STRIPE_KEY` in Vercel dashboard for the frontend
5. Set up webhook endpoint: `https://api.fwber.site/api/payments/webhook`

## 4. Mobile App Store Submission

### Android (TWA - Trusted Web Activity)
1. Generate Android signing key:
```bash
keytool -genkey -v -keystore fwber-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias fwber
```
2. Get SHA-256 fingerprint:
```bash
keytool -list -v -keystore fwber-release-key.jks -alias fwber
```
3. Update `.well-known/assetlinks.json` on the server with the fingerprint

### iOS
1. Get Apple Developer Team ID from https://developer.apple.com
2. Update `apple-app-site-association` file on the server
3. Build with Xcode and submit to App Store Connect

### Current placeholder files on server:
- `/var/www/fwber/repo/fwber-backend-ts/public/.well-known/assetlinks.json`
- `/var/www/fwber/repo/fwber-backend-ts/public/.well-known/apple-app-site-association`

## 5. Vercel Frontend Environment Variables

Set these in the Vercel Dashboard → Project Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://api.fwber.site
NEXT_PUBLIC_STRIPE_KEY=pk_live_xxxxx (when available)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=(from server .env)
NEXT_PUBLIC_SENTRY_DSN=(if using Sentry)
```

## 6. Web Push Notifications (VAPID Keys)

VAPID keys are already generated in the server `.env`. The public key needs
to be set in Vercel as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

To extract the current public key from the server:
```bash
ssh root@5.161.250.43 "grep VAPID_PUBLIC_KEY /var/www/fwber/repo/fwber-backend-ts/.env"
```

## Current Server Status (as of deployment)
- Backend: api.fwber.site (5.161.250.43) — PM2 cluster, 0 errors
- Frontend: www.fwber.site (Vercel) — all pages serving 200
- Database: fwber_production (MySQL) — 150 users, 418 matches, 167 messages
- API: 61/61 endpoints returning HTTP 200

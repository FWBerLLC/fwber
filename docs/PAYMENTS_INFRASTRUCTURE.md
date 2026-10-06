# fwber Payments Infrastructure (Stripe)

## Overview
fwber uses Stripe for processing fiat transactions (e.g., purchasing FWB tokens, Premium subscriptions, profile boosts). The codebase is designed to seamlessly transition between testing and production modes purely via environment variable manipulation, requiring **zero code changes**.

## 1. Finding Your Keys
Log into the [Stripe Dashboard](https://dashboard.stripe.com/).
1. Toggle the "Test mode" switch in the upper right.
2. Navigate to **Developers -> API keys**.
3. You will see your Standard Keys (`pk_test_...` and `sk_test_...`) or Live Keys (`pk_live_...` and `sk_live_...`).

## 2. Server Configuration (`.env`)
Update the `/app/fwber-backend-ts/.env` file on your Hetzner production server:

```env
# Change this from sk_test_... to sk_live_... for production
STRIPE_SECRET_KEY="sk_live_YOUR_PRODUCTION_SECRET_KEY"

# The webhook secret is generated when you register the webhook endpoint in Stripe
STRIPE_WEBHOOK_SECRET="whsec_YOUR_PRODUCTION_WEBHOOK_SECRET"
```

## 3. Webhook Setup
To automatically credit users with tokens after successful payments, you must register a webhook.
1. In Stripe, go to **Developers -> Webhooks**.
2. Click "Add endpoint".
3. Endpoint URL: `https://api.fwber.site/api/payments/webhook`
4. Events to listen to: `checkout.session.completed`
5. Reveal the "Signing secret" (`whsec_...`) and place it in your `.env` as `STRIPE_WEBHOOK_SECRET`.

## 4. Frontend Configuration
The frontend NextJS application requires the **Publishable Key** to tokenize cards.
Update `/app/fwber-frontend/.env.local`:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_YOUR_PRODUCTION_PUBLISHABLE_KEY"
```

## 5. Deployment & Go-Live
After updating the `.env` files on the production server:
1. Restart the backend: `pm2 restart fwber-backend`
2. Rebuild the frontend (if environmental variables are statically injected during build):
   ```bash
   cd /app/fwber-frontend
   npm run build
   pm2 restart fwber-frontend
   ```
3. Run a live test transaction of $1 to verify the webhook integration.

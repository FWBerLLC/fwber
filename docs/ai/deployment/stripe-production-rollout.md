# Stripe Production Rollout Checklist

> **Version:** 1.4.1  
> **Status:** Backend prepared, DevOps configuration required.

The active `fwber` platform now uses Stripe for restored premium billing and restored merchant marketplace purchases. This document serves as the operations-ready checklist for moving from mock billing to live billing in the recommended deployment topology: **Vercel frontend + Hetzner VPS backend**.

## 1. Environment Variable Configuration
To flip the switch from mock to live, the following variables must be configured in Vercel (Frontend) and on the Hetzner-hosted backend.

**Backend (`fwber-backend/.env`):**
```env
STRIPE_KEY=sk_live_...
STRIPE_SECRET=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Note: The webhook secret MUST match the live endpoint registration in the Stripe Dashboard.
```

**Frontend (`fwber-frontend/.env.production`):**
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## 2. Stripe Webhook Registration
1. Log into the Stripe Dashboard.
2. Navigate to **Developers > Webhooks**.
3. Add a new endpoint: `https://api.fwber.site/api/stripe/webhook`
4. Select the following events to listen to:
   - `payment_intent.succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
5. Copy the generated Webhook Secret (`whsec_...`) and update the backend `.env`.

## 3. Product & Price Provisioning
The backend `PremiumPlanCatalog` expects specific price IDs. You must create these in Stripe:
1. Create a Product: "fwber Gold"
2. Create a Recurring Price for $15.00/month.
3. Obtain the `price_...` ID.
4. Ensure the backend config `config/premium.php` or `PremiumPlanCatalog.php` matches this live price ID.

## 4. Operations-Ready Reconciliation Checklist
When running a real-money system for both subscriptions and merchant purchases, reconciliation is critical.

- [ ] **Daily Reconciliation:** Match successful Stripe payment events to Laravel `payments` and `merchant_payments` ledgers.
- [ ] **Chargeback / Dispute Handling:** Configure Stripe to send dispute events and decide whether premium access or merchant redemption issuance should be automatically suspended on chargeback.
- [ ] **Webhook Idempotency:** Confirm repeated webhook deliveries do not create duplicate premium grants or merchant payment rows.
- [ ] **Fallback Behavior:** Verify `PremiumUpgradeModal` and marketplace purchases fail clearly when Stripe is unavailable instead of silently hanging.

## 5. Live Testing (Pre-Launch)
Before announcing to the public, execute one real or Stripe-test premium purchase and one merchant marketplace purchase.
1. Sign up as a new user.
2. Purchase the Gold plan.
3. Verify `/premium/status` reports active Gold and `subscriptions` contains an active row.
4. Visit a merchant storefront and purchase one marketplace item.
5. Verify a `merchant_payments` row and `inventory_redemptions` code are created.
6. Cancel the subscription in Stripe.
7. Verify `customer.subscription.deleted` updates premium state correctly.
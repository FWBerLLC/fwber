-- Stripe webhook idempotency ledger (v2.3.116).
-- Stripe retries deliveries; without a processed-event record, a
-- redelivered checkout.session.completed would credit/grant twice.
-- The webhook handler records each event id AFTER successful handling
-- (so failed grants still retry) and acks duplicates without re-applying.
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL,
  processed_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

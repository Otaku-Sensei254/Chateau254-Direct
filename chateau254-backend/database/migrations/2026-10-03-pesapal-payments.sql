-- Pesapal API 3.0 payment state for orders.
--
-- This migration is additive and safe to run more than once. Existing orders
-- remain cash-on-delivery and unpaid until a new payment is initiated.

BEGIN;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) NOT NULL DEFAULT 'cash_on_delivery';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pesapal_merchant_reference VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pesapal_tracking_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider_status VARCHAR(80);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_message TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
    CHECK (payment_status IN ('unpaid', 'pending', 'completed', 'failed', 'reversed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS orders_pesapal_reference_idx
  ON orders(pesapal_merchant_reference) WHERE pesapal_merchant_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_pesapal_tracking_idx
  ON orders(pesapal_tracking_id) WHERE pesapal_tracking_id IS NOT NULL;

COMMIT;

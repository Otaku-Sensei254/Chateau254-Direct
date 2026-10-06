-- Add M-Pesa payment columns to orders table
-- This migration adds support for M-Pesa STK Push payments

-- Add M-Pesa columns if they don't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mpesa_merchant_reference VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mpesa_checkout_request_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mpesa_transaction_id VARCHAR(50);

-- Create indexes for M-Pesa columns
CREATE INDEX IF NOT EXISTS idx_orders_mpesa_merchant_reference ON orders(mpesa_merchant_reference);
CREATE INDEX IF NOT EXISTS idx_orders_mpesa_checkout_request_id ON orders(mpesa_checkout_request_id);

-- Add comments
COMMENT ON COLUMN orders.mpesa_merchant_reference IS 'M-Pesa merchant reference number';
COMMENT ON COLUMN orders.mpesa_checkout_request_id IS 'M-Pesa STK Push checkout request ID';
COMMENT ON COLUMN orders.mpesa_transaction_id IS 'M-Pesa transaction ID from Safaricom';
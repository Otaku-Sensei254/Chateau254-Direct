const express = require('express');
const { randomUUID } = require('crypto');
const asyncHandler = require('../middleware/async.middleware');
const db = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const env = require('../config/env');
const pesapal = require('../services/pesapal');

const router = express.Router();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const customerQuery = `
  SELECT id, full_name, email, phone FROM users WHERE id = $1
  UNION ALL
  SELECT id, full_name, email, NULL::varchar(30) AS phone FROM chateau_users
  WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM users WHERE id = $1)
`;

const catalogQuery = `
  WITH catalog AS (
    SELECT id, name, price, is_available FROM wines
    UNION ALL SELECT id, name, price, is_available FROM dine_in_menu
    UNION ALL SELECT id, name, price, is_available FROM takeout_menu
    UNION ALL SELECT id, name, price, is_available FROM lunchbox_menu
  )
  SELECT id, name, price, is_available AS "isAvailable"
  FROM catalog
  WHERE id = ANY($1::uuid[])
`;

const getUser = async (userId) => {
  const result = await db.query(customerQuery, [userId]);
  if (!result.rowCount) {
    const error = new Error('Customer account not found');
    error.statusCode = 404;
    throw error;
  }

  const user = result.rows[0];
  // Orders reference users, while older staff/customer records may still live
  // in chateau_users. Keep the existing compatibility behavior for payments.
  const customerExists = await db.query('SELECT id FROM users WHERE id = $1', [user.id]);
  if (!customerExists.rowCount) {
    await db.query(
      'INSERT INTO users (id, full_name, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
      [user.id, user.full_name, user.email],
    );
  }
  return user;
};

const normalizeItems = async (items) => {
  if (!Array.isArray(items) || !items.length) {
    const error = new Error('At least one menu item is required');
    error.statusCode = 400;
    throw error;
  }

  const requested = items.map((item) => ({
    menuItemId: String(item.menu_item_id || item.menuItemId || ''),
    quantity: Number(item.quantity),
  }));
  if (requested.some((item) => !UUID_PATTERN.test(item.menuItemId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) {
    const error = new Error('Each menu item must have a valid ID and quantity');
    error.statusCode = 400;
    throw error;
  }

  const ids = [...new Set(requested.map((item) => item.menuItemId))];
  const result = await db.query(catalogQuery, [ids]);
  const catalog = new Map();
  result.rows.forEach((item) => {
    if (!catalog.has(item.id)) catalog.set(item.id, item);
  });

  const missing = ids.filter((id) => !catalog.has(id));
  if (missing.length) {
    const error = new Error('One or more menu items are no longer available');
    error.statusCode = 409;
    throw error;
  }

  const normalized = requested.map((item) => {
    const catalogItem = catalog.get(item.menuItemId);
    if (!catalogItem.isAvailable) {
      const error = new Error(`${catalogItem.name} is no longer available`);
      error.statusCode = 409;
      throw error;
    }
    return {
      menuItemId: item.menuItemId,
      name: catalogItem.name,
      quantity: item.quantity,
      unitPrice: Number(catalogItem.price),
    };
  });

  const subtotal = normalized.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  return { items: normalized, subtotal };
};

const splitName = (name) => {
  const parts = String(name || 'Château customer').trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || 'Château', lastName: parts.slice(1).join(' ') || 'Customer' };
};

const paymentStatusFromProvider = (providerStatus) => {
  const code = Number(providerStatus.status_code);
  if (code === 1) return 'completed';
  if (code === 2) return 'failed';
  if (code === 3) return 'reversed';
  const providerError = String(providerStatus.error?.message || providerStatus.error?.code || '').toLowerCase();
  if (providerError.includes('pending')) return 'pending';
  const description = String(providerStatus.payment_status_description || providerStatus.description || '').toLowerCase();
  if (description.includes('complete')) return 'completed';
  if (description.includes('fail') || description.includes('invalid')) return 'failed';
  if (description.includes('revers')) return 'reversed';
  return 'pending';
};

const syncPayment = async (trackingId, merchantReference) => {
  const providerStatus = await pesapal.getTransactionStatus(trackingId);
  const paymentStatus = paymentStatusFromProvider(providerStatus);
  const providerMessage = String(providerStatus.error?.message || providerStatus.description || providerStatus.message || providerStatus.payment_status_description || '').slice(0, 500);
  const result = await db.query(
    `UPDATE orders
     SET payment_status = $1,
         payment_provider_status = $2,
         payment_message = $3,
         payment_method = 'pesapal',
         status = CASE WHEN $1 IN ('failed', 'reversed') AND status = 'pending' THEN 'cancelled' ELSE status END,
         paid_at = CASE WHEN $1 = 'completed' THEN COALESCE(paid_at, NOW()) ELSE paid_at END,
         updated_at = NOW()
     WHERE pesapal_tracking_id = $4
        OR ($5::varchar IS NOT NULL AND pesapal_merchant_reference = $5)
     RETURNING *`,
    [paymentStatus, String(providerStatus.error?.code || providerStatus.payment_status_description || providerStatus.status_code || '').slice(0, 80), providerMessage, trackingId, merchantReference || null],
  );

  return { providerStatus, paymentStatus, order: result.rows[0] || null };
};

const createLocalPaymentOrder = async ({ user, address, latitude, longitude, items, total, merchantReference }) => {
  const pool = db.pool;
  if (!pool) throw new Error('Database is not initialized');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderResult = await client.query(
      `INSERT INTO orders (
        user_id, delivery_address, total_amount, payment_method, payment_status, pesapal_merchant_reference
      ) VALUES ($1, $2, $3, 'pesapal', 'pending', $4)
      RETURNING *`,
      [user.id, address, total, merchantReference],
    );
    const order = orderResult.rows[0];
    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [order.id, item.menuItemId, item.quantity, item.unitPrice],
      );
    }
    if (latitude !== null && longitude !== null) {
      await client.query(
        `INSERT INTO customer_locations (user_id, latitude, longitude, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE SET latitude = $2, longitude = $3, updated_at = NOW()`,
        [user.id, latitude, longitude],
      );
    }
    await client.query('COMMIT');
    return order;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

const updateFailedInitialization = (orderId, message) => db.query(
  `UPDATE orders SET payment_status = 'failed', payment_message = $1, status = 'cancelled', updated_at = NOW() WHERE id = $2`,
  [String(message || 'Unable to initialize Pesapal payment').slice(0, 500), orderId],
);

/* Payment fields are additive and are also ensured at boot so a Railway deploy
   does not begin serving checkout requests before its existing database has the
   new columns. The checked-in migration remains available for explicit DB runs. */
const ensurePaymentSchema = () => db.query(`
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
`);

router.post('/register-ipn', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await pesapal.registerIpn({
    url: req.body?.url || env.pesapalIpnUrl,
    ipnNotificationType: req.body?.ipn_notification_type || 'POST',
  });
  res.json({ ipn: result });
}));

router.post('/initialize', authenticate, requireRole('customer', 'admin'), asyncHandler(async (req, res) => {
  if (!env.pesapalCallbackUrl) {
    return res.status(503).json({ error: 'PESAPAL_CALLBACK_URL is not configured on the server' });
  }
  const { delivery_address: deliveryAddress, latitude = null, longitude = null, items = [] } = req.body || {};
  if (!deliveryAddress || String(deliveryAddress).trim().length < 3) return res.status(400).json({ error: 'A delivery address is required' });
  const parsedLatitude = latitude === null || latitude === '' ? null : Number(latitude);
  const parsedLongitude = longitude === null || longitude === '' ? null : Number(longitude);
  if ((parsedLatitude !== null && !Number.isFinite(parsedLatitude)) || (parsedLongitude !== null && !Number.isFinite(parsedLongitude))) {
    return res.status(400).json({ error: 'Location coordinates must be valid numbers' });
  }

  const ipn = await pesapal.findConfiguredIpn();
  if (!ipn?.ipn_id) return res.status(503).json({ error: 'Pesapal IPN is not registered. Register the configured IPN URL first.' });

  const user = await getUser(req.user.id);
  const normalized = await normalizeItems(items);
  const total = Number(normalized.subtotal.toFixed(2));
  const merchantReference = `CH254-${randomUUID()}`;
  const order = await createLocalPaymentOrder({
    user,
    address: String(deliveryAddress).trim(),
    latitude: parsedLatitude,
    longitude: parsedLongitude,
    items: normalized.items,
    total,
    merchantReference,
  });
  const name = splitName(user.full_name);

  try {
    const providerOrder = await pesapal.submitOrder({
      id: merchantReference,
      currency: 'KES',
      amount: total,
      description: `Château254 order ${order.id.slice(0, 8)}`,
      callback_url: env.pesapalCallbackUrl,
      redirect_mode: '',
      notification_id: ipn.ipn_id,
      branch: 'Château254',
      billing_address: {
        email_address: user.email,
        phone_number: user.phone || req.body.phone || '',
        country_code: 'KE',
        first_name: name.firstName,
        middle_name: '',
        last_name: name.lastName,
        line_1: String(deliveryAddress).trim().slice(0, 200),
        line_2: '',
        city: 'Nairobi',
        state: '',
        postal_code: '',
        zip_code: '',
      },
    });
    if (!providerOrder.redirect_url || !providerOrder.order_tracking_id) {
      throw new Error('Pesapal did not return a payment redirect URL');
    }
    const updated = await db.query(
      `UPDATE orders SET pesapal_tracking_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [providerOrder.order_tracking_id, order.id],
    );
    return res.status(201).json({
      payment: {
        redirectUrl: providerOrder.redirect_url,
        orderTrackingId: providerOrder.order_tracking_id,
        merchantReference: providerOrder.merchant_reference || merchantReference,
      },
      order: updated.rows[0] || order,
    });
  } catch (error) {
    await updateFailedInitialization(order.id, error.message).catch(() => {});
    throw error;
  }
}));

router.get('/status/:trackingId', authenticate, asyncHandler(async (req, res) => {
  const existing = await db.query(
    `SELECT id FROM orders WHERE pesapal_tracking_id = $1 AND user_id = $2`,
    [req.params.trackingId, req.user.id],
  );
  if (!existing.rowCount) return res.status(404).json({ error: 'Payment order not found' });
  const result = await syncPayment(req.params.trackingId, null);
  res.json({ payment: { status: result.paymentStatus, provider: result.providerStatus }, order: result.order });
}));

const callback = asyncHandler(async (req, res) => {
  const trackingId = req.query.OrderTrackingId || req.query.orderTrackingId;
  const merchantReference = req.query.OrderMerchantReference || req.query.orderMerchantReference;
  let paymentStatus = 'pending';
  if (trackingId) {
    try {
      const result = await syncPayment(trackingId, merchantReference);
      paymentStatus = result.paymentStatus;
    } catch (error) {
      console.warn('[Pesapal] Callback status lookup failed:', error.message);
    }
  }
  const frontendCallback = new URL('/payment-result', env.frontendUrl);
  if (trackingId) frontendCallback.searchParams.set('OrderTrackingId', trackingId);
  if (merchantReference) frontendCallback.searchParams.set('OrderMerchantReference', merchantReference);
  frontendCallback.searchParams.set('payment_status', paymentStatus);
  res.redirect(frontendCallback.toString());
});

const ipn = asyncHandler(async (req, res) => {
  const payload = req.body || {};
  const trackingId = payload.OrderTrackingId || payload.orderTrackingId || req.query.OrderTrackingId || req.query.orderTrackingId;
  const merchantReference = payload.OrderMerchantReference || payload.orderMerchantReference || req.query.OrderMerchantReference || req.query.orderMerchantReference;
  if (!trackingId) return res.status(400).json({ error: 'OrderTrackingId is required' });
  try {
    await syncPayment(trackingId, merchantReference);
  } catch (error) {
    console.error('[Pesapal] IPN status lookup failed:', error.message);
    return res.status(502).json({ error: 'Unable to verify Pesapal transaction yet' });
  }
  return res.status(200).json({ status: 'received' });
});

router.get('/callback', callback);
router.post('/ipn', ipn);
router.get('/ipn', ipn);

router.ensurePaymentSchema = ensurePaymentSchema;
module.exports = router;

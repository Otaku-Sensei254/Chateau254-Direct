const express = require('express');
const { randomUUID } = require('crypto');
const asyncHandler = require('../middleware/async.middleware');
const db = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const env = require('../config/env');
const mpesa = require('../services/mpesa');

const router = express.Router();

const initiateMpesaPayment = async (userId, phone, amount, accountReference, description = 'Payment') => {
  const userResult = await db.query(
    'SELECT id, full_name, email, phone FROM users WHERE id = $1 UNION ALL SELECT id, full_name, email, NULL::varchar(30) AS phone FROM chateau_users WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM users WHERE id = $1)',
    [userId]
  );

  if (!userResult.rowCount) {
    throw new Error('Customer account not found');
  }

  const user = userResult.rows[0];
  const merchantReference = `CH254-${randomUUID()}`;

  const orderResult = await db.query(
    `INSERT INTO orders (user_id, delivery_address, total_amount, payment_method, payment_status, mpesa_merchant_reference, status)
     VALUES ($1, $2, $3, 'mpesa', 'pending', $4, 'pending')
     RETURNING *`,
    [userId, 'M-Pesa Payment', amount, merchantReference]
  );

  const order = orderResult.rows[0];

  try {
    const stkResult = await mpesa.initiateSTKPush(
      phone,
      amount,
      merchantReference,
      description
    );

    await db.query(
      `UPDATE orders SET mpesa_checkout_request_id = $1, updated_at = NOW() WHERE id = $2`,
      [stkResult.checkoutRequestId, order.id]
    );

    return {
      success: true,
      order,
      stkPush: stkResult,
      merchantReference
    };
  } catch (error) {
    await db.query(
      "UPDATE orders SET payment_status = 'failed', payment_message = $1, status = 'cancelled', updated_at = NOW() WHERE id = $2",
      [error.message, order.id]
    );
    throw error;
  }
};

router.post('/stkpush', authenticate, asyncHandler(async (req, res) => {
  const { amount, phone, account_reference, description } = req.body || {};

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid amount is required' });
  }

  const cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
  if (!cleanPhone || cleanPhone.length < 10) {
    return res.status(400).json({ error: 'Valid phone number is required' });
  }

  try {
    const result = await initiateMpesaPayment(
      req.user.id,
      cleanPhone,
      amount,
      account_reference || `CH254-${req.user.id}`,
      description || 'Chateau254 Payment'
    );

    res.status(201).json({
      message: 'M-Pesa STK Push initiated successfully',
      order: result.order,
      stkPush: result.stkPush,
      merchantReference: result.merchantReference
    });
  } catch (error) {
    console.error('[M-Pesa] STK Push failed:', error);
    res.status(502).json({ error: error.message || 'Failed to initiate M-Pesa payment' });
  }
}));

router.post('/callback', asyncHandler(async (req, res) => {
  const payload = req.body || {};

  console.log('[M-Pesa] Callback received:', JSON.stringify(payload));

  const checkoutRequestId = payload.CheckoutRequestID;
  const merchantRequestId = payload.MerchantRequestID;
  const resultCode = payload.ResultCode;
  const resultDesc = payload.ResultDesc;

  if (!checkoutRequestId) {
    return res.status(400).json({ error: 'CheckoutRequestID is required' });
  }

  const existing = await db.query(
    'SELECT id, payment_status FROM orders WHERE mpesa_checkout_request_id = $1',
    [checkoutRequestId]
  );

  if (!existing.rowCount) {
    return res.status(404).json({ error: 'Order not found for this checkout request' });
  }

  const order = existing.rows[0];
  if (order.payment_status === 'completed') {
    return res.status(200).json({ status: 'already_processed' });
  }

  let paymentStatus = 'failed';
  if (resultCode === 0) {
    paymentStatus = 'completed';
  } else if (resultCode === 1 || resultCode === 2) {
    paymentStatus = 'failed';
  } else {
    paymentStatus = 'pending';
  }

  await db.query(
    `UPDATE orders 
     SET payment_status = $1,
         payment_provider_status = $2,
         payment_message = $3,
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [paymentStatus, String(resultCode), resultDesc, order.id]
  );

  res.status(200).json({ status: 'received' });
}));

router.get('/status/:checkoutRequestId', authenticate, asyncHandler(async (req, res) => {
  const { checkoutRequestId } = req.params;

  if (!checkoutRequestId) {
    return res.status(400).json({ error: 'CheckoutRequestID is required' });
  }

  try {
    const stkStatus = await mpesa.querySTKStatus(checkoutRequestId);

    const orderResult = await db.query(
      'SELECT * FROM orders WHERE mpesa_checkout_request_id = $1 AND user_id = $2',
      [checkoutRequestId, req.user.id]
    );

    if (!orderResult.rowCount) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      stkStatus,
      order: orderResult.rows[0]
    });
  } catch (error) {
    console.error('[M-Pesa] Status query failed:', error);
    res.status(502).json({ error: error.message || 'Failed to query M-Pesa status' });
  }
}));

module.exports = router;
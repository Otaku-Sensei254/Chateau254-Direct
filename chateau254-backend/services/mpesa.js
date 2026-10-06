const dotenv = require('dotenv');
dotenv.config();

const env = require('../config/env');

const MPESA_BASE_URL = env.mpesaEnvironment === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

const getAccessToken = async () => {
  const auth = Buffer.from(`${env.mpesaConsumerKey}:${env.mpesaConsumerSecret}`).toString('base64');
  
  const response = await fetch(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.access_token) {
    console.warn('[M-Pesa] OAuth non-ok:', response.status, data ? JSON.stringify(data).slice(0, 200) : '(non-JSON response)');
    throw new Error('M-Pesa is temporarily unavailable. Please try again in a moment.');
  }

  return data.access_token;
};

const generatePassword = (shortCode, passkey, timestamp) => {
  const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
  return password;
};

const getTimestamp = () => {
  // Safaricom requires Africa/Nairobi time (UTC+3); servers on UTC would
  // build a password from a timestamp 3 hours off → "Wrong credentials".
  const now = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

const normalizePhone = (phoneNumber) => {
  const digits = String(phoneNumber || '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  if (digits.startsWith('254')) return digits;
  if (digits.startsWith('0')) return '254' + digits.slice(1);
  if (digits.length === 9) return '254' + digits;
  return digits;
};

const initiateSTKPush = async (phoneNumber, amount, accountReference, transactionDesc = 'Payment') => {
  if (!env.mpesaConsumerKey || !env.mpesaConsumerSecret) {
    throw new Error('M-Pesa consumer credentials are not configured');
  }

  const normalizedPhone = normalizePhone(phoneNumber);
  if (!normalizedPhone || normalizedPhone.length < 12) {
    throw new Error('Invalid phone number. Use format 254724064302 or 0724064302.');
  }

  const accessToken = await getAccessToken();
  const timestamp = getTimestamp();
  const password = generatePassword(env.mpesaBusinessShortCode, env.mpesaPasskey, timestamp);

  const payload = {
    "BusinessShortCode": env.mpesaBusinessShortCode,
    "Password": password,
    "Timestamp": timestamp,
    "TransactionType": "CustomerPayBillOnline",
    "Amount": Math.round(amount),
    "PartyA": normalizedPhone,
    "PartyB": env.mpesaBusinessShortCode,
    "PhoneNumber": normalizedPhone,
    "CallBackURL": env.mpesaCallbackUrl,
    "AccountReference": accountReference,
    "TransactionDesc": transactionDesc
  };

  const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    // Safaricom occasionally answers with an HTML error page under load —
    // never surface that raw body to the customer.
    console.warn('[M-Pesa] STK initiate non-JSON:', response.status, text.slice(0, 200));
    throw new Error('M-Pesa is temporarily unavailable. Please try again in a moment.');
  }

  if (!response.ok || data.ResponseCode !== '0') {
    console.warn('[M-Pesa] STK initiate rejected:', response.status, JSON.stringify(data).slice(0, 300));
    throw new Error('We could not reach M-Pesa just now. Please wait a moment and try again.');
  }

  return {
    success: true,
    merchantRequestId: data.MerchantRequestID,
    checkoutRequestId: data.CheckoutRequestID,
    responseCode: data.ResponseCode,
    responseDescription: data.ResponseDescription,
    customerMessage: data.CustomerMessage
  };
};

const querySTKStatus = async (checkoutRequestId) => {
  const accessToken = await getAccessToken();
  const timestamp = getTimestamp();
  const password = generatePassword(env.mpesaBusinessShortCode, env.mpesaPasskey, timestamp);

  const payload = {
    "BusinessShortCode": env.mpesaBusinessShortCode,
    "Password": password,
    "Timestamp": timestamp,
    "CheckoutRequestID": checkoutRequestId
  };

  const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  // Daraja answers with ResultCode/ResultDesc once the STK is completed
  // (0 = paid, 1032 = cancelled by user, 1037 = timeout, ...). While it is
  // still on the phone it errors with "being processed" — that is not a
  // failure, it means keep polling.
  if (data.ResultCode !== undefined) {
    const paid = String(data.ResultCode) === '0';
    return {
      success: paid,
      status: paid ? 'success' : 'failed',
      resultCode: String(data.ResultCode),
      resultDesc: data.ResultDesc || data.ResponseDescription || '',
      checkoutRequestId: data.CheckoutRequestID || checkoutRequestId,
      responseCode: data.ResponseCode,
      responseDescription: data.ResponseDescription,
    };
  }

  if (!response.ok) {
    console.warn('[M-Pesa] STK query non-ok:', response.status, JSON.stringify(data).slice(0, 300));
    if (/being processed|not been found|pending/i.test(data.errorMessage || data.errorCode || '')) {
      return { success: false, status: 'pending', checkoutRequestId, resultDesc: '' };
    }
    // Rate limits and gateway faults are transient — report pending so the
    // caller keeps polling instead of failing the customer's payment view.
    if (response.status === 429 || data.fault || /spike|gateway|timeout|temporar/i.test(data.errorMessage || data.fault?.faultstring || '')) {
      return { success: false, status: 'pending', checkoutRequestId, resultDesc: '' };
    }
    // Unknown failure — treat as pending rather than surfacing a raw message;
    // the caller keeps polling and falls back to a friendly timeout message.
    return { success: false, status: 'pending', checkoutRequestId, resultDesc: '' };
  }

  return { success: false, status: 'pending', checkoutRequestId, resultDesc: '' };
};

module.exports = {
  getAccessToken,
  generatePassword,
  getTimestamp,
  initiateSTKPush,
  querySTKStatus
};
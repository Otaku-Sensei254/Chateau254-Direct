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

  const data = await response.json();
  
  if (!response.ok || !data.access_token) {
    throw new Error(`Failed to get M-Pesa access token: ${data.errorMessage || 'Unknown error'}`);
  }

  return data.access_token;
};

const generatePassword = (shortCode, passkey, timestamp) => {
  const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
  return password;
};

const getTimestamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
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
    throw new Error(`M-Pesa returned non-JSON response: ${text.slice(0, 200)}`);
  }

  if (!response.ok || data.ResponseCode !== '0') {
    throw new Error(data.errorMessage || data.ResponseDescription || 'Failed to initiate STK push');
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

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.errorMessage || 'Failed to query STK push status');
  }

  return {
    success: true,
    checkoutRequestId: data.CheckoutRequestID,
    responseCode: data.ResponseCode,
    responseDescription: data.ResponseDescription
  };
};

module.exports = {
  getAccessToken,
  generatePassword,
  getTimestamp,
  initiateSTKPush,
  querySTKStatus
};
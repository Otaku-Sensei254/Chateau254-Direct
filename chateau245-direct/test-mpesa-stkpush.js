#!/usr/bin/env node

/**
 * M-Pesa STK Push Test Script
 * Tests the M-Pesa payment integration with the provided credentials
 */

const http = require('http');

const API_URL = 'http://localhost:5000';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUzNmRjN2YyLTcyZDgtNDczYy1iY2Y1LWQ3ODRkMjQ2ZjZjMSIsInJvbGUiOiJjdXN0b21lciIsInJvbGVzIjpbImN1c3RvbWVyIl0sIm5hbWUiOiJLZW4gS2VubmVkeSIsImVtYWlsIjoiZGh1aHVpbmNAZ21haWwuY29tIiwiaWF0IjoxNzkxMjA3MDE2LCJleHAiOjE3OTE4MTE4MTZ9.DgUriKY8XQt1VslDKJKetGc8L7xFLXsdQD_8TlgqWAo';

const makeRequest = (path, method = 'GET', body = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const testMpesaSTKPush = async () => {
  console.log('=== M-PESA STK PUSH TEST ===\n');

  try {
    // Test 1: Check if M-Pesa endpoint is accessible
    console.log('1. Testing M-Pesa STK Push endpoint...');
    const stkPushResponse = await makeRequest('/api/payments/mpesa/stkpush', 'POST', {
      amount: 10.00,
      phone: '254724064302',
      account_reference: 'TEST-001',
      description: 'Test payment for Chateau254'
    });

    console.log(`   Status: ${stkPushResponse.status}`);
    console.log(`   Response: ${JSON.stringify(stkPushResponse.data, null, 2)}\n`);

    if (stkPushResponse.status === 201 && stkPushResponse.data.success) {
      console.log('✅ M-Pesa STK Push initiated successfully!');
      console.log(`   Merchant Request ID: ${stkPushResponse.data.stkPush?.merchantRequestId}`);
      console.log(`   Checkout Request ID: ${stkPushResponse.data.stkPush?.checkoutRequestId}`);
      console.log(`   Customer Message: ${stkPushResponse.data.stkPush?.customerMessage}\n`);

      // Test 2: Check STK Push status (if we have a checkout request ID)
      if (stkPushResponse.data.stkPush?.checkoutRequestId) {
        console.log('2. Testing STK Push status query...');
        const statusResponse = await makeRequest(
          `/api/payments/mpesa/status/${stkPushResponse.data.stkPush.checkoutRequestId}`,
          'GET'
        );
        console.log(`   Status: ${statusResponse.status}`);
        console.log(`   Response: ${JSON.stringify(statusResponse.data, null, 2)}\n`);
      }
    } else {
      console.log('❌ M-Pesa STK Push failed');
      console.log(`   Error: ${stkPushResponse.data.error || 'Unknown error'}\n`);
    }

    // Test 3: Check callback endpoint
    console.log('3. Testing M-Pesa callback endpoint...');
    const callbackResponse = await makeRequest('/api/payments/mpesa/callback', 'POST', {
      CheckoutRequestID: 'test-checkout-id',
      MerchantRequestID: 'test-merchant-id',
      ResultCode: 0,
      ResultDesc: 'Success'
    });
    console.log(`   Status: ${callbackResponse.status}`);
    console.log(`   Response: ${JSON.stringify(callbackResponse.data, null, 2)}\n`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test
console.log('Starting M-Pesa STK Push test...\n');
testMpesaSTKPush().then(() => {
  console.log('\n=== TEST COMPLETE ===');
  console.log('\nNext steps:');
  console.log('1. Ensure backend is running on', API_URL);
  console.log('2. Ensure M-Pesa credentials are configured in backend .env');
  console.log('3. Test with real phone number and amount');
  console.log('4. Monitor backend logs for STK Push callbacks');
  process.exit(0);
}).catch((error) => {
  console.error('Test error:', error);
  process.exit(1);
});
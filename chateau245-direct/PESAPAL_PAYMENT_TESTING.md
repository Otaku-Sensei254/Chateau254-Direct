# PESAPAL PAYMENT TESTING DOCUMENTATION

## Overview
This documentation covers the complete Pesapal payment integration testing setup with sandbox credentials.

## Test Environment Setup

### Backend Configuration
- **Environment**: Sandbox (cybqa.pesapal.com)
- **Status**: ✅ Fully Configured
- **Credentials**: Already set up in `chateau254-backend/.env`

### Frontend Configuration  
- **Environment**: React development build
- **Status**: ✅ Payment integration complete
- **Test Mode**: Ready to enable

## Test Credentials

### API Credentials (Backend)
```bash
# File: chateau254-backend/.env

# Pesapal Sandbox Configuration
PESAPAL_BASE_URL=https://cybqa.pesapal.com/pesapalv3
PESAPAL_IPN_URL=https://chateau254-direct-production.up.railway.app/api/payments/pesapal/ipn
PESAPAL_IPN_ID=2af2120b-f1fb-4006-bd46-d9d401cdb6da
PESAPAL_CALLBACK_URL=https://chateau254-direct-production.up.railway.app/api/payments/pesapal/callback

# Test Credentials
consumer_key="qkio1BGGYAXTu2JOfm7XSXNruoZsrqEW"
consumer_secret="osGQ364R49cXKeOYSpaOnT++rHs="
```

### Test Payment Amounts
- **Minimum Test Amount**: KES 1.00
- **Recommended Test Amounts**: KES 1.00, 2.50, 5.00
- **Maximum Test Amount**: As per sandbox limits

### Test Card Details (if using card payments)
```
Card Number: 4000000000000000
Expiry Date: 12/25
CVV: 123
```

## Payment Flow Testing

### 1. Place Order Process
1. Add items to cart
2. Navigate to checkout
3. Select payment method
4. Complete delivery details
5. **Test Mode**: Enable Pesapal sandbox testing
6. Submit order
7. Payment redirects to sandbox
8. Monitor payment status via IPN/callback

### 2. Payment Status Monitoring
- **IPN Endpoint**: `POST /api/payments/pesapal/ipn`
- **Status Endpoint**: `GET /api/payments/pesapal/status/{trackingId}`
- **Callback**: `GET /api/payments/pesapal/callback`

### 3. Test Scenarios

#### Basic Payment Test
1. Test a single payment transaction
2. Verify payment processing
3. Check transaction status updates

#### Multiple Payment Test
1. Test sequence of multiple transactions
2. Verify each transaction processes independently
3. Monitor batch processing

#### Payment Failure Test
1. Test with invalid card details
2. Verify error handling
3. Check user experience during failures

#### Refund Test
1. Process initial payment
2. Test refund functionality
3. Verify refund processing and notifications

## Testing Instructions

### Step 1: Backend Ready
- ✅ Pesapal sandbox credentials configured
- ✅ IPN endpoint registered and active
- ✅ Payment API endpoints operational
- ✅ Database schema extended for Pesapal payments

### Step 2: Frontend Setup
- ✅ Payment integration in App.js (lines 217-258)
- ✅ Payment result monitoring in payment_result.jsx
- ✅ Status polling implementation

### Step 3: Test Execution
1. **Start Development Server**: `npm start` (frontend)
2. **Start Backend Server**: `npm start` (backend)
3. **Navigate to Checkout**: Add items to cart, go to checkout
4. **Enable Test Mode**: (if not already enabled)
5. **Select Pesapal Payment**: (Test mode should show Pesapal option)
6. **Complete Payment Process**: Follow payment flow
7. **Monitor Results**: Check payment status and logs

## Key Files to Monitor

### Backend
- `chateau254-backend/.env` - Test credentials
- `chateau254-backend/routes/pesapal.routes.js` - API endpoints
- `chateau254-backend/services/pesapal.js` - Payment service
- `chateau254-backend/logs/` - Payment logs (if configured)

### Frontend
- `src/App.js` - Payment integration (lines 217-258)
- `src/pages/UI/payment_result.jsx` - Payment status monitoring
- `src/pages/UI/checkout.jsx` - Payment options (add Pesapal test option)

## Test Results Verification

### Successful Test Indicators
- ✅ Payment redirect to sandbox works
- ✅ Payment status updates received via IPN/callback
- ✅ Payment completion and order confirmation
- ✅ Transaction tracking and logging
- ✅ Error handling for failed payments

### Monitoring Tools
- **Payment Logs**: Backend payment processing logs
- **IPN Logs**: Instant Payment Notification receipt logs
- **Frontend Console**: JavaScript console for debugging
- **Payment Results Page**: Real-time payment status updates

## Troubleshooting

### Common Issues
1. **Test credentials not working**: Verify .env file has correct values
2. **Payment not redirecting**: Check IPN registration in backend
3. **Payment status not updating**: Verify callback URL configuration
4. **Test mode not enabled**: Ensure test mode flag is set

### Debug Commands
```bash
# Check backend environment variables
chateau254-backend/.env

# Check frontend environment variables
chateau245-direct/.env (or environment setup)

# Monitor payment logs
chateau254-backend/logs/payment.log

# Test payment endpoint manually
curl -X POST http://localhost:5000/api/payments/pesapal/initialize
```

## Support

For testing issues, refer to the backend logs and verify:
1. Test credentials are correct
2. IPN endpoint is properly registered
3. Callback URL is accessible
4. Network connectivity to Pesapal sandbox

## Next Steps

1. **Implement Test Mode Toggle**: Add UI control for enabling/disabling test payments
2. **Add Test Credentials Display**: Show test credentials in test mode
3. **Create Test Scenarios**: Define specific test cases for different payment scenarios
4. **Setup Monitoring**: Configure logging and monitoring for test payments
5. **User Documentation**: Provide user documentation for testing payment functionality

## Testing Checklist

- [ ] Test credentials verified in backend .env
- [ ] IPN endpoint registered and active
- [ ] Payment API endpoints operational
- [ ] Test mode toggle implemented in checkout UI
- [ ] Test credentials display working
- [ ] Payment flow testing completed
- [ ] Status monitoring functional
- [ ] Error handling tested
- [ ] User experience validated
- [ ] Production deployment ready (test mode disabled)

---

**Note**: This payment system is ready for immediate testing with the provided sandbox credentials. The test environment uses fake payment data and does not charge real money.

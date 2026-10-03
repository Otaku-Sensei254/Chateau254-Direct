# Pesapal payment integration plan

## Purpose

Add Pesapal API 3.0 sandbox payments to Chateau254 while keeping cash on delivery
available. Pesapal will host the payment page; the backend will remain the source
of truth for payment status and order fulfilment.

No consumer keys, secrets, bearer tokens, or database credentials belong in this
file or in the frontend bundle.

## Current findings

- Pesapal sandbox authentication has been tested successfully with the supplied
  merchant credentials.
- The deployed Railway API is publicly reachable.
- The Pesapal sandbox account currently has no registered IPN URL.
- The backend currently creates local orders but has no Pesapal payment routes,
  payment-status columns, callback handler, or IPN handler.

## Implementation

### 1. Backend configuration

Add server-only environment variables:

```env
PESAPAL_CONSUMER_KEY=
PESAPAL_CONSUMER_SECRET=
PESAPAL_BASE_URL=https://cybqa.pesapal.com/pesapalv3
PESAPAL_IPN_URL=https://<railway-host>/api/payments/pesapal/ipn
PESAPAL_IPN_ID=<returned-by-register-ipn>
PESAPAL_CALLBACK_URL=https://<railway-host>/api/payments/pesapal/callback
```

The base URL will be changed to `https://pay.pesapal.com/v3` only when moving to
production credentials.

### 2. Database state

Add an additive migration to track payment details on orders:

- payment method and payment status
- Pesapal merchant reference and order tracking ID
- payment provider message/method
- paid timestamp

The migration will be re-runnable and will not delete or rewrite existing orders.
The backend also ensures these additive fields at startup so a Railway deploy
cannot serve payment requests before the existing database has been upgraded.

### 3. Pesapal service and routes

Create a server-side Pesapal client that:

1. Requests and briefly caches the five-minute bearer token.
2. Uses the configured IPN ID (`notification_id`) and can register the URL when
   needed. Pesapal returns this ID from registration; it should be stored as the
   non-secret `PESAPAL_IPN_ID` Railway variable.
3. Submits a unique order request with KES currency, amount, callback URL, IPN
   notification ID, and billing details.
4. Retrieves transaction status using Pesapal's `orderTrackingId`.

Add routes under `/api/payments/pesapal`:

- `POST /initialize` — authenticated customer starts a Pesapal payment.
- `GET /status/:trackingId` — authenticated customer checks their payment.
- `GET /callback` — Pesapal redirects the customer here after payment.
- `POST /ipn` — Pesapal sends status notifications here.
- `POST /register-ipn` — admin-only helper for sandbox/production registration.

The callback and IPN handlers will query Pesapal for the current transaction
status instead of trusting a client redirect or notification alone. A local order
will only be marked paid after Pesapal reports a completed transaction.

### 4. Checkout behavior

- Cash on delivery continues to use the existing order path.
- Selecting M-Pesa/Pesapal sends the order to the backend payment initializer.
- The customer is redirected to Pesapal's hosted checkout URL.
- The callback returns the customer to a frontend payment-result view.
- The frontend displays pending, completed, failed, or reversed states.
- The cart is cleared only after confirmed payment or successful cash-order
  creation.

The server will validate menu items and calculate the payable amount from the
database rather than trusting a price supplied by the browser.

## Test sequence before production

1. Authenticate against the sandbox.
2. Register the Railway IPN URL using `POST` notifications.
3. Confirm the returned IPN ID and active status.
4. Start a small sandbox order and capture the redirect URL and tracking ID.
5. Complete the payment using Pesapal's sandbox test method.
6. Verify both the callback and IPN reach the backend.
7. Query transaction status and confirm the local order is updated exactly once.
8. Test failed, cancelled, pending, and repeated-notification cases.
9. Run backend syntax checks and frontend production build.

### Tests already completed

- Sandbox authentication returned HTTP 200 and a bearer token.
- The Railway IPN URL was registered as a POST endpoint and returned an active
  IPN ID.
- A KES 1 sandbox order request was accepted and returned a hosted Pesapal
  redirect URL and tracking ID.
- The tracking ID status lookup returned Pesapal's pending-payment response.
  The backend treats that provider response as `pending` rather than as a
  failed API request.

## Deployment checklist

- Add Pesapal secrets only to Railway server variables.
- Keep Pesapal secrets out of React variables, logs, Git, and this document.
- Register the production IPN URL separately using production credentials.
- Replace the sandbox base URL only at the production cutover.
- Confirm Railway serves the callback and IPN paths over HTTPS.
- Revoke and rotate any credentials that have been exposed outside the intended
  secret store.

## References

- Pesapal API 3.0 authentication: <https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/authentication>
- Pesapal IPN registration: <https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/registeripnurl>
- Pesapal order submission: <https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/submitorderrequest>
- Pesapal transaction status: <https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/gettransactionstatus>

const env = require('../config/env');

let tokenCache = null;

const configurationError = (message) => {
  const error = new Error(message);
  error.statusCode = 503;
  error.code = 'PESAPAL_NOT_CONFIGURED';
  return error;
};

const apiError = (message, statusCode = 502, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = 'PESAPAL_API_ERROR';
  error.details = details;
  return error;
};

const readResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 500) };
  }
};

const request = async (path, { method = 'GET', token, body, allowPendingProviderError = false } = {}) => {
  const response = await fetch(`${env.pesapalBaseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await readResponse(response);
  const providerError = data.error && (data.error.message || data.error.code || data.error.error_type);
  const isPendingProviderError = allowPendingProviderError && providerError && /pending/i.test(String(providerError));
  if (!response.ok || (providerError && !isPendingProviderError)) {
    throw apiError(providerError || data.message || `Pesapal request failed with HTTP ${response.status}`, response.status >= 400 ? 502 : 502, data.error || data);
  }
  return data;
};

const requestToken = async () => {
  if (!env.pesapalConsumerKey || !env.pesapalConsumerSecret) {
    throw configurationError('Pesapal consumer credentials are not configured');
  }
  const data = await request('/api/Auth/RequestToken', {
    method: 'POST',
    body: {
      consumer_key: env.pesapalConsumerKey,
      consumer_secret: env.pesapalConsumerSecret,
    },
  });
  if (!data.token) throw apiError(data.message || 'Pesapal did not return an access token', 502, data);

  const providerExpiry = data.expiryDate ? Date.parse(data.expiryDate) : NaN;
  const expiresAt = Number.isFinite(providerExpiry) ? providerExpiry - 15_000 : Date.now() + (4 * 60 * 1000);
  tokenCache = { token: data.token, expiresAt };
  return data.token;
};

const getToken = async () => {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;
  return requestToken();
};

const authenticatedRequest = async (path, options = {}) => request(path, { ...options, token: await getToken() });

const listIpns = () => authenticatedRequest('/api/URLSetup/GetIpnList');

const findConfiguredIpn = async () => {
  if (!env.pesapalIpnUrl) throw configurationError('PESAPAL_IPN_URL is not configured');
  if (env.pesapalIpnId) return { url: env.pesapalIpnUrl, ipn_id: env.pesapalIpnId, ipn_status: 1 };
  const list = await listIpns();
  const ipns = Array.isArray(list) ? list : list.ipns || list.data || [];
  return ipns.find((ipn) => ipn.url === env.pesapalIpnUrl && Number(ipn.ipn_status ?? ipn.ipnStatus ?? 1) === 1) || null;
};

const registerIpn = async ({ url = env.pesapalIpnUrl, ipnNotificationType = 'POST' } = {}) => {
  if (!url) throw configurationError('PESAPAL_IPN_URL is not configured');
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && env.nodeEnv === 'production') {
      throw configurationError('Pesapal IPN URL must use HTTPS in production');
    }
  } catch (error) {
    if (error.code === 'PESAPAL_NOT_CONFIGURED') throw error;
    const invalid = new Error('PESAPAL_IPN_URL must be a valid URL');
    invalid.statusCode = 400;
    throw invalid;
  }

  const existing = await findConfiguredIpn().catch((error) => {
    if (error.code === 'PESAPAL_NOT_CONFIGURED') return null;
    throw error;
  });
  if (existing) return { ...existing, alreadyRegistered: true };

  return authenticatedRequest('/api/URLSetup/RegisterIPN', {
    method: 'POST',
    body: { url, ipn_notification_type: ipnNotificationType },
  });
};

const submitOrder = (payload) => authenticatedRequest('/api/Transactions/SubmitOrderRequest', { method: 'POST', body: payload });

const getTransactionStatus = (orderTrackingId) => authenticatedRequest(
  `/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
  { allowPendingProviderError: true },
);

module.exports = {
  findConfiguredIpn,
  getTransactionStatus,
  listIpns,
  registerIpn,
  submitOrder,
};

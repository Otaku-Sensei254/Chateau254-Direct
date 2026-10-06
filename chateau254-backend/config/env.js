const dotenv = require('dotenv');

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:dtechpsql@localhost:5432/chateau254',
  localDatabaseUrl: process.env.NEON_DATABASE_URL || 'postgresql://postgres:dtechpsql@localhost:5432/chateau254',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  liveUrlCoKe: process.env.LIVE_URL_COKE || 'https://chateau254.co.ke',
  jwtSecret: process.env.JWT_SECRET || 'FINEWINE',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  r2Endpoint: process.env.R2_ENDPOINT || '',
  r2BucketName: process.env.R2_BUCKET_NAME || process.env.BUCKET_NAME || '',
  r2PublicUrl: process.env.R2_PUBLIC_URL || process.env.PUBLIC_URL || '',
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.ACCESS_ID || '',
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY || '',
  r2MaxFileSize: Number(process.env.R2_MAX_FILE_SIZE) || 500 * 1024 * 1024,
  pesapalConsumerKey: process.env.PESAPAL_CONSUMER_KEY || process.env.consumer_key || '',
  pesapalConsumerSecret: process.env.PESAPAL_CONSUMER_SECRET || process.env.consumer_secret || '',
  pesapalBaseUrl: (process.env.PESAPAL_BASE_URL || 'https://cybqa.pesapal.com/pesapalv3').replace(/\/$/, ''),
  pesapalIpnUrl: process.env.PESAPAL_IPN_URL || '',
  pesapalIpnId: process.env.PESAPAL_IPN_ID || '',
  pesapalCallbackUrl: process.env.PESAPAL_CALLBACK_URL || '',
  mpesaConsumerKey: process.env.MPESA_CONSUMER_KEY || '',
  mpesaConsumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
  mpesaBusinessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE || '516600',
  mpesaPasskey: process.env.MPESA_PASSKEY || '',
  mpesaCallbackUrl: process.env.MPESA_CALLBACK_URL || '',
  mpesaEnvironment: process.env.MPESA_ENVIRONMENT || 'sandbox',
};

module.exports = env;

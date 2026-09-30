const crypto = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const env = require('./env');

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const r2Configured = Boolean(
  env.r2Endpoint
  && env.r2BucketName
  && env.r2PublicUrl
  && env.r2AccessKeyId
  && env.r2SecretAccessKey,
);

const r2Client = r2Configured
  ? new S3Client({
    region: 'auto',
    endpoint: env.r2Endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
  })
  : null;

const storageError = (message) => {
  const error = new Error(message);
  error.statusCode = 503;
  return error;
};

const ensureConfigured = () => {
  if (!r2Client) throw storageError('Image storage is not configured');
};

const uploadMenuImage = async (file) => {
  ensureConfigured();

  const extension = EXTENSIONS[file.mimetype];
  const key = `menu-items/${crypto.randomUUID()}.${extension}`;

  await r2Client.send(new PutObjectCommand({
    Bucket: env.r2BucketName,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return {
    key,
    imageUrl: `${env.r2PublicUrl.replace(/\/$/, '')}/${key}`,
  };
};

const keyFromPublicUrl = (imageUrl) => {
  if (!imageUrl || !env.r2PublicUrl) return null;

  try {
    const image = new URL(imageUrl);
    const publicBase = new URL(env.r2PublicUrl);
    if (image.origin !== publicBase.origin) return null;

    const basePath = publicBase.pathname.replace(/\/$/, '').replace(/^\//, '');
    const key = decodeURIComponent(image.pathname).replace(/^\//, '');
    const relativeKey = basePath && key.startsWith(`${basePath}/`)
      ? key.slice(basePath.length + 1)
      : key;

    return relativeKey.startsWith('menu-items/') ? relativeKey : null;
  } catch {
    return null;
  }
};

const deleteMenuImage = async (imageUrl) => {
  const key = keyFromPublicUrl(imageUrl);
  if (!key || !r2Client) return;

  await r2Client.send(new DeleteObjectCommand({
    Bucket: env.r2BucketName,
    Key: key,
  }));
};

module.exports = {
  ALLOWED_IMAGE_TYPES,
  uploadMenuImage,
  deleteMenuImage,
};

const crypto = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const env = require('./env');

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const FEED_ALLOWED_MEDIA_TYPES = new Set([
  ...ALLOWED_IMAGE_TYPES,
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);
const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
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

const uploadObject = async (file, prefix) => {
  ensureConfigured();

  const extension = EXTENSIONS[file.mimetype];
  const key = `${prefix}/${crypto.randomUUID()}.${extension}`;

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

const uploadMenuImage = (file) => uploadObject(file, 'menu-items');

const uploadFeedMedia = async (file) => {
  const uploaded = await uploadObject(file, 'feed');
  return {
    ...uploaded,
    mediaType: file.mimetype.startsWith('video/') ? 'video' : 'image',
    mediaMimeType: file.mimetype,
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

    return relativeKey.startsWith('menu-items/') || relativeKey.startsWith('feed/') ? relativeKey : null;
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

const deleteStoredMedia = deleteMenuImage;

module.exports = {
  ALLOWED_IMAGE_TYPES,
  FEED_ALLOWED_MEDIA_TYPES,
  uploadMenuImage,
  uploadFeedMedia,
  deleteMenuImage,
  deleteStoredMedia,
};

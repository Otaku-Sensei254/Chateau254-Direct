const notFound = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};

/* body-parser reports a multipart payload that was mislabelled as JSON as a
   syntax error on the "--Boundary" token. Detect that shape and explain the real
   cause, instead of leaking a parse error the caller cannot act on. */
const MULTIPART_SNIFF = (req, error) => (
  error
  && error.type === 'entity.parse.failed'
  && typeof req.rawBodyPrefix === 'string'
  // A multipart body always opens with the boundary marker; JSON never starts
  // with '--'. Browsers vary the number of leading dashes, so do not constrain it.
  && /^--\S/.test(req.rawBodyPrefix)
);

const errorHandler = (error, req, res, next) => {
  if (MULTIPART_SNIFF(req, error)) {
    return res.status(415).json({
      error: 'Upload must be sent as multipart/form-data. When using fetch with FormData, do not set the Content-Type header yourself.',
    });
  }

  console.error(error);
  const status = error.statusCode || 500;
  return res.status(status).json({
    error: status === 500 ? 'Internal server error' : error.message,
  });
};

module.exports = { notFound, errorHandler };

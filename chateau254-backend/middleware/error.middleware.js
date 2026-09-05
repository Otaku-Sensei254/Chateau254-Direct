const notFound = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};

const errorHandler = (error, req, res, next) => {
  console.error(error);
  const status = error.statusCode || 500;
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : error.message,
  });
};

module.exports = { notFound, errorHandler };

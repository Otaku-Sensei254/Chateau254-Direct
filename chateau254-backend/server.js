const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const { closeDatabase } = require('./config/db');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const menuRoutes = require('./routes/menu.routes');
const ordersRoutes = require('./routes/orders.routes');
const customersRoutes = require('./routes/customers.routes');
const ridersRoutes = require('./routes/riders.routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/', (req, res) => {
  res.json({ name: 'Château254 API', version: '1.0.0', docs: '/api/health' });
});
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/riders', ridersRoutes);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(env.port, () => {
  console.log(`Château254 API listening on port ${env.port}`);
});

const shutdown = async (signal) => {
  console.log(`${signal} received. Closing server...`);
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;

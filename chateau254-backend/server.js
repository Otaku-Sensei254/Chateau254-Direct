const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
const env = require('./config/env');
const { closeDatabase, initializePool } = require('./config/db');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const menuRoutes = require('./routes/menu.routes');
const ordersRoutes = require('./routes/orders.routes');
const customersRoutes = require('./routes/customers.routes');
const ridersRoutes = require('./routes/riders.routes');
const bookingsRoutes = require('./routes/bookings.routes');
const tablesRoutes = require('./routes/tables.routes');
const feedRoutes = require('./routes/feed.routes');
const promotionsRoutes = require('./routes/promotions.routes');
const reportsRoutes = require('./routes/reports.routes');
const pesapalRoutes = require('./routes/pesapal.routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();
const httpServer = createServer(app);

let server = null;

const io = new Server(httpServer, {
  cors: {
    origin: env.frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(helmet());
app.use(cors({ origin: env.frontendUrl, credentials: true }));
/* verify records the first bytes of every JSON body. body-parser's parse error
   does not carry the raw payload, so without this there is no way to tell a
   genuinely malformed JSON request from a multipart upload that was mislabelled
   as JSON. The error handler uses it to return an actionable message. */
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => { req.rawBodyPrefix = buf.subarray(0, 16).toString('latin1'); },
}));
app.use(express.urlencoded({ extended: false }));
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
app.use('/api/bookings', bookingsRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/payments/pesapal', pesapalRoutes);

app.use(notFound);
app.use(errorHandler);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  socket.on('leave_room', (room) => {
    socket.leave(room);
    console.log(`Socket ${socket.id} left room: ${room}`);
  });

  socket.on('rider:location_update', (data) => {
    const { riderId, latitude, longitude, status } = data;
    if (riderId && latitude && longitude) {
      io.to(`rider:${riderId}`).emit('rider:location_updated', { riderId, latitude, longitude, status });
      io.to('admin').emit('rider:location_updated', { riderId, latitude, longitude, status });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

app.set('io', io);

const startServer = async () => {
  try {
    await initializePool();
    await feedRoutes.ensureFeedTable();
    await pesapalRoutes.ensurePaymentSchema();
    server = httpServer.listen(env.port, () => {
      console.log(`Château254 API listening on port ${env.port}`);
    });
  } catch (err) {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  }
};

startServer();

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

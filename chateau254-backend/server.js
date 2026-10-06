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
const mpesaRoutes = require('./routes/mpesa.routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();
const httpServer = createServer(app);

let server = null;

const io = new Server(httpServer, {
  cors: {
    origin: [env.frontendUrl, env.liveUrlCoKe, 'https://chateau254.vercel.app', 'https://chateau254-git-*.vercel.app'].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(helmet());
const allowedOrigins = [env.frontendUrl, env.liveUrlCoKe, 'https://chateau254.vercel.app', 'https://chateau254-git-*.vercel.app'].filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));
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
app.use('/api/payments/mpesa', mpesaRoutes);

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
  /* Without this, a busy port emits an unhandled 'error' event and Node dumps a
     raw net stack trace that says nothing about which process is holding it. */
  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${env.port} is already in use — another copy of the server is probably still running.`);
      console.error('Stop it with: pkill -f "node server.js"   (or use PORT=<other> npm run local)');
    } else if (err.code === 'EACCES') {
      console.error(`Not permitted to bind port ${env.port}. Try a port above 1024, e.g. PORT=5097.`);
    } else {
      console.error('Server error:', err.message);
    }
    process.exit(1);
  });

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

/* Graceful shutdown.
   `server.close()` alone only stops *new* connections; it waits on existing
   keep-alive sockets to drain on their own, which never happens for a browser
   holding one open. The process then hangs on Ctrl+C and every further press
   re-enters this handler -- which is what produced the repeated
   "SIGINT received. Closing server..." lines and the MaxListeners warning about
   close listeners piling up on the same Server.

   closeIdleConnections() releases sockets between requests and
   closeAllConnections() severs the rest, so close() can actually complete.
   The exit deadline is the backstop for anything still holding the loop open. */
let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received. Closing server...`);

  /* Never let a stuck socket hold the process open indefinitely. */
  const exitTimer = setTimeout(() => {
    console.error('Shutdown timed out; forcing exit.');
    process.exit(1);
  }, 10000);
  exitTimer.unref();

  let finished = false;
  const done = async () => {
    if (finished) return;
    finished = true;
    await closeDatabase().catch(() => {});
    clearTimeout(exitTimer);
    process.exit(0);
  };

  /* SIGINT can arrive before listen() has assigned `server`. */
  if (!server) return done();

  try {
    server.closeIdleConnections?.();
    server.closeAllConnections?.();
  } catch { /* older Node: the exit timer is the backstop */ }

  /* Socket.io wraps this same http server and keeps its own engine.io
     transports, which would otherwise keep close() from ever completing. Both
     callbacks funnel through done(), so whichever lands first wins. */
  io.close(() => done());
  server.close(() => done());
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;

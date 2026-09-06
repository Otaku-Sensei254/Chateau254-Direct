const express = require('express');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

const orderQuery = `
    SELECT o.*, COALESCE(u.full_name, cu.full_name) AS customer_name, COALESCE(u.email, cu.email) AS customer_email,
      r.full_name AS rider_name, r.phone AS rider_phone,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count
  FROM orders o
  LEFT JOIN users u ON u.id = o.user_id
  LEFT JOIN chateau_users cu ON cu.id = o.user_id
  LEFT JOIN riders r ON r.id = o.rider_id
`;

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const isAdmin = req.user.roles?.includes('admin') || req.user.role === 'admin';
  const values = [];
  let where = '';

  if (!isAdmin) {
    where = ' WHERE o.user_id = $1';
    values.push(req.user.id);
  } else if (req.query.status) {
    where = ' WHERE o.status = $1';
    values.push(req.query.status);
  }

  const result = await query(`${orderQuery}${where} ORDER BY o.created_at DESC`, values);
  res.json({ orders: result.rows });
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const result = await query(`${orderQuery} WHERE o.id = $1`, [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Order not found' });

  const items = await query(
    `SELECT oi.*, mi.name AS item_name, mi.image_url
     FROM order_items oi
     JOIN menu_items mi ON mi.id = oi.menu_item_id
     WHERE oi.order_id = $1`,
    [req.params.id],
  );

  res.json({ order: { ...result.rows[0], items: items.rows } });
}));

router.post('/', authenticate, requireRole('customer', 'admin'), asyncHandler(async (req, res) => {
  const { user_id, delivery_address, total_amount, latitude, longitude, items = [] } = req.body;
  if (!user_id || !delivery_address || total_amount === undefined) return res.status(400).json({ error: 'User, delivery address, and total amount are required' });

  const userCheck = await query('SELECT id FROM users WHERE id = $1', [user_id]);
  if (!userCheck.rowCount) {
    const legacyUser = await query('SELECT id, full_name, email FROM chateau_users WHERE id = $1', [user_id]);
    if (legacyUser.rowCount) {
      const u = legacyUser.rows[0];
      await query(
        'INSERT INTO users (id, full_name, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
        [u.id, u.full_name, u.email],
      );
    }
  }

  const result = await query(
    `INSERT INTO orders (user_id, delivery_address, total_amount)
     VALUES ($1, $2, $3) RETURNING *`,
    [user_id, delivery_address, total_amount],
  );
  const order = result.rows[0];

  if (latitude && longitude) {
    await query(
      `INSERT INTO customer_locations (user_id, latitude, longitude, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET latitude = $2, longitude = $3, updated_at = NOW()`,
      [user_id, latitude, longitude],
    ).catch(() => {});
  }

  for (const item of items) {
    await query('INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES ($1, $2, $3, $4)', [order.id, item.menu_item_id, item.quantity, item.unit_price]);
  }

  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('order:created', { order });
  }

  res.status(201).json({ order });
}));

router.patch('/:id/status', authenticate, requireRole('admin', 'rider'), asyncHandler(async (req, res) => {
  const { status, rider_id } = req.body;
  const allowedStatuses = ['pending', 'preparing', 'out_for_delivery', 'completed', 'cancelled'];
  if (!allowedStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const result = await query(
    `UPDATE orders SET status = $1, rider_id = COALESCE($2, rider_id), updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [status, rider_id || null, req.params.id],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Order not found' });

  const order = result.rows[0];
  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('order:status_changed', { order });
    if (rider_id) {
      io.to(`rider:${rider_id}`).emit('order:assigned', { order });
    }
    io.to(`customer:${order.user_id}`).emit('order:status_changed', { order });
  }

  res.json({ order });
}));

router.get('/:id/route', authenticate, asyncHandler(async (req, res) => {
  const orderResult = await query(
    `SELECT o.*, r.id AS rider_id, r.full_name AS rider_name
     FROM orders o
     LEFT JOIN riders r ON r.id = o.rider_id
     WHERE o.id = $1`,
    [req.params.id],
  );
  if (!orderResult.rowCount) return res.status(404).json({ error: 'Order not found' });

  const order = orderResult.rows[0];
  if (!order.rider_id) {
    return res.status(400).json({ error: 'No rider assigned to this order' });
  }

  const locationResult = await query(
    'SELECT latitude, longitude FROM rider_locations WHERE rider_id = $1',
    [order.rider_id],
  );
  if (!locationResult.rowCount) {
    return res.status(404).json({ error: 'Rider location not available' });
  }

  const riderLocation = locationResult.rows[0];

  let customerLocation = null;

  const customerResult = await query(
    'SELECT latitude, longitude FROM customer_locations WHERE user_id = $1',
    [order.user_id],
  );
  if (customerResult.rowCount) {
    customerLocation = customerResult.rows[0];
  }

  if (!customerLocation && order.delivery_address) {
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(order.delivery_address)}&limit=1&countrycodes=ke`,
        { headers: { 'User-Agent': 'Chateau254-Backend/1.0' } },
      );
      const geoData = await geoRes.json();
      if (geoData && geoData.length > 0) {
        customerLocation = {
          latitude: parseFloat(geoData[0].lat),
          longitude: parseFloat(geoData[0].lon),
        };
        await query(
          `INSERT INTO customer_locations (user_id, latitude, longitude, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (user_id) DO UPDATE SET latitude = $2, longitude = $3, updated_at = NOW()`,
          [order.user_id, customerLocation.latitude, customerLocation.longitude],
        );
      }
    } catch (geoErr) {
      console.error('Geocoding fallback error:', geoErr);
    }
  }

  if (!customerLocation) {
    return res.status(404).json({ error: 'Customer location not available. Please ask customer to share their location.' });
  }

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${riderLocation.longitude},${riderLocation.latitude};${customerLocation.longitude},${customerLocation.latitude}?overview=full&geometries=geojson&steps=true`;

  try {
    const osrmResponse = await fetch(osrmUrl);
    const osrmData = await osrmResponse.json();

    if (osrmData.code !== 'Ok' || !osrmData.routes?.length) {
      return res.status(404).json({ error: 'Could not calculate route' });
    }

    const route = osrmData.routes[0];
    res.json({
      route: {
        geometry: route.geometry,
        distance: route.distance,
        duration: route.duration,
        steps: route.legs[0]?.steps || [],
      },
      rider: {
        latitude: riderLocation.latitude,
        longitude: riderLocation.longitude,
        name: order.rider_name,
      },
      customer: {
        latitude: customerLocation.latitude,
        longitude: customerLocation.longitude,
      },
    });
  } catch (error) {
    console.error('OSRM error:', error);
    res.status(500).json({ error: 'Failed to calculate route' });
  }
}));

module.exports = router;

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const env = require('../config/env');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

const staffSelect = `
  SELECT u.id, u.full_name, u.email, u.password_hash, u.loyalty_points, u.created_at,
         COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) AS roles
  FROM chateau_users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id
`;

const publicUser = (record) => ({
  id: record.id, full_name: record.full_name, email: record.email,
  role: record.roles[0] || 'customer', roles: record.roles,
  loyalty_points: record.loyalty_points, created_at: record.created_at,
});

const tokenFor = (user) => jwt.sign(
  { id: user.id, role: user.role, roles: user.roles, name: user.full_name, email: user.email },
  env.jwtSecret, { expiresIn: env.jwtExpiresIn },
);

const findStaffByEmail = (email) => query(`${staffSelect} WHERE u.email = $1 GROUP BY u.id`, [email]);
const findStaffById = (id) => query(`${staffSelect} WHERE u.id = $1 GROUP BY u.id`, [id]);

const findCustomerByEmail = (email) => query(
  `SELECT id, full_name, email, password_hash, loyalty_points, created_at, ARRAY['customer']::text[] AS roles FROM users WHERE email = $1
   UNION ALL
   SELECT id, full_name, email, password_hash, loyalty_points, created_at, ARRAY['customer']::text[] AS roles FROM chateau_users WHERE email = $1 AND NOT EXISTS (SELECT 1 FROM users WHERE email = $1)`,
  [email],
);
const findCustomerById = (id) => query(
  `SELECT id, full_name, email, loyalty_points, created_at, ARRAY['customer']::text[] AS roles FROM users WHERE id = $1
   UNION ALL
   SELECT id, full_name, email, loyalty_points, created_at, ARRAY['customer']::text[] AS roles FROM chateau_users WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM users WHERE id = $1)`,
  [id],
);

router.post('/signup', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const normalizedEmail = email.trim().toLowerCase();

  const existingStaff = await query('SELECT id FROM chateau_users WHERE email = $1', [normalizedEmail]);
  if (existingStaff.rowCount) return res.status(409).json({ error: 'An account with this email already exists' });
  const existingCustomer = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existingCustomer.rowCount) return res.status(409).json({ error: 'An account with this email already exists' });

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    'INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, email, loyalty_points, created_at',
    [name.trim(), normalizedEmail, passwordHash],
  );
  const user = publicUser({ ...result.rows[0], roles: ['customer'] });
  res.status(201).json({ user, token: tokenFor(user) });
}));

router.post('/signin', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const normalizedEmail = email.trim().toLowerCase();

  const staffResult = await findStaffByEmail(normalizedEmail);
  if (staffResult.rowCount) {
    const record = staffResult.rows[0];
    if (!record.password_hash || !(await bcrypt.compare(password, record.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = publicUser(record);
    return res.json({ user, token: tokenFor(user) });
  }

  const customerResult = await findCustomerByEmail(normalizedEmail);
  if (!customerResult.rowCount) return res.status(401).json({ error: 'Account not found' });
  const record = customerResult.rows[0];
  if (!record.password_hash || !(await bcrypt.compare(password, record.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const user = publicUser(record);
  res.json({ user, token: tokenFor(user) });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const isCustomer = req.user.role === 'customer' || (req.user.roles && req.user.roles.includes('customer'));
  const result = isCustomer ? await findCustomerById(req.user.id) : await findStaffById(req.user.id);
  if (!result.rowCount) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(result.rows[0]) });
}));

module.exports = router;

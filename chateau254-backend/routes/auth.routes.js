const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const env = require('../config/env');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();
const userSelect = `
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

const tokenFor = (user) => jwt.sign({ id: user.id, role: user.role, roles: user.roles, name: user.full_name, email: user.email }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const findUserByEmail = (email) => query(`${userSelect} WHERE u.email = $1 GROUP BY u.id`, [email]);
const findUserById = (id) => query(`${userSelect} WHERE u.id = $1 GROUP BY u.id`, [id]);

router.post('/signup', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const normalizedEmail = email.trim().toLowerCase();
  if ((await query('SELECT id FROM chateau_users WHERE email = $1', [normalizedEmail])).rowCount) return res.status(409).json({ error: 'An account with this email already exists' });

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query('INSERT INTO chateau_users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id', [name.trim(), normalizedEmail, passwordHash]);
  const userId = result.rows[0].id;
  await query("INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE name = 'customer'", [userId]);
  const user = publicUser((await findUserById(userId)).rows[0]);
  res.status(201).json({ user, token: tokenFor(user) });
}));

router.post('/signin', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const result = await findUserByEmail(email.trim().toLowerCase());
  if (!result.rowCount) return res.status(401).json({ error: 'Account not found' });
  const record = result.rows[0];
  if (!record.password_hash || !(await bcrypt.compare(password, record.password_hash))) return res.status(401).json({ error: 'Invalid email or password' });
  const user = publicUser(record);
  res.json({ user, token: tokenFor(user) });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const result = await findUserById(req.user.id);
  if (!result.rowCount) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(result.rows[0]) });
}));

module.exports = router;

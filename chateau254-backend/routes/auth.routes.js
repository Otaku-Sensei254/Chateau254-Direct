const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const env = require('../config/env');
const { authenticate } = require('../middleware/auth.middleware');

const { OAuth2Client } = require('google-auth-library');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '175951330735-25k2nh44r67hjrl2loc0bo8duj750vb8.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const router = express.Router();

// POST /auth/google — verify Google ID token and create/find user
router.post('/google', asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Google credential is required' });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid Google token' });
  }

  if (!payload || !payload.email) {
    return res.status(400).json({ error: 'Google account email not available' });
  }

  const email = payload.email.toLowerCase();
  const name = payload.name || payload.given_name || 'Google User';
  const googleId = payload.sub;

  // Check if user exists in users table
  let result = await query('SELECT id, full_name, email, phone, loyalty_points, created_at FROM users WHERE email = $1', [email]);
  let user;

  if (result.rowCount) {
    user = result.rows[0];
  } else {
    // Check chateau_users
    const staffResult = await query('SELECT id, full_name, email, created_at FROM chateau_users WHERE email = $1', [email]);
    if (staffResult.rowCount) {
      user = { ...staffResult.rows[0], phone: null, loyalty_points: 0 };
    } else {
      // Create new customer user (no password — Google auth only)
      const insertResult = await query(
        'INSERT INTO users (full_name, email, password_hash, phone) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, phone, loyalty_points, created_at',
        [name, email, null, null]
      );
      user = insertResult.rows[0];
    }
  }

  const roles = user.roles || ['customer'];
  const publicUserObj = { id: user.id, full_name: user.full_name, email: user.email, phone: user.phone || null, role: roles[0] || 'customer', roles, loyalty_points: user.loyalty_points || 0, created_at: user.created_at };
  res.json({ user: publicUserObj, token: tokenFor(publicUserObj) });
}));

const staffSelect = `
  SELECT u.id, u.full_name, u.email, u.password_hash, u.loyalty_points, u.created_at,
         COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) AS roles
  FROM chateau_users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id
`;

const publicUser = (record) => ({
  id: record.id, full_name: record.full_name, email: record.email, phone: record.phone,
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
  `SELECT id, full_name, email, phone, password_hash, loyalty_points, created_at, ARRAY['customer']::text[] AS roles FROM users WHERE email = $1
   UNION ALL
   SELECT id, full_name, email, NULL::varchar(30) AS phone, password_hash, loyalty_points, created_at, ARRAY['customer']::text[] AS roles FROM chateau_users WHERE email = $1 AND NOT EXISTS (SELECT 1 FROM users WHERE email = $1)`,
  [email],
);
const findCustomerById = (id) => query(
  `SELECT id, full_name, email, phone, loyalty_points, created_at, ARRAY['customer']::text[] AS roles FROM users WHERE id = $1
   UNION ALL
   SELECT id, full_name, email, NULL::varchar(30) AS phone, loyalty_points, created_at, ARRAY['customer']::text[] AS roles FROM chateau_users WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM users WHERE id = $1)`,
  [id],
);

router.post('/signup', asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const normalizedEmail = email.trim().toLowerCase();

  const existingStaff = await query('SELECT id FROM chateau_users WHERE email = $1', [normalizedEmail]);
  if (existingStaff.rowCount) return res.status(409).json({ error: 'An account with this email already exists' });
  const existingCustomer = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existingCustomer.rowCount) return res.status(409).json({ error: 'An account with this email already exists' });

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    'INSERT INTO users (full_name, email, password_hash, phone) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, phone, loyalty_points, created_at',
    [name.trim(), normalizedEmail, passwordHash, phone?.trim() || null],
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

// POST /auth/forgot-password — generate reset token (email sent when Resend is configured)
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const normalizedEmail = email.trim().toLowerCase();

  // Find user in users or chateau_users
  const userResult = await query('SELECT id, email FROM users WHERE email = $1', [normalizedEmail]);
  let userId = userResult.rowCount ? userResult.rows[0].id : null;

  if (!userId) {
    const staffResult = await query('SELECT id, email FROM chateau_users WHERE email = $1', [normalizedEmail]);
    if (staffResult.rowCount) userId = staffResult.rows[0].id;
  }

  if (!userId) {
    // Don't reveal whether email exists
    return res.json({ message: 'If an account exists, a reset link has been sent.' });
  }

  // Generate token
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Clean up old tokens
  await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
  await query('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [userId, resetToken, expiresAt]);

  // TODO: Send email via Resend when domain is verified
  // For now, return the token (admin can share manually)
  res.json({ message: 'If an account exists, a reset link has been sent.', resetToken, resetLink: `/auth?reset=${resetToken}` });
}));

// POST /auth/reset-password — validate token and update password
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const tokenResult = await query(
    'SELECT user_id FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
    [token]
  );
  if (!tokenResult.rowCount) return res.status(400).json({ error: 'Invalid or expired reset token' });

  const userId = tokenResult.rows[0].user_id;
  const passwordHash = await bcrypt.hash(password, 12);

  // Update password in users or chateau_users
  const userUpdate = await query('UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id', [passwordHash, userId]);
  if (!userUpdate.rowCount) {
    await query('UPDATE chateau_users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
  }

  // Mark token as used
  await query('UPDATE password_reset_tokens SET used = TRUE WHERE token = $1', [token]);

  res.json({ message: 'Password reset successfully' });
}));

// PUT /auth/phone — update phone number for authenticated user
router.put('/phone', authenticate, asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });
  const userId = req.user.id;
  const result = await query('UPDATE users SET phone = $1 WHERE id = $2 RETURNING id, full_name, email, phone, loyalty_points, created_at', [phone, userId]);
  if (!result.rowCount) return res.status(404).json({ error: 'User not found' });
  const user = result.rows[0];
  res.json({ user: { id: user.id, full_name: user.full_name, email: user.email, phone: user.phone, role: 'customer', roles: ['customer'], loyalty_points: user.loyalty_points || 0, created_at: user.created_at } });
}));

module.exports = router;

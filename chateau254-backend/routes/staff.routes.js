const express = require('express');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const emailService = require('../services/email.service');

const router = express.Router();

const STAFF_ROLE_ID = '0007916f-39dc-41ae-8557-fce45d2c18ab';

// GET /api/staff — list all staff users
router.get('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT u.id, u.full_name, u.email, NULL::varchar(30) AS phone, u.created_at,
            ARRAY_AGG(r.name) AS roles
     FROM chateau_users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id
     WHERE r.name IN ('staff','rider')
     GROUP BY u.id
     ORDER BY u.created_at DESC`
  );
  res.json({ staff: result.rows });
}));

// POST /api/staff — create a staff user
router.post('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { name, email, role, phone } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  const roleName = (role || 'staff').trim().toLowerCase();
  if (roleName === 'rider' && !phone) return res.status(400).json({ error: 'Phone is required for riders' });
  const roleRow = await query('SELECT id, name FROM roles WHERE name = $1', [roleName]);
  if (!roleRow.rowCount) {
    return res.status(400).json({ error: `Unknown role: ${roleName}` });
  }
  const roleId = roleRow.rows[0].id;
  const password = 'staff@chateau254';

  const normalizedEmail = email.trim().toLowerCase();

  // Check if user already exists
  const existing = await query('SELECT id FROM chateau_users WHERE email = $1', [normalizedEmail]);
  if (existing.rowCount) {
    return res.status(409).json({ error: 'A user with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await query(
    'INSERT INTO chateau_users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, email, created_at',
    [name.trim(), normalizedEmail, passwordHash],
  );

  const user = result.rows[0];

  // Assign role
  await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [user.id, roleId]);

  if (roleName === 'rider') {
    await query('INSERT INTO riders (user_id, full_name, phone) VALUES ($1, $2, $3)', [user.id, name.trim(), phone.trim()]);
  }

  // Generate password reset token (for email when Resend is ready)
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, resetToken, expiresAt]
  );

  const frontendUrl = (process.env.FRONTEND_URL || 'https://www.chateau254.co.ke').replace(/\/+$/, '');
  const staffLoginLink = `${frontendUrl}/auth`;
  emailService.send(normalizedEmail, 'Welcome to Château254 Staff', emailService.staffWelcomeEmail(name.trim(), normalizedEmail, roleName, staffLoginLink));
  res.status(201).json({
    staff: { ...user, roles: [roleName] },
    resetToken, // returned so admin can share link manually until email is wired
    resetLink: `/auth?reset=${resetToken}`,
  });
}));

// DELETE /api/staff/:id — remove a staff user
router.delete('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  await query('DELETE FROM user_roles WHERE user_id = $1', [req.params.id]);
  await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [req.params.id]);
  const result = await query('DELETE FROM chateau_users WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Staff member not found' });
  res.json({ message: 'Staff member removed' });
}));

module.exports = router;

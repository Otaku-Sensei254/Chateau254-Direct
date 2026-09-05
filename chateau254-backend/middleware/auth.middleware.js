const jwt = require('jsonwebtoken');
const env = require('../config/env');

const authenticate = (req, res, next) => {
  const header = req.get('authorization');
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    req.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  const userRoles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
  if (!userRoles.some((role) => roles.includes(role))) return res.status(403).json({ error: 'You do not have permission to access this resource' });
  next();
};

module.exports = { authenticate, requireRole };

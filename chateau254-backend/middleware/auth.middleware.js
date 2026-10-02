const jwt = require('jsonwebtoken');
const env = require('../config/env');

const verifyToken = (header) => {
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch (error) {
    return null;
  }
};

const authenticate = (req, res, next) => {
  const user = verifyToken(req.get('authorization'));
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  req.user = user;
  return next();
};

/* Attaches req.user when a valid token is present but never rejects. Public
   endpoints use this so they can personalise a response for signed-in visitors
   while still serving anonymous ones. */
const optionalAuthenticate = (req, res, next) => {
  req.user = verifyToken(req.get('authorization')) || undefined;
  return next();
};

const requireRole = (...roles) => (req, res, next) => {
  const userRoles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
  if (!userRoles.some((role) => roles.includes(role))) return res.status(403).json({ error: 'You do not have permission to access this resource' });
  next();
};

module.exports = { authenticate, optionalAuthenticate, requireRole };

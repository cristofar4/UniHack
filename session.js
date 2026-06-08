const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me';
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET not set — using an insecure dev secret. Set JWT_SECRET in production.');
}

const COOKIE = 'uh_session';
const TOKEN_TTL_DAYS = 7;

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, type: user.account_type },
    JWT_SECRET,
    { expiresIn: `${TOKEN_TTL_DAYS}d` }
  );
}

function setSession(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

function clearSession(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

function readSession(req) {
  const token = req.cookies && req.cookies[COOKIE];
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

function requireAuth(req, res, next) {
  const payload = readSession(req);
  if (!payload) return res.status(401).json({ error: 'Not authenticated' });
  req.user = payload;
  next();
}

module.exports = { JWT_SECRET, COOKIE, signToken, setSession, clearSession, readSession, requireAuth };

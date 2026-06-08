const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { pool } = require('./db');
const { sendVerificationEmail } = require('./email');
const { signToken, setSession, clearSession, readSession } = require('./session');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' }
});

const isValidEmail = e => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const publicUser = u => ({ id: u.id, email: u.email, fullName: u.full_name, accountType: u.account_type, emailVerified: u.email_verified });

// POST /api/auth/signup
router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { email, password, fullName, accountType } = req.body || {};
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const type = accountType === 'organization' ? 'organization' : 'student';
    const hash = await bcrypt.hash(password, 10);
    const verifyToken = crypto.randomBytes(24).toString('hex');

    let result;
    try {
      result = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, account_type, verify_token, verify_sent_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, email, full_name, account_type, email_verified`,
        [email.toLowerCase().trim(), hash, (fullName || '').trim() || null, type, verifyToken]
      );
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'An account with this email already exists. Try signing in.' });
      throw e;
    }

    const user = result.rows[0];
    sendVerificationEmail(user.email, verifyToken)
      .then(() => console.log(`✅ Verification email sent: ${user.email}`))
      .catch(err => console.error('❌ Verification email failed:', err.message));

    setSession(res, signToken(user));
    return res.json({ success: true, user: publicUser(user) });
  } catch (err) {
    console.error('signup error:', err.message);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!isValidEmail(email) || !password) return res.status(400).json({ error: 'Enter your email and password.' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    setSession(res, signToken(user));
    return res.json({ success: true, user: publicUser(user) });
  } catch (err) {
    console.error('login error:', err.message);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  clearSession(res);
  return res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const payload = readSession(req);
  if (!payload) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, account_type, email_verified FROM users WHERE id = $1',
      [payload.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    return res.json({ user: publicUser(user) });
  } catch (err) {
    console.error('me error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/verify?token=...
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.redirect('/?verified=invalid');
  try {
    const result = await pool.query(
      'UPDATE users SET email_verified = TRUE, verify_token = NULL WHERE verify_token = $1 RETURNING id',
      [token]
    );
    return res.redirect(result.rowCount === 0 ? '/?verified=invalid' : '/?verified=success');
  } catch (err) {
    console.error('verify error:', err.message);
    return res.redirect('/?verified=error');
  }
});

module.exports = router;

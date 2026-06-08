const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { pool, initDB } = require('./db');
const { sendWaitlistEmails } = require('./email');
const authRouter = require('./auth');

const app = express();

// Render (and most hosts) sit behind a proxy — needed for secure cookies + rate limiting
app.set('trust proxy', 1);

app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.static('public'));

initDB();

// ── AUTH ──
app.use('/api/auth', authRouter);

// ── WAITLIST (kept for backwards compatibility) ──
app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO waitlist (email) VALUES ($1) ON CONFLICT (email) DO NOTHING RETURNING *',
      [email]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM waitlist');
    const total = Number(countResult.rows[0].count);

    if (result.rowCount === 0) {
      return res.json({ success: true, message: 'Already joined', count: total });
    }

    await sendWaitlistEmails(email, total, process.env.OWNER_EMAIL);
    console.log(`✅ New waitlist signup: ${email} | Total: ${total}`);
    return res.json({ success: true, count: total });
  } catch (err) {
    console.error('Waitlist error:', err.message);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// Live waitlist count — the frontend already calls this; it was missing before
app.get('/api/waitlist/count', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM waitlist');
    return res.json({ count: Number(result.rows[0].count) });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Keep-alive ping so Render's free tier doesn't sleep
setInterval(() => {
  if (process.env.RENDER_URL) {
    require('https').get(`https://${process.env.RENDER_URL}/health`).on('error', () => {});
  }
}, 14 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 UniHack server running on port ${PORT}`);
});

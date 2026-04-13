const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// ── PostgreSQL Connection ───────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ── Create table if not exists ──────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      joined_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('✅ PostgreSQL table ready');
}
initDB().catch(err => console.error('❌ DB init error:', err.message));

// ── Resend Email Client ─────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

// ── POST /api/waitlist ──────────────────────────────────────────
app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  // Save to PostgreSQL
  try {
    await pool.query(
      'INSERT INTO waitlist (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
      [email]
    );
  } catch (err) {
    console.error('DB error:', err.message);
    return res.status(500).json({ error: 'Database error. Please try again.' });
  }

  // Send confirmation email to user
  try {
    await resend.emails.send({
      from: 'UniHack <onboarding@resend.dev>',
      to: email,
      subject: "🎉 You're on the UniHack Waitlist!",
      html: `
        <div style="background:#0a0f0d;color:#fff;font-family:'Helvetica Neue',sans-serif;padding:40px;border-radius:12px;max-width:600px;margin:auto;border:1px solid #00ffa6;">
          <div style="margin-bottom:24px;">
            <span style="background:#0d1f17;border:1.5px solid #00ffa6;border-radius:8px;padding:6px 12px;color:#00ffa6;font-family:monospace;font-weight:700;font-size:16px;">&gt;_ UniHack</span>
          </div>
          <h1 style="color:#fff;font-size:28px;margin-bottom:8px;">Welcome to UniHack! 🚀</h1>
          <p style="color:#00ffa6;font-size:15px;margin-bottom:24px;">You're officially on the waitlist.</p>
          <p style="color:#ccc;font-size:15px;line-height:1.7;margin-bottom:20px;">As an early adopter, you'll receive:</p>
          <div style="background:#111;border-radius:10px;padding:20px;margin-bottom:24px;">
            <p style="margin:10px 0;color:#ccc;font-size:15px;">🎁 <strong style="color:#fff;">500 Bonus Points</strong> when we launch</p>
            <p style="margin:10px 0;color:#ccc;font-size:15px;">🏅 Exclusive <strong style="color:#fff;">Early Adopter Badge</strong></p>
            <p style="margin:10px 0;color:#ccc;font-size:15px;">💼 Priority access to the <strong style="color:#fff;">Job Board</strong></p>
            <p style="margin:10px 0;color:#ccc;font-size:15px;">⚡ First access when UniHack goes live</p>
          </div>
          <p style="color:#ccc;font-size:15px;line-height:1.7;">We'll notify you the moment UniHack launches. Stay sharp and keep building. 💪</p>
          <div style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.1);">
            <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;">UniHack — Hack. Compete. Level Up. Get Hired.</p>
            <p style="color:rgba(255,255,255,0.2);font-size:12px;margin:4px 0 0;">You received this because you signed up at unihack.com</p>
          </div>
        </div>
      `
    });
  } catch (err) {
    console.error('User email error:', err.message);
  }

  // Send notification to owner
  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM waitlist');
    const total = countResult.rows[0].count;

    await resend.emails.send({
      from: 'UniHack Bot <onboarding@resend.dev>',
      to: process.env.OWNER_EMAIL,
      subject: '🔔 New Waitlist Signup — UniHack',
      html: `
        <div style="font-family:sans-serif;padding:24px;background:#f9f9f9;border-radius:8px;max-width:500px;">
          <h2 style="color:#00aa70;margin-bottom:16px;">New Waitlist Signup 🎉</h2>
          <p style="margin:8px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin:8px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p style="margin:8px 0;"><strong>Total signups:</strong> ${total}</p>
        </div>
      `
    });
  } catch (err) {
    console.error('Owner email error:', err.message);
  }

  return res.status(200).json({ success: true });
});

// ── GET /api/waitlist ───────────────────────────────────────────
app.get('/api/waitlist', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM waitlist ORDER BY joined_at DESC');
    res.json({ total: result.rows.length, signups: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch waitlist.' });
  }
});

// ── Health check ────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Keep alive ping (for free tier) ────────────────────────────
const https = require('https');
setInterval(() => {
  https.get(`https://${process.env.RENDER_URL}/health`, () => {}).on('error', () => {});
}, 14 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
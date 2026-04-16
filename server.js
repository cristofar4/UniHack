const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));   // Serve HTML + CSS

// PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Init DB
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        joined_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Database ready');
  } catch (err) {
    console.error('❌ DB init error:', err.message);
  }
}
initDB();

// Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Waitlist Endpoint - FIXED
app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  try {
    // 1. Save to database first (most important)
    await pool.query(
      'INSERT INTO waitlist (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
      [email]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM waitlist');
    const total = countResult.rows[0].count;

    // 2. Try to send emails (but don't let them break the response)
    try {
      // Welcome email to user
      await resend.emails.send({
        from: 'UniHack <onboarding@resend.dev>',
        to: email,
        subject: "🎉 You're on the UniHack Waitlist!",
        html: `
          <div style="background:#0a0f0d;color:#fff;padding:40px;border-radius:12px;max-width:600px;margin:auto;border:1px solid #00ffa6;">
            <h1>Welcome to UniHack! 🚀</h1>
            <p>You're officially on the waitlist.</p>
            <p>As an early adopter, you'll get <strong>500 Bonus Points</strong>, an exclusive badge, and priority access when we launch.</p>
            <p>We'll notify you as soon as UniHack goes live.</p>
          </div>
        `
      });

      // Notification to you (owner)
      await resend.emails.send({
        from: 'UniHack Bot <onboarding@resend.dev>',
        to: process.env.OWNER_EMAIL,
        subject: `🔔 New Waitlist Signup - ${email}`,
        html: `
          <h2>New Waitlist Signup</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Total signups:</strong> ${total}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        `
      });
    } catch (emailErr) {
      console.error('Email sending failed (but user was added):', emailErr.message);
      // We still continue - don't fail the whole request just because email failed
    }

    return res.json({ success: true });

  } catch (err) {
    console.error('Waitlist error:', err.message);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Keep-alive
setInterval(() => {
  if (process.env.RENDER_URL) {
    require('https').get(`https://${process.env.RENDER_URL}/health`).on('error', () => {});
  }
}, 14 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 UniHack server running on https://${process.env.RENDER_URL}`);
});
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// ── PostgreSQL ──
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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
    process.exit(1);
  }
}
initDB();

// ── Nodemailer (your Gmail) ──
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// Test Gmail connection when server starts
transporter.verify((error) => {
  if (error) {
    console.error('❌ Gmail connection failed:', error.message);
  } else {
    console.log('✅ Gmail ready to send emails');
  }
});

// ── Waitlist Route ──
app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  try {
    // Save to database
    const result = await pool.query(
      'INSERT INTO waitlist (email) VALUES ($1) ON CONFLICT (email) DO NOTHING RETURNING *',
      [email]
    );

    // Already signed up before
    if (result.rowCount === 0) {
      return res.json({ success: true, alreadyRegistered: true });
    }

    const countResult = await pool.query('SELECT COUNT(*) FROM waitlist');
    const total = countResult.rows[0].count;

    // ── Send emails ──
    try {
      // Email to your user
      await transporter.sendMail({
        from: `"UniHack" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "🎉 You're on the UniHack Waitlist!",
        html: `
          <div style="background:#0a0f0d;color:#fff;padding:40px;
                      border-radius:12px;max-width:600px;margin:auto;
                      border:1px solid #00ffa6;font-family:sans-serif;">
            <h1 style="color:#00ffa6;">Welcome to UniHack! 🚀</h1>
            <p>You're officially on the waitlist — position 
               <strong style="color:#00ffa6;">#${total}</strong>.
            </p>
            <p>As an early adopter you'll receive:</p>
            <ul>
              <li>⚡ 500 Bonus Points on launch</li>
              <li>🏅 Exclusive Early Adopter badge</li>
              <li>🎯 Priority Job Board access</li>
            </ul>
            <p style="color:#aaa;">
              We'll email you the moment UniHack goes live. Stay tuned!
            </p>
            <p style="color:#aaa;font-size:13px;">— The UniHack Team</p>
          </div>
        `
      });

      // Notification email to you
      await transporter.sendMail({
        from: `"UniHack Bot" <${process.env.GMAIL_USER}>`,
        to: process.env.OWNER_EMAIL,
        subject: `🔔 New Waitlist Signup — ${email}`,
        html: `
          <h2>New Signup!</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Total waitlist count:</strong> ${total}</p>
          <p><strong>Time:</strong> ${new Date().toUTCString()}</p>
        `
      });

      console.log(`✅ Emails sent for ${email} (total: ${total})`);

    } catch (emailErr) {
      console.error('⚠️ Email failed (user still saved):', emailErr.message);
    }

    return res.json({ success: true });

  } catch (err) {
    console.error('❌ Waitlist error:', err.message);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── Health check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Keep Render from sleeping ──
setInterval(() => {
  if (process.env.RENDER_URL) {
    require('https')
      .get(`https://${process.env.RENDER_URL}/health`)
      .on('error', (e) => console.warn('Keep-alive failed:', e.message));
  }
}, 14 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
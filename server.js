const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const Brevo = require('@getbrevo/brevo');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

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

// Brevo Setup
const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

console.log('BREVO_API_KEY loaded:', process.env.BREVO_API_KEY ? 'YES' : 'MISSING ❌');

// ✅ USE VERIFIED EMAIL HERE
const SENDER_EMAIL = process.env.SENDER_EMAIL || "yourverifiedemail@gmail.com";

// Waitlist Endpoint
app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  try {
    // Save to DB (prevent duplicates)
    const result = await pool.query(
      'INSERT INTO waitlist (email) VALUES ($1) ON CONFLICT (email) DO NOTHING RETURNING *',
      [email]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM waitlist');
    const total = countResult.rows[0].count;

    // If already exists
    if (result.rowCount === 0) {
      return res.json({ success: true, message: "Already joined" });
    }

    // Email to user
    const userEmail = {
      sender: { name: "UniHack", email: SENDER_EMAIL },
      to: [{ email }],
      subject: "🎉 You're on the UniHack Waitlist!",
      htmlContent: `
        <div style="background:#0a0f0d;color:#fff;padding:40px;border-radius:12px;max-width:600px;margin:auto;border:1px solid #00ffa6;">
          <h1>Welcome to UniHack! 🚀</h1>
          <p>You're officially on the waitlist.</p>
          <p>As an early adopter, you'll get 500 Bonus Points, Early Adopter Badge, and priority access when we launch.</p>
          <p>We'll notify you as soon as UniHack goes live.</p>
        </div>
      `
    };

    // Email to you (optional)
    const ownerEmail = {
      sender: { name: "UniHack", email: SENDER_EMAIL },
      to: [{ email: process.env.OWNER_EMAIL }],
      subject: `🔔 New Waitlist Signup - ${email}`,
      htmlContent: `<h2>New Signup</h2><p>Email: ${email}</p><p>Total: ${total}</p>`
    };

    // ✅ Send emails safely (no crash)
    try {
      await apiInstance.sendTransacEmail(userEmail);
      console.log("✅ User email sent");
    } catch (e) {
      console.error("❌ User email failed:", e.message);
    }

    try {
      if (process.env.OWNER_EMAIL) {
        await apiInstance.sendTransacEmail(ownerEmail);
        console.log("✅ Owner email sent");
      }
    } catch (e) {
      console.error("❌ Owner email failed:", e.message);
    }

    console.log(`✅ New waitlist signup: ${email} | Total: ${total}`);

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
    require('https')
      .get(`https://${process.env.RENDER_URL}/health`)
      .on('error', () => {});
  }
}, 14 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 UniHack server running on https://${process.env.RENDER_URL}`);
});
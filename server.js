const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

console.log(process.env.OWNER_EMAIL);

const app = express();
app.use(express.json());
app.use(cors());

/* ── MongoDB Connection ───────────────────────────── */
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => console.log("MongoDB error:", err));

/* ── Email Schema (Save waitlist emails) ───────────── */
const EmailSchema = new mongoose.Schema({
  email: String,
  date: {
    type: Date,
    default: Date.now
  }
});

const Email = mongoose.model('Email', EmailSchema);

/* ── Nodemailer transporter ────────────────────────── */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.OWNER_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/* ── Waitlist endpoint ─────────────────────────────── */
app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  try {

    // 1. SAVE EMAIL TO MONGODB ✅
    await Email.create({ email });

    // 2. Email to user
    await transporter.sendMail({
      from: `"UniHack" <${process.env.OWNER_EMAIL}>`,
      to: email,
      subject: '🎉 You\'re on the UniHack Waitlist!',
      html: `
        <div style="background:#0a0f0d;color:#fff;font-family:'Poppins',sans-serif;padding:40px;border-radius:12px;max-width:600px;margin:auto;">
          <h1 style="color:#00ffa6;font-size:28px;">Welcome to UniHack! 🚀</h1>
          <p style="color:#ccc;font-size:15px;line-height:1.7;">
            You've been added to our waitlist.
          </p>
        </div>
      `,
    });

    // 3. Email to owner
    await transporter.sendMail({
      from: `"UniHack Bot" <${process.env.OWNER_EMAIL}>`,
      to: process.env.OWNER_EMAIL,
      subject: '🔔 New Waitlist Signup — UniHack',
      html: `
        <div style="font-family:sans-serif;padding:20px;">
          <h2>New Waitlist Signup</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    return res.status(200).json({ success: true, message: 'You are on the list!' });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Failed to process request.' });
  }
});

/* ── Start server ──────────────────────────────────── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
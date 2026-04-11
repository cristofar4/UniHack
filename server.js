const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const app = express();
app.use(express.json());
app.use(cors());

/* ── Security header (optional but good) ───────────── */
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'UniHack');
  next();
});

/* ── MongoDB Connection ───────────────────────────── */
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.log("MongoDB error:", err));

/* ── Email Schema ─────────────────────────────────── */
const EmailSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  date: {
    type: Date,
    default: Date.now
  }
});

const Email = mongoose.model('Email', EmailSchema);

/* ── Email Transporter ────────────────────────────── */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.OWNER_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/* ── Email validation regex ───────────────────────── */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ── Waitlist Route ──────────────────────────────── */
app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body;

  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  try {
    /* Check duplicate */
    const existing = await Email.findOne({ email });

    if (existing) {
      return res.status(409).json({ error: 'Email already exists.' });
    }

    /* Save to MongoDB */
    await Email.create({ email });

    /* Send email to user */
    await transporter.sendMail({
      from: `"UniHack" <${process.env.OWNER_EMAIL}>`,
      to: email,
      subject: "🎉 You're on the UniHack Waitlist!",
      html: `
        <div style="background:#0a0f0d;color:#fff;font-family:Poppins,sans-serif;padding:40px;border-radius:12px;max-width:600px;margin:auto;">
          <h1 style="color:#00ffa6;font-size:28px;">Welcome to UniHack 🚀</h1>
          <p style="color:#ccc;font-size:15px;line-height:1.7;">
            You've successfully joined our waitlist. We’ll notify you when we launch.
          </p>
        </div>
      `,
    });

    /* Notify owner */
    await transporter.sendMail({
      from: `"UniHack Bot" <${process.env.OWNER_EMAIL}>`,
      to: process.env.OWNER_EMAIL,
      subject: "🔔 New Waitlist Signup",
      html: `
        <div style="font-family:sans-serif;padding:20px;">
          <h2>New Signup</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Successfully joined waitlist!"
    });

  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({
      error: "Server error. Please try again."
    });
  }
});

/* ── Start Server ─────────────────────────────────── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
const Brevo = require('@getbrevo/brevo');

const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

// NOTE: trailing-space bug from the old sender value is fixed with .trim()
const SENDER_EMAIL = (process.env.SENDER_EMAIL || 'unihack810@gmail.com').trim();
const SENDER = { name: 'UniHack', email: SENDER_EMAIL };

function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.RENDER_URL) return `https://${process.env.RENDER_URL}`;
  return 'http://localhost:3000';
}

// Shared on-brand email shell (dark + neon, matches the landing)
function shell(title, body) {
  return `
    <div style="background:#0a0f0d;color:#fff;padding:40px;border-radius:14px;max-width:600px;margin:auto;border:1px solid #00ffa6;font-family:Arial,Helvetica,sans-serif;">
      <div style="font-family:monospace;color:#00ffa6;font-weight:700;font-size:18px;margin-bottom:18px;">&gt;_ UniHack</div>
      <h1 style="font-size:22px;margin:0 0 14px;">${title}</h1>
      ${body}
      <p style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:28px;">If you didn't request this, you can safely ignore this email.</p>
    </div>`;
}

async function sendVerificationEmail(email, token) {
  const link = `${appUrl()}/api/auth/verify?token=${token}`;
  return apiInstance.sendTransacEmail({
    sender: SENDER,
    to: [{ email }],
    subject: '🐝 Verify your UniHack account',
    htmlContent: shell('Confirm your email', `
      <p>Welcome to UniHack! Tap the button below to verify your email and unlock your dashboard.</p>
      <p style="margin:26px 0;">
        <a href="${link}" style="background:#00ffa6;color:#000;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:8px;display:inline-block;">Verify my email</a>
      </p>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;">Or paste this link in your browser:<br><span style="color:#00ffa6;word-break:break-all;">${link}</span></p>
    `)
  });
}

// Waitlist emails — preserved from the original server behaviour
async function sendWaitlistEmails(email, total, ownerEmail) {
  await apiInstance.sendTransacEmail({
    sender: SENDER,
    to: [{ email }],
    subject: "🎉 You're on the UniHack Waitlist!",
    htmlContent: shell('Welcome to UniHack! 🚀', `
      <p>You're officially on the waitlist.</p>
      <p>As an early adopter, you'll get 500 Bonus Points, an Early Adopter Badge, and priority access when we launch.</p>
    `)
  }).catch(e => console.error('❌ Waitlist user email failed:', e.message));

  if (ownerEmail) {
    await apiInstance.sendTransacEmail({
      sender: SENDER,
      to: [{ email: ownerEmail }],
      subject: `🔔 New Waitlist Signup - ${email}`,
      htmlContent: `<h2>New Signup</h2><p>Email: ${email}</p><p>Total: ${total}</p>`
    }).catch(e => console.error('❌ Waitlist owner email failed:', e.message));
  }
}

module.exports = { sendVerificationEmail, sendWaitlistEmails, appUrl, SENDER_EMAIL };

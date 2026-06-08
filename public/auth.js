// ───────── elements ─────────
const entrance = document.getElementById('entrance');
const handle   = document.getElementById('handle');
const hint     = document.getElementById('hint');
const skip     = document.getElementById('skip');
const auth     = document.getElementById('auth');
const banner   = document.getElementById('banner');
const msg      = document.getElementById('msg');

const tabSignin = document.getElementById('tab-signin');
const tabSignup = document.getElementById('tab-signup');
const formSignin = document.getElementById('form-signin');
const formSignup = document.getElementById('form-signup');

let started = false;
let done = false;
let accountType = 'student';

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasSeen = localStorage.getItem('uh_entrance_seen');

// ───────── wind particles ─────────
const canvas = document.getElementById('wind');
const ctx = canvas.getContext('2d');
let particles = [];
const wind = { active: false };

function sizeCanvas() { canvas.width = innerWidth; canvas.height = innerHeight; }
sizeCanvas();
addEventListener('resize', sizeCanvas);

for (let i = 0; i < 70; i++) {
  particles.push({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    vx: Math.random() * 0.6 - 0.3,
    vy: Math.random() * 0.6 - 0.3,
    size: Math.random() * 2 + 0.6
  });
}

function drawWind() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2, cy = canvas.height / 2;
  for (const p of particles) {
    if (wind.active) {
      const dx = cx - p.x, dy = cy - p.y;
      const dist = Math.hypot(dx, dy) || 1;
      p.vx += (dx / dist) * 0.9;
      p.vy += (dy / dist) * 0.9;
      if (dist < 24) { p.x = Math.random() * canvas.width; p.y = Math.random() * canvas.height; p.vx = p.vy = 0; }
    }
    p.x += p.vx; p.y += p.vy;
    if (!wind.active) {
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = wind.active ? 'rgba(0,255,166,0.8)' : 'rgba(0,255,166,0.35)';
    ctx.fill();
  }
  requestAnimationFrame(drawWind);
}
drawWind();

// ───────── entrance sequence ─────────
function startSequence() {
  if (started || done) return;
  started = true;
  entrance.classList.add('s-bee');
  setTimeout(() => entrance.classList.add('s-open'), 1000);
  setTimeout(() => { entrance.classList.add('s-wind'); wind.active = true; }, 1820);
  setTimeout(() => entrance.classList.add('s-thunder'), 2560);
  setTimeout(finishEntrance, 2820);
}

function finishEntrance() {
  if (done) return;
  done = true;
  wind.active = false;
  entrance.classList.add('s-done');
  setTimeout(() => { entrance.style.display = 'none'; }, 650);
  auth.classList.add('show');
  auth.setAttribute('aria-hidden', 'false');
  localStorage.setItem('uh_entrance_seen', '1');
  applyQuery();
  const first = formSignup.hidden ? document.getElementById('si-email') : document.getElementById('su-name');
  setTimeout(() => first && first.focus(), 400);
}

handle.addEventListener('click', startSequence);
hint.addEventListener('click', startSequence);
skip.addEventListener('click', finishEntrance);
// Fail-safe: never trap the user behind the animation
setTimeout(() => { if (!done) finishEntrance(); }, 9000);

// Returning users / reduced motion → straight to the form
if (prefersReduced || hasSeen) finishEntrance();

// Already logged in? Skip auth entirely.
fetch('/api/auth/me', { credentials: 'include' })
  .then(r => { if (r.ok) location.href = '/dashboard.html'; })
  .catch(() => {});

// ───────── tabs ─────────
function switchTab(name) {
  const signin = name === 'signin';
  tabSignin.classList.toggle('active', signin);
  tabSignup.classList.toggle('active', !signin);
  formSignin.hidden = !signin;
  formSignup.hidden = signin;
  msg.textContent = '';
}
tabSignin.addEventListener('click', () => switchTab('signin'));
tabSignup.addEventListener('click', () => switchTab('signup'));

// ───────── account type ─────────
document.querySelectorAll('.seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    accountType = btn.dataset.type;
    document.getElementById('name-label').textContent =
      accountType === 'organization' ? 'Organization name' : 'Full name';
  });
});

// ───────── query params ─────────
function applyQuery() {
  const p = new URLSearchParams(location.search);
  if (p.get('mode') === 'signup' || p.get('type') === 'organization') switchTab('signup');
  if (p.get('type') === 'organization') {
    const orgBtn = document.querySelector('.seg-btn[data-type="organization"]');
    if (orgBtn) orgBtn.click();
  }
  const v = p.get('verified');
  if (v === 'success') showBanner('✓ Email verified! You can sign in now.', false);
  else if (v) showBanner('That verification link is invalid or has expired.', true);
}
function showBanner(text, isError) {
  banner.textContent = text;
  banner.hidden = false;
  banner.classList.toggle('error', !!isError);
}

// ───────── form submit ─────────
async function postJSON(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, data };
}

function setLoading(form, on, label) {
  const btn = form.querySelector('.submit');
  btn.disabled = on;
  btn.textContent = on ? 'Please wait…' : label;
}

formSignin.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  setLoading(formSignin, true, 'Sign In');
  const { ok, data } = await postJSON('/api/auth/login', {
    email: document.getElementById('si-email').value.trim(),
    password: document.getElementById('si-password').value
  });
  if (ok) { location.href = '/dashboard.html'; return; }
  setLoading(formSignin, false, 'Sign In');
  msg.textContent = data.error || 'Could not sign in.';
});

formSignup.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  setLoading(formSignup, true, 'Create account');
  const { ok, data } = await postJSON('/api/auth/signup', {
    fullName: document.getElementById('su-name').value.trim(),
    email: document.getElementById('su-email').value.trim(),
    password: document.getElementById('su-password').value,
    accountType
  });
  if (ok) { location.href = '/dashboard.html'; return; }
  setLoading(formSignup, false, 'Create account');
  msg.textContent = data.error || 'Could not create account.';
});

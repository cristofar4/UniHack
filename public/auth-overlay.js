(function () {
  const overlay = document.getElementById('uh-auth');
  if (!overlay) return;

  const tabSignin = overlay.querySelector('[data-tab="signin"]');
  const tabSignup = overlay.querySelector('[data-tab="signup"]');
  const formSignin = document.getElementById('uh-form-signin');
  const formSignup = document.getElementById('uh-form-signup');
  const banner = document.getElementById('uh-banner');
  const msg = document.getElementById('uh-msg');
  const closeBtn = document.getElementById('uh-close');
  const stages = ['s-bee', 's-open', 's-wind', 's-thunder', 's-card'];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let timers = [], opened = false, accountType = 'student', raf = null, windActive = false;

  // ── wind particles (only while open) ──
  const canvas = document.getElementById('uh-wind');
  const ctx = canvas.getContext('2d');
  let particles = [];
  function sizeC() { canvas.width = innerWidth; canvas.height = innerHeight; }
  function initParticles() {
    particles = [];
    for (let i = 0; i < 60; i++) particles.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, vx: Math.random() * 0.6 - 0.3, vy: Math.random() * 0.6 - 0.3, s: Math.random() * 2 + 0.6 });
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2, cy = canvas.height / 2;
    for (const p of particles) {
      if (windActive) {
        const dx = cx - p.x, dy = cy - p.y, d = Math.hypot(dx, dy) || 1;
        p.vx += (dx / d) * 0.9; p.vy += (dy / d) * 0.9;
        if (d < 24) { p.x = Math.random() * canvas.width; p.y = Math.random() * canvas.height; p.vx = p.vy = 0; }
      }
      p.x += p.vx; p.y += p.vy;
      if (!windActive) { if (p.x < 0 || p.x > canvas.width) p.vx *= -1; if (p.y < 0 || p.y > canvas.height) p.vy *= -1; }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
      ctx.fillStyle = windActive ? 'rgba(0,255,166,0.8)' : 'rgba(0,255,166,0.35)'; ctx.fill();
    }
    raf = requestAnimationFrame(draw);
  }

  function switchTab(mode) {
    const si = mode !== 'signup';
    tabSignin.classList.toggle('active', si);
    tabSignup.classList.toggle('active', !si);
    formSignin.hidden = !si;
    formSignup.hidden = si;
    msg.textContent = '';
  }
  function setType(t) {
    accountType = t;
    overlay.querySelectorAll('.uh-seg-btn').forEach(b => b.classList.toggle('active', b.dataset.type === t));
    document.getElementById('uh-name-label').childNodes[0].nodeValue = t === 'organization' ? 'Organization name' : 'Full name';
  }
  function focusFirst() {
    const f = formSignup.hidden ? document.getElementById('uh-si-email') : document.getElementById('uh-su-name');
    setTimeout(() => f && f.focus(), 120);
  }

  function openAuth(mode, type) {
    switchTab(mode || 'signin');
    setType(type || 'student');
    if (opened) return;
    opened = true;
    document.body.style.overflow = 'hidden';
    sizeC(); initParticles(); if (!raf) draw();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    if (reduce) { overlay.classList.add('s-card'); focusFirst(); return; }
    timers.push(setTimeout(() => overlay.classList.add('s-bee'), 60));
    timers.push(setTimeout(() => overlay.classList.add('s-open'), 1050));
    timers.push(setTimeout(() => { overlay.classList.add('s-wind'); windActive = true; }, 1820));
    timers.push(setTimeout(() => overlay.classList.add('s-thunder'), 2560));
    timers.push(setTimeout(() => { overlay.classList.add('s-card'); windActive = false; focusFirst(); }, 2820));
  }
  function closeAuth() {
    opened = false; windActive = false;
    timers.forEach(clearTimeout); timers = [];
    overlay.classList.remove('open', ...stages);
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    msg.textContent = '';
  }
  window.openAuth = openAuth;

  // turn every "/auth.html" link on the landing into an overlay trigger
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="auth.html"]');
    if (!a) return;
    e.preventDefault();
    let mode = 'signin', type = null;
    try {
      const u = new URL(a.getAttribute('href'), location.origin);
      if (u.searchParams.get('mode') === 'signup') mode = 'signup';
      if (u.searchParams.get('type') === 'organization') { mode = 'signup'; type = 'organization'; }
    } catch (_) {}
    openAuth(mode, type);
  });

  closeBtn.addEventListener('click', closeAuth);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeAuth(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && opened) closeAuth(); });
  tabSignin.addEventListener('click', () => switchTab('signin'));
  tabSignup.addEventListener('click', () => switchTab('signup'));
  overlay.querySelectorAll('.uh-seg-btn').forEach(b => b.addEventListener('click', () => setType(b.dataset.type)));

  async function post(url, body, form, label) {
    const btn = form.querySelector('.uh-submit');
    btn.disabled = true; btn.textContent = 'Please wait…';
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
      const data = await r.json().catch(() => ({}));
      if (r.ok) { location.href = '/dashboard.html'; return; }
      msg.textContent = data.error || 'Something went wrong.';
    } catch (_) { msg.textContent = 'Network error. Please try again.'; }
    btn.disabled = false; btn.textContent = label;
  }
  formSignin.addEventListener('submit', e => {
    e.preventDefault(); msg.textContent = '';
    post('/api/auth/login', { email: document.getElementById('uh-si-email').value.trim(), password: document.getElementById('uh-si-pass').value }, formSignin, 'Sign In');
  });
  formSignup.addEventListener('submit', e => {
    e.preventDefault(); msg.textContent = '';
    post('/api/auth/signup', { fullName: document.getElementById('uh-su-name').value.trim(), email: document.getElementById('uh-su-email').value.trim(), password: document.getElementById('uh-su-pass').value, accountType }, formSignup, 'Create account');
  });

  // open automatically when arriving from the verification email or ?auth=
  const params = new URLSearchParams(location.search);
  const v = params.get('verified');
  if (v) {
    openAuth('signin');
    banner.hidden = false;
    if (v === 'success') banner.textContent = '✓ Email verified! You can sign in now.';
    else { banner.classList.add('err'); banner.textContent = 'That verification link is invalid or has expired.'; }
  } else if (params.get('auth') === 'signup') openAuth('signup');
  else if (params.get('auth') === 'signin') openAuth('signin');
})();

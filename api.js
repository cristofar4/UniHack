const express = require('express');
const { pool } = require('./db');
const { requireAuth, readSession } = require('./session');

const router = express.Router();

const ROLES = {
  developer: 'Developer',
  designer: 'Designer',
  analyst: 'Data Analyst',
  pm: 'Product Manager',
  qa: 'QA Engineer',
  entrepreneur: 'Entrepreneur'
};
const QUESTIONS_PER_TEST = 6;
const PASS_PERCENT = 55;
const SECONDS_PER_QUESTION = 45;

function badgeFor(percent) {
  if (percent >= 90) return 'Pro';
  if (percent >= 80) return 'Gold';
  if (percent >= 70) return 'Silver';
  if (percent >= PASS_PERCENT) return 'Bronze';
  return null;
}

// Bumps the daily streak at most once per calendar day
async function touchActivity(userId) {
  await pool.query(`
    UPDATE users SET
      streak_days = CASE
        WHEN last_active_date = CURRENT_DATE THEN streak_days
        WHEN last_active_date = CURRENT_DATE - INTERVAL '1 day' THEN streak_days + 1
        ELSE 1 END,
      last_active_date = CURRENT_DATE
    WHERE id = $1
  `, [userId]);
}

// GET /api/profile/me — everything the dashboard needs
router.get('/profile/me', requireAuth, async (req, res) => {
  try {
    await touchActivity(req.user.id);
    const { rows } = await pool.query(
      'SELECT id, email, full_name, account_type, email_verified, role, xp, level, streak_days FROM users WHERE id = $1',
      [req.user.id]
    );
    const u = rows[0];
    if (!u) return res.status(401).json({ error: 'Not authenticated' });

    let rank = null, badge = null;
    if (u.role) {
      const r = await pool.query('SELECT COUNT(*)::int + 1 AS rank FROM users WHERE role IS NOT NULL AND xp > $1', [u.xp]);
      rank = r.rows[0].rank;
      const b = await pool.query(
        'SELECT badge FROM test_attempts WHERE user_id = $1 AND role = $2 AND badge IS NOT NULL ORDER BY percent DESC LIMIT 1',
        [u.id, u.role]
      );
      badge = b.rows[0] ? b.rows[0].badge : null;
    }

    res.json({
      user: {
        id: u.id, email: u.email, fullName: u.full_name, accountType: u.account_type,
        emailVerified: u.email_verified, role: u.role, roleLabel: u.role ? ROLES[u.role] : null,
        xp: u.xp, level: u.level, streakDays: u.streak_days, rank, badge
      }
    });
  } catch (err) {
    console.error('profile/me:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/profile/role
router.post('/profile/role', requireAuth, async (req, res) => {
  const { role } = req.body || {};
  if (!ROLES[role]) return res.status(400).json({ error: 'Pick a valid role.' });
  try {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, req.user.id]);
    res.json({ success: true, role, roleLabel: ROLES[role] });
  } catch (err) {
    console.error('profile/role:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/test/:role/start — questions WITHOUT correct answers
router.get('/test/:role/start', requireAuth, async (req, res) => {
  const role = req.params.role;
  if (!ROLES[role]) return res.status(404).json({ error: 'Unknown role' });
  try {
    const { rows } = await pool.query(
      'SELECT id, prompt, options, difficulty FROM questions WHERE role = $1 ORDER BY RANDOM() LIMIT $2',
      [role, QUESTIONS_PER_TEST]
    );
    res.json({ role, roleLabel: ROLES[role], durationSec: rows.length * SECONDS_PER_QUESTION, questions: rows });
  } catch (err) {
    console.error('test/start:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/test/:role/submit — scored server-side, never trust the client
router.post('/test/:role/submit', requireAuth, async (req, res) => {
  const role = req.params.role;
  if (!ROLES[role]) return res.status(404).json({ error: 'Unknown role' });
  const { answers, violations, durationSec } = req.body || {};
  if (!Array.isArray(answers) || answers.length === 0) return res.status(400).json({ error: 'No answers submitted.' });

  try {
    const ids = answers.map(a => parseInt(a.questionId)).filter(Number.isInteger);
    const { rows } = await pool.query('SELECT id, correct_index FROM questions WHERE id = ANY($1) AND role = $2', [ids, role]);
    const correct = new Map(rows.map(r => [r.id, r.correct_index]));

    let score = 0;
    const total = rows.length;
    for (const a of answers) {
      const c = correct.get(parseInt(a.questionId));
      if (c !== undefined && c === a.choiceIndex) score++;
    }

    const percent = total ? Math.round((score / total) * 100) : 0;
    const badge = badgeFor(percent);
    const passed = percent >= PASS_PERCENT;
    const v = Math.max(0, parseInt(violations) || 0);
    const flagged = v > 2;
    const xpAwarded = score * 40 + (passed ? 100 : 0);

    await pool.query(
      'INSERT INTO test_attempts (user_id, role, score, total, percent, badge, xp_awarded, violations, flagged) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [req.user.id, role, score, total, percent, badge, xpAwarded, v, flagged]
    );
    const upd = await pool.query(
      'UPDATE users SET xp = xp + $1, level = 1 + ((xp + $1) / 500) WHERE id = $2 RETURNING xp, level',
      [xpAwarded, req.user.id]
    );
    await touchActivity(req.user.id);

    res.json({ score, total, percent, badge, passed, xpAwarded, xp: upd.rows[0].xp, level: upd.rows[0].level, flagged });
  } catch (err) {
    console.error('test/submit:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/leaderboard — public; highlights the signed-in user if present
router.get('/leaderboard', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, full_name, email, role, level, xp FROM users WHERE role IS NOT NULL ORDER BY xp DESC, id ASC LIMIT 50'
    );
    const list = rows.map((u, i) => ({
      rank: i + 1,
      name: u.full_name || u.email.split('@')[0],
      role: ROLES[u.role] || u.role,
      level: u.level,
      xp: u.xp
    }));

    let me = null;
    const sess = readSession(req);
    if (sess) {
      const r = await pool.query('SELECT xp, role FROM users WHERE id = $1', [sess.id]);
      if (r.rows[0] && r.rows[0].role) {
        const rk = await pool.query('SELECT COUNT(*)::int + 1 AS rank FROM users WHERE role IS NOT NULL AND xp > $1', [r.rows[0].xp]);
        me = { rank: rk.rows[0].rank, xp: r.rows[0].xp };
      }
    }
    res.json({ rows: list, me });
  } catch (err) {
    console.error('leaderboard:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

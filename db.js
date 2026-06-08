const { Pool } = require('pg');
const { seedQuestions } = require('./seed');

// Shared Postgres pool. Use SSL for hosted DBs (Render), skip it for local.
const connectionString = process.env.DATABASE_URL;
const isLocal = !connectionString || /localhost|127\.0\.0\.1/.test(connectionString);
const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

async function initDB() {
  try {
    // Waitlist — kept so existing early signups are never lost
    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        joined_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Users — students + organizations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(120),
        account_type VARCHAR(20) NOT NULL DEFAULT 'student',
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        verify_token VARCHAR(120),
        verify_sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        last_login_at TIMESTAMP
      );
    `);

    // Profile / gamification columns (idempotent)
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS role VARCHAR(40),
        ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS streak_days INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_active_date DATE;
    `);

    // Question bank
    await pool.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        role VARCHAR(40) NOT NULL,
        difficulty INT NOT NULL DEFAULT 1,
        prompt TEXT NOT NULL,
        options JSONB NOT NULL,
        correct_index INT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Test attempts (with anti-cheat telemetry)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_attempts (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(40) NOT NULL,
        score INT NOT NULL,
        total INT NOT NULL,
        percent INT NOT NULL,
        badge VARCHAR(20),
        xp_awarded INT NOT NULL DEFAULT 0,
        violations INT NOT NULL DEFAULT 0,
        flagged BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await seedQuestions(pool);
    console.log('✅ Database ready (users + questions + attempts)');
  } catch (err) {
    console.error('❌ DB init error:', err.message);
  }
}

module.exports = { pool, initDB };

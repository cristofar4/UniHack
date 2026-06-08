const { Pool } = require('pg');

// Shared Postgres pool (used by waitlist + auth)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
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

    // Users — students + organizations (admin added later)
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

    console.log('✅ Database ready (waitlist + users)');
  } catch (err) {
    console.error('❌ DB init error:', err.message);
  }
}

module.exports = { pool, initDB };

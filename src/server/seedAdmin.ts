// src/server/seedAdmin.ts
import pool, { dbInit } from './db';
import bcrypt from 'bcryptjs';

(async () => {
  try {
    await dbInit();
    const email = 'admin@rayban.com';
    const password = 'Admin@2026!';
    // Check if admin already exists
    const [existingRows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingRows.length > 0) {
      console.log('Admin user already exists.');
      process.exit(0);
    }
    const hashed = await bcrypt.hash(password, 10);
    const [, metadata] = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [email, hashed, 'Admin', 'admin']
    );
    console.log('Created admin user with id', metadata.insertId);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin user:', err);
    process.exit(1);
  }
})();

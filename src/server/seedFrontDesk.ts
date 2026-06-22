import pool, { dbInit } from './db';
import bcrypt from 'bcryptjs';

(async () => {
  await dbInit();
  const email = 'frontdesk@rayban.com';
  const password = 'FrontDesk@2026!';
  const [existingRows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existingRows.length > 0) {
    console.log('Front desk user already exists.');
    process.exit(0);
  }
  const hashed = await bcrypt.hash(password, 10);
  const [, metadata] = await pool.query(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
    [email, hashed, 'Front Desk', 'front_desk']
  );
  console.log('Created front desk user with id', metadata.insertId);
  process.exit(0);
})();

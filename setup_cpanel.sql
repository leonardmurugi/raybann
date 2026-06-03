-- SQL Setup Script for cPanel / phpMyAdmin
-- This script contains the initial user credentials for the administrator account.
-- NOTE: The node application (server.ts) automatically creates all required tables
-- on startup. You only need to run this script to insert the initial admin user.

-- Admin Credentials:
-- Email: admin@rayban.com
-- Password: Admin@2026!

-- Ensure the users table exists (in case you are running this before starting the node app)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('admin','reception','field') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert the admin user with a bcrypt hashed password
INSERT IGNORE INTO users (email, password_hash, name, role) 
VALUES (
  'admin@rayban.com',
  '$2b$10$ZtMTn96P3HjW9SMFJpEgHOWb3sw5O0ho.D8r6pwDbtrZ8qRyOd3B.',
  'Admin',
  'admin'
);

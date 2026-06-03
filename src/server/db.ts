// src/server/db.ts
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create a MySQL pool using environment variables.
// cPanel typically provides localhost access; you can also use a full URL via DATABASE_URL.
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST ?? 'localhost',
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER ?? process.env.DB_USER,
  password: process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD,
  database: process.env.MYSQL_DATABASE ?? process.env.DB_NAME,
  // Important for security – limit connections and enable SSL if required.
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Initialise the database schema. This runs on server start.
 * It creates all tables if they do not already exist, matching the previous PostgreSQL structure.
 */
export const dbInit = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL');

    // Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role ENUM('admin','reception','field') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Parent Properties (Main Land)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS parent_properties (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        total_size VARCHAR(255) NOT NULL,
        ownership_status ENUM('partial','fully_owned') NOT NULL DEFAULT 'partial',
        buying_price DECIMAL(15,2) NOT NULL DEFAULT 0,
        amount_paid_to_seller DECIMAL(15,2) NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
      // Customers table (must be created before tables that reference it)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS customers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(50) NOT NULL,
          id_number VARCHAR(100) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);


    // Lands / Plots table (Subdivisions)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parent_property_id INT,
        plot_number VARCHAR(255) UNIQUE NOT NULL,
        location VARCHAR(255) NOT NULL,
        size VARCHAR(255) NOT NULL,
        acquisition_type ENUM('purchase','owned') NOT NULL,
        status ENUM('available','reserved','sold','pending') NOT NULL,
        total_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
        paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        customer_id INT,
        title_deed_status ENUM('pending','processed','issued') NOT NULL DEFAULT 'pending',
        title_deed_url VARCHAR(512),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_property_id) REFERENCES parent_properties(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);

    // Property Costs (Survey, Legal, etc.)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS property_costs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parent_property_id INT,
        land_id INT,
        category VARCHAR(255) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        description TEXT,
        is_approved BOOLEAN DEFAULT FALSE,
        approved_by INT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_property_id) REFERENCES parent_properties(id),
        FOREIGN KEY (land_id) REFERENCES lands(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      )
    `);

    // (customers table already created above)

    // Sales table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        land_id INT,
        customer_id INT,
        total_price DECIMAL(15,2) NOT NULL,
        paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        is_approved BOOLEAN DEFAULT FALSE,
        approved_by INT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (land_id) REFERENCES lands(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      )
    `);

    // Payments table (Transactions)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('received','made') NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        method VARCHAR(50) NOT NULL,
        category VARCHAR(255) NOT NULL,
        description TEXT,
        reference_id INT,
        reference_type VARCHAR(255),
        transaction_ref VARCHAR(255),
        reference_number VARCHAR(255),
        is_approved BOOLEAN DEFAULT FALSE,
        approved_by INT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INT,
        FOREIGN KEY (approved_by) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Receipts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        receipt_number VARCHAR(255) UNIQUE NOT NULL,
        payment_id INT,
        status ENUM('pending','official') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payments(id)
      )
    `);

    // Documents table – stores uploaded blobs securely
    await connection.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT,
        type ENUM('saleAgreement','idDocument','kraCert','passportPhoto','titleDeed') NOT NULL,
        file_blob LONGBLOB NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);

    // Expenses table (Company Operations)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(255) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        description TEXT,
        is_approved BOOLEAN DEFAULT FALSE,
        approved_by INT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        operator_id INT,
        FOREIGN KEY (approved_by) REFERENCES users(id),
        FOREIGN KEY (operator_id) REFERENCES users(id)
      )
    `);

    // Inventory table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
        category VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Debts & Payables (Vendor liabilities / land owners)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS debts_payables (
        id INT AUTO_INCREMENT PRIMARY KEY,
        creditor_name VARCHAR(255) NOT NULL,
        description TEXT,
        total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        balance DECIMAL(15,2) NOT NULL DEFAULT 0,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        payment_method VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending'
      )
    `);

    // Payroll table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payroll (
        id INT AUTO_INCREMENT PRIMARY KEY,
        staff_name VARCHAR(255) NOT NULL,
        month_year VARCHAR(20) NOT NULL,
        basic DECIMAL(15,2) NOT NULL DEFAULT 0,
        commission DECIMAL(15,2) NOT NULL DEFAULT 0,
        transport DECIMAL(15,2) NOT NULL DEFAULT 0,
        deductions DECIMAL(15,2) NOT NULL DEFAULT 0,
        gross_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        net_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        reporting_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_paid BOOLEAN DEFAULT FALSE,
        paid_date TIMESTAMP NULL,
        paid_method VARCHAR(255)
      )
    `);

    // Salary Payments table (Disbursements)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS salary_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        payroll_id INT,
        staff_name VARCHAR(255) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        payment_method VARCHAR(255) NOT NULL,
        transaction_ref VARCHAR(255),
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_approved BOOLEAN DEFAULT FALSE,
        approved_by INT,
        created_by INT,
        FOREIGN KEY (payroll_id) REFERENCES payroll(id),
        FOREIGN KEY (approved_by) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Petty Cash table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS petty_cash (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        type ENUM('debit','credit') NOT NULL,
        description TEXT NOT NULL,
        ref_number VARCHAR(255),
        amount DECIMAL(15,2) NOT NULL DEFAULT 0
      )
    `);

    connection.release();
    console.log('Database schema initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

export default pool;

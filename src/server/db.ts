// src/server/db.ts
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

// Validate database URL is set
const dbUrl = process.env.DATABASE_URL;
const dbAuthToken = process.env.DATABASE_AUTH_TOKEN;

if (!dbUrl) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('Expected format: libsql://[db-id].lite.bunnydb.net/');
  process.exit(1);
}

console.log('✓ Connecting to LibSQL database:', dbUrl.split('/')[2]);

// Create LibSQL client for bunny.net database
const libsqlClient = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});

// Create a wrapper that mimics mysql2/promise API for compatibility
const pool = {
  async query(sql: string, params?: any[]) {
    try {
      // Replace ? placeholders with LibSQL-compatible placeholders
      let processedSql = sql;
      let processedParams: (string | number | boolean | null)[] = [];
      
      if (params && params.length > 0) {
        // Convert mysql-style ? placeholders to LibSQL bind parameters
        let paramIndex = 0;
        processedSql = sql.replace(/\?/g, () => {
          const param = params[paramIndex++];
          // LibSQL only accepts string | number | boolean | null
          // Sanitize unsupported types to prevent "Unsupported type of value" errors
          let sanitized: any = param;
          
          if (param === undefined) {
            sanitized = null;
          } else if (typeof param === 'number' && !Number.isFinite(param)) {
            // Convert NaN, Infinity, -Infinity to null
            sanitized = null;
          } else if (typeof param === 'object' && param !== null) {
            // Objects/Arrays should be serialized to JSON string
            sanitized = JSON.stringify(param);
          }
          
          processedParams.push(sanitized);
          return '?';
        });
      }

      const result = await libsqlClient.execute({
        sql: processedSql,
        args: processedParams,
      });

      // Format response to match mysql2 API: [rows, fields]
      const rows = result.rows.map(row => {
        const obj: Record<string, any> = {};
        Object.keys(row).forEach((key, index) => {
          obj[key] = row[index as any] || row[key as any];
        });
        return obj;
      });

      // Return metadata in same format as mysql2/promise
      const metadata = {
        insertId: result.lastInsertRowid ? Number(result.lastInsertRowid) : 0,
        affectedRows: result.rowsChanged || 0,
      };

      return [rows, metadata];
    } catch (err: any) {
      console.error('❌ Database Query Error:', {
        sql: sql,
        params: params,
        error: err.message,
        stack: err.stack
      });
      throw err;
    }
  },

  async getConnection() {
    // Return self since LibSQL is connection-pooled
    return this;
  },

  async release() {
    // No-op for LibSQL since connection pooling is handled internally
    return Promise.resolve();
  },

  async beginTransaction() {
    // LibSQL/bunny.net HTTP client doesn't support transactions via API
    // This is a no-op for compatibility
    return Promise.resolve();
  },

  async commit() {
    // LibSQL/bunny.net HTTP client doesn't support transactions via API
    // This is a no-op for compatibility
    return Promise.resolve();
  },

  async rollback() {
    // LibSQL/bunny.net HTTP client doesn't support transactions via API
    // This is a no-op for compatibility
    return Promise.resolve();
  },
};

/**
 * Initialise the database schema. This runs on server start.
 * It creates all tables if they do not already exist, adapted for LibSQL/SQLite.
 */
export const dbInit = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to LibSQL (bunny.net)');

    // Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'reception', 'field', 'front_desk')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Parent Properties (Main Land)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS parent_properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        total_size TEXT NOT NULL,
        ownership_status TEXT NOT NULL CHECK(ownership_status IN ('partial', 'fully_owned')) DEFAULT 'partial',
        buying_price REAL NOT NULL DEFAULT 0,
        amount_paid_to_seller REAL NOT NULL DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Customers table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT NOT NULL,
        id_number TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Lands / Plots table (Subdivisions)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_property_id INTEGER,
        plot_number TEXT UNIQUE NOT NULL,
        location TEXT NOT NULL,
        size TEXT NOT NULL,
        acquisition_type TEXT NOT NULL CHECK(acquisition_type IN ('purchase', 'owned')),
        status TEXT NOT NULL CHECK(status IN ('available', 'reserved', 'sold', 'pending')),
        total_cost REAL NOT NULL DEFAULT 0,
        paid_amount REAL NOT NULL DEFAULT 0,
        customer_id INTEGER,
        title_deed_status TEXT NOT NULL CHECK(title_deed_status IN ('pending', 'processed', 'issued')) DEFAULT 'pending',
        title_deed_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_property_id) REFERENCES parent_properties(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);

    // Property Costs (Survey, Legal, etc.)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS property_costs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_property_id INTEGER,
        land_id INTEGER,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        is_approved INTEGER DEFAULT 0,
        approved_by INTEGER,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_property_id) REFERENCES parent_properties(id),
        FOREIGN KEY (land_id) REFERENCES lands(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      )
    `);

    // Sales table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        land_id INTEGER,
        customer_id INTEGER,
        total_price REAL NOT NULL,
        paid_amount REAL NOT NULL DEFAULT 0,
        is_approved INTEGER DEFAULT 0,
        approved_by INTEGER,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (land_id) REFERENCES lands(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      )
    `);

    // Payments table (Transactions)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('received', 'made')),
        amount REAL NOT NULL,
        method TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        reference_id INTEGER,
        reference_type TEXT,
        transaction_ref TEXT,
        reference_number TEXT,
        is_approved INTEGER DEFAULT 0,
        approved_by INTEGER,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        FOREIGN KEY (approved_by) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Receipts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_number TEXT UNIQUE NOT NULL,
        payment_id INTEGER,
        status TEXT NOT NULL CHECK(status IN ('pending', 'official')) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payments(id)
      )
    `);

    // Documents table – stores uploaded blobs securely
    await connection.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        type TEXT NOT NULL CHECK(type IN ('idDocument', 'officialDocs', 'receipt', 'agreement', 'proofOfAddress', 'saleAgreement', 'kraCert', 'passportPhoto', 'titleDeed')),
        file_blob BLOB NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);

    // Expenses table (Company Operations)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        is_approved INTEGER DEFAULT 0,
        approved_by INTEGER,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        operator_id INTEGER,
        FOREIGN KEY (approved_by) REFERENCES users(id),
        FOREIGN KEY (operator_id) REFERENCES users(id)
      )
    `);

    // Inventory table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        unit_price REAL NOT NULL DEFAULT 0,
        category TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Debts & Payables (Vendor liabilities / land owners)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS debts_payables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        creditor_name TEXT NOT NULL,
        description TEXT,
        total_amount REAL NOT NULL DEFAULT 0,
        paid_amount REAL NOT NULL DEFAULT 0,
        balance REAL NOT NULL DEFAULT 0,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        payment_method TEXT,
        status TEXT DEFAULT 'pending'
      )
    `);

    // Payroll table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payroll (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_name TEXT NOT NULL,
        month_year TEXT NOT NULL,
        basic REAL NOT NULL DEFAULT 0,
        commission REAL NOT NULL DEFAULT 0,
        transport REAL NOT NULL DEFAULT 0,
        deductions REAL NOT NULL DEFAULT 0,
        gross_amount REAL NOT NULL DEFAULT 0,
        net_amount REAL NOT NULL DEFAULT 0,
        reporting_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_paid INTEGER DEFAULT 0,
        paid_date DATETIME,
        paid_method TEXT
      )
    `);

    // Salary Payments table (Disbursements)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS salary_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payroll_id INTEGER,
        staff_name TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL,
        transaction_ref TEXT,
        payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_approved INTEGER DEFAULT 0,
        approved_by INTEGER,
        created_by INTEGER,
        FOREIGN KEY (payroll_id) REFERENCES payroll(id),
        FOREIGN KEY (approved_by) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Petty Cash table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS petty_cash (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        type TEXT NOT NULL CHECK(type IN ('debit', 'credit')),
        description TEXT NOT NULL,
        ref_number TEXT,
        amount REAL NOT NULL DEFAULT 0
      )
    `);

    console.log('Database schema initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

export default pool;

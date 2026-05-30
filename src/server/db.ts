import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export const dbInit = async () => {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL');
    
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'reception', 'field')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Parent Properties (Main Land)
    await client.query(`
      CREATE TABLE IF NOT EXISTS parent_properties (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        total_size TEXT NOT NULL,
        ownership_status TEXT NOT NULL DEFAULT 'partial', -- partial, fully_owned
        buying_price NUMERIC NOT NULL DEFAULT 0,
        amount_paid_to_seller NUMERIC NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Lands/Plots table (Subdivisions)
    await client.query(`
      CREATE TABLE IF NOT EXISTS lands (
        id SERIAL PRIMARY KEY,
        parent_property_id INTEGER REFERENCES parent_properties(id),
        plot_number TEXT UNIQUE NOT NULL,
        location TEXT NOT NULL,
        size TEXT NOT NULL,
        acquisition_type TEXT NOT NULL CHECK (acquisition_type IN ('purchase', 'owned')),
        status TEXT NOT NULL CHECK (status IN ('available', 'reserved', 'sold', 'pending')),
        total_cost NUMERIC NOT NULL DEFAULT 0, -- Selling price
        paid_amount NUMERIC NOT NULL DEFAULT 0,
        customer_id INTEGER,
        title_deed_status TEXT NOT NULL DEFAULT 'pending', -- pending, processed, issued
        title_deed_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Additional Costs (Survey, Legal, etc.)
    await client.query(`
      CREATE TABLE IF NOT EXISTS property_costs (
        id SERIAL PRIMARY KEY,
        parent_property_id INTEGER REFERENCES parent_properties(id),
        land_id INTEGER REFERENCES lands(id),
        category TEXT NOT NULL, -- survey, legal, subdivision, title_processing
        amount NUMERIC NOT NULL,
        description TEXT,
        is_approved BOOLEAN DEFAULT FALSE,
        approved_by INTEGER REFERENCES users(id),
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Customers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT NOT NULL,
        id_number TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sales table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        land_id INTEGER REFERENCES lands(id),
        customer_id INTEGER REFERENCES customers(id),
        total_price NUMERIC NOT NULL,
        paid_amount NUMERIC NOT NULL DEFAULT 0,
        is_approved BOOLEAN DEFAULT FALSE,
        approved_by INTEGER REFERENCES users(id),
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Payments table (Transactions)
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('received', 'made')),
        amount NUMERIC NOT NULL,
        method TEXT NOT NULL, -- cash, mpesa, bank
        category TEXT NOT NULL,
        description TEXT,
        reference_id INTEGER,
        reference_type TEXT,
        transaction_ref TEXT, -- M-Pesa code etc
        is_approved BOOLEAN DEFAULT FALSE,
        approved_by INTEGER REFERENCES users(id),
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id)
      )
    `);

    // Receipts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id SERIAL PRIMARY KEY,
        receipt_number TEXT UNIQUE NOT NULL,
        payment_id INTEGER REFERENCES payments(id),
        status TEXT NOT NULL DEFAULT 'pending', -- pending, official
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Documents table for storing uploaded blobs
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        type TEXT NOT NULL CHECK (type IN ('saleAgreement','idDocument','kraCert','passportPhoto','titleDeed')),
        blob BYTEA NOT NULL,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Expenses table (Company Operations)
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL, -- rent, salary, transport, utilities
        amount NUMERIC NOT NULL,
        description TEXT,
        is_approved BOOLEAN DEFAULT FALSE,
        approved_by INTEGER REFERENCES users(id),
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        operator_id INTEGER REFERENCES users(id)
      )
    `);

    // Inventory table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        unit_price NUMERIC NOT NULL DEFAULT 0,
        category TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Debts & Payables (Vendor liabilities / land owners)
    await client.query(`
      CREATE TABLE IF NOT EXISTS debts_payables (
        id SERIAL PRIMARY KEY,
        creditor_name TEXT NOT NULL,
        description TEXT,
        total_amount NUMERIC NOT NULL DEFAULT 0,
        paid_amount NUMERIC NOT NULL DEFAULT 0,
        balance NUMERIC NOT NULL DEFAULT 0,
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        payment_method TEXT,
        status TEXT DEFAULT 'pending'
      )
    `);

    // Payroll Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payroll (
        id SERIAL PRIMARY KEY,
        staff_name TEXT NOT NULL,
        month_year TEXT NOT NULL,
        basic NUMERIC NOT NULL DEFAULT 0,
        commission NUMERIC NOT NULL DEFAULT 0,
        transport NUMERIC NOT NULL DEFAULT 0,
        deductions NUMERIC NOT NULL DEFAULT 0,
        gross_amount NUMERIC NOT NULL DEFAULT 0,
        net_amount NUMERIC NOT NULL DEFAULT 0,
        reporting_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Petty Cash Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS petty_cash (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        type TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
        description TEXT NOT NULL,
        ref_number TEXT,
        amount NUMERIC NOT NULL DEFAULT 0
      )
    `);

    // --- MIGRATIONS ---
    // Ensure existing lands tables have all columns used by current subdivision flows.
    await client.query(`DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lands' AND column_name='parent_property_id') THEN
        ALTER TABLE lands ADD COLUMN parent_property_id INTEGER REFERENCES parent_properties(id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lands' AND column_name='paid_amount') THEN
        ALTER TABLE lands ADD COLUMN paid_amount NUMERIC NOT NULL DEFAULT 0;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lands' AND column_name='customer_id') THEN
        ALTER TABLE lands ADD COLUMN customer_id INTEGER;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lands' AND column_name='title_deed_status') THEN
        ALTER TABLE lands ADD COLUMN title_deed_status TEXT NOT NULL DEFAULT 'pending';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lands' AND column_name='title_deed_url') THEN
        ALTER TABLE lands ADD COLUMN title_deed_url TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lands' AND column_name='updated_at') THEN
        ALTER TABLE lands ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      END IF;
    END $$;`);
    const tablesToMigrate = ['sales', 'payments', 'expenses', 'property_costs'];
    for (const table of tablesToMigrate) {
      // Add is_approved
      await client.query(`
        DO $$ 
        BEGIN 
          BEGIN
            ALTER TABLE ${table} ADD COLUMN is_approved BOOLEAN DEFAULT FALSE;
          EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column is_approved already exists in ${table}.';
          END;
        END $$;
      `);
      
      // Add approved_by
      await client.query(`
        DO $$ 
        BEGIN 
          BEGIN
            ALTER TABLE ${table} ADD COLUMN approved_by INTEGER REFERENCES users(id);
          EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column approved_by already exists in ${table}.';
          END;
        END $$;
      `);
    }

    client.release();
    console.log('Database schema initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

export default pool;

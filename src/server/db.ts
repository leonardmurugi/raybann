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
      )
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

    client.release();
    console.log('Database schema initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

export default pool;

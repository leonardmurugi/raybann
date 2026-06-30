import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.DATABASE_URL;
const dbAuthToken = process.env.DATABASE_AUTH_TOKEN;

if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const client = createClient({ url: dbUrl, authToken: dbAuthToken });

const tables = [
  'payments', 'sales', 'property_costs', 'receipts',
  'lands', 'parent_properties', 'payroll', 'salary_payments',
  'debts_payables', 'petty_cash', 'customers', 'inventory', 'documents'
];

async function wipe() {
  for (const table of tables) {
    try {
      const result = await client.execute(`DELETE FROM ${table}`);
      console.log(`✓ ${table}: ${result.rowsChanged || 0} rows deleted`);
    } catch (err: any) {
      console.log(`✗ ${table}: ${err.message}`);
    }
  }
  console.log('\nDone. Run `npm run dev` to restart the server.');
}

wipe().catch(console.error);

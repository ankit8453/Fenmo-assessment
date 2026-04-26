import 'dotenv/config';
import dotenv from 'dotenv';
import { sql } from '@vercel/postgres';

// Ensure .env.local is loaded (vercel env pull writes there by default).
dotenv.config({ path: '.env.local' });

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error('ERROR: POSTGRES_URL is not set. Run `vercel env pull .env.local` first.');
    console.error('Available DB-related env vars:',
      Object.keys(process.env)
        .filter((k) => /POSTGRES|DATABASE|PG/.test(k))
        .join(', ') || '(none)');
    process.exit(1);
  }

  try {
    const masked = process.env.POSTGRES_URL.replace(/:[^:@]+@/, ':***@');
    console.log('Using POSTGRES_URL:', masked);

    console.log('Creating expenses table...');
    await sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
        category TEXT NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        idempotency_key TEXT UNIQUE
      );
    `;
    console.log('  expenses table ready.');

    console.log('Creating idx_expenses_date...');
    await sql`CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (date DESC);`;
    console.log('  idx_expenses_date ready.');

    console.log('Creating idx_expenses_category...');
    await sql`CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category);`;
    console.log('  idx_expenses_category ready.');

    console.log('Database initialization complete.');
    process.exit(0);
  } catch (err) {
    console.error('Database initialization failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

main();

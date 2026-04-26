import { sql } from './_lib/db.js';

export default async function handler(req, res) {
  const time = new Date().toISOString();
  try {
    await sql`SELECT 1 as test`;
    res.status(200).json({ status: 'ok', time, db: 'connected' });
  } catch (err) {
    res.status(200).json({
      status: 'error',
      time,
      db: 'disconnected',
      error: err.message,
    });
  }
}

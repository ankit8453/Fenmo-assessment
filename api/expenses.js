import { v4 as uuidv4 } from 'uuid';
import { sql } from './_lib/db.js';
import { validateExpense } from './_lib/validation.js';

const MIN_KEY_LEN = 8;
const MAX_KEY_LEN = 200;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Step A — parse body safely
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Request body must be valid JSON' });
    }

    // Step B — read idempotency key (optional)
    const rawKey = req.headers['idempotency-key'];
    let clientProvidedKey = false;
    let idempotencyKey;
    if (rawKey !== undefined) {
      if (typeof rawKey !== 'string' || rawKey.length < MIN_KEY_LEN || rawKey.length > MAX_KEY_LEN) {
        return res.status(400).json({ error: 'Invalid Idempotency-Key header' });
      }
      clientProvidedKey = true;
      idempotencyKey = rawKey;
    } else {
      idempotencyKey = uuidv4();
    }

    // Step C — validate input
    const result = validateExpense(body);
    if (!result.valid) {
      return res.status(400).json({ error: 'Validation failed', details: result.errors });
    }
    const { amount, category, description, date } = result.normalized;

    // Step D — replay path: client retrying with a key we've seen before
    if (clientProvidedKey) {
      const existing = await sql`
        SELECT id, amount, category, description,
               to_char(date, 'YYYY-MM-DD') AS date, created_at
        FROM expenses
        WHERE idempotency_key = ${idempotencyKey}
        LIMIT 1
      `;
      if (existing.rows.length > 0) {
        res.setHeader('Idempotent-Replay', 'true');
        return res.status(200).json(serializeRow(existing.rows[0]));
      }
    }

    // Step E — insert
    const id = uuidv4();
    try {
      const inserted = await sql`
        INSERT INTO expenses (id, amount, category, description, date, idempotency_key)
        VALUES (${id}, ${amount}, ${category}, ${description}, ${date}, ${idempotencyKey})
        RETURNING id, amount, category, description,
                  to_char(date, 'YYYY-MM-DD') AS date, created_at
      `;
      return res.status(201).json(serializeRow(inserted.rows[0]));
    } catch (err) {
      // Step F — race: a concurrent request inserted the same idempotency_key first.
      if (err && err.code === '23505') {
        const replay = await sql`
          SELECT id, amount, category, description,
                 to_char(date, 'YYYY-MM-DD') AS date, created_at
          FROM expenses
          WHERE idempotency_key = ${idempotencyKey}
          LIMIT 1
        `;
        if (replay.rows.length > 0) {
          res.setHeader('Idempotent-Replay', 'true');
          return res.status(200).json(serializeRow(replay.rows[0]));
        }
      }
      throw err;
    }
  } catch (err) {
    // Step G — generic error handling: never leak internals
    console.error('POST /api/expenses failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function serializeRow(row) {
  return {
    id: row.id,
    amount: typeof row.amount === 'string' ? row.amount : String(row.amount),
    category: row.category,
    description: row.description,
    date: row.date,
    created_at: row.created_at,
  };
}

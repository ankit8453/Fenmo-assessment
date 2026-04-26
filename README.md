# Expense Tracker

## Live URL

## Tech Stack

- React (Vite) + Tailwind CSS v3 for the frontend
- Node.js serverless functions in `/api` (Vercel-style)
- Vercel Postgres (Neon-backed) for persistence

## Local Setup

1. `npm install`
2. `vercel env pull .env.local` — pulls `POSTGRES_URL` and other env vars from the Vercel project
3. `npm run db:init` — creates the `expenses` table and indexes (safe to re-run)
4. `npm run dev` — starts the Vite dev server

## API Endpoints

### `POST /api/expenses`

Create a new expense.

**Headers**

- `Content-Type: application/json` (required)
- `Idempotency-Key: <string, 8–200 chars>` (optional, but recommended) — see note below

**Body**

```json
{
  "amount": 12.50,
  "category": "Food",
  "description": "Lunch with team",
  "date": "2026-04-25"
}
```

`description` is optional; all other fields are required.

**Response codes**

- `201 Created` — expense was inserted; body contains the new row.
- `200 OK` with `Idempotent-Replay: true` header — the supplied `Idempotency-Key` matched a prior request; the server returned the **original** stored row (not the new payload).
- `400 Bad Request` — invalid JSON, invalid `Idempotency-Key`, or `{ error: "Validation failed", details: [...] }`.
- `405 Method Not Allowed` — wrong HTTP method (POST only here for now).
- `500 Internal Server Error` — unexpected server failure.

**Idempotency note**: when a client supplies an `Idempotency-Key`, the server stores it under a `UNIQUE` constraint. Any subsequent POST with the same key short-circuits and returns the original row, regardless of whether the new body matches. This makes the endpoint safe against double-clicks, page refreshes, and network retries.

## Data Model

`expenses` table:

| Column            | Type              | Notes                                                         |
| ----------------- | ----------------- | ------------------------------------------------------------- |
| `id`              | `TEXT PRIMARY KEY`| UUID generated in the app layer                               |
| `amount`          | `NUMERIC(12, 2)`  | NOT NULL, `CHECK (amount > 0)` — money stored as exact decimal|
| `category`        | `TEXT`            | NOT NULL — category label (e.g. Food, Travel)                 |
| `description`     | `TEXT`            | Optional free-text description                                |
| `date`            | `DATE`            | NOT NULL — the date the expense occurred                      |
| `created_at`      | `TIMESTAMPTZ`     | NOT NULL DEFAULT NOW() — server insert timestamp              |
| `idempotency_key` | `TEXT UNIQUE`     | Used to make POSTs safely retryable                           |

Indexes:

- `idx_expenses_date` on `(date DESC)` — fast newest-first listing
- `idx_expenses_category` on `(category)` — fast category filtering

## Key Design Decisions

- **Idempotency**: clients send an `Idempotency-Key` header (UUID); the server stores it with a `UNIQUE` constraint and returns the original response on retry. This prevents duplicate expenses from double-clicks, page refreshes, and network retries.
- **Money handling**: amounts are stored as `NUMERIC(12,2)` in Postgres and returned as strings to clients to preserve exact decimal precision and avoid floating-point errors.

## Trade-offs Made

## What I Did Not Do

## What I'd Improve With More Time

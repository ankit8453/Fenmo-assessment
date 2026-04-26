# Expense Tracker

## Live URL

## Tech Stack

- React (Vite) + Tailwind CSS v3 for the frontend (indigo accent palette, Inter typography, currency-aware inputs)
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
- `405 Method Not Allowed` — wrong HTTP method.
- `500 Internal Server Error` — unexpected server failure.

**Idempotency note**: when a client supplies an `Idempotency-Key`, the server stores it under a `UNIQUE` constraint. Any subsequent POST with the same key short-circuits and returns the original row, regardless of whether the new body matches. This makes the endpoint safe against double-clicks, page refreshes, and network retries.

### `GET /api/expenses`

List expenses with optional filtering and sorting, plus a server-computed total.

**Query parameters**

- `category` (optional) — exact-match filter on the `category` column. Must be a non-empty string of 50 characters or fewer.
- `sort` (optional) — currently accepts `date_desc` (orders by `date DESC, created_at DESC`). Any other value falls back to the default of `created_at DESC` (newest insert first).

**Response (200)**

```json
{
  "expenses": [
    {
      "id": "14d91ac1-114b-47a3-a65f-9e5692b67773",
      "amount": "25.00",
      "category": "Travel",
      "description": "Taxi",
      "date": "2026-04-26",
      "created_at": "2026-04-26T10:06:35.821Z"
    }
  ],
  "total": "25.00",
  "count": 1,
  "filters": { "category": "Travel", "sort": "default" }
}
```

`amount` and `total` are returned as strings to preserve `NUMERIC` precision. `total` is `"0.00"` when the result set is empty.

**Response codes**

- `200 OK` — success.
- `400 Bad Request` — `{ error: "Invalid category parameter" }` if `category` is empty/whitespace or > 50 chars.
- `500 Internal Server Error` — unexpected server failure.

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

- **Idempotency**: clients send an `Idempotency-Key` header (UUID); the server stores it with a `UNIQUE` constraint and returns the original response on retry. This prevents duplicate expenses from double-clicks, page refreshes, and network retries. The key is visually surfaced in the form during submission and after success — shown truncated (first 8 / last 4 characters) and labeled as a "Retry" when an in-flight key is reused after a previous failure. This makes the retry protection visible to users and reviewers without needing developer tools.
- **Money handling**: amounts are stored as `NUMERIC(12,2)` in Postgres and returned as strings to clients to preserve exact decimal precision and avoid floating-point errors.
- **Server-computed totals**: the list total is calculated via SQL `SUM(amount)` on the `NUMERIC` column to preserve exact precision; returned as a string for the same reason.
- **Server-side filter and sort**: filtering (`?category`) and sorting (`?sort`) happen via query params on `GET /api/expenses`. The frontend is stateless about the filtered set — it always trusts the server. This avoids client/server drift and keeps the (server-computed) total accurate. Available filter categories in the UI are derived from the currently-fetched expense set.
- **Total formatting**: total is computed server-side and returned as a string by the API. The frontend formats it with Indian locale conventions (`en-IN`) for display, but the source of truth remains the API string to avoid float precision loss.
- **UX states**: form and list both handle loading, error, empty, and success states explicitly. Network failures and server errors show distinct user-facing messages. New rows are briefly highlighted on creation as a visual confirmation, and filter/sort refetches dim the existing table instead of flashing a full loader.
- **Category input**: a predefined dropdown with an "Other" fallback for custom values. This prevents common data-quality issues like "Food" vs "Foods" while still allowing flexibility. The backend remains permissive (any non-empty string up to 50 chars) so historical data stays valid and frontend constraints can evolve independently.
- **Validation**: identical rules run on both client (inline UX feedback per field, on blur and on submit) and server (authoritative). The server is the source of truth — the client copy exists purely to give the user faster feedback. Errors only display after a field is blurred or after a submit attempt.
- **Visual design**: indigo accent on neutral grays — restrained palette to keep focus on data, not chrome. Amounts use `tabular-nums` and a muted ₹ symbol for clean number alignment in the table.

## Trade-offs Made

- **Duplicated validation logic**: `src/lib/validation.js` is a copy of `api/_lib/validation.js`. Vercel serverless functions don't share modules with the Vite build, and a shared package would be over-engineered for a project this size. The duplication is documented at the top of the client copy. For a larger codebase this would move to a shared workspace package (e.g. `packages/validation`).

## What I Did Not Do

## What I'd Improve With More Time

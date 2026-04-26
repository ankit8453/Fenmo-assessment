# Expense Tracker

## Live URL

https://fenmo-assessment-virid.vercel.app/

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
- **Visual design**: emerald accent palette on neutral grays — restrained to keep focus on data, not chrome. Amounts use `tabular-nums` and a muted ₹ symbol for clean number alignment.
- **Layout**: side-by-side at desktop widths (form sticky on the left, list scrollable on the right), falling back to a single-column stack on mobile. The expense list uses card-style rows instead of a traditional table for a more product-feel, and a "Spending by category" mini visualization above the list shows distribution at a glance whenever there are at least two categories.

## Trade-offs Made

- **Duplicated validation logic**: `src/lib/validation.js` is a copy of `api/_lib/validation.js`. Vercel serverless functions don't share modules with the Vite build, and a shared package would be over-engineered for a project this size. The duplication is documented at the top of the client copy. For a larger codebase this would move to a shared workspace package (e.g. `packages/validation`).

## What I Did Not Do

- Did not build edit/delete endpoints or UI. They are outside the acceptance criteria. The data model and indexes support both trivially, but the UI layer would need confirmation flows and additional state handling.
- Did not add user accounts or authentication. The brief describes single-user expense recording, so multi-user support and auth were out of scope.
- Did not add automated tests. The validation utility, the idempotency replay path, and the total calculation are the highest-value targets for tests. I prioritized shipping correct, well-handled features over a partial test suite under the timebox. With more time I would add Jest tests for `validateExpense` (boundary cases) and integration tests for the POST endpoint covering the idempotency replay and the unique-violation race.
- Did not add a separate per-category summary view. The "Spending by category" mini panel above the list is a lightweight take on the brief's "summary view" Nice-to-Have without committing to a full reporting screen.
- Did not add a charting library. The horizontal bar visualization is implemented with plain divs and Tailwind. Recharts or Chart.js would be overkill for a small per-category visualization and would add bundle weight.
- Did not add toast notifications or a global notification system. Inline success and error messages near the form and list are sufficient and don't pull the user's attention away from their current task.
- Did not add an ORM (Prisma, Drizzle). For a single table with two queries, raw parameterized SQL via the Postgres tagged-template client is clearer and has zero ramp-up.
- Did not add CSRF protection or rate limiting. Production code would; for a sandbox assessment with no auth and no public exposure beyond the candidate, neither adds meaningful security.
- Did not migrate to TypeScript. Plain JavaScript was faster for the timebox. The validation utility is well-typed via JSDoc.
- Did not add pagination. The list returns all expenses unfiltered. Fine for an assessment dataset of dozens of rows; would need cursor-based pagination at scale.
- Did not add optimistic UI updates on the list. After submitting, the list re-fetches from the server via a custom event. Optimistic updates would feel snappier but add complexity around reconciling with the server response, especially with idempotency replays returning the original row instead of the new payload.

## What I'd Improve With More Time

1. Add a test suite. Jest unit tests for `validateExpense` covering all boundary cases (negative amounts, future dates, decimal precision overflow), integration tests for the POST endpoint covering happy path + idempotency replay + unique-violation race, and an end-to-end Cypress test for the form-to-list flow.
2. Edit and delete operations with optimistic updates and undo. Soft-delete in the database to preserve history.
3. Pagination with cursor-based navigation and a virtualized list for large datasets.
4. A proper reporting view: trends over time, category breakdowns by month, cumulative spend, and a simple budget-vs-actual comparison.
5. CSV import and export.
6. Authentication (Clerk or NextAuth) and multi-user support, with row-level security in Postgres so each user only sees their own data.
7. Recurring expenses for subscriptions and monthly bills.
8. Multi-currency support, with a base currency and per-expense currency conversion.
9. A mobile app via React Native sharing the API.
10. Observability: structured logging, error reporting via Sentry, and lightweight analytics on submission failures and retries to detect real-world reliability issues.

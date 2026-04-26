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

## Trade-offs Made

## What I Did Not Do

## What I'd Improve With More Time

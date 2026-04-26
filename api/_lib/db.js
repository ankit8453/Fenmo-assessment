// Shared database client for /api routes.
// Uses @vercel/postgres which reads POSTGRES_URL from the environment.
import { sql } from '@vercel/postgres';

export { sql };

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

declare global {
  // Next.js reloads modules in development; without this the pool is
  // recreated on every edit until Postgres refuses new connections.
  var __oursnowPool: Pool | undefined;
}

/**
 * Why this does not throw when the connection string is missing.
 *
 * It used to. Throwing here happens while the module is being imported,
 * which means every page that touches the database fails before any of our
 * own code can catch it — the visitor gets an unexplained 500 and the
 * operator gets a stack trace with the cause buried in it. So a missing or
 * broken configuration becomes an ordinary connection failure at query
 * time, which the page can catch and the health check can name.
 */
export const dbConfigError: string | null = process.env.DATABASE_URL
  ? null
  : "DATABASE_URL is not set";

function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  const isLocal =
    !!url && (url.includes("localhost") || url.includes("127.0.0.1"));
  return new Pool({
    // A deliberately unreachable placeholder so the failure arrives as a
    // connection error rather than as a crash during import.
    connectionString: url ?? "postgresql://unconfigured.invalid:5432/none",
    ssl: !url || isLocal ? false : { rejectUnauthorized: true },
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

const pool = globalThis.__oursnowPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.__oursnowPool = pool;

export const db = drizzle(pool, { schema });
export { schema };

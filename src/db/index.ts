import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

declare global {
  // Next.js reloads modules in development; without this the pool is
  // recreated on every edit until Postgres refuses new connections.
  var __oursnowPool: Pool | undefined;
}

function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  return new Pool({
    connectionString: url,
    // Neon requires TLS; a local server generally does not offer it.
    ssl: url.includes("localhost") || url.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: true },
    max: 5,
    idleTimeoutMillis: 30_000,
  });
}

const pool = globalThis.__oursnowPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.__oursnowPool = pool;

export const db = drizzle(pool, { schema });
export { schema };

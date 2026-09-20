import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be provided");
}

export const pool = new Pool({
  // Keep the runtime connection configuration identical to drizzle.config.ts.
  // Supabase provides a complete PostgreSQL URL, including the pooler host when
  // applicable, so splitting it into POSTGRES_* variables is unnecessary.
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export * from "./schema";

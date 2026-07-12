import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const caPath = path.resolve(__dirname, "../../ca.pem");
const ca = fs.existsSync(caPath) ? fs.readFileSync(caPath, "utf-8") : undefined;

if (!ca) {
  throw new Error(
    "backend/ca.pem is missing. The database connection requires the Aiven CA certificate to verify TLS.",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    ca,
    rejectUnauthorized: true,
  },
});
export const db = drizzle(pool, { schema });

export * from "./schema";

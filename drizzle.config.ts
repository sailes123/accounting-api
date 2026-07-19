import 'dotenv/config';
import { defineConfig } from "drizzle-kit";
import fs from "fs";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const caPath = path.resolve(__dirname, "./ca.pem");
const ca = fs.existsSync(caPath)
  ? fs.readFileSync(caPath, "utf-8")
  : process.env.DATABASE_CA_CERT;

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  dialect: "postgresql",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    ssl: ca ? { ca, rejectUnauthorized: true } : undefined,
  },
});


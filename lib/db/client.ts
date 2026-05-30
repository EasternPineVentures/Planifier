import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  // Don't crash on import in environments without DB (e.g., lint).
  // Code paths that hit the DB will surface the missing var clearly.
  console.warn("[planifier] DATABASE_URL is not set");
}

const client = neon(url ?? "postgresql://invalid:invalid@localhost/invalid");
export const db = drizzle(client, { schema });
export { schema };

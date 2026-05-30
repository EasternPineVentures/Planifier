import "server-only";
import { auth } from "@clerk/nextjs/server";
import { db, schema } from "./client";
import { eq } from "drizzle-orm";

/**
 * Returns the Clerk user id, ensuring a matching row exists in `users`.
 * Used by all authenticated server actions / route handlers.
 */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("UNAUTHENTICATED");

  // Upsert-on-first-use. Cheap: ~1 SELECT, ~0 INSERT after first call.
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(schema.users).values({ id: userId }).onConflictDoNothing();
  }
  return userId;
}

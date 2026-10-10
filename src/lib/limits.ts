import { sql } from "drizzle-orm";
import { db } from "./db.js";
import { aiUsage } from "./schema.js";

// Returns true if the user is still under their daily limit for this kind of request.
export async function underDailyLimit(
  userId: string,
  kind: string,
  max: number
): Promise<boolean> {
  const day = `${kind}:${new Date().toISOString().slice(0, 10)}`;
  const [row] = await db
    .insert(aiUsage)
    .values({ userId, day, count: 1 })
    .onConflictDoUpdate({
      target: [aiUsage.userId, aiUsage.day],
      set: { count: sql`${aiUsage.count} + 1` },
    })
    .returning({ count: aiUsage.count });
  return row.count <= max;
}

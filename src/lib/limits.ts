import { sql } from "drizzle-orm";
import { db } from "./db.js";
import { aiUsage } from "./schema.js";
import { isGuestId } from "./auth.js";

// Demo guests can make up new ids, so they share ONE daily pool per kind of request.
// This caps total AI spend from the demo, no matter how many guest ids exist.
const GUEST_POOL = "guest-shared";
const GUEST_DAILY_CAPS: Record<string, number> = { guide: 40, summary: 15, profile: 60 };

// Returns true if the user is still under their daily limit for this kind of request.
export async function underDailyLimit(
  userId: string,
  kind: string,
  max: number
): Promise<boolean> {
  if (isGuestId(userId)) {
    userId = GUEST_POOL;
    max = GUEST_DAILY_CAPS[kind] ?? 20;
  }
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

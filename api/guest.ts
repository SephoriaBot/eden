import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, sql } from "drizzle-orm";
import { db } from "../src/lib/db.js";
import { plants } from "../src/lib/schema.js";
import { getUserId, isGuestId } from "../src/lib/auth.js";

// DELETE /api/guest wipes everything the calling demo guest created ("Exit demo").
// It only ever works for guest ids, never for real accounts.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = await getUserId(req);
  if (!isGuestId(userId)) return res.status(401).json({ error: "Unauthorized" });

  try {
    await db.delete(plants).where(eq(plants.userId, userId));
    try {
      await db.run(sql`DELETE FROM growing_spaces WHERE user_id = ${userId}`);
    } catch {
      // The growing_spaces table may not exist yet; nothing to wipe then.
    }
    return res.status(204).end();
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
}

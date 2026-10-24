import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, count, eq } from "drizzle-orm";
import { db } from "../src/lib/db.js";
import { pushSubscriptions } from "../src/lib/schema.js";
import { getUserId, isGuestId } from "../src/lib/auth.js";

const MAX_SUBSCRIPTIONS_PER_USER = 10;

function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

async function handle(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Not signed in" });

  // Demo visitors can't get notifications (their data is temporary).
  if (isGuestId(userId)) {
    return res
      .status(403)
      .json({ error: "Sign in to turn on plant reminders." });
  }

  const body = (req.body ?? {}) as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
  const endpoint = cleanString(body.endpoint, 2000);

  if (req.method === "POST") {
    const p256dh = cleanString(body.keys?.p256dh, 500);
    const auth = cleanString(body.keys?.auth, 500);
    if (!endpoint || !p256dh || !auth || !endpoint.startsWith("https://")) {
      return res.status(400).json({ error: "Invalid subscription" });
    }

    const [existing] = await db
      .select({ n: count() })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
    const [already] = await db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint)
        )
      );
    if (!already && existing.n >= MAX_SUBSCRIPTIONS_PER_USER) {
      return res.status(400).json({ error: "Too many devices registered." });
    }

    await db
      .insert(pushSubscriptions)
      .values({
        id: crypto.randomUUID(),
        userId,
        endpoint,
        p256dh,
        auth,
        createdAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { userId, p256dh, auth },
      });

    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    if (!endpoint) return res.status(400).json({ error: "Invalid request" });
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint)
        )
      );
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    return await handle(req, res);
  } catch (err) {
    console.error("push-subscription failed", err);
    return res
      .status(500)
      .json({ error: "Could not save reminder settings. Please try again." });
  }
}
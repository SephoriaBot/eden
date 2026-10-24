// api/care-push.ts
//
// Runs from Vercel Cron (see vercel.json). Sends each signed-in person ONE
// push when any of their plants is due or overdue for watering, even if
// Eden is closed. Sends nothing when no plants are due.
//
// Two cron entries (12:00 and 13:00 UTC) cover daylight saving; the code
// only does its work when it is 8am Eastern.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import webpush from "web-push";
import { db } from "../src/lib/db.js";
import { plants, pushSubscriptions } from "../src/lib/schema.js";

const TZ = "America/New_York";
const SEND_HOUR = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

function tzParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour") };
}

function dayNumber(d: Date): number {
  const p = tzParts(d);
  return Math.round(Date.UTC(p.y, p.m - 1, p.d) / DAY_MS);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    console.error("care-push: missing VAPID environment variables");
    return res.status(500).json({ error: "Not configured" });
  }

  // Only act at 8am Eastern (?force=1 skips this, for testing).
  const now = new Date();
  if (tzParts(now).h !== SEND_HOUR && req.query.force !== "1") {
    return res.status(200).json({ skipped: "not send hour" });
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const today = dayNumber(now);

  const subs = await db.select().from(pushSubscriptions);
  const byUser = new Map<string, typeof subs>();
  for (const s of subs) {
    byUser.set(s.userId, [...(byUser.get(s.userId) ?? []), s]);
  }

  let sent = 0;
  for (const [userId, userSubs] of byUser) {
    try {
      const userPlants = await db
        .select()
        .from(plants)
        .where(eq(plants.userId, userId));

      // Same rule as the care dashboard: watered before, and the next
      // watering day is today or earlier.
      const due = userPlants.filter((p) => {
        if (p.lastWateredAt == null) return false;
        const interval = p.recommendedWateringIntervalDays ?? 7;
        return dayNumber(new Date(p.lastWateredAt + interval * DAY_MS)) <= today;
      });
      if (due.length === 0) continue;

      const names = due.slice(0, 4).map((p) => p.name);
      const remaining = due.length - names.length;
      const payload = JSON.stringify({
        title: "Eden: plant care reminder",
        body:
          `${due.length} plant${due.length === 1 ? "" : "s"} due for watering: ` +
          names.join(", ") +
          (remaining > 0 ? ` and ${remaining} more.` : "."),
        tag: `eden-care-${today}`,
        url: "/",
      });

      for (const s of userSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          );
          sent++;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await db
              .delete(pushSubscriptions)
              .where(eq(pushSubscriptions.id, s.id));
          } else {
            console.error("care-push: send failed", status);
          }
        }
      }
    } catch (err) {
      console.error("care-push: failed for a user", err);
    }
  }

  return res.status(200).json({ users: byUser.size, sent });
}
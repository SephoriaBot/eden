import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../src/lib/db.js";
import { plants } from "../src/lib/schema.js";
import { getUserId } from "../src/lib/auth.js";

const MAX_PLANTS_PER_USER = 100;

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, max);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  const userId = await getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    if (req.method === "GET") {
      const rows = await db
        .select()
        .from(plants)
        .where(eq(plants.userId, userId))
        .orderBy(desc(plants.createdAt))
        .limit(MAX_PLANTS_PER_USER);
      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      const body = req.body ?? {};
      const name = cleanText(body.name, 80);
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const [{ total }] = await db
        .select({ total: count() })
        .from(plants)
        .where(eq(plants.userId, userId));
      if (total >= MAX_PLANTS_PER_USER) {
        return res.status(400).json({ error: "Plant limit reached" });
      }

      const row = {
        id: crypto.randomUUID(),
        userId,
        name,
        location: cleanText(body.location, 80),
        notes: cleanText(body.notes, 500),
        createdAt: Date.now(),
      };
      await db.insert(plants).values(row);
      return res.status(201).json(row);
    }

    if (req.method === "DELETE") {
      const id = typeof req.query.id === "string" ? req.query.id : null;
      if (!id) {
        return res.status(400).json({ error: "Missing id" });
      }
      // Scoped to the signed-in user, so nobody can delete another user's plant.
      await db
        .delete(plants)
        .where(and(eq(plants.id, id), eq(plants.userId, userId)));
      return res.status(204).end();
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
}

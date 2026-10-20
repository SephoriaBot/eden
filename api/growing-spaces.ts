
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@libsql/client";
import { getUserId } from "../src/lib/auth.js";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function ensureTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS growing_spaces (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      light TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader("Cache-Control", "no-store");

  const userId = await getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await ensureTable();

    if (req.method === "GET") {
      const result = await client.execute({
        sql: `SELECT id, name, type, light
              FROM growing_spaces
              WHERE user_id = ?
              ORDER BY created_at ASC`,
        args: [userId],
      });

      return res.status(200).json(result.rows);
    }

    if (req.method === "POST") {
      const body = req.body ?? {};
      const name =
        typeof body.name === "string" ? body.name.trim().slice(0, 70) : "";
      const type =
        typeof body.type === "string" ? body.type.trim().slice(0, 40) : "";
      const light = body.light;
      const validLights = ["low", "medium", "bright", "direct"];

      if (!name || !type || !validLights.includes(light)) {
        return res.status(400).json({ error: "Invalid growing space." });
      }

      const existing = await client.execute({
        sql: `SELECT id FROM growing_spaces
              WHERE user_id = ? AND name = ? AND type = ?`,
        args: [userId, name, type],
      });

      if (existing.rows.length > 0) {
        return res.status(409).json({
          error: "That growing space already exists.",
        });
      }

      const space = {
        id: crypto.randomUUID(),
        name,
        type,
        light,
      };

      await client.execute({
        sql: `INSERT INTO growing_spaces
              (id, user_id, name, type, light, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          space.id,
          userId,
          space.name,
          space.type,
          space.light,
          Date.now(),
        ],
      });

      return res.status(201).json(space);
    }

    if (req.method === "DELETE") {
      const id = typeof req.query.id === "string" ? req.query.id : "";

      if (!id) {
        return res.status(400).json({ error: "Missing space ID." });
      }

      await client.execute({
        sql: `DELETE FROM growing_spaces
              WHERE id = ? AND user_id = ?`,
        args: [id, userId],
      });

      return res.status(204).end();
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch {
    return res.status(500).json({ error: "Could not save growing spaces." });
  }
}

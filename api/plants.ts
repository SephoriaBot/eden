
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "../src/lib/db.js";
import { plants } from "../src/lib/schema.js";
import { getUserId } from "../src/lib/auth.js";

const MAX_PLANTS_PER_USER = 100;

const PLANT_CATEGORIES = [
  "flowering", "foliage", "succulent", "fern", "palm",
  "herb", "trailing", "cactus", "bulb", "tropical", "unknown",
] as const;

type PlantCategory = (typeof PLANT_CATEGORIES)[number];

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

async function ensureColumns() {
  for (const column of [
    sql`ALTER TABLE plants ADD COLUMN category TEXT`,
    sql`ALTER TABLE plants ADD COLUMN care_summary TEXT`,
  ]) {
    try {
      await db.run(column);
    } catch (error) {
      const message = (
        error instanceof Error ? error.message : String(error)
      ).toLowerCase();

      if (
        !message.includes("duplicate column") &&
        !message.includes("already exists")
      ) {
        throw error;
      }
    }
  }
}

async function classifyPlantNames(
  names: string[]
): Promise<Map<string, PlantCategory>> {
  const result = new Map<string, PlantCategory>();
  const key = process.env.GROQ_API_KEY;
  if (!key || names.length === 0) return result;

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          temperature: 0.1,
          max_completion_tokens: 1200,
          messages: [
            {
              role: "system",
              content: `Classify each plant by its most likely actual botanical type. Choose one category:
flowering, foliage, succulent, fern, palm, herb, trailing, cactus, bulb, tropical, unknown.
Prefer specific categories. Use unknown if uncertain.
Return only JSON: {"plants":[{"name":"exact original name","category":"category"}]}
Include every supplied name exactly once.`,
            },
            { role: "user", content: JSON.stringify({ names }) },
          ],
        }),
        signal: AbortSignal.timeout(12000),
      }
    );

    if (!response.ok) return result;

    const data: any = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return result;

    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start < 0 || end <= start) return result;

    const parsed = JSON.parse(content.slice(start, end + 1));
    if (!Array.isArray(parsed.plants)) return result;

    for (const item of parsed.plants) {
      if (
        typeof item?.name === "string" &&
        PLANT_CATEGORIES.includes(item.category)
      ) {
        result.set(nameKey(item.name), item.category as PlantCategory);
      }
    }
  } catch {
    // Plant saving still works if classification fails.
  }

  return result;
}

function cleanCareSummary(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Record<string, unknown>;
  const summary = {
    overview: cleanText(item.overview, 300),
    light: cleanText(item.light, 300),
    watering: cleanText(item.watering, 300),
    temperature: cleanText(item.temperature, 300),
  };

  if (!summary.overview && !summary.light && !summary.watering && !summary.temperature) {
    return null;
  }

  return JSON.stringify(summary);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader("Cache-Control", "no-store");

  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    await ensureColumns();

    if (req.method === "GET") {
      const rows = await db
        .select()
        .from(plants)
        .where(eq(plants.userId, userId))
        .orderBy(desc(plants.createdAt))
        .limit(MAX_PLANTS_PER_USER);

      const missing = rows.filter((plant) => !plant.category);
      if (missing.length > 0) {
        const categories = await classifyPlantNames(
          missing.map((plant) => plant.name)
        );

        for (const plant of missing) {
          const category = categories.get(nameKey(plant.name));
          if (!category) continue;

          await db.update(plants)
            .set({ category })
            .where(and(
              eq(plants.id, plant.id),
              eq(plants.userId, userId)
            ));

          plant.category = category;
        }
      }

      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      const body = req.body ?? {};
      const name = cleanText(body.name, 80);
      if (!name) return res.status(400).json({ error: "Name is required" });

      const [{ total }] = await db
        .select({ total: count() })
        .from(plants)
        .where(eq(plants.userId, userId));

      if (total >= MAX_PLANTS_PER_USER) {
        return res.status(400).json({ error: "Plant limit reached" });
      }

      const categories = await classifyPlantNames([name]);
      const row = {
        id: crypto.randomUUID(),
        userId,
        name,
        location: cleanText(body.location, 80),
        notes: cleanText(body.notes, 500),
        category: categories.get(nameKey(name)) ?? null,
        careSummary: null,
        createdAt: Date.now(),
      };

      await db.insert(plants).values(row);
      return res.status(201).json(row);
    }

    if (req.method === "PUT") {
      const id = typeof req.query.id === "string" ? req.query.id : null;
      if (!id) return res.status(400).json({ error: "Missing id" });

      const [existing] = await db.select().from(plants).where(
        and(eq(plants.id, id), eq(plants.userId, userId))
      ).limit(1);

      if (!existing) return res.status(404).json({ error: "Plant not found" });

      const body = req.body ?? {};
      const changes: Partial<typeof plants.$inferInsert> = {};

      if (typeof body.name === "string") {
        const name = cleanText(body.name, 80);
        if (!name) return res.status(400).json({ error: "Name is required" });

        changes.name = name;

        if (nameKey(name) !== nameKey(existing.name)) {
          const categories = await classifyPlantNames([name]);
          changes.category = categories.get(nameKey(name)) ?? null;
          changes.careSummary = null;
        }
      }

      if (body.careSummary !== undefined) {
        const summary = cleanCareSummary(body.careSummary);
        if (!summary) {
          return res.status(400).json({ error: "Invalid care summary" });
        }
        changes.careSummary = summary;
      }

      if (Object.keys(changes).length > 0) {
        await db.update(plants).set(changes).where(
          and(eq(plants.id, id), eq(plants.userId, userId))
        );
      }

      const [updated] = await db.select().from(plants).where(
        and(eq(plants.id, id), eq(plants.userId, userId))
      ).limit(1);

      return res.status(200).json(updated);
    }

    if (req.method === "DELETE") {
      const id = typeof req.query.id === "string" ? req.query.id : null;
      if (!id) return res.status(400).json({ error: "Missing id" });

      await db.delete(plants).where(
        and(eq(plants.id, id), eq(plants.userId, userId))
      );

      return res.status(204).end();
    }

    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
}

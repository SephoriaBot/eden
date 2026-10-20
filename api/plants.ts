
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

type PlantProfile = {
  category: PlantCategory;
  wateringIntervalDays: number;
};

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

function fallbackProfile(name: string): PlantProfile {
  const n = name.toLowerCase();

  const knownPlants: Array<[string[], PlantProfile]> = [
    [["snake plant", "mother-in-law's tongue", "zz plant"], {
      category: "foliage", wateringIntervalDays: 14,
    }],
    [["aloe", "jade plant", "echeveria", "haworthia"], {
      category: "succulent", wateringIntervalDays: 14,
    }],
    [["cactus"], {
      category: "cactus", wateringIntervalDays: 21,
    }],
    [["peace lily"], {
      category: "flowering", wateringIntervalDays: 5,
    }],
    [["spider plant"], {
      category: "trailing", wateringIntervalDays: 7,
    }],
    [["pothos", "philodendron", "monstera"], {
      category: "trailing", wateringIntervalDays: 7,
    }],
    [["fern", "maidenhair"], {
      category: "fern", wateringIntervalDays: 3,
    }],
    [["basil", "mint", "cilantro", "parsley"], {
      category: "herb", wateringIntervalDays: 2,
    }],
    [["orchid"], {
      category: "flowering", wateringIntervalDays: 7,
    }],
    [["lavender", "rosemary", "thyme"], {
      category: "herb", wateringIntervalDays: 7,
    }],
  ];

  for (const [names, profile] of knownPlants) {
    if (names.some((known) => n.includes(known))) return profile;
  }

  return { category: "unknown", wateringIntervalDays: 7 };
}

async function ensureColumns() {
  const statements = [
    sql`ALTER TABLE plants ADD COLUMN category TEXT`,
    sql`ALTER TABLE plants ADD COLUMN care_summary TEXT`,
    sql`ALTER TABLE plants ADD COLUMN watering_interval_days INTEGER NOT NULL DEFAULT 7`,
    sql`ALTER TABLE plants ADD COLUMN last_watered_at INTEGER`,
    sql`ALTER TABLE plants ADD COLUMN recommended_watering_interval_days INTEGER`,
    sql`ALTER TABLE plants ADD COLUMN watering_recommendation_version INTEGER NOT NULL DEFAULT 0`,
  ];

  for (const statement of statements) {
    try {
      await db.run(statement);
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

async function getPlantProfiles(
  names: string[]
): Promise<Map<string, PlantProfile>> {
  const result = new Map<string, PlantProfile>();

  for (const name of names) {
    result.set(nameKey(name), fallbackProfile(name));
  }

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
          max_completion_tokens: 1800,
          messages: [
            {
              role: "system",
              content: `For each supplied plant name, estimate its most likely plant category and a typical indoor watering interval in days.
Categories: flowering, foliage, succulent, fern, palm, herb, trailing, cactus, bulb, tropical, unknown.
Use 1 to 30 days. Base the interval on typical indoor care for the likely species, not a rigid schedule.
If the name is ambiguous, use category "unknown" and a conservative general estimate.
Return only JSON in this format:
{"plants":[{"name":"exact original name","category":"foliage","wateringIntervalDays":7}]}
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
      if (typeof item?.name !== "string") continue;
      if (!PLANT_CATEGORIES.includes(item.category)) continue;

      const days = Number(item.wateringIntervalDays);
      if (!Number.isInteger(days) || days < 1 || days > 30) continue;

      result.set(nameKey(item.name), {
        category: item.category as PlantCategory,
        wateringIntervalDays: days,
      });
    }
  } catch {
    // Use fallback recommendations if the model is unavailable.
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

  if (
    !summary.overview &&
    !summary.light &&
    !summary.watering &&
    !summary.temperature
  ) {
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

      const missing = rows.filter(
  (plant) => (plant.wateringRecommendationVersion ?? 0) < 1
);

      if (missing.length > 0) {
        const profiles = await getPlantProfiles(
          missing.map((plant) => plant.name)
        );

        for (const plant of missing) {
          const profile =
            profiles.get(nameKey(plant.name)) ??
            fallbackProfile(plant.name);

          await db.update(plants)
            .set({
              category: plant.category ?? profile.category,
              recommendedWateringIntervalDays:
                profile.wateringIntervalDays,
              wateringIntervalDays: profile.wateringIntervalDays, wateringRecommendationVersion: 1,
            })
            .where(and(
              eq(plants.id, plant.id),
              eq(plants.userId, userId)
            ));

          plant.category = plant.category ?? profile.category;
          plant.recommendedWateringIntervalDays =
            profile.wateringIntervalDays;
          plant.wateringIntervalDays = profile.wateringIntervalDays;
        }
      }

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

      const profiles = await getPlantProfiles([name]);
      const profile =
        profiles.get(nameKey(name)) ?? fallbackProfile(name);

      const row = {
        id: crypto.randomUUID(),
        userId,
        name,
        location: cleanText(body.location, 80),
        notes: cleanText(body.notes, 500),
        category: profile.category,
        careSummary: null,
        wateringIntervalDays: profile.wateringIntervalDays,
        recommendedWateringIntervalDays: profile.wateringIntervalDays, wateringRecommendationVersion: 1,
        lastWateredAt: null,
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

      if (!existing) {
        return res.status(404).json({ error: "Plant not found" });
      }

      const body = req.body ?? {};
      const changes: Partial<typeof plants.$inferInsert> = {};

      if (body.location !== undefined) {
  if (body.location !== null && typeof body.location !== "string") {
    return res.status(400).json({ error: "Invalid location" });
  }

  changes.location =
    body.location === null ? null : cleanText(body.location, 80);
}

      if (typeof body.name === "string") {
        const name = cleanText(body.name, 80);
        if (!name) {
          return res.status(400).json({ error: "Name is required" });
        }

        changes.name = name;

        if (nameKey(name) !== nameKey(existing.name)) {
          const profiles = await getPlantProfiles([name]);
          const profile =
            profiles.get(nameKey(name)) ?? fallbackProfile(name);

          changes.category = profile.category;
          changes.recommendedWateringIntervalDays =
            profile.wateringIntervalDays;
          changes.wateringIntervalDays = profile.wateringIntervalDays;
          changes.careSummary = null;
          changes.wateringRecommendationVersion = 1;
        }
      }

      if (body.careSummary !== undefined) {
        const summary = cleanCareSummary(body.careSummary);
        if (!summary) {
          return res.status(400).json({ error: "Invalid care summary" });
        }
        changes.careSummary = summary;
      }

      if (body.lastWateredAt !== undefined) {
        const timestamp = Number(body.lastWateredAt);
        if (!Number.isFinite(timestamp) || timestamp < 0) {
          return res.status(400).json({ error: "Invalid watering date" });
        }
        changes.lastWateredAt = timestamp;
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

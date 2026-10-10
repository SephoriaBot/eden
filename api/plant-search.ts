import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserId } from "../src/lib/auth.js";
import { underDailyLimit } from "../src/lib/limits.js";

const BASE = "https://perenual.com/api/v2";
// Perenual's free plan only returns details for species ids up to this number.
const MAX_FREE_ID = 3000;

// Perenual hides some fields behind paid plans with "Upgrade" text; treat those as missing.
function clean(v: unknown): string | null {
  return typeof v === "string" && v.trim() && !/upgrade/i.test(v) ? v : null;
}

function cleanList(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const items = v.filter((x) => typeof x === "string" && !/upgrade/i.test(x));
  return items.length ? (items as string[]) : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const key = process.env.PERENUAL_API_KEY;
  if (!key) return res.status(500).json({ error: "Server error: missing Perenual key" });

  try {
    if (!(await underDailyLimit(userId, "search", 60))) {
      return res.status(429).json({ error: "Daily search limit reached" });
    }

    const id = typeof req.query.id === "string" ? req.query.id : null;
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 60) : "";

    if (id) {
      if (!/^\d{1,6}$/.test(id)) {
        return res.status(400).json({ error: "Invalid id" });
      }
      if (Number(id) > MAX_FREE_ID) {
        return res
          .status(404)
          .json({ error: "Details for this plant aren't available. Try the AI guide." });
      }
      const r = await fetch(
        `${BASE}/species/details/${id}?key=${encodeURIComponent(key)}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!r.ok) {
        return res.status(502).json({ error: `Plant lookup failed (Perenual ${r.status})` });
      }
      const d: any = await r.json();
      return res.status(200).json({
        id: d.id,
        commonName: clean(d.common_name),
        scientificName: Array.isArray(d.scientific_name) ? d.scientific_name[0] ?? null : null,
        watering: clean(d.watering),
        sunlight: cleanList(d.sunlight),
        cycle: clean(d.cycle),
        careLevel: clean(d.care_level),
        description: clean(d.description),
      });
    }

    if (!q) return res.status(400).json({ error: "Missing search" });

    const r = await fetch(
      `${BASE}/species-list?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) {
      return res.status(502).json({ error: `Plant search failed (Perenual ${r.status})` });
    }
    const data: any = await r.json();
    const results = (Array.isArray(data.data) ? data.data : [])
      .filter((p: any) => typeof p.id === "number" && p.id <= MAX_FREE_ID)
      .slice(0, 8)
      .map((p: any) => ({
        id: p.id,
        commonName: clean(p.common_name),
        scientificName: Array.isArray(p.scientific_name) ? p.scientific_name[0] ?? null : null,
      }));
    return res.status(200).json(results);
  } catch {
    return res.status(500).json({ error: "Server error: could not reach Perenual" });
  }
}

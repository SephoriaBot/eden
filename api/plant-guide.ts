import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { getUserId } from "../src/lib/auth.js";
import { underDailyLimit } from "../src/lib/limits.js";
import { db } from "../src/lib/db.js";
import { plantGuides } from "../src/lib/schema.js";
import {
  CARE_PROMPT,
  FIX_PROMPT,
  askGroq,
  cleanText,
  isCompleteCareGuide,
  slugify,
} from "../src/lib/guide.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: "Server error: missing Groq key" });

  const mode = req.body?.mode === "troubleshoot" ? "troubleshoot" : "care";
  const plant = cleanText(req.body?.plant, 80);
  const problem = cleanText(req.body?.problem, 300);
  if (!plant) return res.status(400).json({ error: "Plant name is required" });
  if (mode === "troubleshoot" && !problem) {
    return res.status(400).json({ error: "Describe the problem" });
  }

  try {
    const slug = slugify(plant);

    // Care guides are the same for everyone, so check the saved copy first.
    // A saved guide costs nothing and doesn't count against the daily limit.
    if (mode === "care" && slug) {
      const [saved] = await db
        .select()
        .from(plantGuides)
        .where(eq(plantGuides.slug, slug))
        .limit(1);
      if (saved) {
        try {
          return res.status(200).json({ sections: JSON.parse(saved.sections) });
        } catch {
          // Bad saved row: fall through and regenerate.
        }
      }
    }

    if (!(await underDailyLimit(userId, "guide", 30))) {
      return res.status(429).json({ error: "Daily guide limit reached" });
    }

    const userMessage =
      mode === "troubleshoot"
        ? `Plant: ${plant}\nProblem: ${problem}`
        : `Plant: ${plant}\nGive me the full care guide.`;

    const result = await askGroq(
      mode === "troubleshoot" ? FIX_PROMPT : CARE_PROMPT,
      userMessage,
      key
    );
    if (!result.ok) return res.status(result.status).json({ error: result.error });

    // Save complete care guides so the next person gets it instantly.
    if (mode === "care" && slug && isCompleteCareGuide(result.sections)) {
      try {
        await db
          .insert(plantGuides)
          .values({
            slug,
            name: plant,
            sections: JSON.stringify(result.sections),
            source: "ai",
            createdAt: Date.now(),
          })
          .onConflictDoNothing();
      } catch {
        // Saving is best-effort; the user still gets their guide.
      }
    }

    return res.status(200).json({ sections: result.sections });
  } catch {
    return res.status(500).json({ error: "Server error: could not reach Groq" });
  }
}

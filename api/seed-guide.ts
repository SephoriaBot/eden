import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { plantGuides } from "../src/lib/schema.js";
import { CARE_PROMPT, askGroq, isCompleteCareGuide, slugify } from "../src/lib/guide.js";

// Add or remove plants here, then run the script again. Plants already saved are skipped.
const PLANTS = [
  // Foliage houseplants
  "Pothos", "Snake Plant", "Spider Plant", "Peace Lily", "Monstera",
  "ZZ Plant", "Rubber Plant", "Fiddle Leaf Fig", "Philodendron", "Chinese Evergreen",
  "Dracaena", "Parlor Palm", "Areca Palm", "Kentia Palm", "Boston Fern",
  "Bird's Nest Fern", "Staghorn Fern", "Prayer Plant", "Calathea", "Alocasia",
  "Dieffenbachia", "Croton", "Cast Iron Plant", "English Ivy", "Heartleaf Philodendron",
  "Umbrella Plant", "Norfolk Island Pine", "Yucca", "Dumb Cane", "Money Tree",
  "Tradescantia", "Peperomia", "Pilea", "Hoya", "Syngonium",
  "Bromeliad", "Air Plant", "Venus Flytrap", "Pitcher Plant", "Polka Dot Plant",
  // Succulents and cacti
  "Aloe Vera", "Jade Plant", "Echeveria", "String of Pearls", "Christmas Cactus",
  "Haworthia", "Burro's Tail", "Panda Plant", "Zebra Plant", "Hens and Chicks",
  "Barrel Cactus", "Prickly Pear", "Bunny Ear Cactus", "Easter Cactus", "Kalanchoe",
  "Lithops", "Agave", "Sedum", "String of Hearts", "Ponytail Palm",
  // Flowering houseplants
  "African Violet", "Orchid", "Anthurium", "Begonia", "Geranium",
  "Cyclamen", "Gloxinia", "Amaryllis", "Poinsettia", "Gardenia",
  "Jasmine", "Hibiscus", "Bougainvillea", "Lipstick Plant", "Oxalis",
  // Garden flowers
  "Rose", "Lavender", "Marigold", "Zinnia", "Sunflower",
  "Petunia", "Pansy", "Impatiens", "Cosmos", "Dahlia",
  "Tulip", "Daffodil", "Hyacinth", "Lily", "Peony",
  "Hydrangea", "Sweet Pea", "Nasturtium", "Snapdragon", "Black-Eyed Susan",
  "Coneflower", "Daylily", "Hosta", "Morning Glory", "Lilac",
  // Herbs
  "Basil", "Mint", "Rosemary", "Thyme", "Parsley",
  "Cilantro", "Chives", "Oregano", "Sage", "Dill",
  "Lemon Balm", "Lemongrass", "Tarragon", "Bay Laurel", "Catnip",
  // Vegetables
  "Tomato", "Pepper", "Lettuce", "Cucumber", "Zucchini",
  "Green Bean", "Pea", "Carrot", "Radish", "Spinach",
  "Kale", "Potato", "Onion", "Garlic", "Beet",
  "Broccoli", "Cabbage", "Eggplant", "Pumpkin", "Sweet Potato",
  "Corn", "Celery", "Swiss Chard", "Arugula", "Microgreens",
  // Fruit and edible shrubs
  "Strawberry", "Blueberry", "Raspberry", "Lemon Tree", "Fig Tree",
  "Avocado", "Grape", "Apple Tree", "Dwarf Citrus", "Blackberry",
];

const key = process.env.GROQ_API_KEY;
if (!key) throw new Error("Missing GROQ_API_KEY");

const db = drizzle(
  createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })
);

async function main() {
  let added = 0;
  for (const name of PLANTS) {
    const slug = slugify(name);
    const [exists] = await db
      .select({ slug: plantGuides.slug })
      .from(plantGuides)
      .where(eq(plantGuides.slug, slug))
      .limit(1);
    if (exists) {
      console.log(`skip   ${name}`);
      continue;
    }

    const result = await askGroq(CARE_PROMPT, `Plant: ${name}\nGive me the full care guide.`, key!);
    if (!result.ok) {
      console.log(`FAILED ${name} ${result.error}`);
      continue;
    }
    if (!isCompleteCareGuide(result.sections)) {
      console.log(`FAILED ${name} (incomplete guide)`);
      continue;
    }

    await db
      .insert(plantGuides)
      .values({
        slug,
        name,
        sections: JSON.stringify(result.sections),
        source: "seed",
        createdAt: Date.now(),
      })
      .onConflictDoNothing();
    added++;
    console.log(`saved  ${name}`);
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.log(`Done. Added ${added} guides.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

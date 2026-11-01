import { lookupPlantFacts } from "./plantProfiles";

// Works out a simple overview of a whole garden (light, watering and humidity
// groups, plus heads-up notes) from Eden's built-in plant knowledge. No AI.

export type GroupablePlant = {
  name: string;
  category: string | null;
  location: string | null;
  wateringIntervalDays: number;
};

export type Group = { title: string; hint: string; plants: string[] };

export type GardenOverview = {
  light: Group[];
  water: Group[];
  humidity: Group[];
  notes: string[];
  unknown: string[];
};

type LightKind = "dim" | "any" | "bright" | "sun";
type HumidityKind = "low" | "average" | "high";
type WaterKind = "often" | "mid" | "rare";

function lightKind(text: string): LightKind {
  if (/^low to bright/i.test(text)) return "any";
  if (/full sun|direct sun|some direct/i.test(text)) return "sun";
  if (/^low/i.test(text) || /^medium,/i.test(text)) return "dim";
  return "bright";
}

function humidityKind(text: string): HumidityKind {
  if (text === "Low") return "low";
  if (text === "High") return "high";
  return "average";
}

function waterKind(days: number): WaterKind {
  if (days <= 4) return "often";
  if (days <= 9) return "mid";
  return "rare";
}

function listNames(names: string[]): string {
  const shown = names.slice(0, 3).join(", ");
  const extra = names.length - 3;
  return extra > 0 ? `${shown} and ${extra} more` : shown;
}

const LIGHT_GROUPS: Array<[LightKind, string, string]> = [
  ["dim", "Low to medium light", "A dimmer room, or a few feet back from a window."],
  ["any", "Easygoing about light", "Fine in most spots."],
  ["bright", "Bright, indirect light", "Near a bright window, out of harsh midday sun."],
  ["sun", "Direct sun", "A sunny south or west window, or outdoors."],
];

const WATER_GROUPS: Array<[WaterKind, string, string]> = [
  ["often", "Every 1 to 4 days", "These dry out fast, so check them often."],
  ["mid", "Every 5 to 9 days", "A steady weekly rhythm works well."],
  ["rare", "Every 10 days or more", "Let the soil dry out between waterings."],
];

const HUMIDITY_GROUPS: Array<[HumidityKind, string, string]> = [
  ["high", "Likes humid air", "A bathroom, grouped together, or on a pebble tray."],
  ["average", "Average room humidity", "Normal indoor air is fine."],
  ["low", "Likes dry air", "Keep away from humid spots."],
];

export function summarizeGarden(plants: GroupablePlant[]): GardenOverview {
  const light = new Map<LightKind, string[]>();
  const water = new Map<WaterKind, string[]>();
  const humidity = new Map<HumidityKind, string[]>();
  const unknown: string[] = [];

  const push = <K,>(map: Map<K, string[]>, key: K, name: string) =>
    map.set(key, [...(map.get(key) ?? []), name]);

  const byLocation = new Map<
    string,
    { label: string; light: Map<LightKind, string[]>; humidity: Map<HumidityKind, string[]>; water: Map<WaterKind, string[]> }
  >();

  for (const p of plants) {
    const facts = lookupPlantFacts(p.name, p.category);
    const w = waterKind(p.wateringIntervalDays);
    push(water, w, p.name);

    let l: LightKind | null = null;
    let h: HumidityKind | null = null;

    if (facts) {
      l = lightKind(facts.light);
      h = humidityKind(facts.humidity);
      push(light, l, p.name);
      push(humidity, h, p.name);
    } else {
      unknown.push(p.name);
    }

    const label = p.location?.trim();
    if (label) {
      const key = label.toLowerCase();
      const entry =
        byLocation.get(key) ??
        { label, light: new Map(), humidity: new Map(), water: new Map() };
      push(entry.water, w, p.name);
      if (l) push(entry.light, l, p.name);
      if (h) push(entry.humidity, h, p.name);
      byLocation.set(key, entry);
    }
  }

  // Heads-up notes: only for plants the person put in the same spot.
  const notes: string[] = [];
  for (const entry of byLocation.values()) {
    const sun = entry.light.get("sun");
    const dim = entry.light.get("dim");
    if (sun && dim) {
      notes.push(
        `${entry.label}: sun lovers (${listNames(sun)}) share a spot with plants that prefer gentler light (${listNames(dim)}).`
      );
    }

    const humid = entry.humidity.get("high");
    const dry = entry.humidity.get("low");
    if (humid && dry) {
      notes.push(
        `${entry.label}: plants that like humid air (${listNames(humid)}) share a spot with plants that prefer dry air (${listNames(dry)}).`
      );
    }

    const thirsty = entry.water.get("often");
    const rare = entry.water.get("rare");
    if (thirsty && rare) {
      notes.push(
        `${entry.label}: plants that need frequent watering (${listNames(thirsty)}) share a spot with plants that should dry out between waterings (${listNames(rare)}). Water them separately.`
      );
    }
  }

  return {
    light: LIGHT_GROUPS.flatMap(([k, title, hint]) =>
      light.get(k) ? [{ title, hint, plants: light.get(k)! }] : []
    ),
    water: WATER_GROUPS.flatMap(([k, title, hint]) =>
      water.get(k) ? [{ title, hint, plants: water.get(k)! }] : []
    ),
    humidity: HUMIDITY_GROUPS.flatMap(([k, title, hint]) =>
      humidity.get(k) ? [{ title, hint, plants: humidity.get(k)! }] : []
    ),
    notes: notes.slice(0, 6),
    unknown,
  };
}

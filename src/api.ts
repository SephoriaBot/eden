

export type CareSummary = {
  overview: string;
  light: string;
  watering: string;
  temperature: string;
};

export type Plant = {
  id: string;
  name: string;
  location: string | null;
  notes: string | null;
  category: string | null;
  careSummary: string | null;
  wateringIntervalDays: number;
  recommendedWateringIntervalDays: number | null;
  lastWateredAt: number | null;
  createdAt: number;
};

export type GuideSection = {
  title: string;
  body: string;
};


type GetToken = () => Promise<string | null>;

// Demo mode: a random "guest_<32 hex>" id kept in this browser, used when nobody is signed in.
const GUEST_KEY = "eden:guest";
const GUEST_RE = /^guest_[0-9a-f]{32}$/;
let memoryGuest: string | null = null; // fallback if localStorage is blocked

export function getGuestToken(): string | null {
  try {
    const v = localStorage.getItem(GUEST_KEY);
    if (v && GUEST_RE.test(v)) return v;
  } catch {
    // ignore storage failures (e.g. private browsing)
  }
  return memoryGuest;
}

export function startGuest(): string {
  const token = getGuestToken() ?? `guest_${crypto.randomUUID().replace(/-/g, "")}`;
  memoryGuest = token;
  try {
    localStorage.setItem(GUEST_KEY, token);
  } catch {
    // ignore storage failures
  }
  return token;
}

// Forget the guest id on this device (data is left alone; used when someone signs in).
export function forgetGuest(): void {
  memoryGuest = null;
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch {
    // ignore storage failures
  }
}

// "Exit demo": wipe the guest's data on the server, then forget the id.
export async function exitGuest(): Promise<void> {
  const token = getGuestToken();
  if (token) {
    await fetch("/api/guest", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  forgetGuest();
}

async function request(
  getToken: GetToken,
  path: string,
  init: RequestInit = {}
) {
  // A signed-in user's token always wins; guests only apply when nobody is signed in.
  const token = (await getToken()) ?? getGuestToken();
  if (!token) throw new Error("Not signed in");

  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Request failed");
  }

  return res;
}

export async function listPlants(getToken: GetToken): Promise<Plant[]> {
  const res = await request(getToken, "/api/plants");
  return res.json();
}

export async function addPlant(
  getToken: GetToken,
  plant: { name: string; location: string; notes: string }
): Promise<Plant> {
  const res = await request(getToken, "/api/plants", {
    method: "POST",
    body: JSON.stringify(plant),
  });
  return res.json();
}

export async function updatePlant(
  getToken: GetToken,
  id: string,
  changes: {
  name?: string;
  location?: string | null;
  careSummary?: CareSummary;
  wateringIntervalDays?: number;
  lastWateredAt?: number;
}
): Promise<Plant> {
  const res = await request(
    getToken,
    `/api/plants?id=${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(changes),
    }
  );
  return res.json();
}

export async function deletePlant(
  getToken: GetToken,
  id: string
): Promise<void> {
  await request(getToken, `/api/plants?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function getCareGuide(
  getToken: GetToken,
  plant: string
): Promise<GuideSection[]> {
  const res = await request(getToken, "/api/plant-guide", {
    method: "POST",
    body: JSON.stringify({ mode: "care", plant }),
  });
  const data = await res.json();
  return data.sections;
}

export async function getTroubleshooting(
  getToken: GetToken,
  plant: string,
  problem: string
): Promise<GuideSection[]> {
  const res = await request(getToken, "/api/plant-guide", {
    method: "POST",
    body: JSON.stringify({ mode: "troubleshoot", plant, problem }),
  });
  const data = await res.json();
  return data.sections;
}

export async function getGardenSummary(
  getToken: GetToken
): Promise<GuideSection[]> {
  const res = await request(getToken, "/api/garden-summary", {
    method: "POST",
  });
  const data = await res.json();
  return data.sections;
}


export type GrowingSpace = {
  id: string;
  name: string;
  type: string;
  light: "low" | "medium" | "bright" | "direct";
};

export async function listGrowingSpaces(
  getToken: GetToken
): Promise<GrowingSpace[]> {
  const res = await request(getToken, "/api/growing-spaces");
  return res.json();
}

export async function addGrowingSpace(
  getToken: GetToken,
  space: Omit<GrowingSpace, "id">
): Promise<GrowingSpace> {
  const res = await request(getToken, "/api/growing-spaces", {
    method: "POST",
    body: JSON.stringify(space),
  });
  return res.json();
}

export async function deleteGrowingSpace(
  getToken: GetToken,
  id: string
): Promise<void> {
  await request(
    getToken,
    `/api/growing-spaces?id=${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

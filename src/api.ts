export type Plant = {
  id: string;
  name: string;
  location: string | null;
  notes: string | null;
  createdAt: number;
};

export type GuideSection = {
  title: string;
  body: string;
};

type GetToken = () => Promise<string | null>;

async function request(getToken: GetToken, path: string, init: RequestInit = {}) {
  const token = await getToken();
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

export async function deletePlant(getToken: GetToken, id: string): Promise<void> {
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

export async function getGardenSummary(getToken: GetToken): Promise<GuideSection[]> {
  const res = await request(getToken, "/api/garden-summary", { method: "POST" });
  const data = await res.json();
  return data.sections;
}

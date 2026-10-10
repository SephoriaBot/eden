export type Plant = {
  id: string;
  name: string;
  location: string | null;
  notes: string | null;
  createdAt: number;
};

export type PlantSearchResult = {
  id: number;
  commonName: string | null;
  scientificName: string | null;
};

export type PlantDetails = PlantSearchResult & {
  watering: string | null;
  sunlight: string[] | null;
  cycle: string | null;
  careLevel: string | null;
  description: string | null;
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

export async function searchPlants(
  getToken: GetToken,
  q: string
): Promise<PlantSearchResult[]> {
  const res = await request(getToken, `/api/plant-search?q=${encodeURIComponent(q)}`);
  return res.json();
}

export async function getPlantDetails(
  getToken: GetToken,
  id: number
): Promise<PlantDetails> {
  const res = await request(getToken, `/api/plant-search?id=${id}`);
  return res.json();
}

export async function askGuide(
  getToken: GetToken,
  plant: string,
  question: string
): Promise<string> {
  const res = await request(getToken, "/api/plant-guide", {
    method: "POST",
    body: JSON.stringify({ plant, question }),
  });
  const data = await res.json();
  return data.text;
}

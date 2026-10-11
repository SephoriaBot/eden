import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  askGuide,
  getPlantDetails,
  searchPlants,
  type PlantDetails,
  type PlantSearchResult,
} from "./api";

export default function PlantInfo({
  prefill,
}: {
  prefill: { text: string; n: number };
}) {
  const { getToken } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlantSearchResult[] | null>(null);
  const [details, setDetails] = useState<PlantDetails | null>(null);
  const [question, setQuestion] = useState("");
  const [guide, setGuide] = useState("");
  const [autoGuide, setAutoGuide] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function search(text: string) {
    const q = text.trim();
    if (!q) return;
    setBusy("search");
    setError("");
    setDetails(null);
    setGuide("");
    setAutoGuide(false);
    setResults(null);

    let found: PlantSearchResult[] = [];
    try {
      found = await searchPlants(getToken, q);
    } catch {
      found = [];
    }

    if (found.length > 0) {
      setResults(found);
      setBusy("");
      return;
    }

    // Nothing in the database (or it failed): let the AI guide answer instead.
    setBusy("guide");
    try {
      setGuide(await askGuide(getToken, q, ""));
      setAutoGuide(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    if (prefill.n > 0) {
      setQuery(prefill.text);
      search(prefill.text);
    }
  }, [prefill.n]);

  async function pick(id: number) {
    setBusy("details");
    setError("");
    try {
      setDetails(await getPlantDetails(getToken, id));
      setResults(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy("");
    }
  }

  async function ask() {
    const plant = details?.commonName || query.trim();
    if (!plant) return;
    setBusy("guide");
    setError("");
    setAutoGuide(false);
    try {
      setGuide(await askGuide(getToken, plant, question));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy("");
    }
  }

  const box: React.CSSProperties = {
    border: "1px solid #ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  };
  const input: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: 10,
    marginBottom: 8,
    fontSize: 16,
  };

  return (
    <section style={box}>
      <h2 style={{ marginTop: 0 }}>Plant info</h2>

      <input
        style={input}
        placeholder="Search a plant (e.g. rose, pothos)"
        value={query}
        maxLength={60}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button
        onClick={() => search(query)}
        disabled={busy !== "" || !query.trim()}
        style={{ padding: "10px 16px", fontSize: 16 }}
      >
        {busy === "search" ? "Searching..." : "Search"}
      </button>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {results && results.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {results.map((r) => (
            <li key={r.id} style={{ marginBottom: 6 }}>
              <button
                onClick={() => pick(r.id)}
                style={{ width: "100%", textAlign: "left", padding: 10, fontSize: 16 }}
              >
                {r.commonName || "Unnamed plant"}
                {r.scientificName ? ` (${r.scientificName})` : ""}
              </button>
            </li>
          ))}
        </ul>
      )}

      {busy === "details" && <p>Loading...</p>}
      {details && (
        <div style={{ margin: "12px 0" }}>
          <strong>{details.commonName || "Plant"}</strong>
          {details.scientificName && <div><em>{details.scientificName}</em></div>}
          {details.watering && <div>Watering: {details.watering}</div>}
          {details.sunlight && <div>Sunlight: {details.sunlight.join(", ")}</div>}
          {details.cycle && <div>Life cycle: {details.cycle}</div>}
          {details.careLevel && <div>Care level: {details.careLevel}</div>}
          {details.description && <p>{details.description}</p>}
        </div>
      )}

      <hr style={{ margin: "16px 0" }} />
      <h3 style={{ marginTop: 0 }}>AI plant guide</h3>
      {autoGuide && (
        <p style={{ fontSize: 14, opacity: 0.8 }}>
          Not in the plant database, so here's the AI guide's answer.
        </p>
      )}
      <input
        style={input}
        placeholder="Optional question (e.g. why are the leaves yellow?)"
        value={question}
        maxLength={300}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <button
        onClick={ask}
        disabled={busy !== "" || !(details?.commonName || query.trim())}
        style={{ padding: "10px 16px", fontSize: 16 }}
      >
        {busy === "guide" ? "Thinking..." : "Ask the guide"}
      </button>
      {guide && <p style={{ whiteSpace: "pre-wrap" }}>{guide}</p>}
      {guide && (
        <p style={{ fontSize: 13, opacity: 0.7 }}>
          AI-generated, so double-check anything important.
        </p>
      )}
    </section>
  );
}

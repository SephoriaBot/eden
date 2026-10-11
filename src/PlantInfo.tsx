import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  askGuide,
  getPlantDetails,
  searchPlants,
  type PlantDetails,
  type PlantSearchResult,
} from "./api";

const SECTION_TITLES = [
  "Overview",
  "Light",
  "Watering",
  "Soil and Containers",
  "Temperature and Humidity",
  "Feeding",
  "Pruning and Maintenance",
  "Common Problems",
  "Pet Safety",
  "Quick Tip",
  "Also worth knowing",
];

function GuideText({ text }: { text: string }) {
  const blocks: { title: string | null; lines: string[] }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const title = SECTION_TITLES.find(
      (t) => line.replace(/[:*#]/g, "").trim().toLowerCase() === t.toLowerCase()
    );
    if (title) {
      blocks.push({ title, lines: [] });
    } else {
      if (blocks.length === 0) blocks.push({ title: null, lines: [] });
      blocks[blocks.length - 1].lines.push(line);
    }
  }

  return (
    <div className="guide">
      {blocks.map((b, i) => (
        <div key={i} className={b.title === "Pet Safety" ? "pet" : undefined}>
          {b.title && <h4>{b.title}</h4>}
          {b.lines.map((l, j) => (
            <p key={j}>{l}</p>
          ))}
        </div>
      ))}
    </div>
  );
}

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

  return (
    <section className="card">
      <h2>Plant info</h2>

      <input
        className="field"
        placeholder="Search a plant (e.g. rose, pothos)"
        value={query}
        maxLength={60}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") search(query);
        }}
      />
      <button
        className="btn"
        onClick={() => search(query)}
        disabled={busy !== "" || !query.trim()}
      >
        {busy === "search" ? "Searching..." : "Search"}
      </button>

      {error && <div className="error">{error}</div>}

      {results && results.length > 0 && (
        <ul className="results">
          {results.map((r) => (
            <li key={r.id}>
              <button className="result-btn" onClick={() => pick(r.id)}>
                {r.commonName || "Unnamed plant"}
                {r.scientificName && <em> ({r.scientificName})</em>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {busy === "details" && <p className="hint">Loading...</p>}
      {details && (
        <div className="details">
          <h3>{details.commonName || "Plant"}</h3>
          {details.scientificName && <em>{details.scientificName}</em>}
          <div className="chips">
            {details.watering && (
              <span className="chip chip-water">Water: {details.watering}</span>
            )}
            {details.sunlight && (
              <span className="chip chip-sun">Sun: {details.sunlight.join(", ")}</span>
            )}
            {details.cycle && (
              <span className="chip chip-cycle">Cycle: {details.cycle}</span>
            )}
            {details.careLevel && (
              <span className="chip chip-care">Care: {details.careLevel}</span>
            )}
          </div>
          {details.description && <p>{details.description}</p>}
        </div>
      )}

      <hr className="divider" />

      <h3>AI plant guide</h3>
      {autoGuide && (
        <p className="hint">Not in the plant database, so here's the AI guide's answer.</p>
      )}
      <input
        className="field"
        placeholder="Optional question (e.g. why are the leaves yellow?)"
        value={question}
        maxLength={300}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <button
        className="btn"
        onClick={ask}
        disabled={busy !== "" || !(details?.commonName || query.trim())}
      >
        {busy === "guide" ? "Thinking..." : "Ask the guide"}
      </button>

      {guide && <GuideText text={guide} />}
      {guide && (
        <p className="hint">AI-generated, so double-check anything important.</p>
      )}
    </section>
  );
}

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { getGardenSummary, type GuideSection, type Plant } from "./api";
import { summarizeGarden, type Group } from "./lib/gardenGroups";
import "./guide.css";
import "./gardensummary.css";

function Body({ text }: { text: string }) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const out: React.ReactNode[] = [];
  let list: string[] = [];

  const flush = () => {
    if (list.length) {
      const items = list;
      out.push(
        <ul key={`u${out.length}`}>
          {items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      );
      list = [];
    }
  };

  for (const l of lines) {
    if (/^[-•]\s+/.test(l)) {
      list.push(l.replace(/^[-•]\s+/, ""));
    } else {
      flush();
      out.push(<p key={`p${out.length}`}>{l}</p>);
    }
  }
  flush();
  return <>{out}</>;
}

function GroupList({ title, groups }: { title: string; groups: Group[] }) {
  if (groups.length === 0) return null;
  return (
    <div className="garden-section">
      <h3>{title}</h3>
      {groups.map((g) => (
        <div className="garden-group" key={g.title}>
          <strong>{g.title}</strong>
          <small>{g.hint}</small>
          <p>{g.plants.join(", ")}</p>
        </div>
      ))}
    </div>
  );
}

export default function GardenSummary({ plants }: { plants: Plant[] }) {
  const plantCount = plants.length;
  const overview = summarizeGarden(plants);
  const { getToken } = useAuth();
  const [sections, setSections] = useState<GuideSection[] | null>(null);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // The summary goes out of date when plants are added or removed.
  useEffect(() => {
    setSections(null);
    setError("");
  }, [plantCount]);

  async function run() {
    setBusy(true);
    setError("");
    try {
      const result = await getGardenSummary(getToken);
      setSections(result);
      setActive(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const current = sections ? sections[active] ?? sections[0] : null;

  return (
    <section className="card">
      <h2>Garden summary</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        Your plants grouped by what they like, so you can see what can share a
        spot or a watering day.
      </p>

      {overview.notes.length > 0 && (
        <div className="garden-section">
          <h3>Heads up</h3>
          <ul className="garden-notes">
            {overview.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      <GroupList title="Light" groups={overview.light} />
      <GroupList title="Watering" groups={overview.water} />
      <GroupList title="Humidity" groups={overview.humidity} />

      {overview.unknown.length > 0 && (
        <p className="hint">
          Eden doesn't have light or humidity info for:{" "}
          {overview.unknown.join(", ")}.
        </p>
      )}

      <div className="garden-section">
        <button className="btn-soft" onClick={run} disabled={busy || plantCount < 2}>
          {busy
            ? "Reading your garden..."
            : sections
            ? "Refresh detailed plan"
            : "Ask AI for a detailed plan"}
        </button>
        {plantCount < 2 && (
          <p className="hint">Add at least 2 plants to get a detailed plan.</p>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {sections && sections.length > 0 && current && (
        <div className="viewer">
          <div className="pills">
            {sections.map((s, i) => (
              <button
                key={s.title + i}
                className={"pill" + (i === active ? " on" : "")}
                onClick={() => setActive(i)}
              >
                {s.title}
              </button>
            ))}
          </div>
          <div className={"section" + (current.title === "Pet Safety" ? " pet" : "")}>
            <h4>{current.title}</h4>
            <Body text={current.body} />
          </div>
          <p className="hint">AI-generated, so double-check anything important.</p>
        </div>
      )}
    </section>
  );
}

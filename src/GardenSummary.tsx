import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { getGardenSummary, type GuideSection } from "./api";
import "./guide.css";

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

export default function GardenSummary({ plantCount }: { plantCount: number }) {
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
  const tooFew = plantCount < 2;

  return (
    <section className="card">
      <h2>Garden summary</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        One overview for your whole garden: what your plants share, which can be
        grouped together, and which need their own space.
      </p>

      <button className="btn" onClick={run} disabled={busy || tooFew}>
        {busy ? "Reading your garden..." : sections ? "Refresh summary" : "Analyze my garden"}
      </button>
      {tooFew && <p className="hint">Add at least 2 plants to get a summary.</p>}

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

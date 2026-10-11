import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { getCareGuide, getTroubleshooting, type GuideSection } from "./api";
import "./guide.css";

const SYMPTOMS = [
  "Yellow leaves",
  "Brown tips or edges",
  "Drooping or wilting",
  "Leggy or stretching",
  "Spots on leaves",
  "Bugs or pests",
  "Not growing",
  "Leaves dropping",
  "Mold or white fuzz",
];

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

function Viewer({ title, sections }: { title: string; sections: GuideSection[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [sections]);

  const current = sections[active] ?? sections[0];

  return (
    <div className="viewer">
      <h3 className="viewer-title">{title}</h3>
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
  );
}

export default function PlantInfo({
  prefill,
}: {
  prefill: { text: string; n: number };
}) {
  const { getToken } = useAuth();
  const [mode, setMode] = useState<"care" | "fix">("care");
  const [plant, setPlant] = useState("");
  const [problem, setProblem] = useState("");
  const [sections, setSections] = useState<GuideSection[] | null>(null);
  const [shownTitle, setShownTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(kind: "care" | "fix", plantName: string, problemText: string) {
    const p = plantName.trim();
    if (!p) return;
    setBusy(true);
    setError("");
    setSections(null);
    try {
      if (kind === "care") {
        setSections(await getCareGuide(getToken, p));
        setShownTitle(`${p}: care guide`);
      } else {
        setSections(await getTroubleshooting(getToken, p, problemText.trim()));
        setShownTitle(`${p}: ${problemText.trim()}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (prefill.n > 0) {
      setMode("care");
      setPlant(prefill.text);
      run("care", prefill.text, "");
    }
  }, [prefill.n]);

  function switchMode(next: "care" | "fix") {
    setMode(next);
    setSections(null);
    setError("");
  }

  return (
    <section className="card">
      <h2>Plant guide</h2>

      <div className="mode-tabs">
        <button
          className={"mode-tab" + (mode === "care" ? " on" : "")}
          onClick={() => switchMode("care")}
        >
          Care guide
        </button>
        <button
          className={"mode-tab" + (mode === "fix" ? " on" : "")}
          onClick={() => switchMode("fix")}
        >
          Troubleshoot
        </button>
      </div>

      <input
        className="field"
        placeholder="Plant name (e.g. rose, pothos, cilantro)"
        value={plant}
        maxLength={80}
        onChange={(e) => setPlant(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && mode === "care") run("care", plant, "");
        }}
      />

      {mode === "care" && (
        <button
          className="btn"
          onClick={() => run("care", plant, "")}
          disabled={busy || !plant.trim()}
        >
          {busy ? "Writing your guide..." : "Get care guide"}
        </button>
      )}

      {mode === "fix" && (
        <>
          <div className="symptoms">
            {SYMPTOMS.map((s) => (
              <button
                key={s}
                className={"symptom" + (problem === s ? " on" : "")}
                onClick={() => setProblem(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <textarea
            className="field"
            placeholder="Describe what's going on (the more detail the better)"
            value={problem}
            maxLength={300}
            rows={3}
            onChange={(e) => setProblem(e.target.value)}
          />
          <button
            className="btn"
            onClick={() => run("fix", plant, problem)}
            disabled={busy || !plant.trim() || !problem.trim()}
          >
            {busy ? "Diagnosing..." : "Diagnose"}
          </button>
        </>
      )}

      {error && <div className="error">{error}</div>}
      {sections && sections.length > 0 && (
        <Viewer title={shownTitle} sections={sections} />
      )}
    </section>
  );
}

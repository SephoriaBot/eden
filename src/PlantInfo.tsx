
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  getCareGuide,
  getTroubleshooting,
  type CareSummary,
  type GuideSection,
} from "./api";
import { BUILT_IN_FIXES } from "./lib/troubleshooting";
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
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const out: React.ReactNode[] = [];
  let list: string[] = [];

  const flush = () => {
    if (list.length) {
      out.push(
        <ul key={`u${out.length}`}>
          {list.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
      list = [];
    }
  };

  for (const line of lines) {
    if (/^[-•]\s+/.test(line)) {
      list.push(line.replace(/^[-•]\s+/, ""));
    } else {
      flush();
      out.push(<p key={`p${out.length}`}>{line}</p>);
    }
  }

  flush();
  return <>{out}</>;
}

function Viewer({ title, sections, aiGenerated }: {
  title: string;
  sections: GuideSection[];
  aiGenerated: boolean;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [sections]);

  const current = sections[active] ?? sections[0];
  if (!current) return null;

  return (
    <div className="viewer">
      <h3 className="viewer-title">{title}</h3>
      <div className="pills">
        {sections.map((section, i) => (
          <button
            key={section.title + i}
            className={"pill" + (i === active ? " on" : "")}
            onClick={() => setActive(i)}
          >
            {section.title}
          </button>
        ))}
      </div>
      <div className={"section" + (current.title === "Pet Safety" ? " pet" : "")}>
        <h4>{current.title}</h4>
        <Body text={current.body} />
      </div>
      <p className="hint">
        {aiGenerated
          ? "AI-generated. Double-check important care decisions."
          : "General advice that applies to most plants. Check your plant's own needs too."}
      </p>
    </div>
  );
}

function makeSummary(sections: GuideSection[]): CareSummary {
  const find = (title: string) =>
    sections.find((section) => section.title.toLowerCase() === title.toLowerCase())
      ?.body.trim().slice(0, 300) ?? "";

  return {
    overview: find("Overview"),
    light: find("Light"),
    watering: find("Watering"),
    temperature: find("Temperature and Humidity"),
  };
}

export default function PlantInfo({
  prefill,
  onCareSummarySaved,
}: {
  prefill: { text: string; n: number; plantId: string | null };
  onCareSummarySaved: (plantId: string, summary: CareSummary) => Promise<void>;
}) {
  const { getToken } = useAuth();
  const [mode, setMode] = useState<"care" | "fix">("care");
  const [plant, setPlant] = useState("");
  const [problem, setProblem] = useState("");
  const [sections, setSections] = useState<GuideSection[] | null>(null);
  const [shownTitle, setShownTitle] = useState("");
  const [shownByAi, setShownByAi] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(
    kind: "care" | "fix",
    plantName: string,
    problemText: string,
    plantId: string | null = null
  ) {
    const p = plantName.trim();
    const builtIn =
      kind === "fix" ? BUILT_IN_FIXES[problemText.trim()] : undefined;

    // A ready-made answer needs no plant name and no AI.
    if (!p && !builtIn) return;

    if (builtIn) {
      setError("");
      setSections(builtIn);
      setShownByAi(false);
      setShownTitle(p ? `${p}: ${problemText.trim()}` : problemText.trim());
      return;
    }

    setShownByAi(true);
    setBusy(true);
    setError("");
    setSections(null);

    try {
      if (kind === "care") {
        const guide = await getCareGuide(getToken, p);
        setSections(guide);
        setShownTitle(`${p}: care guide`);

        if (plantId) {
          try {
            await onCareSummarySaved(plantId, makeSummary(guide));
          } catch {
            setError("Guide loaded, but its quick-care details could not be saved.");
          }
        }
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
      run("care", prefill.text, "", prefill.plantId);
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
          {busy ? "Loading guide..." : "Get care guide"}
        </button>
      )}

      {mode === "fix" && (
        <>
          <div className="symptoms">
            {SYMPTOMS.map((symptom) => (
              <button
                key={symptom}
                className={"symptom" + (problem === symptom ? " on" : "")}
                onClick={() => setProblem(symptom)}
              >
                {symptom}
              </button>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 0 }}>
            Tap a common problem for an instant answer. Or describe something
            else and the AI will take a look.
          </p>
          <textarea
            className="field"
            placeholder="Or describe what's going on"
            value={problem}
            maxLength={300}
            rows={3}
            onChange={(e) => setProblem(e.target.value)}
          />
          <button
            className="btn"
            onClick={() => run("fix", plant, problem)}
            disabled={
              busy ||
              !problem.trim() ||
              (!plant.trim() && !BUILT_IN_FIXES[problem.trim()])
            }
          >
            {busy
              ? "Checking..."
              : BUILT_IN_FIXES[problem.trim()]
              ? "Show fixes"
              : "Ask AI"}
          </button>
        </>
      )}

      {error && <div className="error">{error}</div>}
      {sections && sections.length > 0 && (
        <Viewer title={shownTitle} sections={sections} aiGenerated={shownByAi} />
      )}
    </section>
  );
}

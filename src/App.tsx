import { useCallback, useEffect, useState } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useAuth,
} from "@clerk/clerk-react";
import { addPlant, deletePlant, listPlants, type Plant } from "./api";
import PlantInfo from "./PlantInfo";
import GardenSummary from "./GardenSummary";

function tone(id: string) {
  let sum = 0;
  for (const ch of id) sum += ch.charCodeAt(0);
  return `av${sum % 4}`;
}

function Garden() {
  const { getToken } = useAuth();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [prefill, setPrefill] = useState({ text: "", n: 0 });

  const load = useCallback(async () => {
    try {
      setPlants(await listPlants(getToken));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const plant = await addPlant(getToken, { name, location, notes });
      setPlants((prev) => [plant, ...prev]);
      setName("");
      setLocation("");
      setNotes("");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  async function handleDelete(id: string, plantName: string) {
    if (!window.confirm(`Remove ${plantName} from your garden?`)) return;
    try {
      await deletePlant(getToken, id);
      setPlants((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  function lookup(plantName: string) {
    setPrefill((p) => ({ text: plantName, n: p.n + 1 }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <PlantInfo prefill={prefill} />

      <section className="card">
        <h2>Add a plant</h2>
        <form onSubmit={handleAdd}>
          <input
            className="field"
            placeholder="Plant name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="field"
            placeholder="Location (e.g. kitchen window)"
            value={location}
            maxLength={80}
            onChange={(e) => setLocation(e.target.value)}
          />
          <textarea
            className="field"
            placeholder="Notes"
            value={notes}
            maxLength={500}
            rows={3}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button className="btn" type="submit" disabled={!name.trim()}>
            Add to my garden
          </button>
        </form>
      </section>

      <h2 className="section-title">My garden</h2>

      {error && <div className="error">{error}</div>}
      {loading && <p className="hint">Loading your garden...</p>}

      {!loading && plants.length === 0 && (
        <div className="card empty">
          <div className="plant-avatar av1 face-lg" />
          <p>Your garden is waiting. Add your first plant above.</p>
        </div>
      )}

      {!loading && plants.length > 0 && <GardenSummary plantCount={plants.length} />}

      <ul className="plant-list">
        {plants.map((p) => (
          <li key={p.id} className="plant-card">
            <div className={`plant-avatar ${tone(p.id)}`} />
            <div className="plant-body">
              <div className="plant-name">{p.name}</div>
              {p.location && <span className="badge">{p.location}</span>}
              {p.notes && <div className="plant-notes">{p.notes}</div>}
              <div className="actions">
                <button className="btn-soft" onClick={() => lookup(p.name)}>
                  Care info
                </button>
                <button
                  className="btn-soft btn-danger"
                  onClick={() => handleDelete(p.id, p.name)}
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function App() {
  return (
    <main className="app">
      <header className="header">
        <h1 className="brand">Eden</h1>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>
      <p className="tagline">Your little garden journal and plant guide</p>

      <SignedOut>
        <div className="card welcome">
          <div className="plant-avatar av0 face-lg" />
          <h2>Welcome to Eden</h2>
          <p>Sign in to start your garden.</p>
          <SignInButton mode="modal">
            <button className="btn">Sign in</button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <Garden />
      </SignedIn>
    </main>
  );
}

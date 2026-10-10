import { useCallback, useEffect, useState } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useAuth,
} from "@clerk/clerk-react";
import { addPlant, deletePlant, listPlants, type Plant } from "./api";

function Garden() {
  const { getToken } = useAuth();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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

  async function handleDelete(id: string) {
    try {
      await deletePlant(getToken, id);
      setPlants((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  const input: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: 10,
    marginBottom: 8,
    fontSize: 16,
  };

  return (
    <>
      <form onSubmit={handleAdd} style={{ margin: "16px 0" }}>
        <input
          style={input}
          placeholder="Plant name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          style={input}
          placeholder="Location (e.g. kitchen window)"
          value={location}
          maxLength={80}
          onChange={(e) => setLocation(e.target.value)}
        />
        <textarea
          style={input}
          placeholder="Notes"
          value={notes}
          maxLength={500}
          rows={3}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button type="submit" style={{ padding: "10px 16px", fontSize: 16 }}>
          Add plant
        </button>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {loading && <p>Loading your garden...</p>}
      {!loading && plants.length === 0 && <p>No plants yet. Add your first one above.</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {plants.map((p) => (
          <li
            key={p.id}
            style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 8 }}
          >
            <strong>{p.name}</strong>
            {p.location && <div>{p.location}</div>}
            {p.notes && <div style={{ opacity: 0.8 }}>{p.notes}</div>}
            <button onClick={() => handleDelete(p.id)} style={{ marginTop: 8 }}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function App() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
      <h1>Eden</h1>

      <SignedOut>
        <p>Sign in to start your garden.</p>
        <SignInButton mode="modal" />
      </SignedOut>

      <SignedIn>
        <UserButton />
        <Garden />
      </SignedIn>
    </main>
  );
}

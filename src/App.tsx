
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  SignInButton,
  UserButton,
  useAuth,
} from "@clerk/clerk-react";
import {
  addPlant,
  deletePlant,
  exitGuest,
  forgetGuest,
  getGuestToken,
  listPlants,
  startGuest,
  updatePlant,
  type CareSummary,
  type Plant,
} from "./api";
import PlantInfo from "./PlantInfo";
import GardenSummary from "./GardenSummary";
import CareDashboard from "./CareDashboard";
import GrowingSpacePlanner from "./GrowingSpacePlanner";

const VALID_CATEGORIES = [
  "flowering",
  "foliage",
  "succulent",
  "fern",
  "palm",
  "herb",
  "trailing",
  "cactus",
  "bulb",
  "tropical",
];

type Tab = "garden" | "guide" | "care" | "spaces";


const TABS = [
  { id: "garden", label: "My Garden", icon: "/mygarden.png" },
  { id: "guide", label: "Plant Guide", icon: "/plantguide.png" },
  { id: "care", label: "Care Schedule", icon: "/careschedule.png" },
  { id: "spaces", label: "Growing Spaces", icon: "/growingspaces.png" },
] as const;


function readCareSummary(value: string | null): CareSummary | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== "object" || !parsed) return null;

    return {
      overview: typeof parsed.overview === "string" ? parsed.overview : "",
      light: typeof parsed.light === "string" ? parsed.light : "",
      watering:
        typeof parsed.watering === "string" ? parsed.watering : "",
      temperature:
        typeof parsed.temperature === "string"
          ? parsed.temperature
          : "",
    };
  } catch {
    return null;
  }
}

function Garden() {
  const { getToken } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("garden");
  const [plants, setPlants] = useState<Plant[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [prefill, setPrefill] = useState<{
    text: string;
    n: number;
    plantId: string | null;
  }>({ text: "", n: 0, plantId: null });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

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

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const plant = await addPlant(getToken, {
        name: name.trim(),
        location,
        notes,
      });

      setPlants((prev) => [plant, ...prev]);
      setName("");
      setLocation("");
      setNotes("");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  async function handleSaveName(id: string) {
    if (!editingName.trim()) {
      setError("Enter a plant name first.");
      return;
    }

    setSavingId(id);

    try {
      const updated = await updatePlant(getToken, id, {
        name: editingName.trim(),
      });

      setPlants((prev) =>
        prev.map((p) => (p.id === id ? updated : p))
      );
      setEditingId(null);
      setEditingName("");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update plant");
    } finally {
      setSavingId(null);
    }
  }

  async function handleSaveCareSummary(
    id: string,
    summary: CareSummary
  ) {
    try {
      const updated = await updatePlant(getToken, id, {
        careSummary: summary,
      });

      setPlants((prev) =>
        prev.map((p) => (p.id === id ? updated : p))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save care info");
    }
  }

  function handlePlantUpdated(updated: Plant) {
    setPlants((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  }

  async function handleDelete(id: string, plantName: string) {
    if (!window.confirm(`Remove ${plantName} from your garden?`)) return;

    try {
      await deletePlant(getToken, id);
      setPlants((prev) => prev.filter((p) => p.id !== id));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  function lookup(plant: Plant) {
    setPrefill((prev) => ({
      text: plant.name,
      n: prev.n + 1,
      plantId: plant.id,
    }));
    setActiveTab("guide");
  }

  function illustrationClass(plant: Plant) {
    if (plant.category && VALID_CATEGORIES.includes(plant.category)) {
      return `plant-avatar icon-${plant.category}`;
    }
    return "plant-avatar";
  }

  return (
    <>
      <nav className="main-tabs" aria-label="Main navigation">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={
              activeTab === tab.id ? "main-tab active" : "main-tab"
            }
            aria-current={activeTab === tab.id ? "page" : undefined}
            onClick={() => setActiveTab(tab.id)}
          >
            <img src={tab.icon} alt="" className="main-tab-icon" />
            {tab.label}
          </button>
        ))}
      </nav>

      {error && <div className="error" role="alert">{error}</div>}

      {activeTab === "guide" && (
        <PlantInfo
          prefill={prefill}
          onCareSummarySaved={handleSaveCareSummary}
        />
      )}

      {activeTab === "care" && (
        loading ? (
          <p className="hint">Loading your garden...</p>
        ) : (
          <CareDashboard
            plants={plants}
            onPlantUpdated={handlePlantUpdated}
          />
        )
      )}

      {activeTab === "spaces" && (
        loading ? (
          <p className="hint">Loading your garden...</p>
        ) : (
          <GrowingSpacePlanner
            plants={plants}
            onPlantUpdated={handlePlantUpdated}
          />
        )
      )}

      {activeTab === "garden" && (
        <>
          <section className="card">
            <h2>Add a plant</h2>

            <form onSubmit={handleAdd}>
              <input
                className="field"
                placeholder="Plant name"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                required
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

          {loading && <p className="hint">Loading your garden...</p>}

          {!loading && plants.length === 0 && (
            <div className="card empty">
              <div className="plant-avatar av0 face-lg" />
              <p>Your garden is waiting. Add your first plant above.</p>
            </div>
          )}

          {!loading && plants.length > 0 && (
            <GardenSummary plantCount={plants.length} />
          )}

          <ul className="plant-list">
            {plants.map((p) => {
              const care = readCareSummary(p.careSummary);

              return (
                <li key={p.id} className="plant-card">
                  <div
                    className={illustrationClass(p)}
                    role="img"
                    aria-label={
                      p.category && VALID_CATEGORIES.includes(p.category)
                        ? `${p.category} plant illustration`
                        : "Plant illustration unavailable"
                    }
                  />

                  <div className="plant-body">
                    {editingId === p.id ? (
                      <>
                        <input
                          className="field"
                          aria-label="Correct plant name"
                          placeholder="Correct plant name"
                          value={editingName}
                          maxLength={80}
                          onChange={(e) => setEditingName(e.target.value)}
                        />

                        <div className="actions">
                          <button
                            className="btn-soft"
                            type="button"
                            onClick={() => handleSaveName(p.id)}
                            disabled={
                              savingId === p.id || !editingName.trim()
                            }
                          >
                            {savingId === p.id ? "Saving..." : "Save name"}
                          </button>

                          <button
                            className="btn-soft"
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setEditingName("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="plant-name">{p.name}</div>

                        <div className="actions">
                          <button
                            className="btn-soft"
                            type="button"
                            onClick={() => {
                              setEditingId(p.id);
                              setEditingName(p.name);
                            }}
                          >
                            Edit name
                          </button>
                        </div>
                      </>
                    )}

                    {p.location && (
                      <span className="badge">{p.location}</span>
                    )}

                    {p.notes && (
                      <div className="plant-notes">{p.notes}</div>
                    )}

                    {care && (
                      <div className="details">
                        <h3>Quick care</h3>
                        {care.overview && <p>{care.overview}</p>}
                        {care.light && (
                          <p><strong>Light:</strong> {care.light}</p>
                        )}
                        {care.watering && (
                          <p><strong>Water:</strong> {care.watering}</p>
                        )}
                        {care.temperature && (
                          <p>
                            <strong>Temperature & humidity:</strong>{" "}
                            {care.temperature}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="actions">
                      <button
                        className="btn-soft"
                        type="button"
                        onClick={() => lookup(p)}
                      >
                        {care ? "Refresh care info" : "Get care info"}
                      </button>

                      <button
                        className="btn-soft btn-danger"
                        type="button"
                        onClick={() => handleDelete(p.id, p.name)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

export default function App() {
  const { isLoaded, isSignedIn } = useAuth();
  const [guest, setGuest] = useState<boolean>(() => !!getGuestToken());

  // Once someone signs in, drop the demo id so it can never be used by mistake.
  useEffect(() => {
    if (isSignedIn) {
      forgetGuest();
      setGuest(false);
    }
  }, [isSignedIn]);

  async function leaveDemo() {
    await exitGuest();
    setGuest(false);
  }

  const inDemo = isLoaded && !isSignedIn && guest;
  const showWelcome = isLoaded && !isSignedIn && !guest;

  return (
    <main className="app">
      <header className="header" style={{ flexWrap: "wrap", gap: 8 }}>
        <h1 className="brand">Eden</h1>
        {isSignedIn && <UserButton />}
        {inDemo && (
          <div className="actions" style={{ marginTop: 0, alignItems: "center" }}>
            <span className="hint">Guest demo</span>
            <SignInButton mode="modal">
              <button className="btn-soft" type="button">Sign in</button>
            </SignInButton>
            <button className="btn-soft" type="button" onClick={leaveDemo}>
              Exit demo
            </button>
          </div>
        )}
      </header>

      <p className="tagline">Your little garden journal and plant guide</p>

      {showWelcome && (
        <div className="card welcome">
          <div className="plant-avatar av0 face-lg" />
          <h2>Welcome to Eden</h2>
          <p>Sign in to start your garden.</p>
          <div className="actions" style={{ justifyContent: "center", marginTop: 0 }}>
            <SignInButton mode="modal">
              <button className="btn">Sign in</button>
            </SignInButton>
            <button
              className="btn-soft"
              type="button"
              onClick={() => {
                startGuest();
                setGuest(true);
              }}
            >
              Try the demo (no sign-in)
            </button>
          </div>
          <p className="hint">
            Guest data is wiped when you exit the demo.
          </p>
        </div>
      )}

      {isLoaded && (isSignedIn || inDemo) && (
        <Garden key={isSignedIn ? "user" : "guest"} />
      )}
    </main>
  );
}

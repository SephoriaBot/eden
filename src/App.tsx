
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
import CareDashboard from "./CareDashboard";
import RemindersButton from "./RemindersButton";
import { lookupPlantFacts } from "./lib/plantProfiles";
import "./keyfacts.css";

const VALID_CATEGORIES = [
  "flowering", "foliage", "succulent", "fern", "palm",
  "herb", "trailing", "cactus", "bulb", "tropical",
];

type Tab = "garden" | "guide" | "care";

const TABS = [
  { id: "garden", label: "My Garden", icon: "/mygarden.png" },
  { id: "care", label: "Care Schedule", icon: "/careschedule.png" },
  { id: "guide", label: "Plant Guide", icon: "/plantguide.png" },
] as const;

function Garden() {
  const { getToken } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("garden");
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [prefill, setPrefill] = useState<{
    text: string;
    n: number;
    plantId: string | null;
  }>({ text: "", n: 0, plantId: null });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const selectedPlant = plants.find((p) => p.id === selectedId) ?? plants[0] ?? null;

  const load = useCallback(async () => {
    try {
      const result = await listPlants(getToken);
      setPlants(result);
      setSelectedId((current) => current && result.some((p) => p.id === current)
        ? current
        : result[0]?.id ?? null);
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
      setSelectedId(plant.id);
      setName("");
      setLocation("");
      setNotes("");
      setShowAddForm(false);
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

      setPlants((prev) => prev.map((p) => p.id === id ? updated : p));
      setEditingId(null);
      setEditingName("");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update plant");
    } finally {
      setSavingId(null);
    }
  }

  async function handleSaveCareSummary(id: string, summary: CareSummary) {
    try {
      const updated = await updatePlant(getToken, id, {
        careSummary: summary,
      });

      setPlants((prev) => prev.map((p) => p.id === id ? updated : p));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save care info");
    }
  }

  function handlePlantUpdated(updated: Plant) {
    setPlants((prev) => prev.map((p) => p.id === updated.id ? updated : p));
  }

  async function handleDelete(id: string, plantName: string) {
    if (!window.confirm(`Remove ${plantName} from your garden?`)) return;

    try {
      await deletePlant(getToken, id);
      setPlants((prev) => {
        const remaining = prev.filter((p) => p.id !== id);
        if (selectedId === id) setSelectedId(remaining[0]?.id ?? null);
        return remaining;
      });
      setEditingId(null);
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
            className={activeTab === tab.id ? "main-tab active" : "main-tab"}
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
          <CareDashboard plants={plants} onPlantUpdated={handlePlantUpdated} />
        )
      )}

      {activeTab === "garden" && (
        <>
          <section className="garden-heading">
            <div>
              <h2>My plants</h2>
              <p>{plants.length} {plants.length === 1 ? "plant" : "plants"} in your collection</p>
            </div>
            <button
              className="btn"
              type="button"
              onClick={() => setShowAddForm((current) => !current)}
            >
              {showAddForm ? "Cancel" : "+ Add plant"}
            </button>
          </section>

          {showAddForm && (
            <section className="card garden-add-card">
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
                  rows={2}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <button className="btn" type="submit" disabled={!name.trim()}>
                  Add to my garden
                </button>
              </form>
            </section>
          )}

          {loading && <p className="hint">Loading your plants...</p>}

          {!loading && plants.length === 0 && (
            <div className="card empty">
              <div className="plant-avatar av0 face-lg" />
              <p>Your garden is waiting. Add your first plant to get started.</p>
              <button className="btn" onClick={() => setShowAddForm(true)}>
                Add your first plant
              </button>
            </div>
          )}

          {!loading && plants.length > 0 && (
            <>
              <div className="plant-selector" aria-label="Choose a plant">
                {plants.map((plant) => (
                  <button
                    key={plant.id}
                    type="button"
                    className={`plant-choice ${selectedPlant?.id === plant.id ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedId(plant.id);
                      setEditingId(null);
                    }}
                    aria-pressed={selectedPlant?.id === plant.id}
                  >
                    <span className={illustrationClass(plant)} aria-hidden="true" />
                    <span className="plant-choice-name">{plant.name}</span>
                  </button>
                ))}
              </div>

              {selectedPlant && (
                <section className="card featured-plant">
                  <div className="featured-plant-top">
                    <div className={illustrationClass(selectedPlant)} role="img" aria-label={`${selectedPlant.category || "Plant"} illustration`} />
                    <div className="featured-plant-title">
                      {editingId === selectedPlant.id ? (
                        <>
                          <input
                            className="field"
                            aria-label="Correct plant name"
                            placeholder="Plant name"
                            value={editingName}
                            maxLength={80}
                            onChange={(e) => setEditingName(e.target.value)}
                          />
                          <div className="actions">
                            <button
                              className="btn-soft"
                              type="button"
                              onClick={() => handleSaveName(selectedPlant.id)}
                              disabled={savingId === selectedPlant.id || !editingName.trim()}
                            >
                              {savingId === selectedPlant.id ? "Saving..." : "Save"}
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
                          <h2>{selectedPlant.name}</h2>
                          {selectedPlant.location && (
                            <span className="badge">{selectedPlant.location}</span>
                          )}
                          <button
                            className="btn-soft"
                            type="button"
                            onClick={() => {
                              setEditingId(selectedPlant.id);
                              setEditingName(selectedPlant.name);
                            }}
                          >
                            Edit name
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {selectedPlant.notes && (
                    <p className="featured-plant-notes">{selectedPlant.notes}</p>
                  )}

                  <div className="featured-plant-facts">
                    <div>
                      <span>Watering</span>
                      <strong>
                        Every {selectedPlant.wateringIntervalDays ??
                          selectedPlant.recommendedWateringIntervalDays ?? 7} days
                      </strong>
                    </div>
                    {(() => {
                      const facts = lookupPlantFacts(selectedPlant.name, selectedPlant.category);
                      return facts ? (
                        <>
                          <div><span>Light</span><strong>{facts.light}</strong></div>
                          <div><span>Humidity</span><strong>{facts.humidity}</strong></div>
                          <div><span>Temperature</span><strong>{facts.temperature}</strong></div>
                        </>
                      ) : null;
                    })()}
                  </div>

                  <div className="featured-plant-actions">
                    <button className="btn" type="button" onClick={() => lookup(selectedPlant)}>
                      View full guide
                    </button>
                    <button
                      className="btn-soft"
                      type="button"
                      onClick={() => handleDelete(selectedPlant.id, selectedPlant.name)}
                    >
                      Remove plant
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}

export default function App() {
  const { isLoaded, isSignedIn } = useAuth();
  const [guest, setGuest] = useState<boolean>(() => !!getGuestToken());

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

        {isSignedIn && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <RemindersButton />
            <UserButton />
          </div>
        )}

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

      <p className="tagline">Your personal plant collection and care guide</p>

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
          <p className="hint">Guest data is wiped when you exit the demo.</p>
        </div>
      )}

      {isLoaded && (isSignedIn || inDemo) && (
        <Garden key={isSignedIn ? "user" : "guest"} />
      )}
    </main>
  );
}

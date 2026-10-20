
import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { updatePlant, type Plant } from "./api";

type Props = {
  plants: Plant[];
  onPlantUpdated: (plant: Plant) => void;
};

const SPACE_TYPES = [
  "Windowsill",
  "Shelf",
  "Room",
  "Grow-light setup",
  "Other",
];

function parseLocation(location: string | null) {
  if (!location) return { type: "Windowsill", name: "" };

  const separator = location.indexOf(" · ");
  if (separator !== -1) {
    const type = location.slice(0, separator);
    if (SPACE_TYPES.includes(type)) {
      return { type, name: location.slice(separator + 3) };
    }
  }

  return { type: "Other", name: location };
}

export default function GrowingSpacePlanner({
  plants,
  onPlantUpdated,
}: Props) {
  const { getToken } = useAuth();
  const [plantId, setPlantId] = useState(plants[0]?.id ?? "");
  const [spaceType, setSpaceType] = useState("Windowsill");
  const [spaceName, setSpaceName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedPlant = plants.find((plant) => plant.id === plantId);

  function selectPlant(id: string) {
    setPlantId(id);
    const plant = plants.find((item) => item.id === id);
    const parsed = parseLocation(plant?.location ?? null);
    setSpaceType(parsed.type);
    setSpaceName(parsed.name);
    setMessage("");
  }

  async function savePlacement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedPlant || !spaceName.trim()) {
      setMessage("Choose a plant and enter a space name.");
      return;
    }

    const location =
      spaceType === "Other"
        ? spaceName.trim()
        : `${spaceType} · ${spaceName.trim()}`;

    setSaving(true);
    setMessage("");

    try {
      const updated = await updatePlant(getToken, selectedPlant.id, {
        location,
      });
      onPlantUpdated(updated);
      setMessage(`${selectedPlant.name} placed in ${spaceName.trim()}.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save placement."
      );
    } finally {
      setSaving(false);
    }
  }

  const placedPlants = plants.filter((plant) => plant.location?.trim());
  const unplacedPlants = plants.filter((plant) => !plant.location?.trim());

  const spaces = Array.from(
    placedPlants.reduce((groups, plant) => {
      const location = plant.location!.trim();
      if (!groups.has(location)) groups.set(location, []);
      groups.get(location)!.push(plant);
      return groups;
    }, new Map<string, Plant[]>())
  ).sort(([a], [b]) => a.localeCompare(b));

  return (
    <section className="card space-planner">
      <div className="space-planner-heading">
        <div>
          <h2>Growing Space Planner</h2>
          <p>Find a home for every plant in your garden.</p>
        </div>
        <span className="space-count">
          {spaces.length} {spaces.length === 1 ? "space" : "spaces"}
        </span>
      </div>

      {plants.length === 0 ? (
        <p className="space-empty">
          Add a plant to your garden before planning its placement.
        </p>
      ) : (
        <>
          <form className="space-form" onSubmit={savePlacement}>
            <label>
              Plant
              <select
                className="field"
                value={plantId}
                onChange={(event) => selectPlant(event.target.value)}
              >
                {plants.map((plant) => (
                  <option key={plant.id} value={plant.id}>
                    {plant.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Growing space
              <select
                className="field"
                value={spaceType}
                onChange={(event) => setSpaceType(event.target.value)}
              >
                {SPACE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Space name
              <input
                className="field"
                value={spaceName}
                onChange={(event) => setSpaceName(event.target.value)}
                placeholder="e.g. Kitchen window"
                maxLength={70}
                required
              />
            </label>

            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save placement"}
            </button>

            {message && (
              <p className="space-message" role="status">
                {message}
              </p>
            )}
          </form>

          <div className="space-summary">
            <span>{placedPlants.length} placed</span>
            <span>{unplacedPlants.length} still need a space</span>
          </div>

          {spaces.length > 0 && (
            <div className="space-list">
              {spaces.map(([location, spacePlants]) => (
                <div className="space-group" key={location}>
                  <div className="space-group-heading">
                    <div>
                      <span className="space-type">
                        {parseLocation(location).type}
                      </span>
                      <h3>{parseLocation(location).name}</h3>
                    </div>
                    <span className="space-plant-count">
                      {spacePlants.length}{" "}
                      {spacePlants.length === 1 ? "plant" : "plants"}
                    </span>
                  </div>

                  <div className="space-plant-list">
                    {spacePlants.map((plant) => (
                      <button
                        className="space-plant"
                        type="button"
                        key={plant.id}
                        onClick={() => selectPlant(plant.id)}
                        aria-label={`Edit placement for ${plant.name}`}
                      >
                        <span>{plant.name}</span>
                        <span className="space-edit">Edit placement →</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {unplacedPlants.length > 0 && (
            <div className="space-unplaced">
              <h3>Needs a home</h3>
              <p>
                {unplacedPlants.map((plant) => plant.name).join(", ")}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

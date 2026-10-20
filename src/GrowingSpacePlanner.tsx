
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  addGrowingSpace,
  deleteGrowingSpace,
  listGrowingSpaces,
  updatePlant,
  type GrowingSpace,
  type Plant,
} from "./api";

type Props = {
  plants: Plant[];
  onPlantUpdated: (plant: Plant) => void;
};

type LightLevel = GrowingSpace["light"];

const SPACE_TYPES = [
  "Windowsill",
  "Shelf",
  "Room",
  "Grow-light setup",
  "Other",
];

const LIGHT_LEVELS: { value: LightLevel; label: string }[] = [
  { value: "low", label: "Low light" },
  { value: "medium", label: "Medium, indirect light" },
  { value: "bright", label: "Bright, indirect light" },
  { value: "direct", label: "Direct sunlight" },
];

function getLightNeeds(plant: Plant): {
  level: LightLevel | "unknown";
  reason: string;
} {
  const name = plant.name.toLowerCase();
  let careLight = "";

  try {
    const care = plant.careSummary
      ? JSON.parse(plant.careSummary)
      : null;
    careLight =
      typeof care?.light === "string" ? care.light.toLowerCase() : "";
  } catch {
    // Use the name-based estimate below.
  }

  if (/direct sun|full sun|several hours of direct|full sunlight/.test(careLight)) {
    return {
      level: "direct",
      reason: "Its saved care guide recommends direct sunlight.",
    };
  }

  if (/bright.*indirect|bright indirect|filtered bright/.test(careLight)) {
    return {
      level: "bright",
      reason: "Its saved care guide recommends bright, indirect light.",
    };
  }

  if (/low light|tolerates shade|shade tolerant/.test(careLight)) {
    return {
      level: "low",
      reason: "Its saved care guide says it tolerates lower light.",
    };
  }

  if (/medium.*indirect|moderate.*light/.test(careLight)) {
    return {
      level: "medium",
      reason: "Its saved care guide recommends moderate, indirect light.",
    };
  }

  if (/cactus|echeveria|lavender|rosemary|thyme|basil|succulent/.test(name)) {
    return {
      level: "direct",
      reason: "This plant commonly needs strong light. Confirm its care guide.",
    };
  }

  if (/snake plant|zz plant|pothos|peace lily/.test(name)) {
    return {
      level: "low",
      reason: "This plant often tolerates lower light, though growth may be slower.",
    };
  }

  if (/spider plant|philodendron|monstera|fern|orchid/.test(name)) {
    return {
      level: "medium",
      reason: "This plant commonly prefers indirect light. Confirm its care guide.",
    };
  }

  return {
    level: "unknown",
    reason: "Eden needs reliable light information before confidently matching this plant.",
  };
}

function scoreMatch(plant: Plant, space: GrowingSpace) {
  const needs = getLightNeeds(plant);

  if (needs.level === "unknown") {
    return {
      score: 0,
      label: "Needs care info",
      message: needs.reason,
    };
  }

  const levels: LightLevel[] = ["low", "medium", "bright", "direct"];
  const distance = Math.abs(
    levels.indexOf(needs.level) - levels.indexOf(space.light)
  );

  if (distance === 0) {
    return {
      score: 3,
      label: "Strong match",
      message: needs.reason,
    };
  }

  if (distance === 1) {
    return {
      score: 2,
      label: "Possible match",
      message: `${needs.reason} This space has a different light level, so monitor the plant for stress.`,
    };
  }

  return {
    score: 1,
    label: "Poor light match",
    message: `${needs.reason} This space may provide too much or too little light.`,
  };
}

function parseLocation(location: string | null) {
  if (!location) return "";
  const separator = location.indexOf(" · ");
  return separator >= 0 ? location.slice(separator + 3) : location;
}

export default function GrowingSpacePlanner({
  plants,
  onPlantUpdated,
}: Props) {
  const { getToken } = useAuth();

  const [spaces, setSpaces] = useState<GrowingSpace[]>([]);
  const [spaceName, setSpaceName] = useState("");
  const [spaceType, setSpaceType] = useState("Windowsill");
  const [light, setLight] = useState<LightLevel>("bright");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPlantId, setSavingPlantId] = useState("");
  const [deletingSpaceId, setDeletingSpaceId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSpaces() {
      try {
        const saved = await listGrowingSpaces(getToken);
        if (!cancelled) setSpaces(saved);
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not load your growing spaces."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSpaces();

    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const recommendations = useMemo(
    () =>
      plants.map((plant) => ({
        plant,
        matches: spaces
          .map((space) => ({
            space,
            ...scoreMatch(plant, space),
          }))
          .sort((a, b) => b.score - a.score),
      })),
    [plants, spaces]
  );

  async function handleAddSpace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = spaceName.trim();
    if (!trimmedName || saving) return;

    setSaving(true);
    setMessage("");

    try {
      const created = await addGrowingSpace(getToken, {
        name: trimmedName,
        type: spaceType,
        light,
      });

      setSpaces((current) => [...current, created]);
      setSpaceName("");
      setMessage(`Added ${created.name}. Saved to your account.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save this space."
      );
    } finally {
      setSaving(false);
    }
  }

  async function assignPlant(plant: Plant, space: GrowingSpace) {
    setSavingPlantId(plant.id);
    setMessage("");

    try {
      const updated = await updatePlant(getToken, plant.id, {
        location: `${space.type} · ${space.name}`,
      });

      onPlantUpdated(updated);
      setMessage(`${plant.name} assigned to ${space.name}.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save placement."
      );
    } finally {
      setSavingPlantId("");
    }
  }

  async function removeSpace(space: GrowingSpace) {
    const assigned = plants.some(
      (plant) => parseLocation(plant.location) === space.name
    );

    if (assigned) {
      setMessage("Move the plants assigned to this space before removing it.");
      return;
    }

    setDeletingSpaceId(space.id);
    setMessage("");

    try {
      await deleteGrowingSpace(getToken, space.id);
      setSpaces((current) =>
        current.filter((item) => item.id !== space.id)
      );
      setMessage(`Removed ${space.name}.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not remove this space."
      );
    } finally {
      setDeletingSpaceId("");
    }
  }

  return (
    <section className="card space-planner">
      <div className="space-planner-heading">
        <div>
          <h2>Growing Space Planner</h2>
          <p>
            Add your spaces and let Eden compare their light with your plants' needs.
          </p>
        </div>
        <span className="space-count">
          {spaces.length} {spaces.length === 1 ? "space" : "spaces"}
        </span>
      </div>

      <form className="space-form" onSubmit={handleAddSpace}>
        <h3>Add a growing space</h3>

        <label>
          Space name
          <input
            className="field"
            value={spaceName}
            onChange={(event) => setSpaceName(event.target.value)}
            placeholder="e.g. Upstairs plant shelf"
            maxLength={70}
            required
          />
        </label>

        <label>
          Space type
          <select
            className="field"
            value={spaceType}
            onChange={(event) => setSpaceType(event.target.value)}
          >
            {SPACE_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label>
          Light this space receives
          <select
            className="field"
            value={light}
            onChange={(event) => setLight(event.target.value as LightLevel)}
          >
            {LIGHT_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </label>

        <button className="btn" type="submit" disabled={saving || loading}>
          {saving ? "Saving..." : "Add space"}
        </button>
      </form>

      {message && (
        <p className="space-message" role="status">{message}</p>
      )}

      {loading ? (
        <p className="space-empty">Loading your saved spaces...</p>
      ) : spaces.length > 0 ? (
        <div className="space-list">
          {spaces.map((space) => (
            <div className="space-group" key={space.id}>
              <div className="space-group-heading">
                <div>
                  <span className="space-type">{space.type}</span>
                  <h3>{space.name}</h3>
                  <p className="space-message">
                    {LIGHT_LEVELS.find((item) => item.value === space.light)?.label}
                  </p>
                </div>
                <button
                  className="btn-soft btn-danger"
                  type="button"
                  disabled={deletingSpaceId === space.id}
                  onClick={() => removeSpace(space)}
                >
                  {deletingSpaceId === space.id ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="space-empty">
          You haven't added any growing spaces yet.
        </p>
      )}

      <h3 className="space-recommendation-title">Plant placement suggestions</h3>

      {plants.length === 0 ? (
        <p className="space-empty">Add plants to your garden to get suggestions.</p>
      ) : spaces.length === 0 ? (
        <p className="space-empty">
          Add a growing space above to start matching plants.
        </p>
      ) : (
        <div className="space-list">
          {recommendations.map(({ plant, matches }) => {
            const best = matches[0];
            const currentLocation = parseLocation(plant.location);

            return (
              <div className="space-group" key={plant.id}>
                <div className="space-group-heading">
                  <div>
                    <h3>{plant.name}</h3>
                    <p className="space-message">
                      {currentLocation
                        ? `Currently assigned: ${currentLocation}`
                        : "Not assigned to a space yet"}
                    </p>
                  </div>
                  {best && (
                    <span className="space-plant-count">{best.label}</span>
                  )}
                </div>

                {best && <p className="space-reason">{best.message}</p>}

                <div className="space-match-list">
                  {matches.map((match) => (
                    <div className="space-match" key={match.space.id}>
                      <div>
                        <strong>{match.space.name}</strong>
                        <span>{match.label}</span>
                      </div>
                      <button
                        className="btn-soft"
                        type="button"
                        disabled={
                          savingPlantId === plant.id ||
                          currentLocation === match.space.name
                        }
                        onClick={() => assignPlant(plant, match.space)}
                      >
                        {savingPlantId === plant.id
                          ? "Saving..."
                          : currentLocation === match.space.name
                            ? "Assigned"
                            : "Assign plant"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="care-note">
        Suggestions are estimates, not guarantees. Check each plant's care guide
        and adjust for your local conditions. Your growing spaces and plant
        assignments are saved to your Eden account.
      </p>
    </section>
  );
}

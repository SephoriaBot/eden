
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@clerk/clerk-react";
import { updatePlant, type Plant } from "./api";

type Props = {
  plants: Plant[];
  onPlantUpdated: (plant: Plant) => void;
};

type LightLevel = "low" | "medium" | "bright" | "direct";

type GrowingSpace = {
  id: string;
  name: string;
  type: string;
  light: LightLevel;
};

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

function readSpaces(): GrowingSpace[] {
  try {
    const saved = localStorage.getItem("eden-growing-spaces");
    return saved ? JSON.parse(saved) as GrowingSpace[] : [];
  } catch {
    return [];
  }
}

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
    careLight = typeof care?.light === "string"
      ? care.light.toLowerCase()
      : "";
  } catch {
    // Use the plant-name fallback below.
  }

  if (
    /direct sun|full sun|several hours of direct|full sunlight/.test(careLight)
  ) {
    return {
      level: "direct",
      reason: "Its saved care guide recommends direct sunlight.",
    };
  }

  if (
    /bright.*indirect|bright indirect|filtered bright/.test(careLight)
  ) {
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

  if (
    /cactus|echeveria|lavender|rosemary|thyme|basil|succulent/.test(name)
  ) {
    return {
      level: "direct",
      reason: "This plant commonly needs strong light. Confirm the species' care guide.",
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
      reason: "This plant commonly prefers indirect light. Confirm its species-specific needs.",
    };
  }

  return {
    level: "unknown",
    reason: "Eden needs a reliable light recommendation before it can confidently match this plant.",
  };
}

function scoreMatch(
  plant: Plant,
  space: GrowingSpace
): { score: number; message: string; label: string } {
  const needs = getLightNeeds(plant);

  if (needs.level === "unknown") {
    return {
      score: 0,
      label: "Needs care info",
      message: needs.reason,
    };
  }

  const levels: LightLevel[] = ["low", "medium", "bright", "direct"];
  const plantLevel = needs.level;
  const spaceLevel = space.light;

  const distance = Math.abs(
    levels.indexOf(plantLevel) - levels.indexOf(spaceLevel)
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
      message: `${needs.reason} This space has a different light level, so monitor the plant for signs of stress.`,
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
  const [spaces, setSpaces] = useState<GrowingSpace[]>(readSpaces);
  const [spaceName, setSpaceName] = useState("");
  const [spaceType, setSpaceType] = useState("Windowsill");
  const [light, setLight] = useState<LightLevel>("bright");
  const [savingPlantId, setSavingPlantId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem("eden-growing-spaces", JSON.stringify(spaces));
  }, [spaces]);

  const recommendations = useMemo(() => {
    return plants.map((plant) => {
      const matches = spaces
        .map((space) => ({
          space,
          ...scoreMatch(plant, space),
        }))
        .sort((a, b) => b.score - a.score);

      return { plant, matches };
    });
  }, [plants, spaces]);

  function addSpace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = spaceName.trim();

    if (!trimmedName) return;

    const duplicate = spaces.some(
      (space) =>
        space.name.toLowerCase() === trimmedName.toLowerCase() &&
        space.type === spaceType
    );

    if (duplicate) {
      setMessage("That growing space already exists.");
      return;
    }

    setSpaces((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: trimmedName,
        type: spaceType,
        light,
      },
    ]);

    setSpaceName("");
    setMessage(`Added ${trimmedName}.`);
  }

  async function assignPlant(plant: Plant, space: GrowingSpace) {
    setSavingPlantId(plant.id);
    setMessage("");

    try {
      const location = `${space.type} · ${space.name}`;
      const updated = await updatePlant(getToken, plant.id, { location });
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

  function removeSpace(space: GrowingSpace) {
    const assigned = plants.some(
      (plant) => parseLocation(plant.location) === space.name
    );

    if (assigned) {
      setMessage("Move the plants assigned to this space before removing it.");
      return;
    }

    setSpaces((current) => current.filter((item) => item.id !== space.id));
    setMessage(`Removed ${space.name}.`);
  }

  return (
    <section className="card space-planner">
      <div className="space-planner-heading">
        <div>
          <h2>Growing Space Planner</h2>
          <p>Add your spaces and let Eden compare their light with your plants' needs.</p>
        </div>
        <span className="space-count">
          {spaces.length} {spaces.length === 1 ? "space" : "spaces"}
        </span>
      </div>

      <form className="space-form" onSubmit={addSpace}>
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

        <button className="btn" type="submit">Add space</button>
      </form>

      {message && <p className="space-message" role="status">{message}</p>}

      {spaces.length > 0 && (
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
                  onClick={() => removeSpace(space)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="space-recommendation-title">Plant placement suggestions</h3>

      {plants.length === 0 ? (
        <p className="space-empty">Add plants to your garden to get suggestions.</p>
      ) : spaces.length === 0 ? (
        <p className="space-empty">
          Add at least one growing space above to start matching plants.
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

                {best && (
                  <p className="space-reason">{best.message}</p>
                )}

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
                        disabled={savingPlantId === plant.id || currentLocation === match.space.name}
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
        and adjust for your local conditions. Space profiles currently stay in
        this browser; plant assignments are saved to your Eden account.
      </p>
    </section>
  );
}

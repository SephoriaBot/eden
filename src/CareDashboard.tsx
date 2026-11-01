import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { updatePlant, type Plant } from "./api";

type Props = {
  plants: Plant[];
  onPlantUpdated: (plant: Plant) => void;
};

type Status = "unwatered" | "overdue" | "today" | "upcoming";

function getInterval(plant: Plant): number {
  return (
    plant.wateringIntervalDays ??
    plant.recommendedWateringIntervalDays ??
    7
  );
}

function getDueDate(plant: Plant): Date {
  return new Date(
    plant.lastWateredAt! +
      getInterval(plant) * 24 * 60 * 60 * 1000
  );
}

function getStatus(plant: Plant): Status {
  if (plant.lastWateredAt == null) return "unwatered";

  const due = getDueDate(plant);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (due.getTime() < today.getTime()) return "overdue";
  if (due.getTime() < tomorrow.getTime()) return "today";
  return "upcoming";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatLastWatered(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return "today";
  }

  return formatDate(date);
}

export default function CareDashboard({
  plants,
  onPlantUpdated,
}: Props) {
  const { getToken } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const unwatered = plants.filter((p) => getStatus(p) === "unwatered");
  const overdue = plants.filter((p) => getStatus(p) === "overdue");
  const dueToday = plants.filter((p) => getStatus(p) === "today");
  const upcoming = plants.filter((p) => getStatus(p) === "upcoming");

  async function markWatered(plant: Plant) {
    setBusyId(plant.id);
    setMessage("");

    try {
      const updated = await updatePlant(getToken, plant.id, {
        lastWateredAt: Date.now(),
      });

      onPlantUpdated(updated);
      setMessage(`${plant.name} marked as watered.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save watering date."
      );
    } finally {
      setBusyId(null);
    }
  }

  function startEditing(plant: Plant) {
    setEditingId(plant.id);
    setDraft(String(getInterval(plant)));
    setMessage("");
  }

  async function saveInterval(plant: Plant, days: number) {
    if (!Number.isInteger(days) || days < 1 || days > 30) {
      setMessage("Enter a whole number of days from 1 to 30.");
      return;
    }

    setBusyId(plant.id);
    setMessage("");

    try {
      const updated = await updatePlant(getToken, plant.id, {
        wateringIntervalDays: days,
      });

      onPlantUpdated(updated);
      setEditingId(null);
      setMessage(
        `${plant.name} will now be watered every ${days} ${
          days === 1 ? "day" : "days"
        }.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save watering interval."
      );
    } finally {
      setBusyId(null);
    }
  }

  function renderTask(plant: Plant, status: Status) {
    const isBusy = busyId === plant.id;
    const interval = getInterval(plant);
    const dueDate =
      plant.lastWateredAt != null ? getDueDate(plant) : null;

    let statusText = "Not watered yet";

    if (status === "overdue" && dueDate) {
      statusText = `Overdue · Due ${formatDate(dueDate)}`;
    } else if (status === "today") {
      statusText = "Due today";
    } else if (status === "upcoming" && dueDate) {
      statusText = `Due ${formatDate(dueDate)}`;
    }

    const suggested = plant.recommendedWateringIntervalDays;
    const isCustom = suggested != null && suggested !== interval;
    const isEditing = editingId === plant.id;

    return (
      <div className="care-task" key={plant.id}>
        <div className="care-task-info">
          <strong>{plant.name}</strong>
          <span>{statusText}</span>

          {plant.lastWateredAt != null && (
            <small>
              Last watered {formatLastWatered(plant.lastWateredAt)}
            </small>
          )}

          {isEditing ? (
            <small>
              Water every{" "}
              <input
                type="number"
                min={1}
                max={30}
                step={1}
                inputMode="numeric"
                value={draft}
                disabled={isBusy}
                onChange={(e) => setDraft(e.target.value)}
                aria-label={`Days between waterings for ${plant.name}`}
                style={{ width: "4.5rem" }}
              />{" "}
              days{" "}
              <button
                className="btn-soft"
                disabled={isBusy}
                onClick={() => saveInterval(plant, Number(draft))}
              >
                Save
              </button>{" "}
              <button
                className="btn-soft"
                disabled={isBusy}
                onClick={() => setEditingId(null)}
              >
                Cancel
              </button>
              {isCustom && (
                <>
                  {" "}
                  <button
                    className="btn-soft"
                    disabled={isBusy}
                    onClick={() => saveInterval(plant, suggested!)}
                  >
                    Use Eden's suggestion ({suggested})
                  </button>
                </>
              )}
            </small>
          ) : (
            <small>
              {isCustom
                ? "Your schedule recommends"
                : plant.category === "unknown" || !plant.category
                ? "Starting estimate"
                : "Eden recommends"}{" "}
              watering every {interval}{" "}
              {interval === 1 ? "day" : "days"}{" "}
              <button
                className="btn-soft"
                disabled={isBusy}
                onClick={() => startEditing(plant)}
              >
                Change
              </button>
            </small>
          )}

          {plant.location && <small>{plant.location}</small>}
        </div>

        <button
          className="btn-soft"
          disabled={isBusy}
          onClick={() => markWatered(plant)}
        >
          {isBusy ? "Saving..." : "Watered"}
        </button>
      </div>
    );
  }

  function renderGroup(title: string, items: Plant[], status: Status) {
    return (
      <section className="care-group" key={title}>
        <h3>
          {title} <span>{items.length}</span>
        </h3>

        {items.length === 0 ? (
          <p className="care-empty">Nothing here right now.</p>
        ) : (
          items.map((plant) => renderTask(plant, status))
        )}
      </section>
    );
  }

  return (
    <section className="card care-dashboard">
      <div className="care-dashboard-heading">
        <div>
          <h2>Plant care</h2>
          <p>Personalized starting points for your little garden.</p>
        </div>

      </div>

      <div className="care-counts">
        <div>
          <strong>{overdue.length}</strong>
          <span>Overdue</span>
        </div>
        <div>
          <strong>{dueToday.length}</strong>
          <span>Due today</span>
        </div>
        <div>
          <strong>{upcoming.length}</strong>
          <span>Upcoming</span>
        </div>
      </div>

      {message && <p className="care-message">{message}</p>}

      {renderGroup("Not watered yet", unwatered, "unwatered")}
      {renderGroup("Overdue", overdue, "overdue")}
      {renderGroup("Due today", dueToday, "today")}
      {renderGroup("Upcoming", upcoming, "upcoming")}

      <p className="care-note">
        These are estimates, not fixed rules. Check the soil before watering;
        light, pot size, soil, and season all affect how quickly a plant dries.
      </p>
    </section>
  );
}
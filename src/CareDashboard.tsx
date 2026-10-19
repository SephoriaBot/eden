
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { updatePlant, type Plant } from "./api";

const INTERVALS = [2, 3, 5, 7, 10, 14, 21, 30];

type Props = {
  plants: Plant[];
  onPlantUpdated: (plant: Plant) => void;
};

type Status = "overdue" | "today" | "upcoming";

function getStatus(plant: Plant): Status {
  if (!plant.lastWateredAt) return "today";

  const nextDue =
    plant.lastWateredAt +
    plant.wateringIntervalDays * 24 * 60 * 60 * 1000;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  if (nextDue < todayStart.getTime()) return "overdue";
  if (nextDue < tomorrowStart.getTime()) return "today";
  return "upcoming";
}

function getDueDate(plant: Plant): Date | null {
  if (!plant.lastWateredAt) return null;

  return new Date(
    plant.lastWateredAt +
      plant.wateringIntervalDays * 24 * 60 * 60 * 1000
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function CareDashboard({
  plants,
  onPlantUpdated,
}: Props) {
  const { getToken } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [message, setMessage] = useState("");

  const overdue = plants.filter((p) => getStatus(p) === "overdue");
  const dueToday = plants.filter((p) => getStatus(p) === "today");
  const upcoming = plants.filter((p) => getStatus(p) === "upcoming");

  async function saveChange(
    plant: Plant,
    changes: {
      wateringIntervalDays?: number;
      lastWateredAt?: number;
    }
  ) {
    setBusyId(plant.id);
    setMessage("");

    try {
      const updated = await updatePlant(getToken, plant.id, changes);
      onPlantUpdated(updated);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save watering schedule."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function enableReminders() {
    if (!("Notification" in window)) {
      setMessage("This browser does not support notifications.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        setRemindersEnabled(true);
        setMessage("Reminders are enabled on this device.");
      } else {
        setRemindersEnabled(false);
        setMessage("Notifications were not enabled. You can change this in browser settings.");
      }
    } catch {
      setMessage("Could not enable notifications in this browser.");
    }
  }

  useEffect(() => {
    if (!("Notification" in window)) return;
    setRemindersEnabled(Notification.permission === "granted");
  }, []);

  useEffect(() => {
    function checkReminders() {
      if (
        !("Notification" in window) ||
        Notification.permission !== "granted" ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      const due = plants.filter(
        (plant) => getStatus(plant) !== "upcoming"
      );

      if (due.length === 0) return;

      const today = new Date().toLocaleDateString();
      const storageKey = `eden-care-reminder-${today}`;

      try {
        if (window.localStorage.getItem(storageKey)) return;

        const names = due.slice(0, 4).map((plant) => plant.name);
        const remaining = due.length - names.length;

        new Notification("Eden: plant care reminder", {
          body:
            `${due.length} plant${due.length === 1 ? "" : "s"} need watering: ` +
            names.join(", ") +
            (remaining > 0 ? ` and ${remaining} more.` : "."),
        });

        window.localStorage.setItem(storageKey, "shown");
      } catch {
        // The dashboard still works if browser storage is unavailable.
      }
    }

    checkReminders();

    const timer = window.setInterval(checkReminders, 60 * 60 * 1000);
    window.addEventListener("focus", checkReminders);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", checkReminders);
    };
  }, [plants, remindersEnabled]);

  function PlantTask({
    plant,
    status,
  }: {
    plant: Plant;
    status: Status;
  }) {
    const dueDate = getDueDate(plant);
    const isBusy = busyId === plant.id;

    return (
      <div className="care-task" key={plant.id}>
        <div className="care-task-info">
          <strong>{plant.name}</strong>
          <span>
            {status === "overdue"
              ? `Overdue${dueDate ? ` · Due ${formatDate(dueDate)}` : ""}`
              : status === "today"
                ? "Due today"
                : `Due ${dueDate ? formatDate(dueDate) : "soon"}`}
          </span>
          {plant.location && <small>{plant.location}</small>}
        </div>

        <div className="care-task-controls">
          <label>
            <span>Water every</span>
            <select
              value={plant.wateringIntervalDays || 7}
              disabled={isBusy}
              onChange={(event) =>
                saveChange(plant, {
                  wateringIntervalDays: Number(event.target.value),
                })
              }
            >
              {INTERVALS.map((days) => (
                <option key={days} value={days}>
                  {days} days
                </option>
              ))}
            </select>
          </label>

          <button
            className="btn-soft"
            disabled={isBusy}
            onClick={() =>
              saveChange(plant, { lastWateredAt: Date.now() })
            }
          >
            {isBusy ? "Saving..." : "Watered"}
          </button>
        </div>
      </div>
    );
  }

  function TaskGroup({
    title,
    items,
    status,
  }: {
    title: string;
    items: Plant[];
    status: Status;
  }) {
    return (
      <section className="care-group">
        <h3>
          {title} <span>{items.length}</span>
        </h3>
        {items.length === 0 ? (
          <p className="care-empty">Nothing here right now.</p>
        ) : (
          items.map((plant) => (
            <PlantTask key={plant.id} plant={plant} status={status} />
          ))
        )}
      </section>
    );
  }

  return (
    <section className="card care-dashboard">
      <div className="care-dashboard-heading">
        <div>
          <h2>Plant care</h2>
          <p>Keep your garden happy, one little task at a time.</p>
        </div>
        <button
          className="btn-soft"
          onClick={enableReminders}
          disabled={remindersEnabled}
        >
          {remindersEnabled ? "Reminders on" : "Enable reminders"}
        </button>
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

      <TaskGroup title="Overdue" items={overdue} status="overdue" />
      <TaskGroup title="Due today" items={dueToday} status="today" />
      <TaskGroup title="Upcoming" items={upcoming} status="upcoming" />

      <p className="care-note">
        Watering intervals are reminders, not a diagnosis of soil moisture.
        Check the soil and each plant’s care guide before watering.
      </p>
    </section>
  );
}

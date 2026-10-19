
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { updatePlant, type Plant } from "./api";

type Props = {
  plants: Plant[];
  onPlantUpdated: (plant: Plant) => void;
};

type Status = "overdue" | "today" | "upcoming";

function getInterval(plant: Plant): number {
  return plant.recommendedWateringIntervalDays ?? 7;
}

function getDueDate(plant: Plant): Date {
  const lastCareDate = plant.lastWateredAt ?? plant.createdAt;
  return new Date(
    lastCareDate + getInterval(plant) * 24 * 60 * 60 * 1000
  );
}

function getStatus(plant: Plant): Status {
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

  async function markWatered(plant: Plant) {
    setBusyId(plant.id);
    setMessage("");

    try {
      const updated = await updatePlant(getToken, plant.id, {
        lastWateredAt: Date.now(),
      });
      onPlantUpdated(updated);
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

  async function enableReminders() {
    if (!("Notification" in window)) {
      setMessage("This browser does not support notifications.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        setRemindersEnabled(true);
        setMessage("Plant reminders are enabled on this device.");
      } else {
        setRemindersEnabled(false);
        setMessage("Notifications weren't enabled. Check your browser settings.");
      }
    } catch {
      setMessage("Could not enable browser notifications.");
    }
  }

  useEffect(() => {
    if ("Notification" in window) {
      setRemindersEnabled(Notification.permission === "granted");
    }
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

      const due = plants.filter((plant) => getStatus(plant) !== "upcoming");
      if (due.length === 0) return;

      const today = new Date().toLocaleDateString();
      const storageKey = `eden-care-reminder-${today}`;

      try {
        if (window.localStorage.getItem(storageKey)) return;

        const names = due.slice(0, 4).map((plant) => plant.name);
        const remaining = due.length - names.length;

        new Notification("Eden: plant care reminder", {
          body:
            `${due.length} plant${due.length === 1 ? "" : "s"} due for watering: ` +
            names.join(", ") +
            (remaining > 0 ? ` and ${remaining} more.` : "."),
        });

        window.localStorage.setItem(storageKey, "shown");
      } catch {
        // Reminders are optional; the dashboard still works without storage.
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
    const interval = getInterval(plant);
    const isBusy = busyId === plant.id;

    return (
      <div className="care-task">
        <div className="care-task-info">
          <strong>{plant.name}</strong>
          <span>
            {status === "overdue"
              ? `Overdue · Due ${formatDate(dueDate)}`
              : status === "today"
                ? "Due today"
                : `Due ${formatDate(dueDate)}`}
          </span>
          <small>
            {plant.category === "unknown" || !plant.category
              ? "Starting estimate"
              : "Eden recommends"}{" "}
            watering every {interval} {interval === 1 ? "day" : "days"}
          </small>
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
          <p>Personalized starting points for your little garden.</p>
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
        These are estimates, not fixed rules. Check the soil before watering;
        light, pot size, soil, and season all affect how quickly a plant dries.
      </p>
    </section>
  );
}

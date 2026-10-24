import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { isPushOn, enablePush, disablePush } from "./push";

// Plant care reminders on/off, shown in the top bar next to the account button.
export default function RemindersButton() {
  const { getToken } = useAuth();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isPushOn()
      .then((value) => {
        if (!cancelled) setOn(value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (on) {
        await disablePush(getToken);
        setOn(false);
      } else {
        await enablePush(getToken);
        setOn(true);
      }
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Could not change reminders."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className="btn-soft"
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
    >
      {on ? "Reminders on" : "Reminders off"}
    </button>
  );
}
// Turns plant care reminders on/off for this device. The browser gives us a
// "push subscription" (an address for this device) which we save on the
// server; the server job (api/care-push.ts) sends reminders to it.

type GetToken = () => Promise<string | null>;

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as
  | string
  | undefined;

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function supported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!VAPID_PUBLIC_KEY
  );
}

// True only when this device is currently subscribed.
export async function isPushOn(): Promise<boolean> {
  if (!supported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.ready;
  return (await reg.pushManager.getSubscription()) !== null;
}

async function send(
  getToken: GetToken,
  method: "POST" | "DELETE",
  body: unknown
) {
  const token = await getToken();
  if (!token) throw new Error("Sign in to turn on plant reminders.");
  const res = await fetch("/api/push-subscription", {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Request failed");
  }
}

export async function enablePush(getToken: GetToken): Promise<void> {
  if (isIos() && !isStandalone()) {
    throw new Error(
      "Add Eden to your Home Screen first, then open it from there to turn on reminders."
    );
  }
  if (!supported()) {
    throw new Error("This browser does not support push notifications.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notifications weren't enabled. Check your browser settings.");
  }

  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        VAPID_PUBLIC_KEY as string
      ) as BufferSource,
    }));

  const json = sub.toJSON();
  try {
    await send(getToken, "POST", {
      endpoint: sub.endpoint,
      keys: json.keys,
    });
  } catch (err) {
    await sub.unsubscribe();
    throw err;
  }

  // Quick confirmation that notifications work on this device.
  await reg.showNotification("Eden", {
    body: "Plant reminders are on.",
    icon: "/edenicon.png",
  });
}

export async function disablePush(getToken: GetToken): Promise<void> {
  if (!supported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await send(getToken, "DELETE", { endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe();
}
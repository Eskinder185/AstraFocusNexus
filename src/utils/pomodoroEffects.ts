import type { MutableRefObject } from "react";

/** Web notification (may prompt if default) */
export async function tryNotify(title: string, body: string) {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {}
  }
  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body, tag: "pomodoro" });
      return true;
    } catch {}
  }
  return false;
}

export function vibrate() {
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch {}
  }
}

export function startTitleFlash(
  store: MutableRefObject<string>,
  handle: MutableRefObject<number | null>
) {
  if (handle.current) return;
  store.current = document.title;
  let on = false;
  handle.current = window.setInterval(() => {
    on = !on;
    document.title = on ? "⏰ Pomodoro done!" : store.current;
  }, 800) as unknown as number;
}

export function flashTitleStop(
  store: MutableRefObject<string>,
  handle: MutableRefObject<number | null>
) {
  if (handle.current) {
    window.clearInterval(handle.current);
    handle.current = null;
    document.title = store.current || document.title;
  }
}

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

export function playChime(audioRef: MutableRefObject<HTMLAudioElement | null>) {
  const a = audioRef.current;
  if (a) {
    a.currentTime = 0;
    a.volume = 1;
    a.play().catch(() => {
      try {
        const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
          || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.6, ctx.currentTime + 0.03);
        osc.start();
        setTimeout(() => {
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
          osc.stop(ctx.currentTime + 0.27);
        }, 230);
      } catch {}
    });
  }
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

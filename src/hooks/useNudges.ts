import { useEffect, useRef } from "react";

export function useBreakNudge(minutes = 50) {
  const lastActive = useRef<number>(Date.now());

  useEffect(() => {
    const onActive = () => (lastActive.current = Date.now());
    window.addEventListener("mousemove", onActive);
    window.addEventListener("keydown", onActive);
    window.addEventListener("click", onActive);

    const iv = setInterval(() => {
      const since = Date.now() - lastActive.current;
      const limit = minutes * 60_000;
      if (since >= limit) {
        // Try Notification API, fallback to alert
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Time for a short break ☕", { body: "You’ve been active for a while — 5 minutes to recharge?" });
        } else {
          // Avoid being too noisy
          alert("Break time: You’ve been working ~" + minutes + " minutes. Take 5 to recharge?");
        }
        lastActive.current = Date.now();
      }
    }, 30_000); // check every 30s

    return () => {
      clearInterval(iv);
      window.removeEventListener("mousemove", onActive);
      window.removeEventListener("keydown", onActive);
      window.removeEventListener("click", onActive);
    };
  }, [minutes]);
}

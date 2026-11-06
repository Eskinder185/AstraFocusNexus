import { useEffect, useState } from "react";

/**
 * Current time, refreshed on an aligned interval (default: each minute) and whenever
 * the tab becomes visible again, so "overdue" and "today" stay correct after sleep.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timeout: number;
    const tick = () => {
      setNow(new Date());
      timeout = window.setTimeout(tick, intervalMs - (Date.now() % intervalMs) + 25);
    };
    timeout = window.setTimeout(tick, intervalMs - (Date.now() % intervalMs) + 25);
    const onVisible = () => document.visibilityState === "visible" && setNow(new Date());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
  return now;
}

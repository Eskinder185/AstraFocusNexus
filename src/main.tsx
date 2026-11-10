import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/shell.css";
import "./styles/pages.css";
import "./styles/pro.css";
import App from "./App";
import { unlockNotificationAudio } from "./lib/notificationSound";

// A browser gesture is needed before scheduled events may play Web Audio.
window.addEventListener("pointerdown", unlockNotificationAudio, { once: true, capture: true });
window.addEventListener("keydown", unlockNotificationAudio, { once: true, capture: true });

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/AstraFocusNexus/sw.js").catch(() => {});
  });
}

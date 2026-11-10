import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MobileNav } from "../components/shell/MobileNav";
import { Sidebar } from "../components/shell/Sidebar";
import { Topbar } from "../components/shell/Topbar";
import { useAppToast } from "../context/AppToast";
import { CommandPalette } from "../features/command/CommandPalette";
import { TaskComposerDialog } from "../features/tasks/TaskComposer";
import { TaskPanel } from "../features/tasks/TaskPanel";
import { useWorkspace } from "../features/workspace/WorkspaceProvider";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { isTypingTarget } from "../lib/platform";
import { NAV_ITEMS } from "./nav";
import { useUI, useUIActions } from "./ui";

const COLLAPSED_KEY = "astra.ui.sidebarCollapsed";
const IDLE_NUDGE_MS = 50 * 60_000;

function useGlobalShortcuts() {
  const navigate = useNavigate();
  const { paletteOpen } = useUI();
  const { openPalette, closePalette, openComposer } = useUIActions();
  const { prefs } = useWorkspace();
  const goPending = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (paletteOpen) closePalette();
        else openPalette();
        return;
      }
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target) || document.querySelector("dialog[open]")) return;

      if (goPending.current != null) {
        window.clearTimeout(goPending.current);
        goPending.current = null;
        const item = NAV_ITEMS.find(i => i.goKey === e.key.toLowerCase());
        if (item && (item.id !== "wellness" || prefs.wellnessEnabled)) {
          e.preventDefault();
          navigate(item.path);
        }
        return;
      }
      switch (e.key) {
        case "c":
        case "C":
          e.preventDefault();
          openComposer();
          break;
        case "/":
          e.preventDefault();
          openPalette();
          break;
        case "?":
          e.preventDefault();
          navigate("/help");
          break;
        case "g":
        case "G":
          goPending.current = window.setTimeout(() => (goPending.current = null), 1200);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, paletteOpen, openPalette, closePalette, openComposer, prefs.wellnessEnabled]);
}

/** Gentle nudge after a long stretch without input (carried over from v0.2). */
function useIdleNudge() {
  const { showToast } = useAppToast();
  useEffect(() => {
    let last = Date.now();
    const onActive = () => (last = Date.now());
    const events = ["pointerdown", "keydown", "pointermove"] as const;
    events.forEach(ev => window.addEventListener(ev, onActive, { passive: true }));
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - last >= IDLE_NUDGE_MS) {
        showToast("You’ve been still for a while. Rest your eyes, stretch, or grab some water.", { durationMs: 14_000 });
        last = Date.now();
      }
    }, 30_000);
    return () => {
      window.clearInterval(id);
      events.forEach(ev => window.removeEventListener(ev, onActive));
    };
  }, [showToast]);
}

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  const location = useLocation();
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1099px)");
  const [collapsedPref, setCollapsedPref] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [tabletExpanded, setTabletExpanded] = useState(false);
  const collapsed = isTablet ? !tabletExpanded : collapsedPref;

  const toggleCollapsed = useCallback(() => {
    if (isTablet) {
      setTabletExpanded(v => !v);
      return;
    }
    setCollapsedPref(v => {
      try {
        localStorage.setItem(COLLAPSED_KEY, String(!v));
      } catch {
        /* ignore */
      }
      return !v;
    });
  }, [isTablet]);

  useGlobalShortcuts();
  useIdleNudge();

  // On navigation: collapse the tablet overlay, reset scroll, and move focus to the new page for screen readers.
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    setTabletExpanded(false);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div className={`app ${collapsed ? "app--collapsed" : ""} ${isTablet && tabletExpanded ? "app--overlay" : ""}`}>
      <a className="skip-link" href="#main" onClick={e => (e.preventDefault(), mainRef.current?.focus())}>
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      {isTablet && tabletExpanded && <div className="sidebar-scrim" onClick={() => setTabletExpanded(false)} aria-hidden />}
      <div className="app__main">
        {!online && <div className="offline-banner" role="status">Offline · changes stay on this device and will be available when you return.</div>}
        <Topbar />
        <main id="main" ref={mainRef} tabIndex={-1} className="page" key={location.pathname}>
          {children}
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
      <TaskComposerDialog />
      <TaskPanel />
    </div>
  );
};

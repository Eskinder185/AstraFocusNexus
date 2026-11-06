import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CornerDownLeft, Moon, Pause, Play, Plus, Search, Sun, Target, Timer } from "lucide-react";
import { NAV_ITEMS } from "../../app/nav";
import { useUI, useUIActions } from "../../app/ui";
import { Dialog } from "../../components/ui/Dialog";
import { Kbd } from "../../components/ui/Kbd";
import { usePomodoro } from "../../context/PomodoroContext";
import { useTheme } from "../../context/ThemeContext";
import { cx } from "../../lib/cx";
import { parseQuickAdd } from "../workspace/quickAdd";
import { useWorkspace, useWorkspaceActions } from "../workspace/WorkspaceProvider";

interface Command {
  id: string;
  group: "Create" | "Actions" | "Go to" | "Tasks" | "Goals";
  label: string;
  hint?: string;
  icon: React.ReactNode;
  keys?: string[];
  run: () => void;
}

/** Simple ranked match: every word must appear; prefix matches rank higher. */
function score(text: string, query: string): number {
  const t = text.toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  let s = 0;
  for (const w of words) {
    const i = t.indexOf(w);
    if (i < 0) return -1;
    s += i === 0 ? 3 : t[i - 1] === " " ? 2 : 1;
  }
  return s;
}

export const CommandPalette: React.FC = () => {
  const { paletteOpen } = useUI();
  const { closePalette } = useUIActions();
  if (!paletteOpen) return null;
  return <PaletteContent onClose={closePalette} />;
};

const PaletteContent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { tasks, goals, prefs } = useWorkspace();
  const { addTask } = useWorkspaceActions();
  const { openTask, openComposer } = useUIActions();
  const { resolved, toggle } = useTheme();
  const pomo = usePomodoro();

  const commands = useMemo<Command[]>(() => {
    const q = query.trim();
    const run = (fn: () => void) => () => {
      onClose();
      fn();
    };
    const out: Command[] = [];

    if (q) {
      const parsed = parseQuickAdd(q, new Date());
      out.push({
        id: "create-task",
        group: "Create",
        label: `Create task “${parsed.title}”`,
        hint: parsed.dueDate || parsed.priority ? "with recognised date/priority" : undefined,
        icon: <Plus size={16} />,
        run: run(() =>
          addTask({ title: parsed.title, dueDate: parsed.dueDate, dueTime: parsed.dueTime, ...(parsed.priority ? { priority: parsed.priority } : {}) })
        ),
      });
    } else {
      out.push({ id: "new-task", group: "Create", label: "New task…", icon: <Plus size={16} />, keys: ["C"], run: run(() => openComposer()) });
    }

    const actions: Command[] = [];
    if (pomo.running) {
      actions.push({ id: "pause", group: "Actions", label: "Pause focus timer", icon: <Pause size={16} />, run: run(pomo.pause) });
    } else if (pomo.phase === "paused") {
      actions.push({ id: "resume", group: "Actions", label: "Resume focus timer", icon: <Play size={16} />, run: run(pomo.resume) });
    } else {
      actions.push({
        id: "focus-25",
        group: "Actions",
        label: `Start a ${pomo.settings.focusMin}-minute focus session`,
        icon: <Timer size={16} />,
        run: run(() => {
          if (pomo.mode !== "focus") pomo.setMode("focus");
          window.setTimeout(() => pomo.start(), 0);
          navigate("/focus");
        }),
      });
    }
    actions.push({
      id: "theme",
      group: "Actions",
      label: `Switch to ${resolved === "dark" ? "light" : "dark"} theme`,
      icon: resolved === "dark" ? <Sun size={16} /> : <Moon size={16} />,
      run: run(toggle),
    });
    out.push(...actions.filter(c => !q || score(c.label, q) >= 0));

    const pages = NAV_ITEMS.filter(i => i.id !== "wellness" || prefs.wellnessEnabled);
    for (const item of pages) {
      if (q && score(item.label, q) < 0) continue;
      const Icon = item.icon;
      out.push({
        id: `nav-${item.id}`,
        group: "Go to",
        label: item.label,
        icon: <Icon size={16} />,
        keys: ["G", item.goKey.toUpperCase()],
        run: run(() => navigate(item.path)),
      });
    }

    if (q) {
      const matches = tasks
        .map(t => ({ t, s: score(`${t.title} ${t.notes}`, q) }))
        .filter(x => x.s >= 0)
        .sort((a, b) => (a.t.status === b.t.status ? b.s - a.s : a.t.status === "todo" ? -1 : 1))
        .slice(0, 6);
      for (const { t } of matches) {
        out.push({
          id: `task-${t.id}`,
          group: "Tasks",
          label: t.title,
          hint: t.status === "done" ? "Completed" : undefined,
          icon: <span className={cx("palette__dot", t.status === "done" && "is-done")} />,
          run: run(() => openTask(t.id)),
        });
      }
      for (const g of goals.filter(g => score(g.title, q) >= 0).slice(0, 4)) {
        out.push({ id: `goal-${g.id}`, group: "Goals", label: `${g.emoji} ${g.title}`, icon: <Target size={16} />, run: run(() => navigate("/goals")) });
      }
    }
    return out;
  }, [query, tasks, goals, prefs.wellnessEnabled, pomo, resolved, toggle, navigate, addTask, openTask, openComposer, onClose]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(a => (a + 1) % Math.max(1, commands.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(a => (a - 1 + commands.length) % Math.max(1, commands.length));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(commands.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      commands[active]?.run();
    }
  };

  let lastGroup = "";
  return (
    <Dialog open onClose={onClose} ariaLabel="Command palette" className="palette">
      <div className="palette__search">
        <Search size={18} aria-hidden className="palette__search-icon" />
        <input
          data-autofocus
          className="palette__input"
          placeholder="Search, jump to a page, or type a new task…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={commands[active] ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          aria-label="Command"
          autoComplete="off"
          spellCheck={false}
        />
        <Kbd keys={["Esc"]} />
      </div>
      <div className="palette__list" id={listId} role="listbox" aria-label="Results" ref={listRef}>
        {commands.length === 0 && <p className="palette__empty">No results.</p>}
        {commands.map((c, i) => {
          const header = c.group !== lastGroup ? c.group : null;
          lastGroup = c.group;
          return (
            <React.Fragment key={c.id}>
              {header && (
                <div className="palette__group" role="presentation">
                  {header}
                </div>
              )}
              <div
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={i === active}
                className={cx("palette__item", i === active && "is-active")}
                onMouseMove={() => i !== active && setActive(i)}
                onClick={c.run}
              >
                <span className="palette__icon" aria-hidden>
                  {c.icon}
                </span>
                <span className="palette__label">{c.label}</span>
                {c.hint && <span className="palette__hint">{c.hint}</span>}
                {c.keys && <Kbd keys={c.keys} />}
                {i === active && <CornerDownLeft size={14} className="palette__enter" aria-hidden />}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </Dialog>
  );
};

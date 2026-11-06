import React from "react";
import { NavLink } from "react-router-dom";
import { HardDrive, PanelLeftClose, PanelLeftOpen, Plus, Search } from "lucide-react";
import { NAV_ITEMS, SECTION_LABELS, type NavItem, type NavSection } from "../../app/nav";
import { useUIActions } from "../../app/ui";
import { formatPomodoroMs, usePomodoro } from "../../context/PomodoroContext";
import { groupOpenTasks } from "../../features/workspace/selectors";
import { useWorkspace } from "../../features/workspace/WorkspaceProvider";
import { useNow } from "../../hooks/useNow";
import { cx } from "../../lib/cx";
import { BrandMark } from "../BrandMark";
import { Kbd } from "../ui/Kbd";

interface Props {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export const Sidebar: React.FC<Props> = ({ collapsed, onToggleCollapsed }) => {
  const { tasks, prefs } = useWorkspace();
  const { openComposer, openPalette } = useUIActions();
  const { showMiniTimer, remainingMs, running } = usePomodoro();
  const now = useNow();

  const groups = groupOpenTasks(tasks, now);
  const dueNow = groups.overdue.length + groups.today.length;

  const items = NAV_ITEMS.filter(i => i.id !== "wellness" || prefs.wellnessEnabled);
  const sections = (["workspace", "execution", "growth", "system"] as NavSection[]).map(s => ({
    id: s,
    items: items.filter(i => i.section === s),
  }));

  const badgeFor = (item: NavItem): React.ReactNode => {
    if (item.id === "tasks" && dueNow > 0) {
      return (
        <span className={cx("nav-badge", groups.overdue.length > 0 && "nav-badge--danger")}>
          {dueNow}
          <span className="visually-hidden">
            {" "}
            due today{groups.overdue.length ? `, ${groups.overdue.length} overdue` : ""}
          </span>
        </span>
      );
    }
    if (item.id === "focus" && showMiniTimer) {
      return (
        <span className={cx("nav-timer tabular", !running && "is-paused")}>
          {formatPomodoroMs(remainingMs)}
          <span className="visually-hidden">{running ? " remaining" : " paused"}</span>
        </span>
      );
    }
    return null;
  };

  return (
    <aside className={cx("sidebar", collapsed && "is-collapsed")} aria-label="Primary">
      <div className="sidebar__brand">
        <BrandMark size={28} />
        <span className="sidebar__wordmark">AstraFocus</span>
        <button
          type="button"
          className="btn btn--ghost btn--icon btn--sm sidebar__collapse"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          data-tooltip={collapsed ? "Expand" : undefined}
        >
          {collapsed ? <PanelLeftOpen size={16} aria-hidden /> : <PanelLeftClose size={16} aria-hidden />}
        </button>
      </div>

      <div className="sidebar__quick">
        <button type="button" className="sidebar__create" onClick={() => openComposer()} data-tooltip={collapsed ? "New task (C)" : undefined}>
          <Plus size={16} aria-hidden />
          <span className="sidebar__label">New task</span>
          <Kbd keys={["C"]} className="sidebar__kbd" />
        </button>
        <button type="button" className="sidebar__search" onClick={openPalette} data-tooltip={collapsed ? "Search" : undefined} aria-label="Search and commands">
          <Search size={16} aria-hidden />
          <span className="sidebar__label">Search</span>
          <Kbd keys={["Mod", "K"]} className="sidebar__kbd" />
        </button>
      </div>

      <nav className="sidebar__nav">
        {sections.map(sec =>
          sec.items.length ? (
            <div key={sec.id} className={cx("nav-section", sec.id === "system" && "nav-section--system")}>
              {SECTION_LABELS[sec.id] && <p className="nav-section__label">{SECTION_LABELS[sec.id]}</p>}
              <ul role="list">
                {sec.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <NavLink
                        to={item.path}
                        end={item.path === "/"}
                        className={({ isActive }) => cx("nav-link", isActive && "is-active")}
                        data-tooltip={collapsed ? item.label : undefined}
                      >
                        <Icon size={17} aria-hidden className="nav-link__icon" />
                        <span className="sidebar__label nav-link__label">{item.label}</span>
                        {badgeFor(item)}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null
        )}
      </nav>

      <div className="sidebar__footer" data-tooltip={collapsed ? "Saved on this device" : undefined}>
        <HardDrive size={14} aria-hidden />
        <span className="sidebar__label">Saved on this device</span>
      </div>
    </aside>
  );
};

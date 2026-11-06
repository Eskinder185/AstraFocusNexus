import React from "react";
import { useLocation } from "react-router-dom";
import { Moon, Plus, Search, Sun } from "lucide-react";
import { navItemForPath } from "../../app/nav";
import { useUIActions } from "../../app/ui";
import { useTheme } from "../../context/ThemeContext";
import { BrandMark } from "../BrandMark";
import { Kbd } from "../ui/Kbd";
import { TimerPill } from "./TimerPill";

export const Topbar: React.FC = () => {
  const { pathname } = useLocation();
  const { openPalette, openComposer } = useUIActions();
  const { resolved, toggle } = useTheme();
  const current = navItemForPath(pathname);

  return (
    <header className="topbar">
      <div className="topbar__left">
        <span className="topbar__mobile-brand">
          <BrandMark size={26} />
        </span>
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <ol role="list">
            <li className="breadcrumb__root">Personal</li>
            <li aria-current="page">{current?.label ?? "AstraFocus"}</li>
          </ol>
        </nav>
      </div>
      <div className="topbar__right">
        <TimerPill />
        <button type="button" className="topbar__search" onClick={openPalette} aria-label="Search and commands">
          <Search size={15} aria-hidden />
          <span className="topbar__search-text">Search or jump to…</span>
          <Kbd keys={["Mod", "K"]} />
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--icon"
          onClick={toggle}
          aria-label={`Switch to ${resolved === "dark" ? "light" : "dark"} theme`}
          title={`Switch to ${resolved === "dark" ? "light" : "dark"} theme`}
        >
          {resolved === "dark" ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
        </button>
        <button type="button" className="btn btn--primary topbar__create" onClick={() => openComposer()} aria-label="New task">
          <Plus size={16} aria-hidden />
          <span className="topbar__create-text">New task</span>
        </button>
      </div>
    </header>
  );
};

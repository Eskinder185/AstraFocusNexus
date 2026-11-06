import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Ellipsis, Moon, Sun } from "lucide-react";
import { NAV_ITEMS } from "../../app/nav";
import { useTheme } from "../../context/ThemeContext";
import { useWorkspace } from "../../features/workspace/WorkspaceProvider";
import { cx } from "../../lib/cx";
import { Dialog } from "../ui/Dialog";

/** Bottom navigation for small screens: four destinations plus a "More" sheet. */
export const MobileNav: React.FC = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const { prefs } = useWorkspace();
  const { pathname } = useLocation();
  const { resolved, toggle } = useTheme();

  const primary = NAV_ITEMS.filter(i => i.mobile);
  const more = NAV_ITEMS.filter(i => !i.mobile && (i.id !== "wellness" || prefs.wellnessEnabled));
  const moreActive = more.some(i => pathname.startsWith(i.path));

  return (
    <>
      <nav className="mobile-nav" aria-label="Primary">
        {primary.map(item => {
          const Icon = item.icon;
          return (
            <NavLink key={item.id} to={item.path} end={item.path === "/"} className={({ isActive }) => cx("mobile-nav__item", isActive && "is-active")}>
              <Icon size={20} aria-hidden />
              <span>{item.mobileLabel ?? item.label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          className={cx("mobile-nav__item", moreActive && "is-active")}
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
        >
          <Ellipsis size={20} aria-hidden />
          <span>More</span>
        </button>
      </nav>

      <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="dialog__body more-sheet">
          <ul role="list">
            {more.map(item => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <NavLink to={item.path} className="more-sheet__link" onClick={() => setMoreOpen(false)}>
                    <Icon size={18} aria-hidden />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
            <li>
              <button type="button" className="more-sheet__link" onClick={toggle}>
                {resolved === "dark" ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
                {resolved === "dark" ? "Light theme" : "Dark theme"}
              </button>
            </li>
          </ul>
        </div>
      </Dialog>
    </>
  );
};

import React from "react";
import { cx } from "../../lib/cx";
import { MOD_LABEL } from "../../lib/platform";

/** Renders a key combination, e.g. <Kbd keys={["Mod", "K"]} />. "Mod" becomes ⌘ or Ctrl. */
export const Kbd: React.FC<{ keys: string[]; className?: string }> = ({ keys, className }) => (
  <span className={cx("kbd", className)} aria-hidden>
    {keys.map(k => (
      <kbd key={k}>{k === "Mod" ? MOD_LABEL : k}</kbd>
    ))}
  </span>
);

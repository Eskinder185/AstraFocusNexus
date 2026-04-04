import React from "react";

export interface ToolEmptyProps {
  title: string;
  body: string;
  /** e.g. "📋" — decorative */
  icon?: string;
  className?: string;
  children?: React.ReactNode;
}

/** Compact empty / hint block for tool pages (matrix cells, goals, etc.) */
const ToolEmpty: React.FC<ToolEmptyProps> = ({ title, body, icon, className = "", children }) => (
  <div className={`tool-empty ${className}`.trim()} role="status">
    {icon ? (
      <span className="tool-empty__icon" aria-hidden>
        {icon}
      </span>
    ) : null}
    <p className="tool-empty__title">{title}</p>
    <p className="tool-empty__body">{body}</p>
    {children}
  </div>
);

export default ToolEmpty;

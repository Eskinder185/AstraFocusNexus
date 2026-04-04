import React from "react";

export interface ToolSectionProps {
  title: string;
  lede?: string;
  /** Applied to outer section wrapper */
  className?: string;
  /** Extra classes on the inner card */
  cardClassName?: string;
  children: React.ReactNode;
}

/**
 * Shared “tool card” shell: title + optional lede + body, aligned with Home task form hierarchy.
 */
const ToolSection: React.FC<ToolSectionProps> = ({
  title,
  lede,
  className = "",
  cardClassName = "",
  children,
}) => (
  <section className={`tool-section ${className}`.trim()}>
    <div className={`card tool-section__card ${cardClassName}`.trim()}>
      <header className="tool-section__header">
        <h2 className="tool-section__title">{title}</h2>
        {lede ? <p className="tool-section__lede">{lede}</p> : null}
      </header>
      <div className="tool-section__body">{children}</div>
    </div>
  </section>
);

export default ToolSection;

import React from "react";

interface Props {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<Props> = ({ title, description, eyebrow, actions }) => (
  <header className="page-header">
    <div className="page-header__text">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="page-header__title">{title}</h1>
      {description && <p className="page-header__desc">{description}</p>}
    </div>
    {actions && <div className="page-header__actions">{actions}</div>}
  </header>
);

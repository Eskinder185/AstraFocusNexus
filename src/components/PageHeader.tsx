import React from "react";

export interface PageHeaderProps {
  icon: string;
  title: string;
  subtitle?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ icon, title, subtitle }) => {
  return (
    <header className="page-header">
      <div className="page-header__inner">
        <h1 className="page-title">
          <span className="page-icon" aria-hidden>
            {icon}
          </span>
          <span className="title-anim underline-sweep">{title}</span>
        </h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>
    </header>
  );
};

export default PageHeader;

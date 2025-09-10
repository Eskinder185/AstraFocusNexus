import React from "react";

const PageHeader: React.FC<{ icon: string; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => {
  return (
    <div className="page-header">
      <h1 className="page-title">
        <span className="page-icon" aria-hidden>{icon}</span>
        <span className="title-anim">{title}</span>
      </h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
  );
};

export default PageHeader;

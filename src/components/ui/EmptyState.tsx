import React from "react";
import { cx } from "../../lib/cx";

interface Props {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  compact?: boolean;
}

export const EmptyState: React.FC<Props> = ({ icon, title, children, actions, compact }) => (
  <div className={cx("empty", compact && "empty--compact")}>
    <div className="empty__icon" aria-hidden>
      {icon}
    </div>
    <p className="empty__title">{title}</p>
    {children && <div className="empty__body">{children}</div>}
    {actions && <div className="empty__actions">{actions}</div>}
  </div>
);

import {
  CalendarDays,
  ChartNoAxesCombined,
  CircleHelp,
  Grid2x2,
  LayoutDashboard,
  Leaf,
  ListChecks,
  Settings,
  Target,
  Timer,
  type LucideIcon,
} from "lucide-react";

export type NavSection = "workspace" | "execution" | "growth" | "system";

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  section: NavSection;
  /** Second key of the "G then …" navigation shortcut. */
  goKey: string;
  /** Shown in the mobile bottom bar (others live under "More"). */
  mobile?: boolean;
  mobileLabel?: string;
}

/**
 * Only shipped features appear here. Projects, Notes, Habits and
 * team features are on the roadmap (docs/IMPLEMENTATION_ROADMAP.md) and are not shown
 * until they work.
 */
export const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", path: "/", icon: LayoutDashboard, section: "workspace", goKey: "o", mobile: true, mobileLabel: "Today" },
  { id: "tasks", label: "Tasks", path: "/tasks", icon: ListChecks, section: "workspace", goKey: "t", mobile: true },
  { id: "calendar", label: "Calendar", path: "/calendar", icon: CalendarDays, section: "workspace", goKey: "c", mobile: true },
  { id: "focus", label: "Focus Studio", path: "/focus", icon: Timer, section: "execution", goKey: "f", mobile: true, mobileLabel: "Focus" },
  { id: "matrix", label: "Priority Matrix", path: "/matrix", icon: Grid2x2, section: "execution", goKey: "m" },
  { id: "goals", label: "Goals", path: "/goals", icon: Target, section: "growth", goKey: "g" },
  { id: "analytics", label: "Analytics", path: "/analytics", icon: ChartNoAxesCombined, section: "growth", goKey: "a" },
  { id: "wellness", label: "Wellness", path: "/wellness", icon: Leaf, section: "growth", goKey: "w" },
  { id: "settings", label: "Settings", path: "/settings", icon: Settings, section: "system", goKey: "s" },
  { id: "help", label: "Help & shortcuts", path: "/help", icon: CircleHelp, section: "system", goKey: "h" },
];

export const SECTION_LABELS: Record<NavSection, string> = {
  workspace: "Workspace",
  execution: "Execution",
  growth: "Growth",
  system: "",
};

export function navItemForPath(pathname: string): NavItem | undefined {
  if (pathname === "/") return NAV_ITEMS[0];
  return NAV_ITEMS.find(i => i.path !== "/" && pathname.startsWith(i.path));
}

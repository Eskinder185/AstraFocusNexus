export type Filter = "all" | "active" | "completed" | "matrix";

export type Priority = "UI" | "UN" | "NI" | "NN"; // Urgent+Important, Urgent+Not, Not urgent+Important, Not+Not

export type TaskStatus = "todo" | "in-progress" | "completed" | "archived";

export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "custom";

export interface Recurrence {
  type: RecurrenceType;
  interval: number;
  daysOfWeek?: number[]; // 0-6, 0 is Sunday
  customInterval?: number;
}

export interface ReminderSettings {
  id: string;
  taskId: number;
  scheduledTimestamp: number;
  status: "pending" | "dismissed" | "snoozed";
  recurrence?: Recurrence;
  snoozeUntil?: number;
  dismissedAt?: number;
  lastNotifiedAt?: number;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  startDate: string | null;
  projectId: number | null;
  tags: string[];
  subtasks: Task[];
  recurrence: Recurrence;
  reminderSettings: ReminderSettings | null;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  pomos?: number;
  goalId?: number | null;
}

export interface Goal {
  id: number;
  title: string;
  emoji?: string;
  color?: string;
}

export interface WellnessEntry {
  date: string; // YYYY-MM-DD
  mood: number; // 1..5
  stress: number; // 0..10
}

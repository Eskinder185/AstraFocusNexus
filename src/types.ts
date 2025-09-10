export type Filter = "all" | "active" | "completed" | "matrix";

export type Priority = "UI" | "UN" | "NI" | "NN"; // Urgent+Important, Urgent+Not, Not urgent+Important, Not+Not

export interface Task {
  id: number;
  text: string;
  completed: boolean;
  createdAt: number;
  dueAt?: string;
  remind?: boolean;
  notified?: boolean;
  // Pomodoro stats
  pomos?: number;
  // Phase 2 additions
  priority?: Priority;
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

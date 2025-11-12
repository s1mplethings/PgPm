export type Status = 'Now' | 'Next' | 'Later' | 'Blocked' | 'Done';
export type Priority = 'P0' | 'P1' | 'P2';

export interface Task {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  plan_start?: string;
  plan_end?: string;
  due?: string;
  owner?: string;
  hours?: number;
  api?: number;
  cost?: number;
  impact?: number;
  risk?: number;
  blocked_by?: string[];
  progress?: number;
}

export interface Settings {
  version: number;
  mode: 'rule' | 'deadline' | 'cost';
  hard_limits: { wip_per_owner: number; due_within_hours_priority: number };
  weights: {
    priority: number;
    urgency: number;
    capacity_fit: number;
    budget_headroom: number;
  };
  penalties: { blocked: number; over_budget: number };
  focus_mode_on_accept: boolean;
  columns: Status[];
}

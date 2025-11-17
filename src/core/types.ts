export type Status = 'Inbox' | 'Now' | 'Next' | 'Later' | 'Blocked' | 'Done';
export type Priority = 'P0' | 'P1' | 'P2';

export type Task = {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  owner?: string;
  plan_start?: string;
  plan_end?: string;
  due?: string;
  hours?: number;
  api?: number;
  cost?: number;
  impact?: number;
  risk?: number;
  blocked_by?: string[];
  progress?: number;
  project_id?: string | null;
  labels?: string[];
  created_at?: string;
  updated_at?: string;
};

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

export type TaskType = 'task' | 'milestone' | 'project';

export interface PgTask {
  id: string;
  name: string;
  type: TaskType;
  start: Date;
  end: Date;
  progress: number;
  assignee?: string;
  dependencies: string[];
  costPlan?: number;
  costActual?: number;
  baseline?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
}

export interface ValidationIssue {
  id: string;
  taskId: string;
  level: 'error' | 'warn';
  message: string;
}

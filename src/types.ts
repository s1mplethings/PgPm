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

export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed';
export type TaskPriority = 'P0' | 'P1' | 'P2';

export interface Task {
  id: string;
  name: string;
  owner: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  startDate: string;
  endDate: string;
  isMilestone: boolean;
  baselineStart?: string;
  baselineEnd?: string;
  dependencyIds: string[];
  estimatedHours: number;
  actualHours: number;
  dailyCapacity: number | null;
  budget: number;
  apiExpected: number;
  apiActual: number;
  subscriptionMonthly: number;
  billingModel?: string;
  notes?: string;
}

export interface CostLine {
  dimension: 'task' | 'owner' | 'month';
  key: string;
  totalBudget: number;
  totalSubscription: number;
  apiExpected: number;
  apiActual: number;
  variance: number;
  forecast: number;
}

export type ViewKey = 'gantt' | 'table' | 'cost' | 'resource' | 'dashboard';

export interface ProjectSettings {
  projectName: string;
  timelineStart: string;
  timelineDays: number;
  scale: 'day' | 'week' | 'month';
  timezone: string;
  locale: string;
  resourceDailyLimit: number;
  budgetThresholdWarning: number;
  budgetThresholdCritical: number;
  disableWeekendMilestones: boolean;
  strictOverAllocation: boolean;
}

export interface FilterState {
  status: TaskStatus[];
  owners: string[];
  tags: string[];
  search: string;
}

export interface ValidationIssue {
  taskId: string;
  field: keyof Task | 'dependency';
  message: string;
  severity: 'error' | 'warning';
}

export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed';
export type TaskPriority = 'P0' | 'P1' | 'P2';
export type TaskType = 'task' | 'milestone';

export interface Task {
  id: string;
  name: string;
  owner: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  startDate: string;
  endDate: string;
  type: TaskType;
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

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationFix {
  label: string;
  action: 'shiftWeekendMilestone';
  payload?: Record<string, unknown>;
}

export interface ValidationIssue {
  code: 'T001' | 'T002' | 'B001' | string;
  taskId: string;
  field: keyof Task | 'dependency' | 'budget';
  message: string;
  severity: ValidationSeverity;
  fix?: ValidationFix;
}

export type UsageSource = 'manual' | 'copilot' | 'api';
export type UsageUnit = 'hour' | 'point' | 'currency';

export interface UsageLog {
  id: string;
  taskId: string | null;
  taskName?: string;
  date: string;
  spent: number;
  unit: UsageUnit;
  source: UsageSource;
  cost?: number;
  currency?: string;
  note?: string;
  createdAt: string;
}

export interface UsageSummary {
  total: number;
  byTask: Record<
    string,
    {
      taskId: string | null;
      taskName: string;
      spent: number;
      cost?: number;
    }
  >;
  bySource: Record<UsageSource, number>;
}

export interface PersistedProjectData {
  tasks: Task[];
  settings: ProjectSettings;
  usageLogs: UsageLog[];
  updatedAt: string;
}

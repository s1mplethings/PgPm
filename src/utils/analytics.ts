import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  formatISO,
  parseISO,
  startOfDay
} from 'date-fns';
import type { CostLine, ProjectSettings, Task, UsageLog, ValidationIssue } from '../types';
import { isWeekend, nextBusinessDay, todayIso } from './dates';

const ensureDate = (value: string) => startOfDay(parseISO(value));

export const generateSpanDates = (start: string, span: number) => {
  const dates: string[] = [];
  const base = ensureDate(start);
  for (let i = 0; i < span; i += 1) {
    dates.push(formatISO(addDays(base, i), { representation: 'date' }));
  }
  return dates;
};

export const detectValidationIssues = (
  tasks: Task[],
  settings: ProjectSettings,
  usageLogs: UsageLog[]
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const today = todayIso();

  tasks.forEach((task) => {
    const start = ensureDate(task.startDate);
    const end = ensureDate(task.endDate);

    if (end < start) {
      issues.push({
        code: 'T001',
        taskId: task.id,
        field: 'endDate',
        message: '结束时间不得早于开始时间',
        severity: 'error'
      });
    }

    if (task.type === 'milestone' && task.startDate !== task.endDate) {
      issues.push({
        code: 'T001',
        taskId: task.id,
        field: 'endDate',
        message: '里程碑须保持零工期：开始=结束',
        severity: 'error'
      });
    }

    if (task.type === 'milestone' && settings.disableWeekendMilestones && isWeekend(start)) {
      issues.push({
        code: 'T002',
        taskId: task.id,
        field: 'startDate',
        message: '里程碑位于周末，可顺延到下一个工作日',
        severity: 'warning',
        fix: {
          label: '顺延到周一',
          action: 'shiftWeekendMilestone',
          payload: {
            taskId: task.id,
            suggestedDate: nextBusinessDay(task.startDate)
          }
        }
      });
    }

    if (!task.baselineStart || !task.baselineEnd) {
      issues.push({
        code: 'T001',
        taskId: task.id,
        field: 'baselineStart',
        message: '建议为任务设置基线以便对比偏差',
        severity: 'info'
      });
    }

    if (task.type === 'task' && today > task.endDate && task.status !== 'completed') {
      issues.push({
        code: 'T001',
        taskId: task.id,
        field: 'endDate',
        message: '任务已过期但尚未完成，建议跟进进度',
        severity: 'warning'
      });
    }
  });

  const budgetTotal = tasks.reduce((sum, task) => sum + task.budget, 0);
  if (budgetTotal > 0) {
    const currentMonth = today.slice(0, 7);
    const actual = usageLogs
      .filter((log) => log.date.startsWith(currentMonth))
      .reduce((sum, log) => sum + (typeof log.cost === 'number' ? log.cost : log.spent), 0);
    const ratio = actual / budgetTotal;
    if (ratio >= settings.budgetThresholdCritical) {
      issues.push({
        code: 'B001',
        taskId: 'PROJECT',
        field: 'budget',
        message: `本月消耗已达到预算的 ${(ratio * 100).toFixed(0)}%`,
        severity: 'error'
      });
    } else if (ratio >= settings.budgetThresholdWarning) {
      issues.push({
        code: 'B001',
        taskId: 'PROJECT',
        field: 'budget',
        message: `本月消耗已使用 ${(ratio * 100).toFixed(0)}%，接近预算阈值`,
        severity: 'warning'
      });
    }
  }

  return issues;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export const buildCostLines = (tasks: Task[], settings: ProjectSettings): CostLine[] => {
  const lines: CostLine[] = [];
  const push = (dimension: CostLine['dimension'], key: string, items: Task[]) => {
    const totalBudget = items.reduce((sum, task) => sum + task.budget, 0);
    const totalSubscription = items.reduce((sum, task) => sum + task.subscriptionMonthly, 0);
    const apiExpected = items.reduce((sum, task) => sum + task.apiExpected, 0);
    const apiActual = items.reduce((sum, task) => sum + task.apiActual, 0);
    const variance = apiActual - apiExpected;
    const forecast = apiActual + (apiActual - apiExpected) * settings.budgetThresholdWarning;
    lines.push({
      dimension,
      key,
      totalBudget: round2(totalBudget),
      totalSubscription: round2(totalSubscription),
      apiExpected: round2(apiExpected),
      apiActual: round2(apiActual),
      variance: round2(variance),
      forecast: round2(forecast)
    });
  };

  tasks.forEach((task) => push('task', task.id, [task]));

  const ownerMap = new Map<string, Task[]>();
  tasks.forEach((task) => {
    if (!task.owner) return;
    if (!ownerMap.has(task.owner)) ownerMap.set(task.owner, []);
    ownerMap.get(task.owner)!.push(task);
  });
  ownerMap.forEach((items, owner) => push('owner', owner, items));

  const monthMap = new Map<string, Task[]>();
  tasks.forEach((task) => {
    const monthKey = task.startDate.slice(0, 7);
    if (!monthMap.has(monthKey)) monthMap.set(monthKey, []);
    monthMap.get(monthKey)!.push(task);
  });
  monthMap.forEach((items, key) => push('month', key, items));

  return lines;
};

export interface ResourceHeatmap {
  matrix: Record<string, Record<string, number>>;
  owners: string[];
  dates: string[];
  overAllocated: Array<{ owner: string; date: string; overBy: number; taskId: string }>;
}

export const deriveResourceMap = (
  tasks: Task[],
  settings: ProjectSettings
): ResourceHeatmap => {
  const owners = Array.from(new Set(tasks.map((task) => task.owner).filter(Boolean))) as string[];
  const dates = generateSpanDates(settings.timelineStart, settings.timelineDays);
  const matrix: Record<string, Record<string, number>> = {};
  const overAllocated: ResourceHeatmap['overAllocated'] = [];

  owners.forEach((owner) => {
    matrix[owner] = {};
    dates.forEach((date) => {
      matrix[owner][date] = 0;
    });
  });

  tasks.forEach((task) => {
    if (!task.owner) return;
    const start = ensureDate(task.startDate);
    const end = ensureDate(task.endDate);
    const interval = eachDayOfInterval({ start, end });
    const workingDays = interval.filter((day) => !isWeekend(day));
    const daysCount = workingDays.length || interval.length || 1;
    const perDay = task.estimatedHours / daysCount;
    workingDays.forEach((day) => {
      const key = formatISO(day, { representation: 'date' });
      matrix[task.owner!][key] = (matrix[task.owner!][key] || 0) + perDay;
      const limit = task.dailyCapacity ?? settings.resourceDailyLimit;
      if (matrix[task.owner!][key] > limit) {
        overAllocated.push({
          owner: task.owner!,
          date: key,
          overBy: matrix[task.owner!][key] - limit,
          taskId: task.id
        });
      }
    });
  });

  return { matrix, owners, dates, overAllocated };
};

export const filterTasks = (tasks: Task[], _filters: Partial<ProjectSettings>) => {
  return tasks;
};

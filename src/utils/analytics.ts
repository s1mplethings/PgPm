import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  formatISO,
  isBefore,
  isEqual,
  isSaturday,
  isSunday,
  parseISO,
  startOfDay
} from 'date-fns';
import type {
  CostLine,
  ProjectSettings,
  Task,
  ValidationIssue
} from '../types';

const ensureDate = (value: string) => startOfDay(parseISO(value));

const isWeekend = (date: Date) => isSaturday(date) || isSunday(date);

export const generateSpanDates = (start: string, span: number) => {
  const dates: string[] = [];
  const base = ensureDate(start);
  for (let i = 0; i < span; i += 1) {
    dates.push(formatISO(addDays(base, i), { representation: 'date' }));
  }
  return dates;
};

const isDependencyValid = (tasks: Task[]) => {
  const seen = new Set<string>();
  const visit = (task: Task, stack: Set<string>): boolean => {
    if (stack.has(task.id)) {
      return false;
    }
    if (seen.has(task.id)) {
      return true;
    }
    stack.add(task.id);
    for (const depId of task.dependencyIds) {
      const dep = tasks.find((t) => t.id === depId);
      if (!dep) continue;
      if (!visit(dep, stack)) {
        return false;
      }
    }
    stack.delete(task.id);
    seen.add(task.id);
    return true;
  };
  return tasks.every((task) => visit(task, new Set<string>()));
};

const collectDependencyCycles = (tasks: Task[]): ValidationIssue[] => {
  const visited = new Set<string>();
  const stack = new Set<string>();
  const issues: ValidationIssue[] = [];
  const visit = (task: Task) => {
    if (stack.has(task.id)) {
      issues.push({
        taskId: task.id,
        field: 'dependency',
        message: '存在依赖环，请检查依赖关系。',
        severity: 'error'
      });
      return;
    }
    if (visited.has(task.id)) return;
    visited.add(task.id);
    stack.add(task.id);
    for (const depId of task.dependencyIds) {
      const dep = tasks.find((t) => t.id === depId);
      if (dep) {
        visit(dep);
      }
    }
    stack.delete(task.id);
  };
  tasks.forEach(visit);
  return issues;
};

export const detectValidationIssues = (
  tasks: Task[],
  settings: ProjectSettings
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const idSet = new Set<string>();
  const seenIds = new Set<string>();

  for (const task of tasks) {
    if (seenIds.has(task.id)) {
      issues.push({
        taskId: task.id,
        field: 'id',
        message: 'ID 必须唯一。',
        severity: 'error'
      });
    }
    seenIds.add(task.id);
    idSet.add(task.id);
    const start = ensureDate(task.startDate);
    const end = ensureDate(task.endDate);

    if (isBefore(end, start)) {
      issues.push({
        taskId: task.id,
        field: 'endDate',
        message: '结束日期不得早于开始日期。',
        severity: 'error'
      });
    }

    if (task.isMilestone && !isEqual(start, end)) {
      issues.push({
        taskId: task.id,
        field: 'endDate',
        message: '里程碑需零工期（开始=结束）。',
        severity: 'error'
      });
    }

    if (task.isMilestone && settings.disableWeekendMilestones && isWeekend(start)) {
      issues.push({
        taskId: task.id,
        field: 'startDate',
        message: '里程碑不可落在周末，请调整日期。',
        severity: 'error'
      });
    }

    for (const depId of task.dependencyIds) {
      if (!idSet.has(depId) && !tasks.some((t) => t.id === depId)) {
        issues.push({
          taskId: task.id,
          field: 'dependency',
          message: `依赖 ID ${depId} 不存在。`,
          severity: 'error'
        });
      }
      if (depId === task.id) {
        issues.push({
          taskId: task.id,
          field: 'dependency',
          message: '不可自引用依赖。',
          severity: 'error'
        });
      }
    }

    if (task.budget < 0 || task.subscriptionMonthly < 0) {
      issues.push({
        taskId: task.id,
        field: 'budget',
        message: '预算与订阅费用需为非负。',
        severity: 'error'
      });
    }
    if (task.apiExpected < 0 || task.apiActual < 0) {
      issues.push({
        taskId: task.id,
        field: 'apiExpected',
        message: 'API 用量需为非负。',
        severity: 'error'
      });
    }
    if (task.actualHours < 0 || task.estimatedHours < 0) {
      issues.push({
        taskId: task.id,
        field: 'estimatedHours',
        message: '工时需为非负。',
        severity: 'error'
      });
    }
  }

  for (const task of tasks) {
    const start = ensureDate(task.startDate);
    for (const depId of task.dependencyIds) {
      const dep = tasks.find((t) => t.id === depId);
      if (!dep) continue;
      const depEnd = ensureDate(dep.endDate);
      if (isBefore(start, depEnd)) {
        issues.push({
          taskId: task.id,
          field: 'startDate',
          message: `开始日期需晚于依赖 ${dep.id} 的结束日期。`,
          severity: 'error'
        });
      }
    }
  }

  if (!isDependencyValid(tasks)) {
    issues.push(...collectDependencyCycles(tasks));
  }

  const resourceMap = deriveResourceMap(tasks, settings);
  resourceMap.overAllocated.forEach((row) => {
    issues.push({
      taskId: row.taskId,
      field: 'owner',
      message: `${row.owner} 在 ${row.date} 超配 ${row.overBy.toFixed(1)} 小时。`,
      severity: settings.strictOverAllocation ? 'error' : 'warning'
    });
  });

  return issues;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export const buildCostLines = (
  tasks: Task[],
  settings: ProjectSettings
): CostLine[] => {
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

export const filterTasks = (tasks: Task[], filters: Partial<ProjectSettings>) => {
  // Placeholder if needed for future global filters.
  return tasks;
};

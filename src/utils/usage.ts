import { formatISO, isSameMonth, parseISO } from 'date-fns';
import { nanoid } from 'nanoid';
import type { Task, UsageLog, UsageSummary } from '../types';

export const createUsageLog = (partial: Omit<UsageLog, 'id' | 'createdAt'>): UsageLog => ({
  ...partial,
  id: `U-${nanoid(8)}`,
  createdAt: formatISO(new Date())
});

export const summarizeUsage = (logs: UsageLog[]): UsageSummary => {
  const summary: UsageSummary = {
    total: 0,
    byTask: {},
    bySource: {
      manual: 0,
      copilot: 0,
      api: 0
    }
  };
  logs.forEach((log) => {
    summary.total += log.spent;
    summary.bySource[log.source] = (summary.bySource[log.source] ?? 0) + log.spent;
    const key = log.taskId ?? 'unassigned';
    if (!summary.byTask[key]) {
      summary.byTask[key] = {
        taskId: log.taskId,
        taskName: log.taskName ?? (log.taskId ? log.taskId : 'δ���䡾'),
        spent: 0,
        cost: 0
      };
    }
    summary.byTask[key].spent += log.spent;
    if (typeof log.cost === 'number') {
      summary.byTask[key].cost = (summary.byTask[key].cost ?? 0) + log.cost;
    }
  });
  return summary;
};

export const monthUsageTotal = (logs: UsageLog[], reference: Date = new Date()) => {
  return logs
    .filter((log) => isSameMonth(parseISO(log.date), reference))
    .reduce((sum, log) => sum + log.cost ?? 0, 0);
};

export const mapUsageToTasks = (logs: UsageLog[], tasks: Task[]) => {
  const taskNameMap = new Map(tasks.map((task) => [task.id, task.name]));
  return logs.map((log) => {
    if (log.taskId && !log.taskName) {
      return { ...log, taskName: taskNameMap.get(log.taskId) ?? log.taskId };
    }
    return log;
  });
};

import type { Task, Settings } from './types';

const daysTo = (due?: string) => {
  if (!due) return 9999;
  const d = new Date(due).getTime();
  const now = Date.now();
  return Math.ceil((d - now) / 86400000);
};

const budgetHeadroom = (t: Task) => {
  const c = t.cost ?? 0;
  if (c <= 50) return 1;
  if (c <= 150) return 0.7;
  if (c <= 300) return 0.4;
  return 0.2;
};

const capacityFit = (t: Task) => {
  const h = t.hours ?? 0;
  if (h <= 16) return 1;
  if (h <= 24) return 0.7;
  return 0.4;
};

const priorityWeight = (p: Task['priority']) => (p === 'P0' ? 1 : p === 'P1' ? 0.7 : 0.4);

export function scoreTask(t: Task, s: Settings) {
  const w = s.weights;
  const penalties = s.penalties;
  const priority = priorityWeight(t.priority);
  const urgency = Math.max(0, 1 - Math.max(0, daysTo(t.due)) / 14);
  const cap = capacityFit(t);
  const budget = budgetHeadroom(t);
  let score =
    w.priority * priority +
    w.urgency * urgency +
    w.capacity_fit * cap +
    w.budget_headroom * budget;
  if ((t.blocked_by?.length ?? 0) > 0) score -= penalties.blocked;
  if ((t.cost ?? 0) > 300) score -= penalties.over_budget;
  return score;
}

export function recommend(tasks: Task[], settings: Settings, activeTaskIds: string[] = []) {
  const dueSoon = tasks.filter((t) => daysTo(t.due) <= 1 && t.status !== 'Done');
  const wipCapReached = activeTaskIds.length >= settings.hard_limits.wip_per_owner;
  if (wipCapReached) return { top1: null, top3: [], reason: 'WIP limit reached' };
  const pool = dueSoon.length
    ? dueSoon
    : tasks.filter((t) => t.status !== 'Done' && t.status !== 'Blocked');

  const modeBias = (t: Task) =>
    settings.mode === 'deadline'
      ? -daysTo(t.due)
      : settings.mode === 'cost'
        ? -(t.cost ?? 0)
        : 0;

  const scored = pool
    .map((t) => ({ t, s: scoreTask(t, settings) + 0.01 * modeBias(t) }))
    .sort((a, b) => b.s - a.s);

  const top1 = scored[0]?.t ?? null;
  const top3 = scored.slice(0, 3).map((x) => x.t);
  const reason = dueSoon.length ? 'due within 24h' : 'best score';
  return { top1, top3, reason };
}

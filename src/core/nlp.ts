import type { Task } from './types';

const STATUS_TOKENS = new Set(['now', 'next', 'later', 'blocked', 'done']);
const PRIORITY_TOKENS = new Set(['p0', 'p1', 'p2']);

const normalizeDate = (token: string): string | undefined => {
  const isoMatch = token.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return token;
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (token === '今天') return base.toISOString().slice(0, 10);
  if (token === '明天') {
    base.setDate(base.getDate() + 1);
    return base.toISOString().slice(0, 10);
  }
  if (token === '后天') {
    base.setDate(base.getDate() + 2);
    return base.toISOString().slice(0, 10);
  }
  return undefined;
};

const parseTimeRange = (segment: string) => {
  const match = segment.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
  if (!match) return undefined;
  return { start: match[1], end: match[2] };
};

let seed = Date.now();
const nextId = () => `QA-${seed++}`;

export function parseLineToTask(line: string): Task {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  const result: Task = {
    id: nextId(),
    title: '',
    status: 'Now',
    priority: 'P1',
    plan_start: undefined,
    plan_end: undefined,
    due: undefined,
    owner: undefined,
    hours: undefined,
    api: undefined,
    cost: undefined,
    blocked_by: [],
    progress: 0
  };

  const rest: string[] = [];

  tokens.forEach((raw) => {
    const token = raw.trim();
    const lower = token.toLowerCase();
    if (STATUS_TOKENS.has(lower)) {
      result.status = token as Task['status'];
      return;
    }
    if (PRIORITY_TOKENS.has(lower)) {
      result.priority = token.toUpperCase() as Task['priority'];
      return;
    }
    if (token.startsWith('@')) {
      result.owner = token.slice(1) || undefined;
      return;
    }
    if (token.startsWith('¥') || token.startsWith('￥')) {
      const value = Number(token.replace(/[¥￥,]/g, ''));
      if (!Number.isNaN(value)) result.cost = value;
      return;
    }
    if (/^\d+(k)?api$/i.test(lower)) {
      const value = Number(lower.replace(/k?api/i, ''));
      if (!Number.isNaN(value)) result.api = value;
      return;
    }
    if (/^\d+(\.\d+)?h$/i.test(lower)) {
      const value = Number(lower.replace(/h/i, ''));
      if (!Number.isNaN(value)) result.hours = value;
      return;
    }
    if (/^progress=\d{1,3}%$/.test(lower)) {
      const value = Number(lower.replace(/progress=|%/g, ''));
      if (!Number.isNaN(value)) result.progress = Math.min(100, value) / 100;
      return;
    }
    const maybeDate = normalizeDate(token);
    if (maybeDate) {
      result.due = maybeDate;
      return;
    }
    const iso = token.match(/^\d{4}-\d{2}-\d{2}$/);
    if (iso) {
      result.due = token;
      return;
    }
    const range = parseTimeRange(token);
    if (range) {
      if (result.due) {
        result.plan_start = `${result.due}T${range.start}`;
        result.plan_end = `${result.due}T${range.end}`;
      } else {
        result.plan_start = range.start;
        result.plan_end = range.end;
      }
      return;
    }
    rest.push(token);
  });

  if (!result.due) {
    const today = new Date();
    result.due = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      .toISOString()
      .slice(0, 10);
  }

  result.title = rest.join(' ') || '未命名任务';
  return result;
}

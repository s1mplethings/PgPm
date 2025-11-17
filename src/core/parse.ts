import type { Task, Priority, Status } from './types';
import { newId, ymd, ymdhm } from './id';

const zhWeekMap: Record<string, number> = {
  周日: 0,
  周天: 0,
  星期日: 0,
  星期天: 0,
  周一: 1,
  星期一: 1,
  周二: 2,
  星期二: 2,
  周三: 3,
  星期三: 3,
  周四: 4,
  星期四: 4,
  周五: 5,
  星期五: 5,
  周六: 6,
  星期六: 6
};

const addDays = (base: Date, delta: number) => {
  const copied = new Date(base);
  copied.setDate(copied.getDate() + delta);
  return copied;
};

const setHM = (base: Date, hour: number, minute: number) => {
  const copied = new Date(base);
  copied.setHours(hour, minute, 0, 0);
  return copied;
};

function parseDateToken(token: string, base = new Date()): Date | null {
  token = token.trim();
  if (token === '今天') return base;
  if (token === '明天') return addDays(base, 1);
  if (token === '后天') return addDays(base, 2);
  let match = token.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) return new Date(+match[1], +match[2] - 1, +match[3]);
  match = token.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (match) return new Date(base.getFullYear(), +match[1] - 1, +match[2]);
  match = token.match(/^(\d{1,2})月(\d{1,2})日$/);
  if (match) return new Date(base.getFullYear(), +match[1] - 1, +match[2]);
  if (token in zhWeekMap) {
    const target = zhWeekMap[token];
    const current = base.getDay();
    const delta = ((target - current + 7) % 7) || 7;
    return addDays(base, delta);
  }
  return null;
}

function parseTimeSpan(text: string) {
  let match = text.match(/(\d{1,2})(?::(\d{2}))?\s*[-~到–—]\s*(\d{1,2})(?::(\d{2}))?/);
  if (match) {
    const h1 = +match[1];
    const m1 = +(match[2] ?? 0);
    const h2 = +match[3];
    const m2 = +(match[4] ?? 0);
    const start = setHM(new Date(), h1, m1);
    const end = setHM(new Date(), h2, m2);
    const duration = (end.getTime() - start.getTime()) / 3_600_000;
    return {
      start: ymdhm(start),
      end: ymdhm(end),
      hours: Math.max(0.25, Math.round(duration * 4) / 4)
    };
  }
  match = text.match(/(\d+(?:\.\d+)?)\s*(?:h|小时)/i);
  if (match) return { hours: +match[1] };
  return {};
}

const parseNum = (token: string, key: 'api' | 'cost' | 'hours') => {
  if (key === 'api') {
    const match =
      token.match(/(\d+(?:\.\d+)?)\s*(?:k\s*api|kapi|api)/i) || token.match(/(\d+(?:\.\d+)?)k/i);
    if (match) return +match[1];
  }
  if (key === 'cost') {
    const match = token.match(/[¥￥]?\s*(\d+(?:\.\d+)?)\s*(?:元|rmb|￥|¥)?/i);
    if (match) return +match[1];
  }
  if (key === 'hours') {
    const match = token.match(/(\d+(?:\.\d+)?)\s*(?:h|小时)/i);
    if (match) return +match[1];
  }
  return undefined;
};

const parsePriority = (token: string): Priority | undefined =>
  /P0/i.test(token)
    ? 'P0'
    : /P1/i.test(token)
      ? 'P1'
      : /P2/i.test(token)
        ? 'P2'
        : token.match(/\bp\s*([012])\b/i)?.[1]
          ? (`P${RegExp.$1}` as Priority)
          : undefined;

const parseStatus = (token: string): Status | undefined =>
  /now|现在/i.test(token)
    ? 'Now'
    : /next|随后|下一个/i.test(token)
      ? 'Next'
      : /later|以后|稍后/i.test(token)
        ? 'Later'
        : /blocked|阻塞/i.test(token)
          ? 'Blocked'
          : /done|完成/i.test(token)
            ? 'Done'
            : undefined;

const parseOwner = (token: string) => token.match(/@([\u4e00-\u9fa5A-Za-z0-9_\-]+)/)?.[1];

const parseLabels = (token: string) =>
  (token.match(/#([\p{L}\p{N}_\-]+)/gu) || []).map((item) => item.slice(1));

export function parseLine(line: string): Partial<Task> {
  const base = new Date();
  let title = line.trim();
  let due: string | undefined;

  const dateTokens =
    line.match(
      /(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}|(?:今天|明天|后天|周[一二三四五六日天]|星期[一二三四五六日天]))/g
    ) || [];
  if (dateTokens.length) {
    const parsed = parseDateToken(dateTokens[0], base);
    if (parsed) due = ymd(parsed);
    title = title.replace(dateTokens[0], '').trim();
  }

  const span = parseTimeSpan(line);
  const hours = span.hours ?? parseNum(line, 'hours');
  const api = parseNum(line, 'api');
  const cost = parseNum(line, 'cost');
  const priority = parsePriority(line) ?? 'P1';
  const status = parseStatus(line) ?? 'Inbox';
  const owner = parseOwner(line);
  const labels = parseLabels(line);

  title = title
    .replace(/(\d{1,2}:\d{2}\s*[-~到–—]\s*\d{1,2}:\d{2})/g, '')
    .replace(/(\d+(?:\.\d+)?\s*(?:h|小时))/gi, '')
    .replace(/(P[012]|\bp\s*[012]\b)/gi, '')
    .replace(/(now|next|later|blocked|done|现在|随后|以后|阻塞|完成)/gi, '')
    .replace(/(@[\u4e00-\u9fa5A-Za-z0-9_\-]+)/g, '')
    .replace(/[¥￥]?\s*\d+(?:\.\d+)?\s*(?:元|rmb|￥|¥)?/gi, '')
    .replace(/\d+(?:\.\d+)?\s*(?:k\s*api|kapi|api|k)/gi, '')
    .replace(/#\S+/g, '')
    .trim();

  return {
    id: newId(),
    title: title || '未命名任务',
    status,
    priority,
    plan_start: span.start,
    plan_end: span.end,
    due,
    owner,
    hours,
    api,
    cost,
    labels,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  } as Partial<Task>;
}

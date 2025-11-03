import {
  addDays,
  differenceInCalendarDays,
  formatISO,
  isSaturday,
  isSunday,
  max,
  min,
  parseISO,
  startOfDay
} from 'date-fns';
import type { Task } from '../types';

const ensureDate = (value: string) => startOfDay(parseISO(value));

export const todayIso = () => formatISO(startOfDay(new Date()), { representation: 'date' });

export const isWeekend = (value: Date | string) => {
  const date = value instanceof Date ? value : ensureDate(value);
  return isSaturday(date) || isSunday(date);
};

export const nextBusinessDay = (value: Date | string) => {
  const date = value instanceof Date ? startOfDay(value) : ensureDate(value);
  let cursor = date;
  while (isWeekend(cursor)) {
    cursor = addDays(cursor, 1);
  }
  return formatISO(cursor, { representation: 'date' });
};

export const previousBusinessDay = (value: Date | string) => {
  const date = value instanceof Date ? startOfDay(value) : ensureDate(value);
  let cursor = date;
  while (isWeekend(cursor)) {
    cursor = addDays(cursor, -1);
  }
  return formatISO(cursor, { representation: 'date' });
};

export interface DateRange {
  start: string;
  end: string;
}

export const findTaskDateRange = (tasks: Task[]): DateRange | null => {
  if (!tasks.length) return null;
  const startDates = tasks.map((task) => ensureDate(task.startDate));
  const endDates = tasks.map((task) => ensureDate(task.endDate));
  const start = startDates.reduce((acc, date) => min([acc, date]));
  const end = endDates.reduce((acc, date) => max([acc, date]));
  return {
    start: formatISO(start, { representation: 'date' }),
    end: formatISO(end, { representation: 'date' })
  };
};

export const defaultTimelineRange = (): DateRange => {
  const base = startOfDay(new Date());
  return {
    start: formatISO(addDays(base, -14), { representation: 'date' }),
    end: formatISO(addDays(base, 45), { representation: 'date' })
  };
};

export const expandRange = (range: DateRange, paddingPercent = 0.2): DateRange => {
  const start = ensureDate(range.start);
  const end = ensureDate(range.end);
  const span = Math.max(differenceInCalendarDays(end, start), 1);
  const padding = Math.ceil(span * paddingPercent);
  return {
    start: formatISO(addDays(start, -padding), { representation: 'date' }),
    end: formatISO(addDays(end, padding), { representation: 'date' })
  };
};

export const rangeToTimeline = (range: DateRange) => {
  const start = ensureDate(range.start);
  const end = ensureDate(range.end);
  const days = differenceInCalendarDays(end, start) + 1;
  return {
    timelineStart: formatISO(start, { representation: 'date' }),
    timelineDays: Math.max(days, 1)
  };
};

export const ensureBaseline = (task: Task): Task => {
  if (task.baselineStart && task.baselineEnd) return task;
  return {
    ...task,
    baselineStart: task.baselineStart ?? task.startDate,
    baselineEnd: task.baselineEnd ?? task.endDate
  };
};

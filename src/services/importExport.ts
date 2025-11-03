import type { Task, UsageLog } from '../types';

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

export interface UsageCsvMapping {
  date: string;
  spent: string;
  source?: string;
  cost?: string;
  taskId?: string;
  taskName?: string;
  unit?: string;
  currency?: string;
  note?: string;
}

const parseLine = (line: string) => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map((value) => value.replace(/^"|"$/g, ''));
};

export const parseCsv = (content: string): CsvParseResult => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return { headers: [], rows: [] };
  }
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? '';
    });
    return record;
  });
  return { headers, rows };
};

export const mapUsageRecords = (
  rows: Record<string, string>[],
  mapping: UsageCsvMapping,
  tasks: Task[]
): Array<Omit<UsageLog, 'id' | 'createdAt'>> => {
  const taskNameMap = new Map(tasks.map((task) => [task.name, task]));
  return rows
    .map((row) => {
      const date = row[mapping.date];
      const spentRaw = row[mapping.spent];
      if (!date || !spentRaw) return null;
      const spent = Number(spentRaw);
      if (Number.isNaN(spent)) return null;
      let taskId = mapping.taskId ? row[mapping.taskId] || null : null;
      const taskName = mapping.taskName ? row[mapping.taskName] : undefined;
      if (!taskId && taskName) {
        const matched = taskNameMap.get(taskName);
        if (matched) {
          taskId = matched.id;
        }
      }
      const record: Omit<UsageLog, 'id' | 'createdAt'> = {
        taskId,
        taskName,
        date,
        spent,
        unit: (mapping.unit ? (row[mapping.unit] as UsageLog['unit']) : 'hour') ?? 'hour',
        source: (mapping.source ? (row[mapping.source] as UsageLog['source']) : 'manual') ?? 'manual',
        cost: mapping.cost ? Number(row[mapping.cost] || 0) : undefined,
        currency: mapping.currency ? row[mapping.currency] || undefined : undefined,
        note: mapping.note ? row[mapping.note] || undefined : undefined
      };
      return record;
    })
    .filter((item): item is Omit<UsageLog, 'id' | 'createdAt'> => item !== null);
};

export const usageLogsToCsv = (logs: UsageLog[]) => {
  const headers = [
    'taskId',
    'taskName',
    'date',
    'spent',
    'unit',
    'source',
    'cost',
    'currency',
    'note'
  ];
  const lines = [headers.join(',')];
  logs.forEach((log) => {
    const values = [
      log.taskId ?? '',
      log.taskName ?? '',
      log.date,
      String(log.spent),
      log.unit,
      log.source,
      typeof log.cost === 'number' ? String(log.cost) : '',
      log.currency ?? '',
      log.note ? `"${log.note.replace(/"/g, '""')}"` : ''
    ];
    lines.push(values.join(','));
  });
  return lines.join('\n');
};

import { useMemo, useState } from 'react';
import { Download, Plus, Upload, X } from 'lucide-react';
import { useScheduleStore } from '../store/scheduleStore';
import { summarizeUsage } from '../utils/usage';
import type { UsageCsvMapping } from '../services/importExport';
import { mapUsageRecords, parseCsv, usageLogsToCsv } from '../services/importExport';
import type { UsageLog } from '../types';

interface UsageDrawerProps {
  open: boolean;
}

interface QuickEntryState {
  taskId: string | null;
  date: string;
  spent: string;
  unit: UsageLog['unit'];
  source: UsageLog['source'];
  cost: string;
  note: string;
}

const createInitialQuickEntry = (): QuickEntryState => {
  const today = new Date().toISOString().slice(0, 10);
  return {
    taskId: '',
    date: today,
    spent: '',
    unit: 'hour',
    source: 'manual',
    cost: '',
    note: ''
  };
};

export const UsageDrawer = ({ open }: UsageDrawerProps) => {
  const {
    usageLogs,
    tasks,
    addUsageLog,
    deleteUsageLogs,
    importUsageLogs,
    setUsageDrawerOpen,
    settings
  } = useScheduleStore((state) => ({
    usageLogs: state.usageLogs,
    tasks: state.tasks,
    addUsageLog: state.addUsageLog,
    deleteUsageLogs: state.deleteUsageLogs,
    importUsageLogs: state.importUsageLogs,
    setUsageDrawerOpen: state.setUsageDrawerOpen,
    settings: state.settings
  }));

  const [quickEntry, setQuickEntry] = useState<QuickEntryState>(createInitialQuickEntry());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<UsageCsvMapping | null>(null);

  const summary = useMemo(() => summarizeUsage(usageLogs), [usageLogs]);
  const totalBudget = useMemo(
    () => tasks.reduce((sum, task) => sum + task.budget, 0),
    [tasks]
  );
  const currentMonthUsage = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return usageLogs
      .filter((log) => log.date.startsWith(currentMonth))
      .reduce((sum, log) => sum + (typeof log.cost === 'number' ? log.cost : log.spent), 0);
  }, [usageLogs]);

  if (!open) return null;

  const handleClose = () => {
    setUsageDrawerOpen(false);
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping(null);
  };

  const handleQuickEntrySubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!quickEntry.spent) {
      window.alert('请输入投入时长或点数');
      return;
    }
    const spentValue = Number(quickEntry.spent);
    if (Number.isNaN(spentValue)) {
      window.alert('投入值必须为数字');
      return;
    }
    addUsageLog({
      taskId: quickEntry.taskId || null,
      taskName: quickEntry.taskId ? undefined : '未分配',
      date: quickEntry.date,
      spent: spentValue,
      unit: quickEntry.unit,
      source: quickEntry.source,
      cost: quickEntry.cost ? Number(quickEntry.cost) : undefined,
      note: quickEntry.note || undefined
    });
    setQuickEntry(createInitialQuickEntry());
  };

  const handleUsageSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (!selectedIds.size) return;
    deleteUsageLogs(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setCsvHeaders(parsed.headers);
      setCsvRows(parsed.rows);
      if (parsed.headers.length) {
        const guessMapping: UsageCsvMapping = {
          date: parsed.headers.find((header) => header.toLowerCase().includes('date')) ?? parsed.headers[0],
          spent:
            parsed.headers.find((header) => header.toLowerCase().includes('spent')) ??
            parsed.headers.find((header) => header.toLowerCase().includes('value')) ??
            parsed.headers[1] ??
            parsed.headers[0]
        };
        if (parsed.headers.find((header) => header.toLowerCase().includes('source'))) {
          guessMapping.source = parsed.headers.find((header) => header.toLowerCase().includes('source'));
        }
        if (parsed.headers.find((header) => header.toLowerCase().includes('cost'))) {
          guessMapping.cost = parsed.headers.find((header) => header.toLowerCase().includes('cost'));
        }
        if (parsed.headers.find((header) => header.toLowerCase().includes('task'))) {
          guessMapping.taskName = parsed.headers.find((header) => header.toLowerCase().includes('task'));
        }
        setMapping(guessMapping);
      }
    } catch (error) {
      console.error(error);
      window.alert('CSV 解析失败，请检查文件格式。');
    } finally {
      event.target.value = '';
    }
  };

  const handleCsvImport = () => {
    if (!mapping) {
      window.alert('请完成字段映射后再导入。');
      return;
    }
    const records = mapUsageRecords(csvRows, mapping, tasks);
    if (!records.length) {
      window.alert('未能识别有效数据，请核对映射。');
      return;
    }
    importUsageLogs(records);
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping(null);
  };

  const handleExport = () => {
    const csv = usageLogsToCsv(usageLogs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'usage-logs.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="absolute right-0 top-0 h-full w-[420px] border-l bg-white shadow-lg">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <div className="text-sm font-semibold text-slate-700">消耗/用量</div>
          <div className="text-xs text-slate-400">集中管理 Copilot/API/人工录入</div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-md border border-slate-200 p-1 text-slate-500 hover:bg-slate-100"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-6 overflow-y-auto px-5 py-4">
        <section className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs uppercase text-slate-500">本月预算使用</div>
          <div className="mt-1 flex items-end justify-between">
            <div>
              <div className="text-lg font-semibold text-slate-800">
                ¥{currentMonthUsage.toFixed(0)} / ¥{totalBudget.toFixed(0)}
              </div>
              <div className="text-xs text-slate-500">
                阈值：{Math.round(settings.budgetThresholdWarning * 100)}% /{' '}
                {Math.round(settings.budgetThresholdCritical * 100)}%
              </div>
            </div>
            {totalBudget > 0 && (
              <div className="w-32 rounded-full bg-slate-200">
                <div
                  className={`h-2.5 rounded-full ${
                    currentMonthUsage / totalBudget >= settings.budgetThresholdCritical
                      ? 'bg-red-500'
                      : currentMonthUsage / totalBudget >= settings.budgetThresholdWarning
                      ? 'bg-amber-400'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min((currentMonthUsage / totalBudget) * 100, 100)}%` }}
                />
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
            <span>快捷录入</span>
          </div>
          <form className="mt-3 space-y-3 text-sm" onSubmit={handleQuickEntrySubmit}>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">关联任务</span>
                <select
                  value={quickEntry.taskId ?? ''}
                  onChange={(e) => setQuickEntry((state) => ({ ...state, taskId: e.target.value || null }))}
                  className="rounded-md border border-slate-200 px-2 py-1.5"
                >
                  <option value="">未分配</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">日期</span>
                <input
                  type="date"
                  value={quickEntry.date}
                  onChange={(e) => setQuickEntry((state) => ({ ...state, date: e.target.value }))}
                  className="rounded-md border border-slate-200 px-2 py-1.5"
                />
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">投入</span>
                <input
                  value={quickEntry.spent}
                  onChange={(e) => setQuickEntry((state) => ({ ...state, spent: e.target.value }))}
                  className="rounded-md border border-slate-200 px-2 py-1.5"
                  placeholder="数字"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">单位</span>
                <select
                  value={quickEntry.unit}
                  onChange={(e) =>
                    setQuickEntry((state) => ({ ...state, unit: e.target.value as UsageLog['unit'] }))
                  }
                  className="rounded-md border border-slate-200 px-2 py-1.5"
                >
                  <option value="hour">小时</option>
                  <option value="point">点数</option>
                  <option value="currency">金额</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">来源</span>
                <select
                  value={quickEntry.source}
                  onChange={(e) =>
                    setQuickEntry((state) => ({ ...state, source: e.target.value as UsageLog['source'] }))
                  }
                  className="rounded-md border border-slate-200 px-2 py-1.5"
                >
                  <option value="manual">Manual</option>
                  <option value="copilot">Copilot</option>
                  <option value="api">API</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">金额 (¥)</span>
                <input
                  value={quickEntry.cost}
                  onChange={(e) => setQuickEntry((state) => ({ ...state, cost: e.target.value }))}
                  className="rounded-md border border-slate-200 px-2 py-1.5"
                  placeholder="可选"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">备注</span>
                <input
                  value={quickEntry.note}
                  onChange={(e) => setQuickEntry((state) => ({ ...state, note: e.target.value }))}
                  className="rounded-md border border-slate-200 px-2 py-1.5"
                  placeholder="可选"
                />
              </label>
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              记录投入
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
            <span>任务汇总</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                导出 CSV
              </button>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" />
                导入 CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
              </label>
            </div>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {summary.byTask &&
              Object.values(summary.byTask).map((item) => (
                <article key={item.taskId ?? 'unassigned'} className="rounded-md border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">
                      {item.taskName || item.taskId || '未分配'}
                    </span>
                    <span className="text-xs text-slate-400">{item.taskId ?? '未配对'}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    投入 {item.spent.toFixed(1)}h {item.cost ? ` / ¥${item.cost.toFixed(0)}` : ''}
                  </div>
                </article>
              ))}
          </div>
          {csvHeaders.length > 0 && (
            <div className="mt-4 rounded-md border border-dashed border-slate-300 p-3 text-xs">
              <div className="font-semibold text-slate-600">字段映射</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <FieldMappingSelect
                  label="日期"
                  headers={csvHeaders}
                  value={mapping?.date ?? ''}
                  onChange={(value) => setMapping((prev) => ({ ...(prev ?? { spent: '', date: '' }), date: value }))}
                />
                <FieldMappingSelect
                  label="投入"
                  headers={csvHeaders}
                  value={mapping?.spent ?? ''}
                  onChange={(value) => setMapping((prev) => ({ ...(prev ?? { spent: '', date: '' }), spent: value }))}
                />
                <FieldMappingSelect
                  label="来源"
                  headers={csvHeaders}
                  value={mapping?.source ?? ''}
                  onChange={(value) => setMapping((prev) => ({ ...(prev ?? { spent: '', date: '' }), source: value }))}
                  allowEmpty
                />
                <FieldMappingSelect
                  label="成本"
                  headers={csvHeaders}
                  value={mapping?.cost ?? ''}
                  onChange={(value) => setMapping((prev) => ({ ...(prev ?? { spent: '', date: '' }), cost: value }))}
                  allowEmpty
                />
                <FieldMappingSelect
                  label="任务名称"
                  headers={csvHeaders}
                  value={mapping?.taskName ?? ''}
                  onChange={(value) =>
                    setMapping((prev) => ({ ...(prev ?? { spent: '', date: '' }), taskName: value }))
                  }
                  allowEmpty
                />
                <FieldMappingSelect
                  label="备注"
                  headers={csvHeaders}
                  value={mapping?.note ?? ''}
                  onChange={(value) => setMapping((prev) => ({ ...(prev ?? { spent: '', date: '' }), note: value }))}
                  allowEmpty
                />
              </div>
              <button
                type="button"
                onClick={handleCsvImport}
                className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
              >
                导入记录
              </button>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
            <span>明细列表（{usageLogs.length} 条）</span>
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
              disabled={!selectedIds.size}
            >
              删除所选
            </button>
          </div>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto text-xs">
            {usageLogs.map((log) => (
              <label
                key={log.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(log.id)}
                  onChange={() => handleUsageSelection(log.id)}
                  className="accent-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">{log.taskName ?? log.taskId ?? '未分配'}</span>
                    <span className="text-slate-400">{log.date}</span>
                  </div>
                  <div className="text-slate-500">
                    {log.spent} {log.unit} · {log.source}
                    {typeof log.cost === 'number' && ` · ¥${log.cost}`}
                  </div>
                  {log.note && <div className="text-slate-400">{log.note}</div>}
                </div>
              </label>
            ))}
            {usageLogs.length === 0 && (
              <div className="rounded-md border border-dashed border-slate-200 px-3 py-8 text-center text-slate-400">
                暂无用量记录，使用上方表单录入或导入 CSV。
              </div>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
};

interface FieldMappingSelectProps {
  label: string;
  headers: string[];
  value: string;
  allowEmpty?: boolean;
  onChange: (value: string) => void;
}

const FieldMappingSelect = ({ label, headers, value, onChange, allowEmpty }: FieldMappingSelectProps) => (
  <label className="flex flex-col gap-1">
    <span className="text-[11px] text-slate-500">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-slate-200 px-2 py-1.5 text-xs"
    >
      {allowEmpty && <option value="">（空）</option>}
      {headers.map((header) => (
        <option key={header} value={header}>
          {header}
        </option>
      ))}
    </select>
  </label>
);

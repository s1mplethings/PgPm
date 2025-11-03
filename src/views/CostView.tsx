import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Task } from '../types';
import { useScheduleStore } from '../store/scheduleStore';
import { formatCurrency, formatTokens } from '../utils/format';
import { buildCostLines } from '../utils/analytics';

interface Props {
  tasks: Task[];
}

const DIMENSIONS = [
  { key: 'task', label: '按任务' },
  { key: 'owner', label: '按负责人' },
  { key: 'month', label: '按月份' }
] as const;

export const CostView = ({ tasks }: Props) => {
  const [dimension, setDimension] = useState<(typeof DIMENSIONS)[number]['key']>('task');
  const { settings } = useScheduleStore((state) => ({
    settings: state.settings
  }));

  const costLines = useMemo(
    () => buildCostLines(tasks, settings).filter((line) => line.dimension === dimension),
    [tasks, settings, dimension]
  );

  const totals = useMemo(() => {
    const sumBudget = tasks.reduce((sum, task) => sum + task.budget, 0);
    const sumSub = tasks.reduce((sum, task) => sum + task.subscriptionMonthly, 0);
    const apiExpected = tasks.reduce((sum, task) => sum + task.apiExpected, 0);
    const apiActual = tasks.reduce((sum, task) => sum + task.apiActual, 0);
    return { sumBudget, sumSub, apiExpected, apiActual };
  }, [tasks]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">消耗（AI API & 订阅费）</h2>
          <p className="text-xs text-slate-500">
            KPI 卡实时聚合预算与用量；明细表支持维度切换。超出 80% 将黄警，100% 红警。
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <AlertTriangle className="h-4 w-4 text-warning" />
          阈值：黄 {settings.budgetThresholdWarning * 100}% · 红 {settings.budgetThresholdCritical * 100}%
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 border-b bg-white px-5 py-4 md:grid-cols-4">
        <KPI label="总预算($)" value={formatCurrency(totals.sumBudget)} />
        <KPI label="月订阅($)" value={formatCurrency(totals.sumSub)} />
        <KPI label="API预计(tokens)" value={formatTokens(totals.apiExpected)} />
        <KPI label="API实际(tokens)" value={formatTokens(totals.apiActual)} />
      </div>
      <div className="flex items-center justify-between border-b bg-slate-50 px-5 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>维度：</span>
          {DIMENSIONS.map((item) => (
            <button
              key={item.key}
              onClick={() => setDimension(item.key)}
              className={`rounded-md px-3 py-1 text-xs ${
                dimension === item.key ? 'bg-primary text-white' : 'border border-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500">
          预测：按最近斜率估算，超支风险将标红（示意）
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-white px-5 py-4">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="bg-slate-100 text-left text-xs uppercase text-slate-500">
              <th className="px-3 py-2 font-semibold">维度</th>
              <th className="px-3 py-2 font-semibold text-right">总预算</th>
              <th className="px-3 py-2 font-semibold text-right">月订阅</th>
              <th className="px-3 py-2 font-semibold text-right">API 预计</th>
              <th className="px-3 py-2 font-semibold text-right">API 实际</th>
              <th className="px-3 py-2 font-semibold text-right">差异</th>
              <th className="px-3 py-2 font-semibold text-right">预测</th>
              <th className="px-3 py-2 font-semibold text-right">预警</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {costLines.map((line) => {
              const warn = line.apiActual >= settings.budgetThresholdWarning * line.apiExpected;
              const danger = line.apiActual >= settings.budgetThresholdCritical * line.apiExpected;
              return (
                <tr key={`${line.dimension}-${line.key}`} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-700">{line.key}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(line.totalBudget)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(line.totalSubscription)}</td>
                  <td className="px-3 py-2 text-right">{formatTokens(line.apiExpected)}</td>
                  <td className="px-3 py-2 text-right">{formatTokens(line.apiActual)}</td>
                  <td className="px-3 py-2 text-right">{formatTokens(line.variance)}</td>
                  <td className="px-3 py-2 text-right">{formatTokens(line.forecast)}</td>
                  <td className="px-3 py-2 text-right">
                    {danger ? (
                      <span className="rounded-full bg-danger/10 px-3 py-1 text-xs text-danger">红警</span>
                    ) : warn ? (
                      <span className="rounded-full bg-warning/10 px-3 py-1 text-xs text-warning">黄警</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">正常</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface KPIProps {
  label: string;
  value: string;
}

const KPI = ({ label, value }: KPIProps) => (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="mt-2 text-lg font-semibold text-slate-800">{value}</div>
  </div>
);

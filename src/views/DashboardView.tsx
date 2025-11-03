import { useMemo } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Clock, Target } from 'lucide-react';
import type { Task } from '../types';
import { formatTokens } from '../utils/format';

interface Props {
  tasks: Task[];
}

export const DashboardView = ({ tasks }: Props) => {
  const milestones = useMemo(
    () =>
      tasks
        .filter((task) => task.isMilestone)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .slice(0, 5),
    [tasks]
  );

  const blocked = useMemo(() => tasks.filter((task) => task.status === 'blocked'), [tasks]);
  const upcoming = useMemo(
    () => tasks.filter((task) => task.status !== 'completed').slice(0, 5),
    [tasks]
  );

  const burnRate = useMemo(() => {
    const expected = tasks.reduce((sum, task) => sum + task.apiExpected, 0);
    const actual = tasks.reduce((sum, task) => sum + task.apiActual, 0);
    return expected ? actual / expected : 0;
  }, [tasks]);

  return (
    <div className="flex h-full flex-col overflow-auto px-5 py-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard
          icon={<Clock className="h-5 w-5 text-primary" />}
          title="正在进行"
          value={`${tasks.filter((task) => task.status === 'in_progress').length} 项`}
          description="包括进行中与本周新开启的任务"
        />
        <MetricCard
          icon={<Target className="h-5 w-5 text-purple-600" />}
          title="里程碑"
          value={`${milestones.length} / ${tasks.length}`}
          description="里程碑完成情况概览"
        />
        <MetricCard
          icon={<AlertTriangle className="h-5 w-5 text-warning" />}
          title="阻塞"
          value={`${blocked.length} 项`}
          description="需尽快解决的阻塞任务"
        />
        <MetricCard
          icon={<BarChart3 className="h-5 w-5 text-success" />}
          title="API 燃尽比"
          value={`${(burnRate * 100).toFixed(0)}%`}
          description={`预计 ${formatTokens(tasks.reduce((sum, item) => sum + item.apiActual, 0))}`}
        />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="里程碑到期" icon={<CheckCircle2 className="h-4 w-4 text-primary" />} className="lg:col-span-1">
          <ul className="space-y-3 text-sm">
            {milestones.map((task) => (
              <li key={task.id} className="rounded-md border border-slate-200 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-700">{task.name}</div>
                  <span className="text-xs text-slate-400">{task.startDate}</span>
                </div>
                <div className="text-xs text-slate-500">负责人：{task.owner ?? '未分配'}</div>
              </li>
            ))}
            {milestones.length === 0 && (
              <li className="rounded-md border border-dashed border-slate-200 px-3 py-8 text-center text-xs text-slate-400">
                暂无里程碑，快去添加一个吧。
              </li>
            )}
          </ul>
        </Panel>
        <Panel title="风险提示" icon={<AlertTriangle className="h-4 w-4 text-warning" />} className="lg:col-span-1">
          <ul className="space-y-3 text-sm">
            {blocked.map((task) => (
              <li key={task.id} className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2">
                <div className="font-semibold text-warning">{task.name}</div>
                <div className="text-xs text-warning">
                  负责人：{task.owner ?? '未分配'} · 依赖：{task.dependencyIds.join(', ') || '无'}
                </div>
              </li>
            ))}
            {blocked.length === 0 && (
              <li className="rounded-md border border-dashed border-slate-200 px-3 py-8 text-center text-xs text-slate-400">
                暂无阻塞，保持势头！
              </li>
            )}
          </ul>
        </Panel>
        <Panel title="近期开启" icon={<Clock className="h-4 w-4 text-slate-400" />} className="lg:col-span-1">
          <ul className="space-y-3 text-sm">
            {upcoming.map((task) => (
              <li key={task.id} className="rounded-md border border-slate-200 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-700">{task.name}</div>
                  <span className="text-xs text-slate-400">{task.startDate}</span>
                </div>
                <div className="text-xs text-slate-500">优先级：{task.priority}</div>
              </li>
            ))}
            {upcoming.length === 0 && (
              <li className="rounded-md border border-dashed border-slate-200 px-3 py-8 text-center text-xs text-slate-400">
                本周没有新的任务排期。
              </li>
            )}
          </ul>
        </Panel>
      </div>
    </div>
  );
};

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}

const MetricCard = ({ icon, title, value, description }: MetricCardProps) => (
  <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
    <div className="rounded-lg bg-slate-100 p-2">{icon}</div>
    <div>
      <div className="text-xs uppercase text-slate-400">{title}</div>
      <div className="mt-1 text-lg font-semibold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500">{description}</div>
    </div>
  </div>
);

interface PanelProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const Panel = ({ title, icon, children, className }: PanelProps) => (
  <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className ?? ''}`}>
    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
      {icon}
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
    </div>
    <div className="pt-3">{children}</div>
  </section>
);

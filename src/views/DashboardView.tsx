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
        .filter((task) => task.type === 'milestone')
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
          title="进行中"
          value={`${tasks.filter((task) => task.status === 'in_progress').length} 项`}
          description="统计当前仍在推进的任务数量"
        />
        <MetricCard
          icon={<Target className="h-5 w-5 text-purple-600" />}
          title="里程碑"
          value={`${milestones.length} / ${tasks.length}`}
          description="即将到来的前 5 个里程碑"
        />
        <MetricCard
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
          title="阻塞"
          value={`${blocked.length} 项`}
          description="需要重点关注的阻塞项"
        />
        <MetricCard
          icon={<BarChart3 className="h-5 w-5 text-emerald-600" />}
          title="API 消耗率"
          value={`${(burnRate * 100).toFixed(0)}%`}
          description={`累计消耗 ${formatTokens(tasks.reduce((sum, item) => sum + item.apiActual, 0))}`}
        />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="里程碑跟踪" icon={<CheckCircle2 className="h-4 w-4 text-primary" />} className="lg:col-span-1">
          <ul className="space-y-3 text-sm">
            {milestones.map((task) => (
              <li key={task.id} className="rounded-md border border-slate-200 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-700">{task.name}</div>
                  <span className="text-xs text-slate-400">{task.startDate}</span>
                </div>
                <div className="text-xs text-slate-500">负责人：{task.owner ?? '未指定'}</div>
              </li>
            ))}
            {milestones.length === 0 && (
              <li className="rounded-md border border-dashed border-slate-200 px-3 py-8 text-center text-xs text-slate-400">
                暂无里程碑，试着为关键节点建立里程碑。
              </li>
            )}
          </ul>
        </Panel>
        <Panel title="阻塞提醒" icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} className="lg:col-span-1">
          <ul className="space-y-3 text-sm">
            {blocked.map((task) => (
              <li key={task.id} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <div className="font-semibold text-amber-600">{task.name}</div>
                <div className="text-xs text-amber-600">
                  负责人：{task.owner ?? '未指定'} · 依赖：
                  {task.dependencyIds.length ? task.dependencyIds.join(', ') : '无'}
                </div>
              </li>
            ))}
            {blocked.length === 0 && (
              <li className="rounded-md border border-dashed border-slate-200 px-3 py-8 text-center text-xs text-slate-400">
                一切顺利，没有阻塞任务。
              </li>
            )}
          </ul>
        </Panel>
        <Panel title="即将开始" icon={<Clock className="h-4 w-4 text-slate-400" />} className="lg:col-span-1">
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
                暂无新的计划，请补充后续任务。
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

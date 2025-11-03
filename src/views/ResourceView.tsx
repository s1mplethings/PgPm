import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import type { Task } from '../types';
import { useScheduleStore } from '../store/scheduleStore';
import { formatHours } from '../utils/format';
import { deriveResourceMap } from '../utils/analytics';

interface Props {
  tasks: Task[];
}

export const ResourceView = ({ tasks }: Props) => {
  const { settings } = useScheduleStore((state) => ({
    settings: state.settings
  }));
  const [selected, setSelected] = useState<{ owner: string; date: string } | null>(null);

  const heatmap = useMemo(() => deriveResourceMap(tasks, settings), [tasks, settings]);

  const selectedTasks = useMemo(() => {
    if (!selected) return [];
    return tasks.filter((task) => {
      if (task.owner !== selected.owner) return false;
      return task.startDate <= selected.date && task.endDate >= selected.date;
    });
  }, [selected, tasks]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">资源负载（人 × 日 热图）</h2>
          <p className="text-xs text-slate-500">
            单元格颜色表示工时占比，超出 {settings.resourceDailyLimit}h / 天将标红。支持点击查看当日任务。
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CalendarDays className="h-4 w-4" />
          时间范围：{settings.timelineStart} 起 {settings.timelineDays} 天
        </div>
      </div>
      <div className="flex flex-1 gap-4 overflow-hidden p-5">
        <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[960px] w-full text-sm">
            <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-500">
              <tr>
                <th className="border-r border-slate-200 px-3 py-2 text-left">负责人</th>
                {heatmap.dates.map((date) => (
                  <th key={date} className="border-r border-slate-200 px-3 py-2 text-center">
                    {date.slice(5)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmap.owners.length === 0 ? (
                <tr>
                  <td colSpan={heatmap.dates.length + 1} className="px-5 py-6 text-center text-sm text-slate-500">
                    暂无负责人数据。
                  </td>
                </tr>
              ) : (
                heatmap.owners.map((owner) => (
                  <tr key={owner} className="hover:bg-slate-50">
                    <td className="border-r border-t border-slate-200 px-3 py-2 font-medium text-slate-700">
                      {owner}
                    </td>
                    {heatmap.dates.map((date) => {
                      const value = heatmap.matrix[owner]?.[date] ?? 0;
                      const limit = settings.resourceDailyLimit;
                      const ratio = Math.min(value / limit, 1);
                      const background = value > limit ? 'rgba(239, 68, 68, 0.2)' : `rgba(37, 99, 235, ${ratio * 0.3})`;
                      return (
                        <td
                          key={date}
                          className="cursor-pointer border-r border-t border-slate-200 px-3 py-2 text-center text-xs font-medium text-slate-700"
                          style={{ background }}
                          onClick={() => setSelected({ owner, date })}
                        >
                          {value ? formatHours(value) : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <aside className="w-80 shrink-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-700">当天任务</div>
          {selected ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-500">
                {selected.owner} · {selected.date}
              </div>
              {selectedTasks.map((task) => (
                <div key={task.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <div className="font-medium text-slate-800">{task.name}</div>
                  <div className="text-xs text-slate-500">
                    {task.startDate} → {task.endDate} · 预计 {task.estimatedHours}h
                  </div>
                </div>
              ))}
              {selectedTasks.length === 0 && (
                <div className="rounded-md border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                  当天无任务或尚未分配。
                </div>
              )}
              <button
                type="button"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-100"
              >
                自动平衡（即将推出）
              </button>
            </div>
          ) : (
            <div className="mt-3 rounded-md border border-dashed border-slate-200 px-3 py-10 text-center text-xs text-slate-400">
              点击热图单元格查看当天任务与调度建议。
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

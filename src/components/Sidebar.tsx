import { useMemo } from 'react';
import { useScheduleStore } from '../store/scheduleStore';
import type { ViewKey } from '../types';

const viewConfig: Array<{ key: ViewKey; label: string }> = [
  { key: 'gantt', label: '甘特' },
  { key: 'table', label: '任务表' },
  { key: 'cost', label: '消耗' },
  { key: 'resource', label: '资源负载' },
  { key: 'dashboard', label: '仪表盘' }
];

export const Sidebar = () => {
  const { tasks, filters, view, setView, setFilters, settings, setSettings } = useScheduleStore(
    (state) => ({
      tasks: state.tasks,
      filters: state.filters,
      view: state.view,
      setView: state.setView,
      setFilters: state.setFilters,
      settings: state.settings,
      setSettings: state.setSettings
    })
  );

  const owners = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.owner).filter(Boolean))) as string[],
    [tasks]
  );
  const tags = useMemo(
    () => Array.from(new Set(tasks.flatMap((task) => task.tags))),
    [tasks]
  );

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r bg-white">
      <div className="border-b px-4 py-3">
        <div className="text-xs uppercase text-slate-400">视图</div>
        <div className="mt-3 flex flex-col gap-1">
          {viewConfig.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                view === item.key ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{item.label}</span>
              {view === item.key && <span className="text-xs">●</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div>
          <div className="text-xs uppercase text-slate-400">时间窗口</div>
          <div className="mt-2 space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>起始日期</span>
              <input
                type="date"
                value={settings.timelineStart}
                onChange={(event) => setSettings({ timelineStart: event.target.value })}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => setSettings({ timelineStart: new Date().toISOString().slice(0, 10) })}
              className="w-full rounded-md border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-500 hover:border-primary hover:text-primary"
            >
              跳到今天
            </button>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-xs uppercase text-slate-400">状态</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {['not_started', 'in_progress', 'blocked', 'completed'].map((status) => {
              const active = filters.status.includes(status as any);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    const set = new Set(filters.status);
                    if (active) set.delete(status as any);
                    else set.add(status as any);
                    setFilters({ status: Array.from(set) as any });
                  }}
                  className={`rounded-md px-2 py-1 ${
                    active ? 'bg-primary/10 text-primary' : 'border border-slate-200 text-slate-600'
                  }`}
                >
                  {status === 'not_started'
                    ? '未开始'
                    : status === 'in_progress'
                    ? '进行中'
                    : status === 'blocked'
                    ? '阻塞'
                    : '已完成'}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4">
          <div className="text-xs uppercase text-slate-400">负责人</div>
          <div className="mt-2 space-y-2">
            {owners.map((owner) => {
              const active = filters.owners.includes(owner);
              return (
                <label key={owner} className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => {
                      const set = new Set(filters.owners);
                      if (active) set.delete(owner);
                      else set.add(owner);
                      setFilters({ owners: Array.from(set) });
                    }}
                  />
                  {owner}
                </label>
              );
            })}
          </div>
        </div>
        <div className="mt-4">
          <div className="text-xs uppercase text-slate-400">标签</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => {
              const active = filters.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const set = new Set(filters.tags);
                    if (active) set.delete(tag);
                    else set.add(tag);
                    setFilters({ tags: Array.from(set) });
                  }}
                  className={`rounded-full px-3 py-1 text-xs ${
                    active ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="border-t px-4 py-3 text-xs text-slate-400">
        快捷键：新增 Ctrl+Enter · 向下填充 Ctrl+D · 冻结列 F · 甘特跳到今天 T
      </div>
    </aside>
  );
};

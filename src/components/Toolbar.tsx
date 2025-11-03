import { useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Download, Filter, Search, Upload } from 'lucide-react';
import { useScheduleStore } from '../store/scheduleStore';
import type { FilterState, ProjectSettings } from '../types';

interface ToolbarProps {
  summary: { totalBudget: number; totalApi: number };
  filters: FilterState;
  settings: ProjectSettings;
}

export const Toolbar = ({ summary, filters, settings }: ToolbarProps) => {
  const setSettings = useScheduleStore((state) => state.setSettings);
  const setFilters = useScheduleStore((state) => state.setFilters);
  const runValidation = useScheduleStore((state) => state.runValidation);

  const shiftTimeline = useCallback(
    (direction: 'back' | 'forward') => {
      const delta = direction === 'back' ? -7 : 7;
      const startDate = new Date(settings.timelineStart);
      startDate.setDate(startDate.getDate() + delta);
      setSettings({ timelineStart: startDate.toISOString().slice(0, 10) });
    },
    [settings.timelineStart, setSettings]
  );

  const handleScaleChange = (scale: ProjectSettings['scale']) => setSettings({ scale });
  const handleProjectNameChange = (evt: React.ChangeEvent<HTMLInputElement>) =>
    setSettings({ projectName: evt.target.value });

  const handleTimelineLengthChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings({ timelineDays: Number(evt.target.value) });
  };

  return (
    <header className="flex items-center gap-4 border-b bg-white px-5 py-3">
      <div className="flex items-center gap-3">
        <input
          value={settings.projectName}
          onChange={handleProjectNameChange}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1">
          <button
            type="button"
            onClick={() => shiftTimeline('back')}
            className="rounded-md p-1 hover:bg-slate-100"
            aria-label="向前移动时间窗口"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="px-2 text-xs text-slate-500">
            {settings.timelineStart} · {settings.timelineDays}天
          </div>
          <button
            type="button"
            onClick={() => shiftTimeline('forward')}
            className="rounded-md p-1 hover:bg-slate-100"
            aria-label="向后移动时间窗口"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <select
          value={settings.timelineDays}
          onChange={handleTimelineLengthChange}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {[30, 60, 90, 120].map((option) => (
            <option key={option} value={option}>
              {option} 天跨度
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1">
          {(['day', 'week', 'month'] as const).map((scale) => (
            <button
              key={scale}
              type="button"
              onClick={() => handleScaleChange(scale)}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                settings.scale === scale ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {scale === 'day' ? '日' : scale === 'week' ? '周' : '月'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-1 items-center justify-end gap-2">
        <div className="flex items-center overflow-hidden rounded-md border border-slate-200">
          <Search className="ml-2 h-4 w-4 text-slate-400" />
          <input
            placeholder="搜索任务、负责人、标签"
            value={filters.search}
            onChange={(event) => setFilters({ search: event.target.value })}
            className="bg-transparent px-3 py-1.5 text-sm focus:outline-none"
          />
        </div>
        <button
          type="button"
          className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          <Filter className="h-4 w-4" />
          过滤器
        </button>
        <button
          type="button"
          className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          <Upload className="h-4 w-4" />
          导入
        </button>
        <button
          type="button"
          className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          导出
        </button>
        <button
          type="button"
          onClick={runValidation}
          className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-white shadow hover:bg-primary/90"
        >
          <Calendar className="h-4 w-4" />
          校验计划
        </button>
        <div className="rounded-md border border-slate-200 px-4 py-1.5 text-right text-xs leading-tight text-slate-600">
          <div>预算合计</div>
          <div className="text-sm font-semibold text-slate-900">￥{summary.totalBudget.toLocaleString()}</div>
        </div>
        <div className="rounded-md border border-slate-200 px-4 py-1.5 text-right text-xs leading-tight text-slate-600">
          <div>API 实际</div>
          <div className="text-sm font-semibold text-slate-900">{summary.totalApi.toLocaleString()} tokens</div>
        </div>
      </div>
    </header>
  );
};

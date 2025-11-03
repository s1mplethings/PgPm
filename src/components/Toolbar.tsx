import { useCallback, useRef } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Download,
  Filter,
  Layers,
  LineChart,
  Save,
  Search,
  Upload,
  ZoomIn
} from 'lucide-react';
import { useScheduleStore } from '../store/scheduleStore';
import type { FilterState, ProjectSettings } from '../types';

interface ToolbarProps {
  summary: { totalBudget: number; totalApi: number };
  filters: FilterState;
  settings: ProjectSettings;
}

export const Toolbar = ({ summary, filters, settings }: ToolbarProps) => {
  const {
    setSettings,
    setFilters,
    runValidation,
    focusToday,
    fitTimelineToTasks,
    toggleBaseline,
    showBaseline,
    saveProject,
    exportProject,
    importProject,
    setUsageDrawerOpen,
    usageLogs
  } = useScheduleStore((state) => ({
    setSettings: state.setSettings,
    setFilters: state.setFilters,
    runValidation: state.runValidation,
    focusToday: state.focusToday,
    fitTimelineToTasks: state.fitTimelineToTasks,
    toggleBaseline: state.toggleBaseline,
    showBaseline: state.showBaseline,
    saveProject: state.saveProject,
    exportProject: state.exportProject,
    importProject: state.importProject,
    setUsageDrawerOpen: state.setUsageDrawerOpen,
    usageLogs: state.usageLogs
  }));

  const jsonFileInputRef = useRef<HTMLInputElement>(null);

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
  const handleProjectNameChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    setSettings({ projectName: event.target.value });

  const handleTimelineLengthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings({ timelineDays: Number(event.target.value) });
  };

  const handleImportProjectClick = () => {
    jsonFileInputRef.current?.click();
  };

  const handleJsonFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      importProject(content);
    } catch (error) {
      console.error(error);
      window.alert('导入失败，请检查 JSON 格式是否正确。');
    } finally {
      event.target.value = '';
    }
  };

  const handleExportProject = () => {
    const payload = exportProject();
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${settings.projectName || 'project-schedule'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <header className="flex items-center gap-4 border-b bg-white px-5 py-3">
      <input
        ref={jsonFileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleJsonFileChange}
      />
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
            aria-label="向前移动时间窗"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="px-2 text-xs text-slate-500">
            {settings.timelineStart} 起 {settings.timelineDays}天
          </div>
          <button
            type="button"
            onClick={() => shiftTimeline('forward')}
            className="rounded-md p-1 hover:bg-slate-100"
            aria-label="向后移动时间窗"
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
              {option} 天
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
        <button
          type="button"
          onClick={focusToday}
          className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          <Crosshair className="h-4 w-4" />
          定位今天
        </button>
        <button
          type="button"
          onClick={fitTimelineToTasks}
          className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          <ZoomIn className="h-4 w-4" />
          适配范围
        </button>
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
          高级筛选
        </button>
        <button
          type="button"
          onClick={() => setUsageDrawerOpen(true)}
          className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          <LineChart className="h-4 w-4" />
          用量({usageLogs.length})
        </button>
        <button
          type="button"
          onClick={toggleBaseline}
          className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm ${
            showBaseline ? 'border border-primary bg-primary/5 text-primary' : 'border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Layers className="h-4 w-4" />
          {showBaseline ? '隐藏基线' : '显示基线'}
        </button>
        <div className="rounded-md border border-slate-200 px-4 py-1.5 text-right text-xs leading-tight text-slate-600">
          <div>预算汇总</div>
          <div className="text-sm font-semibold text-slate-900">¥{summary.totalBudget.toLocaleString()}</div>
        </div>
        <div className="rounded-md border border-slate-200 px-4 py-1.5 text-right text-xs leading-tight text-slate-600">
          <div>API 实耗</div>
          <div className="text-sm font-semibold text-slate-900">{summary.totalApi.toLocaleString()} tokens</div>
        </div>
        <button
          type="button"
          onClick={runValidation}
          className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-white shadow hover:bg-primary/90"
        >
          <Calendar className="h-4 w-4" />
          校验计划
        </button>
        <button
          type="button"
          onClick={saveProject}
          className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          <Save className="h-4 w-4" />
          保存
        </button>
        <button
          type="button"
          onClick={handleExportProject}
          className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          导出 JSON
        </button>
        <button
          type="button"
          onClick={handleImportProjectClick}
          className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          <Upload className="h-4 w-4" />
          导入 JSON
        </button>
      </div>
    </header>
  );
};

import { useMemo } from 'react';
import { Gantt, ViewMode, type Task as GanttTask } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { addDays, formatISO, parseISO } from 'date-fns';
import { useScheduleStore } from '../store/scheduleStore';
import type { Task } from '../types';

interface Props {
  tasks: Task[];
}

const getBarColor = (status: Task['status']) => {
  switch (status) {
    case 'in_progress':
      return '#2563eb';
    case 'blocked':
      return '#f97316';
    case 'completed':
      return '#22c55e';
    default:
      return '#94a3b8';
  }
};

const mapTask = (task: Task): GanttTask => {
  const start = parseISO(task.startDate);
  const end = parseISO(task.endDate);
  return {
    id: task.id,
    name: task.name,
    start,
    end: task.isMilestone ? addDays(end, 1) : end,
    type: task.isMilestone ? 'milestone' : 'task',
    progress: task.status === 'completed' ? 100 : task.status === 'in_progress' ? 60 : 0,
    isDisabled: task.status === 'completed',
    dependencies: task.dependencyIds,
    styles: {
      progressColor: getBarColor(task.status),
      progressSelectedColor: '#7c3aed',
      backgroundColor: getBarColor(task.status),
      backgroundSelectedColor: '#7c3aed'
    }
  };
};

export const GanttView = ({ tasks }: Props) => {
  const { settings, setSettings, updateTask } = useScheduleStore((state) => ({
    settings: state.settings,
    setSettings: state.setSettings,
    updateTask: state.updateTask
  }));

  const ganttTasks = useMemo(() => {
    const mapped: GanttTask[] = [];
    tasks.forEach((task) => {
      mapped.push(mapTask(task));
      if (task.baselineStart && task.baselineEnd) {
        mapped.push({
          id: `${task.id}-baseline`,
          type: 'project',
          name: `${task.name} 基线`,
          start: parseISO(task.baselineStart),
          end: parseISO(task.baselineEnd),
          progress: 0,
          hideChildren: true,
          isDisabled: true,
          styles: {
            backgroundColor: 'rgba(148, 163, 184, 0.35)',
            backgroundSelectedColor: 'rgba(79, 70, 229, 0.4)'
          }
        });
      }
    });
    return mapped;
  }, [tasks]);

  const handleDateChange = (ganttTask: GanttTask) => {
    const current = tasks.find((task) => task.id === ganttTask.id);
    if (!current) return;
    const startDate = formatISO(ganttTask.start, { representation: 'date' });
    const endDate = formatISO(addDays(ganttTask.end, current.isMilestone ? -1 : 0), {
      representation: 'date'
    });

    const depsOk = current.dependencyIds.every((id) => {
      const dep = tasks.find((task) => task.id === id);
      if (!dep) return true;
      return startDate >= dep.endDate;
    });

    if (!depsOk) {
      window.alert('受依赖约束，开始日期需晚于所有依赖的结束日期。');
      return;
    }

    if (current.isMilestone && settings.disableWeekendMilestones) {
      const day = new Date(startDate).getDay();
      if (day === 0 || day === 6) {
        window.alert('里程碑不可落在周末，将保留原计划。');
        return;
      }
    }

    updateTask({ ...current, startDate, endDate });
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setSettings({
      scale: mode === ViewMode.Day ? 'day' : mode === ViewMode.Week ? 'week' : 'month'
    });
  };

  const viewMode =
    settings.scale === 'day' ? ViewMode.Day : settings.scale === 'week' ? ViewMode.Week : ViewMode.Month;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">甘特图</h2>
          <p className="text-xs text-slate-500">
            支持拖拽计划、关键路径高亮即将上线。周末自动灰底，完成后默认锁定。
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1">
            颜色：进行中=主色 · 阻塞=橙 · 完成=绿
          </span>
          <button
            type="button"
            onClick={() => setSettings({ scale: 'week' })}
            className="rounded-md border border-slate-200 px-3 py-1"
          >
            关键路径
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          <div className="min-h-full">
            <View
              ganttTasks={ganttTasks}
              viewMode={viewMode}
              handleDateChange={handleDateChange}
              handleViewModeChange={handleViewModeChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface ViewProps {
  ganttTasks: GanttTask[];
  viewMode: ViewMode;
  handleDateChange: (task: GanttTask) => void;
  handleViewModeChange: (mode: ViewMode) => void;
}

const View = ({ ganttTasks, viewMode, handleDateChange, handleViewModeChange }: ViewProps) => {
  return (
    <div className="gantt-wrapper">
      <style>{`
        .gantt-task-react .bar-milestone {
          fill: #7c3aed;
          stroke: #7c3aed;
        }
        .gantt-task-react .bar-label {
          fill: #0f172a;
          font-size: 11px;
          font-weight: 500;
        }
        .gantt-task-react .tick .tick-line.weekend {
          stroke: rgba(148, 163, 184, 0.25);
        }
      `}</style>
      <Gantt
        tasks={ganttTasks}
        listCellWidth="250px"
        ganttHeight={520}
        onDateChange={handleDateChange}
        viewMode={viewMode}
        onViewChange={handleViewModeChange}
      />
    </div>
  );
};

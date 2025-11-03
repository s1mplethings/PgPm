import { useMemo } from 'react';
import { Gantt, ViewMode, type Task as GanttTask } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { addDays, formatISO, parseISO } from 'date-fns';
import { useScheduleStore } from '../store/scheduleStore';
import type { Task } from '../types';
import { todayIso } from '../utils/dates';

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

const mapTask = (task: Task, showBaseline: boolean, today: string): GanttTask[] => {
  const start = parseISO(task.startDate);
  const end = parseISO(task.endDate);
  const isMilestone = task.type === 'milestone';
  const overdue = task.type === 'task' && today > task.endDate && task.status !== 'completed';

  const baseTask: GanttTask = {
    id: task.id,
    name: task.name,
    start,
    end: isMilestone ? addDays(end, 1) : end,
    type: isMilestone ? 'milestone' : 'task',
    progress: task.status === 'completed' ? 100 : task.status === 'in_progress' ? 60 : 0,
    isDisabled: task.status === 'completed',
    dependencies: task.dependencyIds,
    styles: {
      progressColor: getBarColor(task.status),
      progressSelectedColor: '#7c3aed',
      backgroundColor: overdue ? '#ef4444' : getBarColor(task.status),
      backgroundSelectedColor: '#7c3aed',
      barCornerRadius: isMilestone ? 4 : 3
    }
  };

  if (!showBaseline || !task.baselineStart || !task.baselineEnd) {
    return [baseTask];
  }

  return [
    baseTask,
    {
      id: `${task.id}-baseline`,
      type: 'project',
      name: `${task.name} 基线`,
      start: parseISO(task.baselineStart),
      end: parseISO(task.baselineEnd),
      progress: 0,
      hideChildren: true,
      isDisabled: true,
      styles: {
        backgroundColor: 'rgba(148, 163, 184, 0.25)',
        backgroundSelectedColor: 'rgba(79, 70, 229, 0.4)'
      }
    }
  ];
};

export const GanttView = ({ tasks }: Props) => {
  const {
    settings,
    setSettings,
    updateTask,
    showBaseline,
    ganttViewDate,
    ganttViewDateNonce,
    shiftMilestoneToWeekday
  } = useScheduleStore((state) => ({
    settings: state.settings,
    setSettings: state.setSettings,
    updateTask: state.updateTask,
    showBaseline: state.showBaseline,
    ganttViewDate: state.ganttViewDate,
    ganttViewDateNonce: state.ganttViewDateNonce,
    shiftMilestoneToWeekday: state.shiftMilestoneToWeekday
  }));

  const today = todayIso();

  const ganttTasks = useMemo(() => {
    const mapped: GanttTask[] = [];
    tasks.forEach((task) => {
      mapTask(task, showBaseline, today).forEach((item) => mapped.push(item));
    });
    return mapped;
  }, [tasks, showBaseline, today]);

  const handleDateChange = (ganttTask: GanttTask) => {
    const current = tasks.find((task) => task.id === ganttTask.id);
    if (!current) return;
    const startDate = formatISO(ganttTask.start, { representation: 'date' });
    const endDate = formatISO(addDays(ganttTask.end, current.type === 'milestone' ? -1 : 0), {
      representation: 'date'
    });

    if (current.type === 'milestone' && settings.disableWeekendMilestones) {
      const day = new Date(startDate).getDay();
      if (day === 0 || day === 6) {
        const confirmed = window.confirm('里程碑无法落在周末，是否顺延到下一个工作日？');
        if (confirmed) {
          shiftMilestoneToWeekday(current.id);
        }
        return;
      }
    }

    updateTask({
      ...current,
      startDate,
      endDate: current.type === 'milestone' ? startDate : endDate
    });
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
          <h2 className="text-lg font-semibold text-slate-800">甘特视图</h2>
          <p className="text-xs text-slate-500">
            支持拖拽、依赖校验、周末高亮与基线对比。点击工具栏可快速定位到今天或缩放全部任务。
          </p>
        </div>
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">
          蓝=进行中 橙=阻塞 绿=完成 红=过期
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          <div className="min-h-full">
            <View
              key={ganttViewDateNonce}
              ganttTasks={ganttTasks}
              viewMode={viewMode}
              viewDate={ganttViewDate ? parseISO(ganttViewDate) : undefined}
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
  viewDate?: Date;
  handleDateChange: (task: GanttTask) => void;
  handleViewModeChange: (mode: ViewMode) => void;
}

const View = ({ ganttTasks, viewMode, viewDate, handleDateChange, handleViewModeChange }: ViewProps) => {
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
        viewDate={viewDate}
      />
    </div>
  );
};

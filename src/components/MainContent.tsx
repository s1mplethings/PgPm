import { useMemo } from 'react';
import { useScheduleStore } from '../store/scheduleStore';
import { GanttView } from '../views/GanttView';
import { TaskTableView } from '../views/TaskTableView';
import { CostView } from '../views/CostView';
import { ResourceView } from '../views/ResourceView';
import { DashboardView } from '../views/DashboardView';
import type { Task } from '../types';

const applyFilters = (
  tasks: Task[],
  filters: ReturnType<typeof useScheduleStore>['filters']
): Task[] => {
  return tasks.filter((task) => {
    if (filters.search) {
      const query = filters.search.toLowerCase();
      if (
        !task.name.toLowerCase().includes(query) &&
        !(task.owner || '').toLowerCase().includes(query) &&
        !task.tags.some((tag) => tag.toLowerCase().includes(query))
      ) {
        return false;
      }
    }
    if (filters.status.length && !filters.status.includes(task.status)) return false;
    if (filters.owners.length && task.owner && !filters.owners.includes(task.owner)) return false;
    if (filters.tags.length && !filters.tags.some((tag) => task.tags.includes(tag))) return false;
    return true;
  });
};

export const MainContent = () => {
  const { tasks, filters, view } = useScheduleStore((state) => ({
    tasks: state.tasks,
    filters: state.filters,
    view: state.view
  }));

  const filteredTasks = useMemo(() => applyFilters(tasks, filters), [tasks, filters]);

  return (
    <main className="flex-1 overflow-hidden bg-slate-50">
      {view === 'gantt' && <GanttView tasks={filteredTasks} />}
      {view === 'table' && <TaskTableView tasks={filteredTasks} />}
      {view === 'cost' && <CostView tasks={filteredTasks} />}
      {view === 'resource' && <ResourceView tasks={filteredTasks} />}
      {view === 'dashboard' && <DashboardView tasks={filteredTasks} />}
    </main>
  );
};

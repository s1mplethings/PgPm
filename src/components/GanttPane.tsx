import { useMemo } from 'react';
import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { useStore } from '../store';
import type { PgTask } from '../types';

const toGanttTask = (task: PgTask): GanttTask => ({
  id: task.id,
  name: task.name,
  start: task.start,
  end: task.end,
  type: task.type,
  progress: task.progress,
  isDisabled: false,
  dependencies: task.dependencies,
  hideChildren: false
});

export const GanttPane = () => {
  const tasks = useStore((state) => state.order.map((id) => state.tasks[id]));
  const updateTask = useStore((state) => state.updateTask);
  const deleteTask = useStore((state) => state.deleteTask);
  const runValidation = useStore((state) => state.runValidation);

  const ganttTasks = useMemo(() => tasks.map((task) => toGanttTask(task)), [tasks]);

  return (
    <Gantt
      tasks={ganttTasks}
      viewMode={ViewMode.Day}
      onDateChange={(task) => {
        updateTask(task.id, { start: task.start, end: task.end });
        runValidation();
        return true;
      }}
      onProgressChange={(task) => {
        updateTask(task.id, { progress: task.progress ?? 0 });
        return true;
      }}
      onDelete={(task) => {
        deleteTask(task.id);
        runValidation();
        return true;
      }}
      onDoubleClick={(task) => {
        console.debug('double click', task.id);
      }}
      onClick={(task) => {
        console.debug('select', task.id);
      }}
    />
  );
};

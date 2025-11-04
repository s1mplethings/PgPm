import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { addDays, isWeekend } from 'date-fns';
import type { PgTask, ValidationIssue } from './types';

interface SerializedTask
  extends Omit<PgTask, 'start' | 'end' | 'baseline'> {
  start: string;
  end: string;
  baseline?: { start: string; end: string };
}

interface SnapshotPayload {
  tasks: Record<string, SerializedTask>;
  order: string[];
}

interface StoreState {
  tasks: Record<string, PgTask>;
  order: string[];
  selection: { taskId?: string };
  issues: ValidationIssue[];
  undoStack: string[];
  redoStack: string[];

  addTask: (partial?: Partial<PgTask>) => string;
  addMilestone: (partial?: Partial<PgTask>) => string;
  updateTask: (id: string, patch: Partial<PgTask>) => void;
  deleteTask: (id: string) => void;
  link: (fromId: string, toId: string) => void;
  unlink: (fromId: string, toId: string) => void;
  setBaseline: (id: string) => void;
  runValidation: () => void;

  autoLevel: () => void;
  undo: () => void;
  redo: () => void;

  importData: (tasks: Array<PgTask | SerializedTask>) => void;
  exportData: () => string;

  _serialize: () => string;
  _restore: (snapshot: string) => void;
  _pushUndo: () => void;
}

const toIso = (date: Date) => date.toISOString();
const fromIso = (value: string) => new Date(value);

const serializeTask = (task: PgTask): SerializedTask => ({
  ...task,
  start: toIso(task.start),
  end: toIso(task.end),
  baseline: task.baseline
    ? {
        start: toIso(task.baseline.start),
        end: toIso(task.baseline.end)
      }
    : undefined
});

const hydrateTask = (task: SerializedTask): PgTask => ({
  ...task,
  start: fromIso(task.start),
  end: fromIso(task.end),
  baseline: task.baseline
    ? {
        start: fromIso(task.baseline.start),
        end: fromIso(task.baseline.end)
      }
    : undefined
});

const snapToWorkday = (value: Date) => {
  let current = new Date(value);
  while (isWeekend(current)) {
    current = addDays(current, 1);
  }
  return current;
};

const ensureTask = (task: PgTask): PgTask => ({
  ...task,
  dependencies: task.dependencies ?? []
});

export const useStore = create<StoreState>((set, get) => ({
  tasks: {},
  order: [],
  selection: {},
  issues: [],
  undoStack: [],
  redoStack: [],

  _serialize: () => {
    const snapshot: SnapshotPayload = {
      tasks: Object.fromEntries(
        Object.entries(get().tasks).map(([id, task]) => [id, serializeTask(task)])
      ),
      order: [...get().order]
    };
    return JSON.stringify(snapshot);
  },
  _restore: (payload) => {
    const parsed = JSON.parse(payload) as SnapshotPayload;
    const hydrated: Record<string, PgTask> = Object.fromEntries(
      Object.entries(parsed.tasks).map(([id, task]) => [id, ensureTask(hydrateTask(task))])
    );
    set({
      tasks: hydrated,
      order: parsed.order
    });
  },
  _pushUndo: () => {
    const snapshot = get()._serialize();
    set((state) => ({
      undoStack: [...state.undoStack, snapshot],
      redoStack: []
    }));
  },

  addTask: (partial = {}) => {
    const id = nanoid(8);
    const baseStart = partial.start ?? new Date();
    const start = snapToWorkday(baseStart);
    const existingDuration =
      partial.end && partial.start
        ? partial.end.getTime() - partial.start.getTime()
        : 24 * 60 * 60 * 1000;
    const tentativeEnd = new Date(start.getTime() + existingDuration);
    const end = snapToWorkday(tentativeEnd);
    const task: PgTask = ensureTask({
      id,
      name: partial.name ?? '新任务',
      type: 'task',
      start,
      end,
      progress: partial.progress ?? 0,
      assignee: partial.assignee,
      dependencies: partial.dependencies ?? [],
      costPlan: partial.costPlan ?? 0,
      costActual: partial.costActual ?? 0,
      baseline: partial.baseline
        ? {
            start: partial.baseline.start,
            end: partial.baseline.end
          }
        : undefined,
      tags: partial.tags ?? []
    });
    get()._pushUndo();
    set((state) => ({
      tasks: { ...state.tasks, [id]: task },
      order: [...state.order, id]
    }));
    return id;
  },

  addMilestone: (partial = {}) => {
    const id = nanoid(8);
    const baseDay = snapToWorkday(partial.start ?? new Date());
    const milestone: PgTask = ensureTask({
      id,
      name: partial.name ?? '里程碑',
      type: 'milestone',
      start: baseDay,
      end: baseDay,
      progress: partial.progress ?? 100,
      assignee: partial.assignee,
      dependencies: partial.dependencies ?? [],
      costPlan: partial.costPlan,
      costActual: partial.costActual,
      baseline: partial.baseline
        ? { start: partial.baseline.start, end: partial.baseline.end }
        : undefined,
      tags: partial.tags ?? []
    });
    get()._pushUndo();
    set((state) => ({
      tasks: { ...state.tasks, [id]: milestone },
      order: [...state.order, id]
    }));
    return id;
  },

  updateTask: (id, patch) => {
    const current = get().tasks[id];
    if (!current) return;
    get()._pushUndo();
    const next: PgTask = ensureTask({
      ...current,
      ...patch,
      start: patch.start ? new Date(patch.start) : current.start,
      end: patch.end ? new Date(patch.end) : current.end,
      baseline: patch.baseline
        ? {
            start: new Date(patch.baseline.start),
            end: new Date(patch.baseline.end)
          }
        : current.baseline
    });
    set((state) => ({
      tasks: { ...state.tasks, [id]: next }
    }));
  },

  deleteTask: (id) => {
    if (!get().tasks[id]) return;
    get()._pushUndo();
    set((state) => {
      const cloned = { ...state.tasks };
      delete cloned[id];
      Object.values(cloned).forEach((task) => {
        task.dependencies = task.dependencies.filter((dep) => dep !== id);
      });
      return {
        tasks: cloned,
        order: state.order.filter((taskId) => taskId !== id)
      };
    });
  },

  link: (fromId, toId) => {
    if (fromId === toId) return;
    const target = get().tasks[toId];
    if (!target) return;
    get()._pushUndo();
    set((state) => {
      const dependencies = new Set(target.dependencies);
      dependencies.add(fromId);
      return {
        tasks: {
          ...state.tasks,
          [toId]: {
            ...target,
            dependencies: Array.from(dependencies)
          }
        }
      };
    });
  },

  unlink: (fromId, toId) => {
    const target = get().tasks[toId];
    if (!target) return;
    get()._pushUndo();
    set((state) => ({
      tasks: {
        ...state.tasks,
        [toId]: {
          ...target,
          dependencies: target.dependencies.filter((dep) => dep !== fromId)
        }
      }
    }));
  },

  setBaseline: (id) => {
    const task = get().tasks[id];
    if (!task) return;
    get()._pushUndo();
    set((state) => ({
      tasks: {
        ...state.tasks,
        [id]: {
          ...task,
          baseline: {
            start: task.start,
            end: task.end
          }
        }
      }
    }));
  },

  runValidation: () => {
    const issues: ValidationIssue[] = [];
    Object.values(get().tasks).forEach((task) => {
      if (task.end.getTime() < task.start.getTime()) {
        issues.push({
          id: nanoid(6),
          taskId: task.id,
          level: 'error',
          message: '结束时间早于开始时间'
        });
      }
      if (task.type === 'milestone' && (isWeekend(task.start) || isWeekend(task.end))) {
        issues.push({
          id: nanoid(6),
          taskId: task.id,
          level: 'error',
          message: '里程碑不能落在周末'
        });
      }
    });
    set({ issues });
  },

  autoLevel: () => {
    const { tasks } = get();
    get()._pushUndo();
    set((state) => {
      const updated: Record<string, PgTask> = { ...state.tasks };
      state.order.forEach((taskId) => {
        const task = updated[taskId];
        if (!task || !task.dependencies.length) return;
        const predecessors = task.dependencies
          .map((depId) => updated[depId])
          .filter((dep): dep is PgTask => Boolean(dep));
        if (!predecessors.length) return;
        const latestEnd = predecessors.reduce<Date>((max, current) => {
          return current.end.getTime() > max.getTime() ? current.end : max;
        }, task.start);
        const newStart = snapToWorkday(addDays(latestEnd, 1));
        if (newStart.getTime() <= task.start.getTime()) return;
        const duration = task.end.getTime() - task.start.getTime();
        const newEnd = snapToWorkday(new Date(newStart.getTime() + duration));
        updated[taskId] = {
          ...task,
          start: newStart,
          end: newEnd
        };
      });
      return { tasks: updated };
    });
  },

  undo: () => {
    const { undoStack, _serialize, _restore, redoStack } = get();
    if (!undoStack.length) return;
    const current = _serialize();
    const previous = undoStack[undoStack.length - 1];
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, current]
    });
    _restore(previous);
  },

  redo: () => {
    const { redoStack, _serialize, _restore, undoStack } = get();
    if (!redoStack.length) return;
    const current = _serialize();
    const next = redoStack[redoStack.length - 1];
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, current]
    });
    _restore(next);
  },

  importData: (arr) => {
    const map: Record<string, PgTask> = {};
    const order: string[] = [];
    arr.forEach((task) => {
      const serialized = 'start' in task && typeof task.start === 'string' ? (task as SerializedTask) : undefined;
      const hydrated = serialized ? hydrateTask(serialized) : (task as PgTask);
      const normalized: PgTask = ensureTask({
        ...hydrated,
        start: new Date(hydrated.start),
        end: new Date(hydrated.end),
        baseline: hydrated.baseline
          ? {
              start: new Date(hydrated.baseline.start),
              end: new Date(hydrated.baseline.end)
            }
          : undefined
      });
      map[normalized.id] = normalized;
      order.push(normalized.id);
    });
    get()._pushUndo();
    set({
      tasks: map,
      order
    });
  },

  exportData: () => {
    const { order, tasks } = get();
    const rows = order.map((id) => serializeTask(tasks[id]));
    return JSON.stringify(rows, null, 2);
  }
}));

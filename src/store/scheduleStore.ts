import { create } from 'zustand';
import { addDays, formatISO } from 'date-fns';
import type {
  CostLine,
  FilterState,
  PersistedProjectData,
  ProjectSettings,
  Task,
  UsageLog,
  ValidationIssue,
  ViewKey
} from '../types';
import {
  buildCostLines,
  detectValidationIssues,
  deriveResourceMap,
  generateSpanDates
} from '../utils/analytics';
import {
  defaultTimelineRange,
  ensureBaseline,
  expandRange,
  findTaskDateRange,
  nextBusinessDay,
  rangeToTimeline,
  todayIso
} from '../utils/dates';
import { createUsageLog } from '../utils/usage';
import {
  exportProjectData,
  importProjectData,
  loadProject,
  saveProject
} from '../services/persist';

const PROJECT_STORAGE_ID = 'default';

const normalizeTask = (task: Task | (Partial<Task> & { isMilestone?: boolean })): Task => {
  const type = task.type ?? (task as any).isMilestone ? 'milestone' : 'task';
  const startDate = task.startDate ?? todayIso();
  const endDate = type === 'milestone' ? startDate : task.endDate ?? startDate;
  return ensureBaseline({
    ...(task as Task),
    type,
    startDate,
    endDate,
    baselineStart: task.baselineStart ?? startDate,
    baselineEnd: task.baselineEnd ?? endDate,
    dependencyIds: task.dependencyIds ?? [],
    estimatedHours: task.estimatedHours ?? 0,
    actualHours: task.actualHours ?? 0,
    dailyCapacity: task.dailyCapacity ?? null,
    budget: task.budget ?? 0,
    apiExpected: task.apiExpected ?? 0,
    apiActual: task.apiActual ?? 0,
    subscriptionMonthly: task.subscriptionMonthly ?? 0,
    tags: task.tags ?? [],
    owner: task.owner ?? null,
    status: task.status ?? 'not_started',
    priority: task.priority ?? 'P2',
    billingModel: task.billingModel,
    notes: task.notes
  });
};

const normalizeTasks = (tasks: Task[]) => tasks.map((task) => normalizeTask(task));

const today = new Date();
const iso = (d: Date) => formatISO(d, { representation: 'date' });

const seedTasks: Task[] = normalizeTasks([
  {
    id: 'T-1001',
    name: '项目启动会',
    owner: 'Alice',
    status: 'completed',
    priority: 'P1',
    tags: ['kickoff'],
    startDate: iso(addDays(today, -10)),
    endDate: iso(addDays(today, -7)),
    type: 'task',
    baselineStart: iso(addDays(today, -12)),
    baselineEnd: iso(addDays(today, -7)),
    dependencyIds: [],
    estimatedHours: 24,
    actualHours: 26,
    dailyCapacity: null,
    budget: 1500,
    apiExpected: 200000,
    apiActual: 210000,
    subscriptionMonthly: 300,
    billingModel: 'gpt-4o',
    notes: '准备资料和权限开通。'
  },
  {
    id: 'T-1002',
    name: '需求澄清工作坊',
    owner: 'Bob',
    status: 'in_progress',
    priority: 'P0',
    tags: ['workshop'],
    startDate: iso(addDays(today, -5)),
    endDate: iso(addDays(today, -3)),
    type: 'task',
    baselineStart: iso(addDays(today, -6)),
    baselineEnd: iso(addDays(today, -2)),
    dependencyIds: ['T-1001'],
    estimatedHours: 16,
    actualHours: 8,
    dailyCapacity: null,
    budget: 1200,
    apiExpected: 120000,
    apiActual: 60000,
    subscriptionMonthly: 0,
    billingModel: 'gpt-4o-mini',
    notes: ''
  },
  {
    id: 'T-1003',
    name: '确认里程碑 M1',
    owner: 'Clara',
    status: 'not_started',
    priority: 'P1',
    tags: ['milestone'],
    startDate: iso(addDays(today, 2)),
    endDate: iso(addDays(today, 2)),
    type: 'milestone',
    baselineStart: iso(addDays(today, 1)),
    baselineEnd: iso(addDays(today, 1)),
    dependencyIds: ['T-1002'],
    estimatedHours: 4,
    actualHours: 0,
    dailyCapacity: null,
    budget: 500,
    apiExpected: 50000,
    apiActual: 0,
    subscriptionMonthly: 0,
    billingModel: 'gpt-4o',
    notes: '需确认干系人同步会议'
  },
  {
    id: 'T-1004',
    name: 'AI API 成本模型验证',
    owner: 'Alice',
    status: 'blocked',
    priority: 'P0',
    tags: ['cost'],
    startDate: iso(addDays(today, 1)),
    endDate: iso(addDays(today, 6)),
    type: 'task',
    baselineStart: iso(addDays(today, 0)),
    baselineEnd: iso(addDays(today, 5)),
    dependencyIds: ['T-1002'],
    estimatedHours: 32,
    actualHours: 0,
    dailyCapacity: null,
    budget: 2500,
    apiExpected: 300000,
    apiActual: 0,
    subscriptionMonthly: 200,
    billingModel: 'gpt-4o',
    notes: '等待模型最新定价确认'
  }
]);

const initialRange = findTaskDateRange(seedTasks) ?? defaultTimelineRange();
const initialTimeline = rangeToTimeline(expandRange(initialRange, 0.2));

const baseSettings: ProjectSettings = {
  projectName: 'AI 项目排程',
  timelineStart: initialTimeline.timelineStart,
  timelineDays: initialTimeline.timelineDays,
  scale: 'week',
  timezone: 'Asia/Singapore',
  locale: 'zh-SG',
  resourceDailyLimit: 8,
  budgetThresholdWarning: 0.8,
  budgetThresholdCritical: 1.0,
  disableWeekendMilestones: true,
  strictOverAllocation: false
};

type ResourceHeatmap = ReturnType<typeof deriveResourceMap>;

interface ScheduleState {
  projectId: string;
  tasks: Task[];
  usageLogs: UsageLog[];
  selectedTaskIds: string[];
  view: ViewKey;
  filters: FilterState;
  settings: ProjectSettings;
  showBaseline: boolean;
  isUsageDrawerOpen: boolean;
  ganttViewDate: string | null;
  ganttViewDateNonce: number;
  lastValidation: ValidationIssue[];
  setProjectId: (projectId: string) => void;
  setView: (view: ViewKey) => void;
  updateTask: (task: Task) => void;
  addTask: (task: Task) => void;
  duplicateTasks: (ids: string[]) => void;
  deleteTasks: (ids: string[]) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setSettings: (settings: Partial<ProjectSettings>) => void;
  setSelectedTaskIds: (ids: string[]) => void;
  toggleBaseline: () => void;
  setUsageDrawerOpen: (open: boolean) => void;
  focusToday: () => void;
  focusOnDate: (date: string) => void;
  fitTimelineToTasks: () => void;
  shiftMilestoneToWeekday: (taskId: string, targetDate?: string) => void;
  addUsageLog: (log: Omit<UsageLog, 'id' | 'createdAt'>) => void;
  importUsageLogs: (logs: Array<Omit<UsageLog, 'id' | 'createdAt'>>) => void;
  deleteUsageLogs: (ids: string[]) => void;
  clearUsageLogs: () => void;
  runValidation: () => void;
  getCostLines: () => CostLine[];
  getResourceHeatmap: () => ResourceHeatmap;
  getSpanDates: () => string[];
  saveProject: () => void;
  loadProject: (projectId: string) => void;
  exportProject: () => string;
  importProject: (payload: string) => void;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  projectId: PROJECT_STORAGE_ID,
  tasks: seedTasks,
  usageLogs: [],
  selectedTaskIds: [],
  view: 'gantt',
  filters: {
    status: [],
    owners: [],
    tags: [],
    search: ''
  },
  settings: baseSettings,
  showBaseline: false,
  isUsageDrawerOpen: false,
  ganttViewDate: todayIso(),
  ganttViewDateNonce: 0,
  lastValidation: [],
  setProjectId: (projectId) => set({ projectId }),
  setView: (view) => set({ view }),
  updateTask: (task) => {
    const next = normalizeTask(task);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === next.id ? next : t))
    }));
    get().runValidation();
  },
  addTask: (task) => {
    const next = normalizeTask(task);
    set((state) => ({
      tasks: [...state.tasks, next]
    }));
    get().runValidation();
  },
  duplicateTasks: (ids) => {
    const now = Date.now();
    set((state) => {
      const clones: Task[] = [];
      state.tasks
        .filter((task) => ids.includes(task.id))
        .forEach((task, index) => {
          const clone: Task = normalizeTask({
            ...task,
            id: `${task.id}-C${index + 1}-${now}`,
            name: `${task.name}-副本`,
            startDate: task.startDate,
            endDate: task.type === 'milestone' ? task.startDate : task.endDate
          });
          clones.push(clone);
        });
      return { tasks: [...state.tasks, ...clones] };
    });
    get().runValidation();
  },
  deleteTasks: (ids) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => !ids.includes(task.id)),
      selectedTaskIds: state.selectedTaskIds.filter((id) => !ids.includes(id))
    }));
    get().runValidation();
  },
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters }
    })),
  setSettings: (settings) =>
    set((state) => ({
      settings: { ...state.settings, ...settings }
    })),
  setSelectedTaskIds: (ids) => set({ selectedTaskIds: ids }),
  toggleBaseline: () =>
    set((state) => ({
      showBaseline: !state.showBaseline
    })),
  setUsageDrawerOpen: (open) => set({ isUsageDrawerOpen: open }),
  focusToday: () =>
    set((state) => ({
      ganttViewDate: todayIso(),
      ganttViewDateNonce: state.ganttViewDateNonce + 1
    })),
  focusOnDate: (date) =>
    set((state) => ({
      ganttViewDate: date,
      ganttViewDateNonce: state.ganttViewDateNonce + 1
    })),
  fitTimelineToTasks: () => {
    const { tasks } = get();
    const range = findTaskDateRange(tasks) ?? defaultTimelineRange();
    const expanded = expandRange(range, 0.2);
    const timeline = rangeToTimeline(expanded);
    set((state) => ({
      settings: { ...state.settings, ...timeline }
    }));
  },
  shiftMilestoneToWeekday: (taskId, targetDate) => {
    const { tasks } = get();
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.type !== 'milestone') return;
    const safeDate = targetDate ?? nextBusinessDay(task.startDate);
    const updated = normalizeTask({
      ...task,
      startDate: safeDate,
      endDate: safeDate,
      baselineStart: task.baselineStart ?? safeDate,
      baselineEnd: task.baselineEnd ?? safeDate
    });
    set((state) => ({
      tasks: state.tasks.map((item) => (item.id === taskId ? updated : item))
    }));
    get().runValidation();
  },
  addUsageLog: (log) => {
    const normalized = createUsageLog({
      ...log,
      taskId: log.taskId ?? null,
      date: log.date ?? todayIso(),
      unit: log.unit ?? 'hour',
      source: log.source ?? 'manual'
    });
    set((state) => ({
      usageLogs: [...state.usageLogs, normalized]
    }));
    get().runValidation();
  },
  importUsageLogs: (logs) => {
    set((state) => ({
      usageLogs: [
        ...state.usageLogs,
        ...logs.map((log) =>
          createUsageLog({
            taskId: log.taskId ?? null,
            taskName: log.taskName,
            date: log.date,
            spent: log.spent,
            unit: log.unit ?? 'hour',
            source: log.source ?? 'manual',
            cost: log.cost,
            currency: log.currency,
            note: log.note
          })
        )
      ]
    }));
    get().runValidation();
  },
  deleteUsageLogs: (ids) => {
    set((state) => ({
      usageLogs: state.usageLogs.filter((log) => !ids.includes(log.id))
    }));
    get().runValidation();
  },
  clearUsageLogs: () => {
    set({ usageLogs: [] });
    get().runValidation();
  },
  runValidation: () => {
    const { tasks, settings, usageLogs } = get();
    const issues = detectValidationIssues(tasks, settings, usageLogs);
    set({ lastValidation: issues });
  },
  getCostLines: () => {
    const { tasks, settings } = get();
    return buildCostLines(tasks, settings);
  },
  getResourceHeatmap: () => {
    const { tasks, settings } = get();
    return deriveResourceMap(tasks, settings);
  },
  getSpanDates: () => {
    const { settings } = get();
    return generateSpanDates(settings.timelineStart, settings.timelineDays);
  },
  saveProject: () => {
    const { projectId, tasks, settings, usageLogs } = get();
    const payload: PersistedProjectData = {
      tasks,
      settings,
      usageLogs,
      updatedAt: new Date().toISOString()
    };
    saveProject(projectId, payload);
  },
  loadProject: (projectId) => {
    const data = loadProject(projectId);
    if (!data) return;
    set({
      projectId,
      tasks: normalizeTasks(data.tasks),
      settings: { ...baseSettings, ...data.settings },
      usageLogs: data.usageLogs ?? [],
      lastValidation: []
    });
    get().runValidation();
  },
  exportProject: () => {
    const { tasks, settings, usageLogs } = get();
    const payload: PersistedProjectData = {
      tasks,
      settings,
      usageLogs,
      updatedAt: new Date().toISOString()
    };
    return exportProjectData(payload);
  },
  importProject: (payload) => {
    const data = importProjectData(payload);
    set({
      projectId: data.projectId ?? PROJECT_STORAGE_ID,
      tasks: normalizeTasks(data.tasks),
      settings: { ...baseSettings, ...data.settings },
      usageLogs: data.usageLogs ?? [],
      lastValidation: []
    });
    get().runValidation();
  }
}));

import { create } from 'zustand';
import { addDays, formatISO } from 'date-fns';
import type {
  CostLine,
  FilterState,
  ProjectSettings,
  Task,
  ValidationIssue,
  ViewKey
} from '../types';
import {
  buildCostLines,
  detectValidationIssues,
  deriveResourceMap,
  generateSpanDates
} from '../utils/analytics';

interface ScheduleState {
  tasks: Task[];
  selectedTaskIds: string[];
  view: ViewKey;
  filters: FilterState;
  settings: ProjectSettings;
  lastValidation: ValidationIssue[];
  setView: (view: ViewKey) => void;
  updateTask: (task: Task) => void;
  addTask: (task: Task) => void;
  duplicateTasks: (ids: string[]) => void;
  deleteTasks: (ids: string[]) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setSettings: (settings: Partial<ProjectSettings>) => void;
  setSelectedTaskIds: (ids: string[]) => void;
  runValidation: () => void;
  getCostLines: () => CostLine[];
  getResourceHeatmap: () => ReturnType<typeof deriveResourceMap>;
  getSpanDates: () => string[];
}

const today = new Date();
const iso = (d: Date) => formatISO(d, { representation: 'date' });

const initialTasks: Task[] = [
  {
    id: 'T-1001',
    name: '项目初始化',
    owner: 'Alice',
    status: 'completed',
    priority: 'P1',
    tags: ['kickoff'],
    startDate: iso(addDays(today, -10)),
    endDate: iso(addDays(today, -7)),
    isMilestone: false,
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
    notes: '完成准备工作与权限申请。'
  },
  {
    id: 'T-1002',
    name: '需求梳理工作坊',
    owner: 'Bob',
    status: 'in_progress',
    priority: 'P0',
    tags: ['workshop'],
    startDate: iso(addDays(today, -5)),
    endDate: iso(addDays(today, -3)),
    isMilestone: false,
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
    isMilestone: true,
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
    notes: '需所有干系人通过。'
  },
  {
    id: 'T-1004',
    name: 'AI API 成本模型设计',
    owner: 'Alice',
    status: 'blocked',
    priority: 'P0',
    tags: ['cost'],
    startDate: iso(addDays(today, 1)),
    endDate: iso(addDays(today, 6)),
    isMilestone: false,
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
    notes: '等待模型单价配置审批。'
  }
];

const initialSettings: ProjectSettings = {
  projectName: 'AI 项目面板',
  timelineStart: iso(addDays(today, -14)),
  timelineDays: 90,
  scale: 'week',
  timezone: 'Asia/Singapore',
  locale: 'zh-SG',
  resourceDailyLimit: 8,
  budgetThresholdWarning: 0.8,
  budgetThresholdCritical: 1.0,
  disableWeekendMilestones: true,
  strictOverAllocation: false
};

const initialFilters: FilterState = {
  status: [],
  owners: [],
  tags: [],
  search: ''
};

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  tasks: initialTasks,
  selectedTaskIds: [],
  view: 'gantt',
  filters: initialFilters,
  settings: initialSettings,
  lastValidation: [],
  setView: (view) => set({ view }),
  updateTask: (task) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === task.id ? task : t))
    })),
  addTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks, task]
    })),
  duplicateTasks: (ids) =>
    set((state) => {
      const now = Date.now();
      const clones = state.tasks
        .filter((t) => ids.includes(t.id))
        .map((t, index) => ({
          ...t,
          id: `${t.id}-C${index + 1}-${now}`,
          name: `${t.name}（副本）`
        }));
      return { tasks: [...state.tasks, ...clones] };
    }),
  deleteTasks: (ids) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => !ids.includes(t.id))
    })),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters }
    })),
  setSettings: (settings) =>
    set((state) => ({
      settings: { ...state.settings, ...settings }
    })),
  setSelectedTaskIds: (ids) => set({ selectedTaskIds: ids }),
  runValidation: () => {
    const { tasks, settings } = get();
    const issues = detectValidationIssues(tasks, settings);
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
  }
}));

import { useMemo, useRef, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Copy, Crosshair, Plus, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useScheduleStore } from '../store/scheduleStore';
import type { Task } from '../types';

interface Props {
  tasks: Task[];
}

interface UsageAggregate {
  spent: number;
  cost: number;
}

export const TaskTableView = ({ tasks }: Props) => {
  const gridRef = useRef<AgGridReact<Task>>(null);
  const [quickFilter, setQuickFilter] = useState('');
  const {
    updateTask,
    addTask,
    deleteTasks,
    duplicateTasks,
    setSelectedTaskIds,
    selectedTaskIds,
    lastValidation,
    usageLogs,
    focusOnDate
  } = useScheduleStore((state) => ({
    updateTask: state.updateTask,
    addTask: state.addTask,
    deleteTasks: state.deleteTasks,
    duplicateTasks: state.duplicateTasks,
    setSelectedTaskIds: state.setSelectedTaskIds,
    selectedTaskIds: state.selectedTaskIds,
    lastValidation: state.lastValidation,
    usageLogs: state.usageLogs,
    focusOnDate: state.focusOnDate
  }));

  const usageByTask = useMemo(() => {
    const map = new Map<string, UsageAggregate>();
    usageLogs.forEach((log) => {
      const key = log.taskId ?? 'unassigned';
      if (!map.has(key)) {
        map.set(key, { spent: 0, cost: 0 });
      }
      const entry = map.get(key)!;
      entry.spent += log.spent;
      entry.cost += log.cost ?? 0;
    });
    return map;
  }, [usageLogs]);

  const columns = useMemo<ColDef<Task>[]>(() => {
    const validationMap = new Map<string, string[]>();
    lastValidation.forEach((issue) => {
      const key = `${issue.taskId}:${issue.field}`;
      if (!validationMap.has(key)) validationMap.set(key, []);
      validationMap.get(key)!.push(issue.message);
    });

    const createNumberColumn = (field: keyof Task, headerName: string): ColDef<Task> => ({
      field,
      headerName,
      width: 130,
      editable: true,
      type: 'numericColumn',
      valueParser: (params) => Number(params.newValue) || 0,
      cellClassRules: {
        'ag-cell-error': (params) => validationMap.has(`${params.data?.id}:${field}`)
      }
    });

    return [
      {
        field: 'id',
        headerName: 'ID',
        width: 120,
        pinned: 'left',
        editable: false
      },
      {
        field: 'name',
        headerName: '任务',
        pinned: 'left',
        width: 220,
        editable: true,
        cellClassRules: {
          'ag-cell-error': (params) => validationMap.has(`${params.data?.id}:name`)
        }
      },
      {
        field: 'type',
        headerName: '类型',
        width: 120,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['task', 'milestone']
        },
        cellRenderer: (params: ICellRendererParams<Task>) =>
          params.value === 'milestone' ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              里程碑
            </span>
          ) : (
            '标准任务'
          )
      },
      {
        field: 'owner',
        headerName: '负责人',
        width: 140,
        editable: true
      },
      {
        field: 'status',
        headerName: '状态',
        width: 140,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['not_started', 'in_progress', 'blocked', 'completed']
        }
      },
      {
        field: 'startDate',
        headerName: '起止',
        width: 170,
        editable: true,
        valueGetter: (params) => `${params.data?.startDate ?? ''} ~ ${params.data?.endDate ?? ''}`,
        cellRenderer: (params: ICellRendererParams<Task>) => {
          const task = params.data;
          if (!task) return null;
          const isWeekend =
            new Date(task.startDate).getDay() === 0 ||
            new Date(task.startDate).getDay() === 6 ||
            new Date(task.endDate).getDay() === 0 ||
            new Date(task.endDate).getDay() === 6;
          const hasWeekend = isWeekend && task.type === 'task';
          return (
            <div className="flex items-center justify-between gap-1">
              <div className="flex flex-col text-xs leading-tight">
                <span>{task.startDate}</span>
                <span>{task.type === 'milestone' ? '(零工期)' : task.endDate}</span>
              </div>
              <button
                type="button"
                onClick={() => focusOnDate(task.startDate)}
                className="rounded border border-slate-200 p-1 hover:bg-slate-100"
                title="甘特定位到该日期"
              >
                <Crosshair className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {hasWeekend && <span className="h-2 w-2 rounded-full bg-amber-400" title="包含周末" />}
            </div>
          );
        },
        cellClassRules: {
          'ag-cell-error': (params) => validationMap.has(`${params.data?.id}:startDate`) || validationMap.has(`${params.data?.id}:endDate`)
        }
      },
      {
        field: 'baselineStart',
        headerName: '基线',
        width: 160,
        editable: true,
        valueGetter: (params) =>
          `${params.data?.baselineStart ?? params.data?.startDate ?? ''} ~ ${
            params.data?.baselineEnd ?? params.data?.endDate ?? ''
          }`,
        cellClassRules: {
          'ag-cell-warning': (params) =>
            validationMap.has(`${params.data?.id}:baselineStart`) ||
            validationMap.has(`${params.data?.id}:baselineEnd`)
        }
      },
      createNumberColumn('estimatedHours', '预估工时'),
      createNumberColumn('budget', '预算(¥)'),
      createNumberColumn('apiExpected', 'API预估'),
      createNumberColumn('apiActual', 'API实耗'),
      createNumberColumn('subscriptionMonthly', '订阅/月'),
      {
        headerName: '用量(本月)',
        field: 'usage',
        width: 150,
        valueGetter: (params) => {
          const key = params.data?.id ?? 'unassigned';
          const aggregate = usageByTask.get(key);
          if (!aggregate) return '';
          const parts = [];
          if (aggregate.spent) parts.push(`${aggregate.spent.toFixed(1)}h`);
          if (aggregate.cost) parts.push(`¥${aggregate.cost.toFixed(0)}`);
          return parts.join(' / ');
        }
      },
      {
        field: 'notes',
        headerName: '备注',
        width: 220,
        editable: true
      }
    ];
  }, [lastValidation, usageByTask, focusOnDate]);

  const handleCellValueChange = (event: any) => {
    if (!event.data) return;
    const updated: Task = {
      ...event.data,
      type: event.data.type === 'milestone' ? 'milestone' : 'task',
      endDate: event.data.type === 'milestone' ? event.data.startDate : event.data.endDate
    };
    updateTask(updated);
  };

  const handleAddRow = () => {
    const start = new Date().toISOString().slice(0, 10);
    const newTask: Task = {
      id: `T-${nanoid(6)}`,
      name: '新建任务',
      owner: null,
      status: 'not_started',
      priority: 'P2',
      tags: [],
      startDate: start,
      endDate: start,
      type: 'task',
      baselineStart: start,
      baselineEnd: start,
      dependencyIds: [],
      estimatedHours: 8,
      actualHours: 0,
      dailyCapacity: null,
      budget: 0,
      apiExpected: 0,
      apiActual: 0,
      subscriptionMonthly: 0,
      notes: ''
    };
    addTask(newTask);
  };

  const handleDelete = () => {
    const ids = gridRef.current
      ?.getSelectedNodes()
      .map((node) => node.data?.id)
      .filter(Boolean) as string[];
    if (ids?.length) {
      deleteTasks(ids);
    }
  };

  const handleDuplicate = () => {
    const ids = gridRef.current
      ?.getSelectedNodes()
      .map((node) => node.data?.id)
      .filter(Boolean) as string[];
    if (ids?.length) {
      duplicateTasks(ids);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">任务表</h2>
          <p className="text-xs text-slate-500">
            支持 Excel 粘贴、批量编辑。对周末、基线与预算超标会自动提示。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={quickFilter}
            onChange={(event) => setQuickFilter(event.target.value)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm"
            placeholder="快速过滤"
          />
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            新增
          </button>
          <button
            type="button"
            onClick={handleDuplicate}
            className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
            disabled={!selectedTaskIds.length}
          >
            <Copy className="h-4 w-4" />
            复制
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-600 hover:bg-red-100"
            disabled={!selectedTaskIds.length}
          >
            <Trash2 className="h-4 w-4" />
            删除
          </button>
        </div>
      </div>
      <div className="flex-1 bg-white">
        <div className="ag-theme-alpine h-full w-full">
          <AgGridReact<Task>
            ref={gridRef}
            rowData={tasks}
            columnDefs={columns}
            rowSelection="multiple"
            onCellValueChanged={handleCellValueChange}
            suppressDragLeaveHidesColumns
            enableCellTextSelection
            rowHeight={42}
            quickFilterText={quickFilter}
            onSelectionChanged={() => {
              const ids = gridRef.current
                ?.getSelectedNodes()
                .map((node) => node.data?.id)
                .filter(Boolean) as string[];
              setSelectedTaskIds(ids ?? []);
            }}
          />
        </div>
      </div>
      <div className="border-t px-5 py-2 text-xs text-slate-400">
        提示：粘贴 Excel 时请保持列顺序一致；里程碑自动保持零工期，如需跨天请切换为“标准任务”。
      </div>
    </div>
  );
};

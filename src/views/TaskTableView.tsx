import { useMemo, useRef, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Plus, Trash2, Copy } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useScheduleStore } from '../store/scheduleStore';
import type { Task } from '../types';

interface Props {
  tasks: Task[];
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
    lastValidation
  } = useScheduleStore((state) => ({
    updateTask: state.updateTask,
    addTask: state.addTask,
    deleteTasks: state.deleteTasks,
    duplicateTasks: state.duplicateTasks,
    setSelectedTaskIds: state.setSelectedTaskIds,
    selectedTaskIds: state.selectedTaskIds,
    lastValidation: state.lastValidation
  }));

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
      width: 140,
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
        headerName: '名称',
        pinned: 'left',
        width: 220,
        editable: true,
        cellClassRules: {
          'ag-cell-error': (params) => validationMap.has(`${params.data?.id}:name`)
        }
      },
      {
        field: 'owner',
        headerName: '负责人',
        pinned: 'left',
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
        headerName: '开始',
        width: 130,
        editable: true,
        cellClassRules: {
          'ag-cell-error': (params) => validationMap.has(`${params.data?.id}:startDate`)
        }
      },
      {
        field: 'endDate',
        headerName: '结束',
        width: 130,
        editable: true,
        cellClassRules: {
          'ag-cell-error': (params) => validationMap.has(`${params.data?.id}:endDate`)
        }
      },
      {
        field: 'isMilestone',
        headerName: '里程碑',
        width: 110,
        editable: true,
        cellRenderer: (params: ICellRendererParams<Task>) => (
          <input
            type="checkbox"
            checked={params.value}
            onChange={(event) => params.node.setDataValue('isMilestone', event.target.checked)}
          />
        )
      },
      createNumberColumn('estimatedHours', '预计工时'),
      createNumberColumn('budget', '预算$'),
      createNumberColumn('apiExpected', 'API预计'),
      createNumberColumn('apiActual', 'API实际'),
      createNumberColumn('subscriptionMonthly', '月订阅$'),
      {
        field: 'dependencyIds',
        headerName: '依赖ID',
        width: 180,
        editable: true,
        valueGetter: (params) => params.data?.dependencyIds.join(', ') ?? '',
        valueSetter: (params) => {
          if (!params.data) return false;
          params.data.dependencyIds = params.newValue
            ? params.newValue
                .split(',')
                .map((value: string) => value.trim())
                .filter(Boolean)
            : [];
          return true;
        }
      },
      {
        field: 'priority',
        headerName: '优先级',
        width: 120,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['P0', 'P1', 'P2']
        }
      },
      {
        field: 'tags',
        headerName: '标签',
        width: 160,
        editable: true,
        valueGetter: (params) => params.data?.tags.join(', ') ?? '',
        valueSetter: (params) => {
          if (!params.data) return false;
          params.data.tags = params.newValue
            ? params.newValue
                .split(',')
                .map((value: string) => value.trim())
                .filter(Boolean)
            : [];
          return true;
        }
      },
      {
        field: 'notes',
        headerName: '备注',
        width: 220,
        editable: true
      },
      {
        field: 'id',
        headerName: '校验',
        width: 120,
        pinned: 'right',
        valueGetter: (params) => {
          const errors = lastValidation.filter((issue) => issue.taskId === params.data?.id);
          return errors.length ? `${errors.length} 条提示` : '通过';
        },
        cellClassRules: {
          'ag-cell-error': (params) => lastValidation.some((issue) => issue.taskId === params.data?.id)
        }
      }
    ];
  }, [lastValidation]);

  const handleCellValueChange = (event: any) => {
    if (!event.data) return;
    updateTask({ ...event.data });
  };

  const handleAddRow = () => {
    const newTask: Task = {
      id: `T-${nanoid(6)}`,
      name: '新建任务',
      owner: null,
      status: 'not_started',
      priority: 'P2',
      tags: [],
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      isMilestone: false,
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
            支持 Excel 式粘贴、批量编辑、冻结首列。非法值将以红框提示并同步至右侧校验栏。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={quickFilter}
            onChange={(event) => setQuickFilter(event.target.value)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm"
            placeholder="快速筛选"
          />
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            新增行
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
            pinnedTopRowData={undefined}
            rowSelection="multiple"
            onCellValueChanged={handleCellValueChange}
            suppressDragLeaveHidesColumns
            enableCellTextSelection
            rowHeight={40}
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
        提示：表格支持粘贴 Excel 区块；已完成任务的时间与依赖默认锁定，可在管理员模式解除。
      </div>
    </div>
  );
};

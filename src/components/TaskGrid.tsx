import { useMemo, useRef } from 'react';
import type { ColDef, CellValueChangedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { useStore } from '../store';
import type { PgTask } from '../types';

export const TaskGrid = () => {
  const gridRef = useRef<AgGridReact<PgTask>>(null);
  const tasks = useStore((state) => state.order.map((id) => state.tasks[id]));
  const updateTask = useStore((state) => state.updateTask);
  const deleteTask = useStore((state) => state.deleteTask);

  const columnDefs = useMemo<ColDef<PgTask>[]>(() => {
    const formatDate = (value?: Date) => (value ? value.toISOString().slice(0, 10) : '');
    return [
      { headerName: 'ID', field: 'id', editable: false, width: 120 },
      { headerName: '名称', field: 'name', editable: true, width: 180 },
      {
        headerName: '类型',
        field: 'type',
        editable: true,
        width: 110,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['task', 'milestone', 'project']
        }
      },
      { headerName: '负责人', field: 'assignee', editable: true, width: 140 },
      {
        headerName: '开始',
        field: 'start',
        editable: true,
        width: 130,
        valueGetter: (params) => formatDate(params.data?.start),
        valueSetter: (params) => {
          const value = params.newValue;
          if (!params.data) return false;
          const date = value ? new Date(value) : params.data.start;
          updateTask(params.data.id, { start: date });
          return true;
        }
      },
      {
        headerName: '结束',
        field: 'end',
        editable: true,
        width: 130,
        valueGetter: (params) => formatDate(params.data?.end),
        valueSetter: (params) => {
          const value = params.newValue;
          if (!params.data) return false;
          const date = value ? new Date(value) : params.data.end;
          updateTask(params.data.id, { end: date });
          return true;
        }
      },
      {
        headerName: '依赖',
        field: 'dependencies',
        editable: true,
        width: 160,
        valueGetter: (params) => params.data?.dependencies.join(', ') ?? '',
        valueSetter: (params) => {
          if (!params.data) return false;
          const value = String(params.newValue ?? '');
          const dependencies = value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
          updateTask(params.data.id, { dependencies });
          return true;
        }
      },
      {
        headerName: '进度%',
        field: 'progress',
        editable: true,
        width: 110,
        valueFormatter: (params) => `${params.value ?? 0}`
      },
      {
        headerName: '计划消耗',
        field: 'costPlan',
        editable: true,
        width: 120
      },
      {
        headerName: '实际消耗',
        field: 'costActual',
        editable: true,
        width: 120
      }
    ];
  }, [updateTask]);

  const defaultColDef = useMemo<ColDef<PgTask>>(
    () => ({
      resizable: true,
      sortable: true
    }),
    []
  );

  const handleCellValueChange = (event: CellValueChangedEvent<PgTask>) => {
    const task = event.data;
    if (!task) return;
    const field = event.colDef.field as keyof PgTask | undefined;
    if (!field) return;
    if (field === 'start' || field === 'end' || field === 'dependencies') {
      return;
    }
    const patch: Partial<PgTask> = { [field]: event.newValue } as Partial<PgTask>;
    updateTask(task.id, patch);
  };

  return (
    <div className="ag-theme-alpine h-[360px] w-full">
      <AgGridReact<PgTask>
        ref={gridRef}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowData={tasks}
        getRowId={(params) => params.data.id}
        suppressRowClickSelection={false}
        editType="fullRow"
        onCellValueChanged={handleCellValueChange}
        onRowDoubleClicked={(event) => {
          if (event.data) deleteTask(event.data.id);
        }}
      />
    </div>
  );
};

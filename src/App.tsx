import { useState } from 'react';
import { GanttPane } from './components/GanttPane';
import { TaskGrid } from './components/TaskGrid';
import { useStore } from './store';

const copyToClipboard = async (text: string) => {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  }
};

function App() {
  const addTask = useStore((state) => state.addTask);
  const addMilestone = useStore((state) => state.addMilestone);
  const runValidation = useStore((state) => state.runValidation);
  const autoLevel = useStore((state) => state.autoLevel);
  const undo = useStore((state) => state.undo);
  const redo = useStore((state) => state.redo);
  const exportData = useStore((state) => state.exportData);
  const importData = useStore((state) => state.importData);
  const issues = useStore((state) => state.issues);

  const [importError, setImportError] = useState<string | null>(null);

  const handleExport = async () => {
    const payload = exportData();
    try {
      await copyToClipboard(payload);
      window.alert('已将 JSON 导出复制到剪贴板');
    } catch (error) {
      console.error(error);
      window.alert('复制失败，请手动粘贴下方文本框。');
    }
  };

  const handleImport = () => {
    const input = window.prompt('粘贴 JSON 数据以导入');
    if (!input) return;
    try {
      const data = JSON.parse(input);
      if (!Array.isArray(data)) {
        throw new Error('数据格式应为任务数组');
      }
      importData(data);
      runValidation();
      setImportError(null);
    } catch (error) {
      console.error(error);
      setImportError('导入失败，请确认 JSON 格式正确。');
    }
  };

  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={() => addTask()}>
          新增任务
        </button>
        <button type="button" className="btn" onClick={() => addMilestone()}>
          新增里程碑
        </button>
        <button type="button" className="btn" onClick={runValidation}>
          校验
        </button>
        <button type="button" className="btn" onClick={autoLevel}>
          自动资源平衡
        </button>
        <button type="button" className="btn" onClick={undo}>
          撤销
        </button>
        <button type="button" className="btn" onClick={redo}>
          重做
        </button>
        <button type="button" className="btn" onClick={handleExport}>
          导出 JSON
        </button>
        <button type="button" className="btn" onClick={handleImport}>
          导入 JSON
        </button>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">甘特视图</h2>
        <GanttPane />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">任务表</h2>
        <TaskGrid />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">
          校验中心（{issues.length}）
        </h2>
        {issues.length === 0 ? (
          <div className="rounded border border-dashed border-emerald-200 bg-emerald-50 px-3 py-4 text-sm text-emerald-600">
            一切正常，暂无问题。
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            {issues.map((issue) => (
              <li
                key={issue.id}
                className={`rounded border px-3 py-2 ${
                  issue.level === 'error'
                    ? 'border-red-200 bg-red-50 text-red-600'
                    : 'border-amber-200 bg-amber-50 text-amber-600'
                }`}
              >
                <strong>{issue.taskId}</strong> · {issue.message}
              </li>
            ))}
          </ul>
        )}
        {importError && (
          <p className="mt-2 text-xs text-red-500" role="alert">
            {importError}
          </p>
        )}
      </section>
    </div>
  );
}

export default App;

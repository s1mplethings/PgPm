import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { ValidationIssue } from '../types';

interface Props {
  issues: ValidationIssue[];
}

export const ValidationCenter = ({ issues }: Props) => {
  return (
    <aside className="w-80 shrink-0 border-l bg-white">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="text-sm font-semibold text-slate-700">校验提示</div>
        <div className="text-xs text-slate-400">{issues.length} 条</div>
      </div>
      <div className="h-full overflow-y-auto px-4 py-3">
        {issues.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-slate-200 px-3 py-10 text-center">
            <CheckCircle className="h-10 w-10 text-success" />
            <div className="text-sm font-medium text-slate-600">暂无错误</div>
            <div className="text-xs text-slate-400">点击「校验计划」以重新检查。</div>
          </div>
        ) : (
          <ul className="space-y-3">
            {issues.map((issue) => (
              <li key={`${issue.taskId}-${issue.field}-${issue.message}`} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-start gap-2">
                  {issue.severity === 'error' ? (
                    <AlertTriangle className="h-4 w-4 text-danger" />
                  ) : (
                    <Info className="h-4 w-4 text-warning" />
                  )}
                  <div>
                    <div className="text-xs uppercase text-slate-400">{issue.taskId}</div>
                    <div className="text-sm font-medium text-slate-700">{issue.message}</div>
                    <div className="text-xs text-slate-400">字段：{issue.field}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
};

import { AlertTriangle, CheckCircle, Info, Wrench } from 'lucide-react';
import { useScheduleStore } from '../store/scheduleStore';
import type { ValidationIssue } from '../types';

interface Props {
  issues: ValidationIssue[];
}

const severityStyle: Record<ValidationIssue['severity'], string> = {
  error: 'text-red-600 bg-red-50 border-red-200',
  warning: 'text-amber-600 bg-amber-50 border-amber-200',
  info: 'text-slate-500 bg-slate-50 border-slate-200'
};

const severityIcon: Record<ValidationIssue['severity'], JSX.Element> = {
  error: <AlertTriangle className="h-4 w-4 text-red-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  info: <Info className="h-4 w-4 text-slate-400" />
};

export const ValidationCenter = ({ issues }: Props) => {
  const { shiftMilestoneToWeekday } = useScheduleStore((state) => ({
    shiftMilestoneToWeekday: state.shiftMilestoneToWeekday
  }));

  const handleFix = (issue: ValidationIssue) => {
    if (!issue.fix) return;
    if (issue.fix.action === 'shiftWeekendMilestone' && typeof issue.fix.payload?.taskId === 'string') {
      shiftMilestoneToWeekday(
        issue.fix.payload.taskId as string,
        typeof issue.fix.payload?.suggestedDate === 'string'
          ? (issue.fix.payload.suggestedDate as string)
          : undefined
      );
    }
  };

  return (
    <aside className="w-80 shrink-0 border-l bg-white">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="text-sm font-semibold text-slate-700">校验中心</div>
        <div className="text-xs text-slate-400">{issues.length} 条</div>
      </div>
      <div className="h-full overflow-y-auto px-4 py-3">
        {issues.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-slate-200 px-3 py-10 text-center">
            <CheckCircle className="h-10 w-10 text-emerald-500" />
            <div className="text-sm font-medium text-slate-600">一切正常</div>
            <div className="text-xs text-slate-400">所有任务通过快速检查。</div>
          </div>
        ) : (
          <ul className="space-y-3">
            {issues.map((issue) => (
              <li
                key={`${issue.code}-${issue.taskId}-${issue.field}-${issue.message}`}
                className={`rounded-md border px-3 py-3 text-sm ${severityStyle[issue.severity]}`}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-1">{severityIcon[issue.severity]}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                      <span className="rounded bg-white px-2 py-0.5 font-semibold text-slate-600 shadow-sm">
                        {issue.code}
                      </span>
                      <span>{issue.taskId === 'PROJECT' ? '项目总体' : issue.taskId}</span>
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-700">{issue.message}</div>
                    <div className="text-xs text-slate-500">字段：{issue.field}</div>
                    {issue.fix && (
                      <button
                        type="button"
                        onClick={() => handleFix(issue)}
                        className="mt-2 inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        {issue.fix.label}
                      </button>
                    )}
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

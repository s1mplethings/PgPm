import { useEffect, useState, type CSSProperties } from 'react';
import type { Task } from '../../core/types';
import { parseLineToTask } from '../../core/nlp';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
};

const overlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.25)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const panel: CSSProperties = {
  width: 720,
  maxWidth: 'calc(100% - 32px)',
  background: '#fff',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  boxShadow: '0 8px 40px rgba(0,0,0,.2)',
  padding: 16
};

export default function QuickAdd({ open, onClose, onSave }: Props) {
  const [line, setLine] = useState('');
  const [draft, setDraft] = useState<Task | null>(null);

  useEffect(() => {
    if (!open) {
      setLine('');
      setDraft(null);
    }
  }, [open]);

  const parse = () => {
    if (!line.trim()) {
      setDraft(null);
      return;
    }
    const parsed = parseLineToTask(line);
    setDraft(parsed);
  };

  const confirm = () => {
    if (draft?.title) {
      onSave(draft);
    }
  };

  if (!open) return null;

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={(event) => event.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>快速添加任务（自然语言）</div>
        <div style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
          示例：<code>明天 14:00-16:00 写接口文档 2h P0 @你 ¥20 10kapi Now</code>
        </div>
        <textarea
          placeholder="在这里输入一行任务描述…"
          value={line}
          onChange={(event) => setLine(event.target.value)}
          style={{
            marginTop: 12,
            width: '100%',
            height: 90,
            padding: 10,
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={parse}>
            解析
          </button>
          <button className="btn brand" onClick={confirm} disabled={!draft}>
            保存
          </button>
          <button className="btn" onClick={onClose}>
            取消
          </button>
        </div>
        {draft && (
          <div
            style={{
              marginTop: 12,
              background: '#f8fafc',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: 12
            }}
          >
            <div style={{ fontWeight: 600 }}>解析结果（可保存）</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
              {JSON.stringify(draft, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

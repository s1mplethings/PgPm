import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { parseLine } from '../../core/parse';
import type { Task } from '../../core/types';
import { repo } from '../../infra/repoFactory';
import '../../app.input.css';

type Props = {
  onChanged?: () => void;
};

export default function InputPage({ onChanged }: Props) {
  const [line, setLine] = useState('');
  const [draft, setDraft] = useState<Partial<Task> | null>(null);
  const [list, setList] = useState<Task[]>([]);

  const refresh = async () => {
    const tasks = await repo.list();
    setList(tasks);
  };

  useEffect(() => {
    refresh();
  }, []);

  const notifyChange = () => {
    refresh();
    onChanged?.();
  };

  const onParse = () => setDraft(parseLine(line));

  const onSave = async () => {
    if (!draft?.title) return;
    await repo.add({ ...draft, status: draft.status ?? 'Inbox' } as Task);
    setLine('');
    setDraft(null);
    notifyChange();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onParse();
    onSave();
  };

  const groups = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const dupKey = (value?: string) => (value ?? '').trim();
    const dupMap = new Map<string, number>();
    list.forEach((task) => {
      const key = dupKey(task.title);
      dupMap.set(key, (dupMap.get(key) ?? 0) + 1);
    });
    return {
      dueToday: list.filter((task) => task.due === today),
      p0: list.filter((task) => task.priority === 'P0'),
      blocked: list.filter((task) => task.status === 'Blocked'),
      duplicated: list.filter((task) => (dupMap.get(dupKey(task.title)) ?? 0) > 1)
    };
  }, [list]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr .8fr', gap: 16 }}>
      <div>
        <form className="card section" onSubmit={handleSubmit}>
          <div style={{ fontWeight: 700 }}>添加任务（自然语言，一行）</div>
          <textarea
            value={line}
            onChange={(event) => setLine(event.target.value)}
            placeholder="例：明天 14:00-16:00 写接口文档 2h P0 @你 ¥20 10kapi Now #后端 #接口"
            style={{
              marginTop: 8,
              width: '100%',
              height: 80,
              padding: 10,
              border: '1px solid #e5e7eb',
              borderRadius: 10
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                onParse();
                onSave();
              }
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={onParse}>
              解析
            </button>
            <button type="submit" className="btn brand">
              保存并新建（Enter）
            </button>
          </div>
        </form>

        <div className="card section" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>整理（智能分组）</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4,1fr)',
              gap: 8,
              marginTop: 8
            }}
          >
            <Group title="今日到期" items={groups.dueToday} />
            <Group title="P0" items={groups.p0} />
            <Group title="阻塞" items={groups.blocked} />
            <Group title="疑似重复" items={groups.duplicated} />
          </div>
        </div>
      </div>

      <div className="card section">
        <div style={{ fontWeight: 700 }}>解析结果（可编辑后保存）</div>
        {draft ? (
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            <input
              value={draft.title || ''}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="标题"
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              <select
                value={draft.status || 'Inbox'}
                onChange={(event) => setDraft({ ...draft, status: event.target.value as Task['status'] })}
              >
                {['Inbox', 'Now', 'Next', 'Later', 'Blocked', 'Done'].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <select
                value={draft.priority || 'P1'}
                onChange={(event) => setDraft({ ...draft, priority: event.target.value as Task['priority'] })}
              >
                {['P0', 'P1', 'P2'].map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              <input
                type="date"
                value={draft.plan_start || ''}
                onChange={(event) => setDraft({ ...draft, plan_start: event.target.value })}
                placeholder="计划开始"
              />
              <input
                type="date"
                value={draft.plan_end || ''}
                onChange={(event) => setDraft({ ...draft, plan_end: event.target.value })}
                placeholder="计划结束"
              />
              <input
                type="date"
                value={draft.due || ''}
                onChange={(event) => setDraft({ ...draft, due: event.target.value })}
                placeholder="到期"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              <input
                type="number"
                step="0.25"
                value={draft.hours ?? ''}
                onChange={(event) => setDraft({ ...draft, hours: Number(event.target.value) })}
                placeholder="小时(h)"
              />
              <input
                type="number"
                step="1"
                value={draft.api ?? ''}
                onChange={(event) => setDraft({ ...draft, api: Number(event.target.value) })}
                placeholder="API(k)"
              />
              <input
                type="number"
                step="1"
                value={draft.cost ?? ''}
                onChange={(event) => setDraft({ ...draft, cost: Number(event.target.value) })}
                placeholder="费用(¥)"
              />
            </div>
            <input
              value={draft.owner || ''}
              onChange={(event) => setDraft({ ...draft, owner: event.target.value })}
              placeholder="负责人"
            />
            <input
              value={(draft.labels || []).join(' ')}
              onChange={(event) =>
                setDraft({ ...draft, labels: event.target.value.split(/\s+/).filter(Boolean) })
              }
              placeholder="标签（空格分隔）"
            />
          </div>
        ) : (
          <div className="sub" style={{ marginTop: 8 }}>
            输入后点击“解析”查看结果
          </div>
        )}
      </div>
    </div>
  );
}

function Group({ title, items }: { title: string; items: Task[] }) {
  return (
    <div className="item" style={{ padding: 10 }}>
      <div style={{ fontWeight: 600 }}>
        {title} <span className="sub">({items.length})</span>
      </div>
      <ul style={{ margin: 8, paddingLeft: 16 }}>
        {items.slice(0, 6).map((task) => (
          <li key={task.id} title={task.title}>
            {task.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

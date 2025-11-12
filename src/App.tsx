import { useEffect, useMemo, useState, type ReactNode } from 'react';
import './app.css';
import type { Task, Settings } from './core/types';
import { demoSettings } from './core/sampleData';
import { demoV04Tasks } from './core/sampleData_v04';
import { recommend } from './core/recommend';
import { readJSON, writeJSON } from './lib/fs';
import QuickAdd from './features/quickadd/QuickAdd';

type Mode = Settings['mode'];
type Pane = 'input' | 'display';

const Badge = ({ children, tone }: { children: ReactNode; tone?: 'brand' }) => (
  <span className={`badge ${tone === 'brand' ? 'brand' : ''}`}>{children}</span>
);

const Progress = ({ value }: { value: number }) => {
  const pct = `${Math.max(0, Math.min(1, value)) * 100}%`;
  return (
    <div className="progress">
      <i style={{ width: pct }} />
    </div>
  );
};

export default function App() {
  const [settings, setSettings] = useState<Settings>(demoSettings);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [active, setActive] = useState<string[]>([]);
  const [focus, setFocus] = useState<Task | null>(null);
  const [qaOpen, setQaOpen] = useState(false);
  const [pane, setPane] = useState<Pane>('input');

  useEffect(() => {
    (async () => {
      const loadedSettings = await readJSON<Settings>('settings.json', demoSettings);
      const snapshot = await readJSON<{ version: number; tasks: Task[] }>('tasks.json', {
        version: 1,
        tasks: []
      });
      setSettings(loadedSettings);
      setTasks(snapshot.tasks || []);
    })();
  }, []);

  const rec = useMemo(() => recommend(tasks, settings, active), [tasks, settings, active]);

  const setMode = async (mode: Mode) => {
    const next = { ...settings, mode };
    setSettings(next);
    await writeJSON('settings.json', next);
  };

  const saveTasks = async (arr: Task[]) => {
    setTasks(arr);
    await writeJSON('tasks.json', { version: 1, tasks: arr });
  };

  const appendEvent = async (payload: { task_id: string; action: 'accept' | 'skip' }) => {
    const events = await readJSON<{ ts: string; task_id: string; action: string }[]>(
      'events.json',
      []
    );
    events.push({ ts: new Date().toISOString(), ...payload });
    await writeJSON('events.json', events);
  };

  const accept = async (t: Task | null) => {
    if (!t) return;
    setActive([t.id]);
    setFocus(t);
    await appendEvent({ task_id: t.id, action: 'accept' });
  };

  const skip = async (t: Task | null) => {
    if (!t) return;
    await appendEvent({ task_id: t.id, action: 'skip' });
  };

  const importV04 = async () => {
    const arr = demoV04Tasks();
    await saveTasks(arr);
    setActive([]);
    setFocus(null);
  };

  const clearAll = async () => {
    await saveTasks([]);
    setActive([]);
    setFocus(null);
  };

  const columns = settings.columns ?? ['Now', 'Next', 'Later', 'Blocked', 'Done'];

  const renderInputPane = () => (
    <>
      <div className="topbar">
        <div className="h1">输入中心</div>
        <div className="kit" style={{ gap: 12 }}>
          <button className="btn brand" onClick={() => setQaOpen(true)}>
            打开自然语言弹窗
          </button>
        </div>
      </div>

      <div className="section card">
        <div className="h2">自然语言快速添加</div>
        <div className="sub" style={{ marginTop: 4 }}>
          输入一行描述（时间、优先级、负责人、预算等），自动解析为任务。
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn brand" onClick={() => setQaOpen(true)}>
            立即输入
          </button>
          <button className="btn" onClick={importV04}>
            导入 v0.4 示例数据
          </button>
          <button className="btn" onClick={clearAll}>
            清空全部
          </button>
        </div>
        <div className="sub" style={{ marginTop: 8 }}>
          示例：明天 14:00-16:00 写接口文档 2h P0 @你 ¥20 10kapi Now
        </div>
      </div>

      <div className="section card" style={{ marginTop: 12 }}>
        <div className="h2">当前任务概览</div>
        <div style={{ marginTop: 8 }}>
          {tasks.length === 0 ? (
            <div className="empty">暂无任务，可通过左上按钮导入或创建。</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {tasks.slice(0, 5).map((task) => (
                <li key={task.id} style={{ marginBottom: 4 }}>
                  {task.title} · {task.status} · Due {task.due}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="section card" style={{ marginTop: 12 }}>
        <div className="h2" style={{ fontSize: 16 }}>
          测试工具
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button className="btn brand" onClick={importV04}>
            导入 v0.4 示例数据
          </button>
          <button className="btn" onClick={clearAll}>
            清空
          </button>
        </div>
      </div>
    </>
  );

  const renderDisplayPane = () => (
    <>
      <div className="topbar">
        <div className="h1">项目 · 任务板（NLP 输入）</div>
        <div className="kit" style={{ gap: 12 }}>
          <button className="btn brand" onClick={() => setQaOpen(true)}>
            快速添加
          </button>
          <div className="pills">
            <div className={`pill ${settings.mode === 'rule' ? 'active' : ''}`} onClick={() => setMode('rule')}>
              Auto
            </div>
            <div
              className={`pill ${settings.mode === 'deadline' ? 'active' : ''}`}
              onClick={() => setMode('deadline')}
            >
              Deadline
            </div>
            <div className={`pill ${settings.mode === 'cost' ? 'active' : ''}`} onClick={() => setMode('cost')}>
              Cost
            </div>
          </div>
        </div>
      </div>

      <div className="section card">
        <div className="h2">推荐下一步</div>
        <div className="sub" style={{ marginTop: 4 }}>
          WIP=1、24h 到期优先、阻塞/超预算降权
        </div>

        {rec.top1 ? (
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card" style={{ padding: 14 }}>
              <div className="ttl" style={{ fontWeight: 700, fontSize: 16 }}>
                {rec.top1.title}
              </div>
              <div className="sub" style={{ marginTop: 4 }}>
                Due {rec.top1.due} · {rec.reason}
              </div>
              <div style={{ marginTop: 10 }}>
                <Progress value={rec.top1.progress ?? 0} />
              </div>
              <div className="badges" style={{ marginTop: 10 }}>
                <Badge>{rec.top1.hours ?? 0}h</Badge>
                <Badge>{rec.top1.api ?? 0}k API</Badge>
                <Badge>¥{rec.top1.cost ?? 0}</Badge>
                <Badge tone="brand">{rec.top1.priority}</Badge>
              </div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div className="h2" style={{ fontSize: 16 }}>
                为何推荐
              </div>
              <div className="badges" style={{ marginTop: 8 }}>
                <Badge>P0(×3)</Badge>
                <Badge>到期≤7天(+2)</Badge>
                <Badge>容量匹配(+1)</Badge>
                <Badge>预算正常(+1)</Badge>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn brand" onClick={() => accept(rec.top1)}>
                  接受并开始
                </button>
                <button className="btn" onClick={() => skip(rec.top1)}>
                  跳过
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 14, marginTop: 12 }}>
            <div className="empty">WIP 上限已满 / 无可执行任务</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }} className="h2">
        任务板
      </div>
      <div className="grid-5" style={{ marginTop: 8 }}>
        {columns.map((col) => {
          const list = tasks.filter((t) => t.status === col);
          return (
            <div key={col} className="column card">
              <div className="head">
                <b>{col}</b>
                <span className="sub">{list.length}</span>
              </div>
              <div className="list">
                {list.slice(0, 6).map((t) => (
                  <div key={t.id} className="item">
                    <div className="ttl">{t.title}</div>
                    <div className="meta">Due {t.due}</div>
                    <div style={{ marginTop: 6 }}>
                      <Progress value={t.progress ?? 0} />
                    </div>
                    <div className="badges" style={{ marginTop: 8 }}>
                      <Badge>{t.hours ?? 0}h</Badge>
                      <Badge>{t.api ?? 0}k API</Badge>
                      <Badge>¥{t.cost ?? 0}</Badge>
                      <Badge tone="brand">{t.priority}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="wrapper">
      <div className="shell">
        <aside className="sidebar">
          <div className="logo">PM 控制台</div>
          <button className={`side-btn ${pane === 'input' ? 'active' : ''}`} onClick={() => setPane('input')}>
            输入部分
          </button>
          <button className={`side-btn ${pane === 'display' ? 'active' : ''}`} onClick={() => setPane('display')}>
            显示部分
          </button>
        </aside>
        <main className="main">
          <div className="container">{pane === 'input' ? renderInputPane() : renderDisplayPane()}</div>
        </main>
      </div>

      <QuickAdd
        open={qaOpen}
        onClose={() => setQaOpen(false)}
        onSave={async (task) => {
          await saveTasks([task, ...tasks]);
          setQaOpen(false);
        }}
      />
    </div>
  );
}

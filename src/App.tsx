import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import './app.css';
import type { Task, Settings } from './core/types';
import { demoSettings } from './core/sampleData';
import { demoV04Tasks } from './core/sampleData_v04';
import { recommend } from './core/recommend';
import { readJSON, writeJSON } from './lib/fs';
import InputPage from './features/input/InputPage';
import { repo } from './infra/repoFactory';

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
  const [pane, setPane] = useState<Pane>('input');

  useEffect(() => {
    (async () => {
      const loaded = await readJSON<Settings>('settings.json', demoSettings);
      setSettings(loaded);
    })();
  }, []);

  const refreshTasks = useCallback(async () => {
    const list = await repo.list();
    setTasks(list);
  }, []);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  const rec = useMemo(() => recommend(tasks, settings, active), [tasks, settings, active]);

  const setMode = async (mode: Mode) => {
    const next = { ...settings, mode };
    setSettings(next);
    await writeJSON('settings.json', next);
  };

  const appendEvent = async (payload: { task_id: string; action: 'accept' | 'skip' }) => {
    const events = await readJSON<{ ts: string; task_id: string; action: string }[]>('events.json', []);
    events.push({ ts: new Date().toISOString(), ...payload });
    await writeJSON('events.json', events);
  };

  const accept = async (task: Task | null) => {
    if (!task) return;
    setActive([task.id]);
    await appendEvent({ task_id: task.id, action: 'accept' });
  };

  const skip = async (task: Task | null) => {
    if (!task) return;
    await appendEvent({ task_id: task.id, action: 'skip' });
  };

  const importV04 = async () => {
    const arr = demoV04Tasks();
    await repo.saveAll(arr);
    setActive([]);
    refreshTasks();
  };

  const clearAll = async () => {
    await repo.saveAll([]);
    setActive([]);
    refreshTasks();
  };

  const columns = settings.columns ?? ['Inbox', 'Now', 'Next', 'Later', 'Blocked', 'Done'];

  const renderInputPane = () => (
    <div className="section card" style={{ background: 'transparent', boxShadow: 'none', border: 'none', padding: 0 }}>
      <InputPage onChanged={refreshTasks} />
    </div>
  );

  const renderDisplayPane = () => (
    <>
      <div className="topbar">
        <div className="h1">项目 · 任务板（NLP 输入）</div>
        <div className="kit" style={{ gap: 12 }}>
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
          const list = tasks.filter((task) => task.status === col);
          return (
            <div key={col} className="column card">
              <div className="head">
                <b>{col}</b>
                <span className="sub">{list.length}</span>
              </div>
              <div className="list">
                {list.slice(0, 6).map((task) => (
                  <div key={task.id} className="item">
                    <div className="ttl">{task.title}</div>
                    <div className="meta">Due {task.due}</div>
                    <div style={{ marginTop: 6 }}>
                      <Progress value={task.progress ?? 0} />
                    </div>
                    <div className="badges" style={{ marginTop: 8 }}>
                      <Badge>{task.hours ?? 0}h</Badge>
                      <Badge>{task.api ?? 0}k API</Badge>
                      <Badge>¥{task.cost ?? 0}</Badge>
                      <Badge tone="brand">{task.priority}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
    </div>
  );
}

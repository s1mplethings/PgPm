import { invoke } from '@tauri-apps/api/core';
import type { Task } from '../core/types';
import type { TaskRepo } from '../core/repo';

const REL_PATH = 'tasks.json';

async function read(): Promise<Task[]> {
  try {
    const payload = await invoke<unknown>('read_json', { relPath: REL_PATH });
    if (Array.isArray(payload)) return payload as Task[];
    if (payload && typeof payload === 'object' && 'tasks' in (payload as any)) {
      return ((payload as any).tasks ?? []) as Task[];
    }
    return [];
  } catch {
    return [];
  }
}

async function write(tasks: Task[]) {
  await invoke('write_json_atomic', { relPath: REL_PATH, data: { version: 1, tasks } });
}

export const tauriJsonRepo: TaskRepo = {
  async list() {
    return read();
  },
  async add(task) {
    const tasks = await read();
    tasks.unshift(task);
    await write(tasks);
  },
  async bulkAdd(newTasks) {
    const tasks = await read();
    await write([...newTasks, ...tasks]);
  },
  async update(id, patch) {
    const tasks = (await read()).map((task) =>
      task.id === id ? { ...task, ...patch, updated_at: new Date().toISOString() } : task
    );
    await write(tasks);
  },
  async remove(id) {
    await write((await read()).filter((task) => task.id !== id));
  },
  async saveAll(tasks) {
    await write(tasks);
  }
};

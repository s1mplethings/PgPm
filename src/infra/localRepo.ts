import type { Task } from '../core/types';
import type { TaskRepo } from '../core/repo';

const KEY = 'pgpm.tasks.v1';

function read(): Task[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(tasks: Task[]) {
  localStorage.setItem(KEY, JSON.stringify(tasks));
}

export const localRepo: TaskRepo = {
  async list() {
    return read();
  },
  async add(task) {
    const tasks = read();
    tasks.unshift(task as Task);
    write(tasks);
  },
  async bulkAdd(newTasks) {
    const tasks = read();
    write([...newTasks, ...tasks]);
  },
  async update(id, patch) {
    const tasks = read().map((task) =>
      task.id === id ? { ...task, ...patch, updated_at: new Date().toISOString() } : task
    );
    write(tasks);
  },
  async remove(id) {
    write(read().filter((task) => task.id !== id));
  },
  async saveAll(tasks) {
    write(tasks);
  }
};

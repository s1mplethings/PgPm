import type { Task } from './types';

export interface TaskRepo {
  list(): Promise<Task[]>;
  add(task: Task): Promise<void>;
  bulkAdd(tasks: Task[]): Promise<void>;
  update(id: string, patch: Partial<Task>): Promise<void>;
  remove(id: string): Promise<void>;
  saveAll(tasks: Task[]): Promise<void>;
}

export type RepoKind = 'local' | 'tauri-json' | 'sqlite';

export function isTauri(): boolean {
  return typeof (window as any).__TAURI__ !== 'undefined';
}

import type { Settings, Task } from './types';
import { readJSON, writeJSON } from '../lib/fs';

export interface TaskSnapshot {
  version: number;
  tasks: Task[];
}

export interface TaskEvent {
  ts: string;
  task_id: string;
  action: 'accept' | 'skip' | 'start' | 'complete' | 'pause';
  payload?: Record<string, unknown>;
}

const TASKS_PATH = 'tasks.json';
const SETTINGS_PATH = 'settings.json';
const EVENTS_PATH = 'events.json';

export async function loadSettings(fallback: Settings): Promise<Settings> {
  return readJSON<Settings>(SETTINGS_PATH, fallback);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeJSON(SETTINGS_PATH, settings);
}

export async function loadTasks(fallback: TaskSnapshot): Promise<TaskSnapshot> {
  return readJSON<TaskSnapshot>(TASKS_PATH, fallback);
}

export async function saveTasks(snapshot: TaskSnapshot): Promise<void> {
  await writeJSON(TASKS_PATH, snapshot);
}

export async function appendEvents(events: TaskEvent[]): Promise<void> {
  const existing = await readJSON<TaskEvent[]>(EVENTS_PATH, []);
  await writeJSON(EVENTS_PATH, [...existing, ...events]);
}

import { invoke } from '@tauri-apps/api/core';

export async function readJSON<T>(relPath: string, fallback: T): Promise<T> {
  try {
    const value = await invoke('read_json', { relPath });
    return value as T;
  } catch {
    return fallback;
  }
}

export async function writeJSON<T>(relPath: string, data: T): Promise<void> {
  await invoke('write_json_atomic', { relPath, data });
}

import type { PersistedProjectData } from '../types';

const STORAGE_PREFIX = 'pgpm:project:';

const getStorage = () => {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
};

export const saveProject = (projectId: string, data: PersistedProjectData) => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(`${STORAGE_PREFIX}${projectId}`, JSON.stringify(data));
};

export const loadProject = (projectId: string): PersistedProjectData | null => {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(`${STORAGE_PREFIX}${projectId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedProjectData;
  } catch (error) {
    console.error('Failed to parse project data', error);
    return null;
  }
};

export const exportProjectData = (data: PersistedProjectData) => {
  return JSON.stringify(data, null, 2);
};

export const importProjectData = (
  payload: string
): PersistedProjectData & { projectId?: string } => {
  const parsed = JSON.parse(payload) as PersistedProjectData & { projectId?: string };
  return parsed;
};

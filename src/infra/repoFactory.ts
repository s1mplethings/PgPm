import { isTauri } from '../core/repo';
import { localRepo } from './localRepo';
import { tauriJsonRepo } from './tauriJsonRepo';

export const repo = isTauri() ? tauriJsonRepo : localRepo;

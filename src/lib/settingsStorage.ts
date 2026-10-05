import type { ChecklistState, SaveResult, Settings } from '@/lib/types';
import { DEFAULT_BASE_RATE, DEFAULT_BASE_RATE_AS_OF } from '@/constants/law';

// 단방향: 이 파일은 storage.ts를 import하지 않는다(storage.ts가 removeChecklistFor를 가져다 쓴다).
export const SETTINGS_KEY = 'renewwindow:settings:v1';
export const SETTINGS_CORRUPT_KEY = 'renewwindow:settings:corrupt';
export const CHECKLIST_KEY = 'renewwindow:checklist:v1';
export const CHECKLIST_CORRUPT_KEY = 'renewwindow:checklist:corrupt';

function isQuotaError(e: unknown): boolean {
  if (!(e instanceof Error) && !(typeof e === 'object' && e !== null)) return false;
  const err = e as { name?: string; code?: number };
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

function write(key: string, value: unknown): SaveResult {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (e) {
    return isQuotaError(e) ? { ok: false, error: 'quota', quota: true } : { ok: false, error: 'unknown' };
  }
}

function backupCorrupt(key: string, raw: string): void {
  try {
    localStorage.setItem(key, raw);
  } catch {
    // 백업 실패는 복구 흐름을 막지 않는다
  }
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function defaultSettings(): Settings {
  return { baseRatePercent: DEFAULT_BASE_RATE, baseRateAsOf: DEFAULT_BASE_RATE_AS_OF };
}

function isSettings(v: unknown): v is Settings {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.baseRatePercent === 'number' &&
    Number.isFinite(s.baseRatePercent) &&
    typeof s.baseRateAsOf === 'string'
  );
}

export function loadSettings(): Settings {
  const raw = readRaw(SETTINGS_KEY);
  if (raw === null) return defaultSettings();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isSettings(parsed)) {
      return { baseRatePercent: parsed.baseRatePercent, baseRateAsOf: parsed.baseRateAsOf };
    }
  } catch {
    // 아래에서 백업 후 기본값
  }
  backupCorrupt(SETTINGS_CORRUPT_KEY, raw);
  return defaultSettings();
}

export function saveSettings(settings: Settings): SaveResult {
  return write(SETTINGS_KEY, settings);
}

function isChecklistState(v: unknown): v is ChecklistState {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  return Object.values(v as Record<string, unknown>).every(
    (items) => Array.isArray(items) && items.every((i) => typeof i === 'string'),
  );
}

export function loadChecklist(): ChecklistState {
  const raw = readRaw(CHECKLIST_KEY);
  if (raw === null) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isChecklistState(parsed)) return parsed;
  } catch {
    // 아래에서 백업 후 빈 값
  }
  backupCorrupt(CHECKLIST_CORRUPT_KEY, raw);
  return {};
}

export function saveChecklist(contractId: string, checkedIds: string[]): SaveResult {
  const next: ChecklistState = { ...loadChecklist(), [contractId]: [...checkedIds] };
  return write(CHECKLIST_KEY, next);
}

export function removeChecklistFor(contractId: string): SaveResult {
  const current = loadChecklist();
  if (!(contractId in current)) return { ok: true };
  const { [contractId]: _removed, ...rest } = current;
  return write(CHECKLIST_KEY, rest);
}

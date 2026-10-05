import type { Contract, LoadContractsResult, SaveContractResult, SaveResult } from '@/lib/types';
import { MAX_CONTRACTS } from '@/constants/law';
import { removeChecklistFor } from '@/lib/settingsStorage';

export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

// ── 계약 저장소 ──────────────────────────────────────────────
export const CONTRACTS_KEY = 'renewwindow:contracts:v1';
export const CONTRACTS_CORRUPT_KEY = 'renewwindow:contracts:corrupt';

export type ContractDraft = Omit<Contract, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };

export interface SaveContractResponse extends SaveContractResult {
  contract?: Contract;
}

function isQuotaError(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  const err = e as { name?: string; code?: number };
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // 폴백으로
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function isContract(v: unknown): v is Contract {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    typeof c.nickname === 'string' &&
    typeof c.endDate === 'string' &&
    typeof c.deposit === 'number' &&
    Number.isFinite(c.deposit) &&
    typeof c.monthlyRent === 'number' &&
    Number.isFinite(c.monthlyRent) &&
    typeof c.renewalRightUsed === 'boolean' &&
    typeof c.createdAt === 'string' &&
    typeof c.updatedAt === 'string' &&
    (c.lastIncreaseDate === undefined || typeof c.lastIncreaseDate === 'string') &&
    (c.notice === undefined || (typeof c.notice === 'object' && c.notice !== null))
  );
}

/** localStorage 접근 자체의 SecurityError는 그대로 던진다(홈이 처리). */
export function loadContracts(): LoadContractsResult {
  const raw = localStorage.getItem(CONTRACTS_KEY);
  if (raw === null) return { contracts: [], recovered: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(isContract)) {
      return { contracts: parsed, recovered: false };
    }
  } catch {
    // 아래에서 백업
  }
  try {
    localStorage.setItem(CONTRACTS_CORRUPT_KEY, raw);
  } catch {
    // 백업 실패는 복구를 막지 않는다
  }
  return { contracts: [], recovered: true };
}

export function getContract(id: string): Contract | undefined {
  return loadContracts().contracts.find((c) => c.id === id);
}

function writeContracts(contracts: Contract[]): SaveResult {
  try {
    localStorage.setItem(CONTRACTS_KEY, JSON.stringify(contracts));
    return { ok: true };
  } catch (e) {
    return isQuotaError(e) ? { ok: false, error: 'quota', quota: true } : { ok: false, error: 'unknown' };
  }
}

export function saveContract(draft: ContractDraft): SaveContractResponse {
  try {
    const { contracts } = loadContracts();
    const now = new Date().toISOString();
    const { id: draftId, ...fields } = draft;

    let contract: Contract;
    let next: Contract[];
    if (draftId !== undefined) {
      const existing = contracts.find((c) => c.id === draftId);
      if (!existing) return { ok: false, error: 'not_found' };
      contract = { ...existing, ...fields, id: existing.id, createdAt: existing.createdAt, updatedAt: now };
      // 수정 화면에서 비운 최근 증액일은 fields에 키가 없으므로 이전 값을 지운다
      if (fields.lastIncreaseDate === undefined) delete contract.lastIncreaseDate;
      next = contracts.map((c) => (c.id === draftId ? contract : c));
    } else {
      if (contracts.length >= MAX_CONTRACTS) return { ok: false, error: 'limit' };
      contract = { ...fields, id: generateId(), createdAt: now, updatedAt: now };
      next = [...contracts, contract];
    }

    const written = writeContracts(next);
    if (!written.ok) return written;
    return { ok: true, id: contract.id, contract };
  } catch {
    return { ok: false, error: 'unknown' };
  }
}

export function deleteContract(id: string): SaveResult {
  try {
    const { contracts } = loadContracts();
    const written = writeContracts(contracts.filter((c) => c.id !== id));
    if (!written.ok) return written;
    return removeChecklistFor(id);
  } catch {
    return { ok: false, error: 'unknown' };
  }
}

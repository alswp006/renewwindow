import { describe, it, expect, vi } from 'vitest';
import { saveContract, loadContracts, getContract, deleteContract } from '@/lib/storage';
import { saveChecklist, loadChecklist } from '@/lib/settingsStorage';
import { MAX_CONTRACTS } from '@/constants/law';

const draft = {
  nickname: '망원동 투룸',
  endDate: '2027-03-31',
  deposit: 200000000,
  monthlyRent: 0,
  renewalRightUsed: false,
};

describe('storage: 계약', () => {
  it('신규 저장은 id·createdAt·updatedAt을 채우고 1건 저장한다', () => {
    const r = saveContract(draft);
    expect(r.ok).toBe(true);
    expect(r.contract?.id).toBe(r.id);
    expect(JSON.parse(localStorage.getItem('renewwindow:contracts:v1')!)).toHaveLength(1);
    expect(getContract(r.id!)?.nickname).toBe('망원동 투룸');
  });

  it('같은 id 저장은 건수를 유지하고 updatedAt만 갱신한다', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-06T09:00:00+09:00'));
    const first = saveContract(draft);
    vi.setSystemTime(new Date('2026-10-07T09:00:00+09:00'));
    const second = saveContract({ ...draft, id: first.id, deposit: 180000000 });
    expect(loadContracts().contracts).toHaveLength(1);
    expect(second.contract?.deposit).toBe(180000000);
    expect(second.contract?.createdAt).toBe(first.contract?.createdAt);
    expect(second.contract?.updatedAt).not.toBe(first.contract?.updatedAt);
  });

  it('없는 id 갱신은 not_found, 21번째 신규는 limit', () => {
    expect(saveContract({ ...draft, id: 'nope' })).toEqual({ ok: false, error: 'not_found' });
    for (let i = 0; i < MAX_CONTRACTS; i++) expect(saveContract(draft).ok).toBe(true);
    expect(saveContract(draft)).toEqual({ ok: false, error: 'limit' });
  });

  it('손상 데이터는 빈 목록 + recovered, 원본은 corrupt 키에 백업', () => {
    for (const raw of ['{not json', '{"id":"x"}', '[{"id":"x","deposit":"많음"}]']) {
      localStorage.setItem('renewwindow:contracts:v1', raw);
      expect(loadContracts()).toEqual({ contracts: [], recovered: true });
      expect(localStorage.getItem('renewwindow:contracts:corrupt')).toBe(raw);
    }
  });

  it('quota 오류는 예외 없이 quota 결과를 돌려주고 기존 값은 그대로다', () => {
    const first = saveContract(draft);
    const before = localStorage.getItem('renewwindow:contracts:v1');
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const r = saveContract({ ...draft, id: first.id, deposit: 1 });
    spy.mockRestore();
    expect(r).toMatchObject({ ok: false, error: 'quota' });
    expect(localStorage.getItem('renewwindow:contracts:v1')).toBe(before);
  });

  it('localStorage 접근 SecurityError는 loadContracts에서 그대로 던진다', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(() => loadContracts()).toThrow();
    spy.mockRestore();
  });

  it('deleteContract는 체크리스트도 함께 지운다', () => {
    const a = saveContract(draft);
    const b = saveContract(draft);
    saveChecklist(a.id!, ['x']);
    saveChecklist(b.id!, ['y']);
    expect(deleteContract(a.id!).ok).toBe(true);
    expect(loadChecklist()[a.id!]).toBeUndefined();
    expect(loadChecklist()[b.id!]).toEqual(['y']);
    expect(loadContracts().contracts.map((c) => c.id)).toEqual([b.id]);
  });

  it('crypto.randomUUID가 없으면 폴백 id를 쓴다', () => {
    const orig = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    const r = saveContract(draft);
    Object.defineProperty(crypto, 'randomUUID', { value: orig, configurable: true });
    expect(r.id).toMatch(/^[0-9a-z]+$/);
  });
});

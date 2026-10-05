import { describe, it, expect, vi } from 'vitest';
import {
  loadSettings,
  saveSettings,
  loadChecklist,
  saveChecklist,
  removeChecklistFor,
} from '@/lib/settingsStorage';
import { DEFAULT_BASE_RATE, DEFAULT_BASE_RATE_AS_OF } from '@/constants/law';

const defaults = { baseRatePercent: DEFAULT_BASE_RATE, baseRateAsOf: DEFAULT_BASE_RATE_AS_OF };

describe('settingsStorage: 설정', () => {
  it('저장값이 없으면 기본값', () => {
    expect(loadSettings()).toEqual(defaults);
  });

  it('저장 후 다시 읽으면 같은 값', () => {
    expect(saveSettings({ baseRatePercent: 3, baseRateAsOf: '2026-11-01' }).ok).toBe(true);
    expect(loadSettings()).toEqual({ baseRatePercent: 3, baseRateAsOf: '2026-11-01' });
  });

  it('손상 값은 기본값 + 원본 백업', () => {
    for (const raw of ['{bad', '{"baseRatePercent":"abc"}']) {
      localStorage.setItem('renewwindow:settings:v1', raw);
      expect(loadSettings()).toEqual(defaults);
      expect(localStorage.getItem('renewwindow:settings:corrupt')).toBe(raw);
    }
  });

  it('quota 오류는 예외 없이 quota 결과', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(saveSettings(defaults)).toMatchObject({ ok: false, error: 'quota' });
    expect(saveChecklist('c1', ['a'])).toMatchObject({ ok: false, error: 'quota' });
    spy.mockRestore();
    expect(localStorage.getItem('renewwindow:settings:v1')).toBeNull();
  });
});

describe('settingsStorage: 체크리스트', () => {
  it('저장·삭제', () => {
    saveChecklist('c1', ['a', 'b']);
    saveChecklist('c2', ['c']);
    expect(loadChecklist()).toEqual({ c1: ['a', 'b'], c2: ['c'] });
    expect(removeChecklistFor('c1').ok).toBe(true);
    expect(loadChecklist()).toEqual({ c2: ['c'] });
    expect(removeChecklistFor('없는-id').ok).toBe(true);
  });

  it('손상 값은 {} + 원본 백업', () => {
    for (const raw of ['[1,2', '{"c1":"deliver_by_deadline"}']) {
      localStorage.setItem('renewwindow:checklist:v1', raw);
      expect(loadChecklist()).toEqual({});
      expect(localStorage.getItem('renewwindow:checklist:corrupt')).toBe(raw);
    }
  });
});

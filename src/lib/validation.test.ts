import { describe, it, expect } from 'vitest';
import {
  validateContractForm,
  validateConversionAmount,
  validateBaseRate,
} from '@/lib/validation';

const TODAY = '2026-10-06';
const base = { nickname: '계약', endDate: '2027-10-06', deposit: '1000000', monthlyRent: '0' };

function errorsOf(values: Parameters<typeof validateContractForm>[0]) {
  const r = validateContractForm(values, TODAY);
  if (r.ok) throw new Error('expected failure');
  return r;
}

describe('validateContractForm', () => {
  it('필수값·형식 오류와 firstErrorField', () => {
    const r = errorsOf({ nickname: '', endDate: '2027-13-01', deposit: '0', monthlyRent: '0' });
    expect(r.errors.nickname).toBe('계약 이름을 입력해주세요');
    expect(r.errors.endDate).toBe('만기일을 YYYY-MM-DD 형식으로 입력해주세요');
    expect(r.errors.deposit).toBe('보증금이나 월세 중 하나는 입력해주세요');
    expect(r.firstErrorField).toBe('nickname');
  });

  it('범위 초과 문구', () => {
    expect(errorsOf({ ...base, nickname: 'a'.repeat(21) }).errors.nickname).toBe(
      '계약 이름은 20자 이내로 입력해주세요',
    );
    expect(errorsOf({ ...base, endDate: '2026-10-05' }).errors.endDate).toBe(
      '만기일이 오늘 이전이에요. 다음 계약 만기일을 입력해주세요',
    );
    expect(errorsOf({ ...base, endDate: '2031-10-07' }).errors.endDate).toBe(
      '만기일은 5년 이내로 입력해주세요',
    );
    expect(errorsOf({ ...base, deposit: '10000000001' }).errors.deposit).toBe(
      '보증금은 100억원 이하로 입력해주세요',
    );
    expect(errorsOf({ ...base, monthlyRent: '10000001' }).errors.monthlyRent).toBe(
      '월세는 1,000만원 이하로 입력해주세요',
    );
  });

  it('만기일 경계: 오늘·5년 후 오늘은 통과', () => {
    expect(validateContractForm({ ...base, endDate: TODAY }, TODAY).ok).toBe(true);
    expect(validateContractForm({ ...base, endDate: '2031-10-06' }, TODAY).ok).toBe(true);
  });

  it('최근 증액일 형식·미래 에러', () => {
    for (const lastIncreaseDate of ['2026-13-01', '2026-02-30', '202603']) {
      expect(errorsOf({ ...base, lastIncreaseDate }).errors.lastIncreaseDate).toBe(
        '최근 증액일을 YYYY-MM-DD 형식으로 입력해주세요',
      );
    }
    expect(errorsOf({ ...base, lastIncreaseDate: '2026-10-07' }).errors.lastIncreaseDate).toBe(
      '최근 증액일은 오늘 이전이어야 해요',
    );
  });

  it('최근 증액일 오늘은 ok, 빈 값이면 키가 없다', () => {
    const today = validateContractForm({ ...base, lastIncreaseDate: TODAY }, TODAY);
    expect(today.ok && today.value.lastIncreaseDate).toBe(TODAY);
    const empty = validateContractForm({ ...base, lastIncreaseDate: '' }, TODAY);
    expect(empty.ok).toBe(true);
    if (empty.ok) expect('lastIncreaseDate' in empty.value).toBe(false);
  });

  it('콤마·공백을 허용하고 이름은 trim한다', () => {
    const r = validateContractForm(
      { ...base, nickname: ' 망원동 투룸 ', deposit: '200,000,000', monthlyRent: '500,000' },
      TODAY,
    );
    expect(r.ok && r.value).toMatchObject({
      nickname: '망원동 투룸',
      deposit: 200000000,
      monthlyRent: 500000,
      renewalRightUsed: false,
    });
  });
});

describe('validateConversionAmount', () => {
  it('0·빈 값, 보증금 초과, 정상', () => {
    expect(validateConversionAmount('0', 200000000)).toEqual({
      ok: false,
      error: '전환할 금액을 입력해주세요',
    });
    expect(validateConversionAmount('', 200000000).ok).toBe(false);
    expect(validateConversionAmount('250000000', 200000000)).toEqual({
      ok: false,
      error: '현재 보증금보다 많이 전환할 수 없어요',
    });
    expect(validateConversionAmount('100,000,000', 200000000)).toEqual({
      ok: true,
      value: 100000000,
    });
  });
});

describe('validateBaseRate', () => {
  it('범위 밖·빈 값은 에러, 소수는 통과', () => {
    const error = '기준금리는 0~10% 사이로 입력해주세요';
    expect(validateBaseRate('12')).toEqual({ ok: false, error });
    expect(validateBaseRate('')).toEqual({ ok: false, error });
    expect(validateBaseRate('-1').ok).toBe(false);
    expect(validateBaseRate('abc').ok).toBe(false);
    expect(validateBaseRate('3.25')).toEqual({ ok: true, value: 3.25 });
    expect(validateBaseRate('0')).toEqual({ ok: true, value: 0 });
    expect(validateBaseRate('10')).toEqual({ ok: true, value: 10 });
  });
});

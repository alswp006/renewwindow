import { describe, it, expect } from 'vitest';
import {
  computeRenewalWindow,
  sortContracts,
  getNoticeTiming,
  isWithinOneYearOfIncrease,
} from '@/lib/renewal';
import { addMonthsClamped, diffDays, formatDateInput, getToday, isValidYMD } from '@/lib/date';

describe('date', () => {
  it('diffDays는 앞 날짜 − 뒤 날짜(부호 있음)', () => {
    expect(diffDays('2027-01-31', '2026-10-06')).toBe(117);
    expect(diffDays('2026-10-06', '2027-01-31')).toBe(-117);
    expect(diffDays('2026-10-06', '2026-10-06')).toBe(0);
  });

  it('isValidYMD', () => {
    expect(isValidYMD('2027-13-01')).toBe(false);
    expect(isValidYMD('2027-02-30')).toBe(false);
    expect(isValidYMD('2028-02-29')).toBe(true);
    expect(isValidYMD('2027-02-29')).toBe(false);
    expect(isValidYMD('2027-3-1')).toBe(false);
  });

  it('formatDateInput', () => {
    expect(formatDateInput('20270331')).toBe('2027-03-31');
    expect(formatDateInput('202703')).toBe('2027-03');
    expect(formatDateInput('2027')).toBe('2027');
    expect(formatDateInput('2027-03-31 99')).toBe('2027-03-31');
  });

  it('addMonthsClamped는 말일로 보정하고 음수 달도 처리', () => {
    expect(addMonthsClamped('2027-01-31', 1)).toBe('2027-02-28');
    expect(addMonthsClamped('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonthsClamped('2027-03-31', -6)).toBe('2026-09-30');
    expect(addMonthsClamped('2027-02-30', 1)).toEqual({ error: 'invalid_date' });
  });

  it('getToday는 YYYY-MM-DD', () => {
    expect(isValidYMD(getToday())).toBe(true);
  });
});

describe('computeRenewalWindow', () => {
  it('진행 중(open)', () => {
    expect(computeRenewalWindow('2027-03-31', '2026-10-06')).toMatchObject({
      startDate: '2026-09-30',
      deadlineDate: '2027-01-31',
      status: 'open',
      daysToDeadline: 117,
    });
  });

  it('시작 전(upcoming)', () => {
    expect(computeRenewalWindow('2027-04-30', '2026-10-06')).toMatchObject({
      startDate: '2026-10-30',
      deadlineDate: '2027-02-28',
      status: 'upcoming',
      daysToStart: 24,
    });
  });

  it('말일·윤년 보정', () => {
    expect(computeRenewalWindow('2027-08-31', '2026-10-06')).toMatchObject({
      startDate: '2027-02-28',
      deadlineDate: '2027-06-30',
    });
    expect(computeRenewalWindow('2028-08-31', '2027-01-01')).toMatchObject({
      startDate: '2028-02-29',
    });
  });

  it('경계: 시작일·마감일 당일은 open, 다음 날은 closed, 만기 다음 날은 expired', () => {
    expect(computeRenewalWindow('2027-03-31', '2026-09-30')).toMatchObject({ status: 'open' });
    expect(computeRenewalWindow('2027-03-31', '2027-01-31')).toMatchObject({ status: 'open' });
    expect(computeRenewalWindow('2027-03-31', '2027-02-01')).toMatchObject({ status: 'closed' });
    expect(computeRenewalWindow('2027-03-31', '2027-03-31')).toMatchObject({ status: 'closed' });
    expect(computeRenewalWindow('2027-03-31', '2027-04-01')).toMatchObject({ status: 'expired' });
  });

  it('잘못된 날짜는 예외 없이 error', () => {
    expect(computeRenewalWindow('2027-02-30', '2026-10-06')).toEqual({ error: 'invalid_date' });
    expect(computeRenewalWindow('2027-03-31', 'x')).toEqual({ error: 'invalid_date' });
  });
});

describe('sortContracts', () => {
  const contracts = [
    { id: 'A', endDate: '2027-03-31' },
    { id: 'B', endDate: '2027-04-30' },
    { id: 'C', endDate: '2026-11-30' },
    { id: 'D', endDate: '2027-01-15' },
  ];

  it('D, A, B, C 순서', () => {
    expect(sortContracts(contracts, '2026-10-06').map((c) => c.id)).toEqual(['D', 'A', 'B', 'C']);
  });

  it('원본 배열 순서는 그대로', () => {
    sortContracts(contracts, '2026-10-06');
    expect(contracts.map((c) => c.id)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('만기 지난 계약과 잘못된 날짜는 뒤로', () => {
    const list = [
      { id: 'bad', endDate: '2027-02-30' },
      { id: 'old', endDate: '2026-01-01' },
      { id: 'open', endDate: '2027-03-31' },
    ];
    expect(sortContracts(list, '2026-10-06').map((c) => c.id)).toEqual(['open', 'old', 'bad']);
  });
});

describe('getNoticeTiming', () => {
  it('기간 앞·안·뒤', () => {
    expect(getNoticeTiming('2027-03-31', '2026-09-01')).toBe('before_period');
    expect(getNoticeTiming('2027-03-31', '2026-12-20')).toBe('in_period');
    expect(getNoticeTiming('2027-03-31', '2027-02-10')).toBe('after_period');
  });

  it('잘못된 날짜', () => {
    expect(getNoticeTiming('2027-03-31', '2026-13-01')).toEqual({ error: 'invalid_date' });
  });
});

describe('isWithinOneYearOfIncrease', () => {
  it('1년 이내면 true, 지났거나 없으면 false', () => {
    expect(isWithinOneYearOfIncrease('2026-03-01', '2026-12-20')).toBe(true);
    expect(isWithinOneYearOfIncrease('2026-03-01', '2027-02-28')).toBe(true);
    expect(isWithinOneYearOfIncrease('2026-03-01', '2027-03-01')).toBe(false);
    expect(isWithinOneYearOfIncrease(undefined, '2026-12-20')).toBe(false);
    expect(isWithinOneYearOfIncrease('', '2026-12-20')).toBe(false);
  });
});

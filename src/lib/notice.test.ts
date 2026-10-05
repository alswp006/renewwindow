import { describe, it, expect } from 'vitest';
import { computeNoticeCheck } from '@/lib/notice';

const contract = { endDate: '2027-03-31', deposit: 200000000, monthlyRent: 500000 };

describe('computeNoticeCheck', () => {
  it('증액률·초과액·시기를 계산한다', () => {
    expect(
      computeNoticeCheck(contract, {
        noticeDate: '2026-12-20',
        newDeposit: 216000000,
        newMonthlyRent: 550000,
      }),
    ).toMatchObject({
      depositRatePercent: 8,
      rentRatePercent: 10,
      depositOver: 6000000,
      rentOver: 25000,
      isOverCap: true,
      noticeTiming: 'in_period',
      withinOneYearOfIncrease: false,
    });
  });

  it('noticeDate에 따라 after_period / before_period', () => {
    const base = { newDeposit: 216000000, newMonthlyRent: 550000 };
    expect(computeNoticeCheck(contract, { ...base, noticeDate: '2027-02-10' })).toMatchObject({
      noticeTiming: 'after_period',
    });
    expect(computeNoticeCheck(contract, { ...base, noticeDate: '2026-09-01' })).toMatchObject({
      noticeTiming: 'before_period',
    });
  });

  it('상한 5% 이내면 초과액 0, isOverCap false', () => {
    expect(
      computeNoticeCheck(contract, {
        noticeDate: '2026-12-20',
        newDeposit: 210000000,
        newMonthlyRent: 525000,
      }),
    ).toMatchObject({ depositOver: 0, rentOver: 0, isOverCap: false });
  });

  it('상한 금액은 내림 처리', () => {
    // 월세 333,333원 → 상한 floor(349,999.65) = 349,999
    expect(
      computeNoticeCheck(
        { ...contract, monthlyRent: 333333 },
        { noticeDate: '2026-12-20', newDeposit: 200000000, newMonthlyRent: 350000 },
      ),
    ).toMatchObject({ rentOver: 1 });
  });

  it('기존 금액이 0이면 비율은 null', () => {
    expect(
      computeNoticeCheck(
        { ...contract, deposit: 0 },
        { noticeDate: '2026-12-20', newDeposit: 10000000, newMonthlyRent: 550000 },
      ),
    ).toMatchObject({ depositRatePercent: null, rentRatePercent: 10, depositOver: 10000000 });
  });

  it('1년 이내 증액 여부', () => {
    const notice = { noticeDate: '2026-12-20', newDeposit: 200000000, newMonthlyRent: 500000 };
    expect(computeNoticeCheck({ ...contract, lastIncreaseDate: '2026-03-01' }, notice)).toMatchObject({
      withinOneYearOfIncrease: true,
    });
    expect(computeNoticeCheck(contract, notice)).toMatchObject({ withinOneYearOfIncrease: false });
  });

  it('날짜가 잘못되면 예외 없이 error', () => {
    const notice = { noticeDate: '2026-12-20', newDeposit: 1, newMonthlyRent: 1 };
    expect(computeNoticeCheck({ ...contract, endDate: '2027-02-30' }, notice)).toEqual({
      error: 'invalid_date',
    });
    expect(computeNoticeCheck(contract, { ...notice, noticeDate: '' })).toEqual({
      error: 'invalid_date',
    });
  });
});

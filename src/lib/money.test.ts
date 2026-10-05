import { describe, it, expect } from 'vitest';
import {
  computeCap,
  computeConversionRate,
  computeConversion,
  buildConversionResult,
  computeScenarios,
} from '@/lib/money';

describe('money', () => {
  it('computeCap: 5% 상한, floor는 마지막에 한 번', () => {
    expect(computeCap(200000000, 500000)).toEqual({
      maxDeposit: 210000000,
      maxMonthlyRent: 525000,
      depositIncrease: 10000000,
      rentIncrease: 25000,
    });
    const c = computeCap(123456789, 333333);
    expect(c.maxDeposit).toBe(129629628);
    expect(c.maxMonthlyRent).toBe(349999);
  });

  it('computeConversionRate: 기준금리+2%p, 상한 10%', () => {
    expect(computeConversionRate(2.5)).toBe(4.5);
    expect(computeConversionRate(9.0)).toBe(10);
    expect(computeConversionRate(3.25)).toBe(5.25);
  });

  it('computeConversion: floor(amount*bp/120000)', () => {
    expect(computeConversion(50000000, 4.5)).toBe(187500);
    expect(computeConversion(0, 4.5)).toBe(0);
  });

  it('buildConversionResult', () => {
    expect(buildConversionResult(100000000, 500000, 40000000, 4.5)).toEqual({
      remainingDeposit: 60000000,
      addedRent: 150000,
      newMonthlyRent: 650000,
      ratePercent: 4.5,
    });
  });

  it('computeScenarios: 0/25/50/75% 4행', () => {
    const rows = computeScenarios(200000000, 0, 4.5);
    expect(rows.map((r) => r.percent)).toEqual([0, 25, 50, 75]);
    expect(rows[1]).toEqual({
      percent: 25,
      remainingDeposit: 150000000,
      monthlyRentCap: 187500,
      annualRent: 2250000,
    });
    expect(rows[3].monthlyRentCap).toBe(562500);
  });

  it('computeScenarios: 기존 월세가 monthlyRentCap에 더해진다', () => {
    expect(computeScenarios(200000000, 500000, 4.5)[0].monthlyRentCap).toBe(500000);
    expect(computeScenarios(200000000, 500000, 4.5)[2].monthlyRentCap).toBe(875000);
  });
});

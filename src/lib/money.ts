import type { CapResult, ConversionResult, ScenarioRow } from '@/lib/types';
import {
  CONVERSION_CAP_PERCENT,
  CONVERSION_SPREAD_PERCENT,
  INCREASE_CAP_PERCENT,
} from '@/constants/law';

const SCENARIO_PERCENTS = [0, 25, 50, 75] as const;

/** 퍼센트 → bp(1% = 100bp). 입력 소수 오차를 정수로 고정한다. */
function toBp(percent: number): number {
  return Math.round(percent * 100);
}

/** 곱셈 먼저, floor는 마지막에 한 번. 5% 증액 상한 */
function capOf(amount: number): number {
  return Math.floor((amount * (100 + INCREASE_CAP_PERCENT)) / 100);
}

/** 갱신 시 증액 상한(5%). 보증금·월세 각각 floor */
export function computeCap(deposit: number, monthlyRent: number): CapResult {
  const maxDeposit = capOf(deposit);
  const maxMonthlyRent = capOf(monthlyRent);
  return {
    maxDeposit,
    maxMonthlyRent,
    depositIncrease: maxDeposit - deposit,
    rentIncrease: maxMonthlyRent - monthlyRent,
  };
}

/** 적용 전환율(%) = min(연 10%, 기준금리 + 2%p) */
export function computeConversionRate(baseRatePercent: number): number {
  const bp = Math.min(
    toBp(CONVERSION_CAP_PERCENT),
    toBp(baseRatePercent) + toBp(CONVERSION_SPREAD_PERCENT),
  );
  return bp / 100;
}

/** 전환 보증금 → 월세. floor(amount × bp / 120000) */
export function computeConversion(amount: number, ratePercent: number): number {
  return Math.floor((amount * toBp(ratePercent)) / 120000);
}

/** 보증금 일부를 월세로 바꾼 결과 */
export function buildConversionResult(
  deposit: number,
  monthlyRent: number,
  conversionAmount: number,
  ratePercent: number,
): ConversionResult {
  const addedRent = computeConversion(conversionAmount, ratePercent);
  return {
    remainingDeposit: deposit - conversionAmount,
    addedRent,
    newMonthlyRent: monthlyRent + addedRent,
    ratePercent,
  };
}

/** 보증금 0/25/50/75% 전환 시나리오. monthlyRentCap = 기존 월세 + 전환 월세 */
export function computeScenarios(
  deposit: number,
  monthlyRent: number,
  ratePercent: number,
): ScenarioRow[] {
  return SCENARIO_PERCENTS.map((percent) => {
    const conversionAmount = Math.floor((deposit * percent) / 100);
    const monthlyRentCap = monthlyRent + computeConversion(conversionAmount, ratePercent);
    return {
      percent,
      remainingDeposit: deposit - conversionAmount,
      monthlyRentCap,
      annualRent: monthlyRentCap * 12,
    };
  });
}

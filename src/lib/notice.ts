import type { Contract, LandlordNotice, NoticeCheck } from '@/lib/types';
import { INCREASE_CAP_PERCENT } from '@/constants/law';
import type { InvalidDate } from '@/lib/date';
import { getNoticeTiming, isWithinOneYearOfIncrease } from '@/lib/renewal';

type ContractInfo = Pick<Contract, 'endDate' | 'deposit' | 'monthlyRent'> & {
  lastIncreaseDate?: string;
};
type NoticeInfo = Pick<LandlordNotice, 'noticeDate' | 'newDeposit' | 'newMonthlyRent'>;

/** 증감률(%). 기존 금액이 0 이하이면 계산할 수 없어 null. 소수 둘째 자리까지. */
function ratePercent(before: number, after: number): number | null {
  if (!(before > 0)) return null;
  return Math.round(((after - before) / before) * 10000) / 100;
}

/** 5% 상한 대비 초과액 */
function overCap(before: number, after: number): number {
  const cap = Math.floor((before * (100 + INCREASE_CAP_PERCENT)) / 100);
  return Math.max(0, after - cap);
}

/** 집주인 통보 점검: 증액률·상한 초과액·통보 시기·1년 내 증액 여부. 날짜가 잘못되면 { error } */
export function computeNoticeCheck(
  contract: ContractInfo,
  notice: NoticeInfo,
): NoticeCheck | InvalidDate {
  const noticeTiming = getNoticeTiming(contract.endDate, notice.noticeDate);
  if (typeof noticeTiming !== 'string') return noticeTiming;

  const depositOver = overCap(contract.deposit, notice.newDeposit);
  const rentOver = overCap(contract.monthlyRent, notice.newMonthlyRent);

  return {
    depositRatePercent: ratePercent(contract.deposit, notice.newDeposit),
    rentRatePercent: ratePercent(contract.monthlyRent, notice.newMonthlyRent),
    depositOver,
    rentOver,
    isOverCap: depositOver > 0 || rentOver > 0,
    noticeTiming,
    withinOneYearOfIncrease: isWithinOneYearOfIncrease(contract.lastIncreaseDate, notice.noticeDate),
  };
}

import type { NoticeTiming, RenewalWindow, WindowStatus } from '@/lib/types';
import { RENEWAL_END_MONTHS, RENEWAL_START_MONTHS } from '@/constants/law';
import { addMonthsClamped, diffDays, isValidYMD, type InvalidDate } from '@/lib/date';

// 통보 점검은 notice.ts에 있지만 소비자는 renewal에서도 가져다 쓴다.
export { computeNoticeCheck } from '@/lib/notice';

/** 갱신요구 기간: 만기 6개월 전 ~ 2개월 전(말일 보정). 입력이 잘못되면 { error } */
export function computeRenewalWindow(endDate: string, today: string): RenewalWindow | InvalidDate {
  if (!isValidYMD(endDate) || !isValidYMD(today)) return { error: 'invalid_date' };
  const startDate = addMonthsClamped(endDate, -RENEWAL_START_MONTHS);
  const deadlineDate = addMonthsClamped(endDate, -RENEWAL_END_MONTHS);
  if (typeof startDate !== 'string' || typeof deadlineDate !== 'string') return { error: 'invalid_date' };

  const daysToStart = diffDays(startDate, today);
  const daysToDeadline = diffDays(deadlineDate, today);
  const daysToEnd = diffDays(endDate, today);

  let status: WindowStatus;
  if (daysToStart > 0) status = 'upcoming';
  else if (daysToDeadline >= 0) status = 'open';
  else if (daysToEnd >= 0) status = 'closed';
  else status = 'expired';

  return { startDate, deadlineDate, endDate, status, daysToStart, daysToDeadline, daysToEnd };
}

const STATUS_ORDER: Record<WindowStatus, number> = { open: 0, upcoming: 1, closed: 2, expired: 3 };

/**
 * 급한 순 정렬(원본 불변): 진행 중(마감 임박순) → 예정(시작 빠른 순) → 마감 지남 → 만기 지남.
 * 날짜가 잘못된 계약은 맨 뒤.
 */
export function sortContracts<T extends { endDate: string }>(contracts: T[], today: string): T[] {
  const keyed = contracts.map((contract, index) => {
    const w = computeRenewalWindow(contract.endDate, today);
    if ('error' in w) return { contract, index, rank: 4, key: 0 };
    const key =
      w.status === 'open'
        ? w.daysToDeadline
        : w.status === 'upcoming'
          ? w.daysToStart
          : w.daysToEnd;
    return { contract, index, rank: STATUS_ORDER[w.status], key };
  });
  keyed.sort((a, b) => a.rank - b.rank || a.key - b.key || a.index - b.index);
  return keyed.map((k) => k.contract);
}

/** 통보일이 갱신요구 기간의 앞/안/뒤 어디인지 */
export function getNoticeTiming(endDate: string, noticeDate: string): NoticeTiming | InvalidDate {
  if (!isValidYMD(noticeDate)) return { error: 'invalid_date' };
  const w = computeRenewalWindow(endDate, noticeDate);
  if ('error' in w) return w;
  if (noticeDate < w.startDate) return 'before_period';
  if (noticeDate > w.deadlineDate) return 'after_period';
  return 'in_period';
}

/** 마지막 증액일로부터 1년이 지나지 않았는지(없거나 잘못된 값이면 false) */
export function isWithinOneYearOfIncrease(
  lastIncreaseDate: string | null | undefined,
  noticeDate: string,
): boolean {
  if (!lastIncreaseDate || !isValidYMD(lastIncreaseDate) || !isValidYMD(noticeDate)) return false;
  const oneYearLater = addMonthsClamped(lastIncreaseDate, 12);
  if (typeof oneYearLater !== 'string') return false;
  return noticeDate < oneYearLater;
}

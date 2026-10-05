import type { Contract, FieldErrors, LandlordNotice } from '@/lib/types';
import { isValidYMD } from '@/lib/date';
import {
  MAX_DEPOSIT,
  MAX_MONTHLY_RENT,
  parseDecimal,
  parseWon,
} from '@/lib/validation';

export interface NoticeFormValues {
  noticeDate: string;
  inputMode?: 'rate' | 'amount';
  /** 보증금 인상률(%) — rate 모드 */
  depositRate?: string;
  /** 월세 인상률(%) — rate 모드. 월세 0 계약은 검증하지 않는다 */
  rentRate?: string;
  /** 보증금·월세에 같은 인상률을 쓰는 약식 입력. depositRate/rentRate가 없을 때만 쓴다 */
  increaseRate?: string;
  newDeposit?: string;
  newMonthlyRent?: string;
}

export type NoticeContract = Pick<Contract, 'endDate' | 'deposit' | 'monthlyRent'>;

export type ValidNotice = Pick<
  LandlordNotice,
  'noticeDate' | 'newDeposit' | 'newMonthlyRent' | 'inputMode'
>;

export type NoticeFormResult =
  | { ok: true; value: ValidNotice }
  | { ok: false; errors: FieldErrors; firstErrorField: string };

const DEPOSIT_RANGE_ERROR = '새 보증금은 0원~100억원 사이로 입력해주세요';
const RENT_RANGE_ERROR = '새 월세는 0원~1,000만원 사이로 입력해주세요';
const RATE_RANGE_ERROR = '인상률은 0~100% 사이로 입력해주세요';
const FIELD_ORDER = [
  'noticeDate',
  'increaseRate',
  'depositRate',
  'rentRate',
  'newDeposit',
  'newMonthlyRent',
];

/** 인상률 적용. bp 정수로 고정한 뒤 곱셈 먼저, floor는 마지막에 한 번 */
function applyRate(amount: number, ratePercent: number): number {
  return Math.floor((amount * (10000 + Math.round(ratePercent * 100))) / 10000);
}

/** 0~100 범위의 인상률. 빈 값·숫자 아님·범위 밖이면 null */
function parseRate(raw: string | undefined): number | null {
  const rate = parseDecimal(raw);
  return rate === null || !Number.isFinite(rate) || rate < 0 || rate > 100 ? null : rate;
}

function fail(errors: FieldErrors): NoticeFormResult {
  const firstErrorField = FIELD_ORDER.find((key) => key in errors) ?? Object.keys(errors)[0];
  return { ok: false, errors, firstErrorField };
}

export function validateNoticeForm(
  values: NoticeFormValues,
  contract: NoticeContract,
  _today?: string,
): NoticeFormResult {
  const errors: FieldErrors = {};
  const inputMode = values.inputMode ?? 'rate';
  const hasRent = contract.monthlyRent > 0;

  const noticeDate = (values.noticeDate ?? '').trim();
  if (!isValidYMD(noticeDate)) {
    errors.noticeDate = '통보일을 YYYY-MM-DD 형식으로 입력해주세요';
  }

  let newDeposit = 0;
  let newMonthlyRent = 0;

  if (inputMode === 'rate') {
    const shared = values.depositRate === undefined && values.rentRate === undefined;
    const depositKey = shared ? 'increaseRate' : 'depositRate';
    const rentKey = shared ? 'increaseRate' : 'rentRate';
    const depositRaw = shared ? values.increaseRate : values.depositRate;
    const rentRaw = shared ? values.increaseRate : values.rentRate;

    const depositRate = parseRate(depositRaw);
    if (depositRate === null) {
      errors[depositKey] = RATE_RANGE_ERROR;
    } else {
      newDeposit = applyRate(contract.deposit, depositRate);
      if (newDeposit > MAX_DEPOSIT) errors.depositRate = DEPOSIT_RANGE_ERROR;
    }

    if (hasRent) {
      const rentRate = parseRate(rentRaw);
      if (rentRate === null) {
        errors[rentKey] = RATE_RANGE_ERROR;
      } else {
        newMonthlyRent = applyRate(contract.monthlyRent, rentRate);
        if (newMonthlyRent > MAX_MONTHLY_RENT) errors.rentRate = RENT_RANGE_ERROR;
      }
    }
  } else {
    const deposit = parseWon(values.newDeposit);
    if (deposit === null) {
      errors.newDeposit = '새 보증금을 입력해주세요';
    } else if (!Number.isFinite(deposit) || deposit < 0 || deposit > MAX_DEPOSIT) {
      errors.newDeposit = DEPOSIT_RANGE_ERROR;
    } else {
      newDeposit = deposit;
    }

    if (hasRent) {
      const rent = parseWon(values.newMonthlyRent);
      if (rent === null) {
        errors.newMonthlyRent = '새 월세를 입력해주세요';
      } else if (!Number.isFinite(rent) || rent < 0 || rent > MAX_MONTHLY_RENT) {
        errors.newMonthlyRent = RENT_RANGE_ERROR;
      } else {
        newMonthlyRent = rent;
      }
    }
  }

  if (Object.keys(errors).length > 0) return fail(errors);
  return { ok: true, value: { noticeDate, newDeposit, newMonthlyRent, inputMode } };
}

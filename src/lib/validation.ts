import type { ContractInput, FieldErrors } from '@/lib/types';
import { addMonthsClamped, isValidYMD } from '@/lib/date';

export const MAX_DEPOSIT = 10_000_000_000; // 100억원
export const MAX_MONTHLY_RENT = 10_000_000; // 1,000만원
const MAX_NICKNAME_LENGTH = 20;
const MAX_END_YEARS = 5;

export type ContractFormValues = Pick<
  ContractInput,
  'nickname' | 'endDate' | 'deposit' | 'monthlyRent'
> &
  Partial<Pick<ContractInput, 'lastIncreaseDate' | 'renewalRightUsed'>>;

export interface ValidContract {
  nickname: string;
  endDate: string;
  deposit: number;
  monthlyRent: number;
  renewalRightUsed: boolean;
  lastIncreaseDate?: string;
}

export type ContractFormResult =
  | { ok: true; value: ValidContract }
  | { ok: false; errors: FieldErrors; firstErrorField: string };

export type ValueResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * 원 단위 입력 → 정수. 콤마·공백은 무시한다.
 * 빈 값은 null, 정수가 아니면 NaN(음수는 정수로 읽는다 — 범위 검사에서 걸러진다).
 */
export function parseWon(raw: string | undefined): number | null {
  const s = (raw ?? '').replace(/[,\s]/g, '');
  if (s === '') return null;
  if (!/^-?\d+$/.test(s)) return NaN;
  return Number(s);
}

/** 문자열 → 소수. 빈 값은 null, 숫자가 아니면 NaN */
export function parseDecimal(raw: string | undefined): number | null {
  const s = (raw ?? '').trim();
  if (s === '') return null;
  if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s);
}

function firstKey(errors: FieldErrors, order: string[]): string {
  return order.find((key) => key in errors) ?? Object.keys(errors)[0];
}

export function validateContractForm(
  values: ContractFormValues,
  today: string,
): ContractFormResult {
  const errors: FieldErrors = {};

  const nickname = (values.nickname ?? '').trim();
  const nicknameLength = Array.from(nickname).length;
  if (nicknameLength === 0) errors.nickname = '계약 이름을 입력해주세요';
  else if (nicknameLength > MAX_NICKNAME_LENGTH) {
    errors.nickname = '계약 이름은 20자 이내로 입력해주세요';
  }

  const endDate = (values.endDate ?? '').trim();
  if (!isValidYMD(endDate)) {
    errors.endDate = '만기일을 YYYY-MM-DD 형식으로 입력해주세요';
  } else if (endDate < today) {
    errors.endDate = '만기일이 오늘 이전이에요. 다음 계약 만기일을 입력해주세요';
  } else {
    const limit = addMonthsClamped(today, MAX_END_YEARS * 12);
    if (typeof limit === 'string' && endDate > limit) {
      errors.endDate = '만기일은 5년 이내로 입력해주세요';
    }
  }

  const deposit = parseWon(values.deposit) ?? 0;
  const monthlyRent = parseWon(values.monthlyRent) ?? 0;

  if (!Number.isFinite(deposit) || deposit < 0) {
    errors.deposit = '보증금은 0원 이상 숫자로 입력해주세요';
  } else if (deposit > MAX_DEPOSIT) {
    errors.deposit = '보증금은 100억원 이하로 입력해주세요';
  }

  if (!Number.isFinite(monthlyRent) || monthlyRent < 0) {
    errors.monthlyRent = '월세는 0원 이상 숫자로 입력해주세요';
  } else if (monthlyRent > MAX_MONTHLY_RENT) {
    errors.monthlyRent = '월세는 1,000만원 이하로 입력해주세요';
  }

  if (!errors.deposit && !errors.monthlyRent && deposit === 0 && monthlyRent === 0) {
    errors.deposit = '보증금이나 월세 중 하나는 입력해주세요';
  }

  const lastIncreaseDate = (values.lastIncreaseDate ?? '').trim();
  if (lastIncreaseDate !== '') {
    if (!isValidYMD(lastIncreaseDate)) {
      errors.lastIncreaseDate = '최근 증액일을 YYYY-MM-DD 형식으로 입력해주세요';
    } else if (lastIncreaseDate > today) {
      errors.lastIncreaseDate = '최근 증액일은 오늘 이전이어야 해요';
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      errors,
      firstErrorField: firstKey(errors, [
        'nickname',
        'endDate',
        'deposit',
        'monthlyRent',
        'lastIncreaseDate',
      ]),
    };
  }

  const value: ValidContract = {
    nickname,
    endDate,
    deposit,
    monthlyRent,
    renewalRightUsed: values.renewalRightUsed ?? false,
  };
  if (lastIncreaseDate !== '') value.lastIncreaseDate = lastIncreaseDate;
  return { ok: true, value };
}

/** 보증금 → 월세 전환 금액(원). 1원 이상, 현재 보증금 이하 */
export function validateConversionAmount(raw: string, deposit: number): ValueResult<number> {
  const amount = parseWon(raw);
  if (amount === null || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: '전환할 금액을 입력해주세요' };
  }
  if (amount > deposit) {
    return { ok: false, error: '현재 보증금보다 많이 전환할 수 없어요' };
  }
  return { ok: true, value: amount };
}

/** 기준금리(%) 0~10 */
export function validateBaseRate(raw: string): ValueResult<number> {
  const rate = parseDecimal(raw);
  if (rate === null || !Number.isFinite(rate) || rate < 0 || rate > 10) {
    return { ok: false, error: '기준금리는 0~10% 사이로 입력해주세요' };
  }
  return { ok: true, value: rate };
}

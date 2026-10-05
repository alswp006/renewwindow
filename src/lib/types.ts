// Domain types — SPEC Data Models. 런타임 export 금지(type/interface만).

export interface LandlordNotice {
  noticeDate: string;
  newDeposit: number;
  newMonthlyRent: number;
  inputMode: 'rate' | 'amount';
  checkedAt: string;
}

export interface Contract {
  id: string;
  nickname: string;
  endDate: string;
  deposit: number;
  monthlyRent: number;
  renewalRightUsed: boolean;
  lastIncreaseDate?: string;
  notice?: LandlordNotice;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  baseRatePercent: number;
  baseRateAsOf: string;
}

export type ChecklistState = Record<string, string[]>;

export interface ChecklistItem {
  id: string;
  title: string;
  source: string;
}

export type WindowStatus = 'upcoming' | 'open' | 'closed' | 'expired';

export type NoticeTiming = 'before_period' | 'in_period' | 'after_period';

export interface RenewalWindow {
  startDate: string;
  deadlineDate: string;
  endDate: string;
  status: WindowStatus;
  daysToStart: number;
  daysToDeadline: number;
  daysToEnd: number;
}

export interface CapResult {
  maxDeposit: number;
  maxMonthlyRent: number;
  depositIncrease: number;
  rentIncrease: number;
}

export interface NoticeCheck {
  depositRatePercent: number | null;
  rentRatePercent: number | null;
  depositOver: number;
  rentOver: number;
  isOverCap: boolean;
  noticeTiming: NoticeTiming;
  withinOneYearOfIncrease: boolean;
}

export interface ConversionResult {
  ratePercent: number;
  addedRent: number;
  remainingDeposit: number;
  newMonthlyRent: number;
}

export interface ScenarioRow {
  percent: number;
  remainingDeposit: number;
  monthlyRentCap: number;
  annualRent: number;
}

/** 계약 입력 폼의 원본 값(숫자 필드도 문자열) */
export interface ContractInput {
  nickname: string;
  endDate: string;
  deposit: string;
  monthlyRent: string;
  lastIncreaseDate: string;
  renewalRightUsed: boolean;
}

export type FieldErrors = Record<string, string>;

export interface SaveResult {
  ok: boolean;
  error?: string;
  quota?: boolean;
}

export interface SaveContractResult extends SaveResult {
  id?: string;
}

export interface LoadContractsResult {
  contracts: Contract[];
  recovered: boolean;
}

export interface RouteState {
  '/': { toast?: string } | null;
  '/contracts/new': null;
  '/contracts/:id': { justSaved?: boolean } | null;
  '/contracts/:id/edit': null;
  '/contracts/:id/notice': null;
}

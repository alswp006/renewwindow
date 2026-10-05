/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** (구현: 패킷 0001) */
export type Contract = { id: string; nickname: string; endDate: string; deposit: number; monthlyRent: number; lastIncreaseDate?: string; useRenewalRight: boolean; notice?: { noticeDate: string; depositRatePercent: number | null; rentRatePercent: number | null; checkedAt: string } };

/** (구현: 패킷 0001) */
export type ContractInput = { nickname: string; endDate: string; deposit: string; monthlyRent: string; lastIncreaseDate: string; useRenewalRight: boolean };

/** (구현: 패킷 0001) */
export type Settings = { baseRatePercent: number };

/** (구현: 패킷 0001) */
export type RenewalWindow = { startDate: string; deadlineDate: string; expiryDate: string };

/** (구현: 패킷 0001) */
export type NoticeCheck = { depositRatePercent: number | null; rentRatePercent: number | null; depositCap: number; rentCap: number; depositOver: number; rentOver: number; isOverDeposit: boolean; isOverRent: boolean; isOverEither: boolean; canNotify: boolean };

/** (구현: 패킷 0001) */
export type Scenario = { conversionAmount: number; remainingDeposit: number; maxMonthlyRent: number; rentCap: number };

/** (구현: 패킷 0001) */
export type Checklist = { [contractId: string]: string[] };

/** (구현: 패킷 0001) */
export type SaveResult = { ok: boolean; error?: string; quota?: boolean };

/** (구현: 패킷 0001) */
export type SaveContractResult = { ok: boolean; error?: string; quota?: boolean; id?: string };

/** (구현: 패킷 0001) */
export type LoadContractsResult = { contracts: Contract[]; recovered: boolean };

/** (구현: 패킷 0001) */
export type FieldErrors = { [fieldName: string]: string };

/** 유효한 연월일 검증 (구현: 패킷 0002) */
export type isValidYMDFn = (y: number, m: number, d: number) => boolean;

/** YYYY-MM-DD 형식 오늘 날짜 (구현: 패킷 0002) */
export type getTodayFn = () => string;

/** 월 더하기, 말일 처리 (구현: 패킷 0002) */
export type addMonthsClampedFn = (dateStr: string, months: number) => string;

/** Date.UTC 기준 일수 차이 (구현: 패킷 0002) */
export type diffDaysFn = (dateA: string, dateB: string) => number;

/** 8자리 입력 → YYYY-MM-DD 자동 하이픈 (구현: 패킷 0002) */
export type formatDateInputFn = (raw: string) => string;

/** 갱신 시작·마감·만기 날짜 (구현: 패킷 0002) */
export type computeRenewalWindowFn = (endDate: string, today: string) => RenewalWindow | { error: 'invalid_date' };

/** 갱신 창구 오름차순 정렬 (구현: 패킷 0002) */
export type sortContractsFn = (contracts: Contract[], today: string) => Contract[];

/** 갱신요구 시기 (구현: 패킷 0002) */
export type getNoticeTimingFn = (endDate: string, today: string) => 'open' | 'upcoming' | 'passed';

/** 1년 이내 증액 여부 (구현: 패킷 0002) */
export type isWithinOneYearOfIncreaseFn = (lastIncreaseDate: string | undefined, today: string) => boolean;

/** 상한액 계산 (구현: 패킷 0003) */
export type computeCapFn = (deposit: number, baseRatePercent: number) => { maxDeposit: number; maxMonthlyRent: number };

/** 적용 전환율 (구현: 패킷 0003) */
export type computeConversionRateFn = (deposit: number, baseRatePercent: number) => number;

/** 전환 월세 (구현: 패킷 0003) */
export type computeConversionFn = (conversionAmount: number, conversionRate: number) => number;

/** 전환 결과 구성 (구현: 패킷 0003) */
export type buildConversionResultFn = (conversionAmount: number, deposit: number, conversionRate: number, cap: number) => { remainingDeposit: number; maxMonthlyRent: number; rentCap: number };

/** 0/25/50/75% 시나리오 4개 (구현: 패킷 0003) */
export type computeScenariosFn = (deposit: number, monthlyRent: number, baseRatePercent: number) => Scenario[];

/** 1억 5,000만원 형식 (구현: 패킷 0003) */
export type formatKRWFn = (amount: number) => string;

/** 천 단위 콤마 (구현: 패킷 0003) */
export type formatNumberInputFn = (raw: string) => string;

/** 숫자만 추출 (구현: 패킷 0003) */
export type digitsOnlyFn = (raw: string) => string;

/** 2.5% 형식 (구현: 패킷 0003) */
export type formatRateFn = (percentValue: number) => string;

/** 소수점 2자리 % (구현: 패킷 0003) */
export type formatPercent2Fn = (percentValue: number) => string;

/** D-117 또는 D-day (구현: 패킷 0003) */
export type formatDdayFn = (days: number) => string;

/** 모든 계약 로드 + 손상 복구 여부 (구현: 패킷 0004) */
export type loadContractsFn = () => LoadContractsResult;

/** 단건 조회 (구현: 패킷 0004) */
export type getContractFn = (id: string) => Contract | undefined;

/** 신규 저장 (id 자동 생성) (구현: 패킷 0004) */
export type saveContractFn = (contract: Omit<Contract, 'id'>) => SaveContractResult;

/** 계약 + 체크리스트 항목 삭제 (구현: 패킷 0004) */
export type deleteContractFn = (id: string) => SaveResult;

/** 설정 로드 (구현: 패킷 0004) */
export type loadSettingsFn = () => Settings;

/** 설정 저장 (구현: 패킷 0004) */
export type saveSettingsFn = (settings: Settings) => SaveResult;

/** 모든 체크리스트 로드 (구현: 패킷 0004) */
export type loadChecklistFn = () => Checklist;

/** 계약별 체크리스트 저장 (구현: 패킷 0004) */
export type saveChecklistFn = (contractId: string, itemIds: string[]) => SaveResult;

/** 계약 체크리스트 삭제 (구현: 패킷 0004) */
export type removeChecklistForFn = (contractId: string) => SaveResult;

/** 계약 폼 검증 (구현: 패킷 0005) */
export type validateContractFormFn = (values: ContractInput, today: string) => { ok: true; value: Omit<Contract, 'id' | 'notice'> } | { ok: false; errors: FieldErrors; firstErrorField: string };

/** 전환 금액 검증 (구현: 패킷 0005) */
export type validateConversionAmountFn = (raw: string, deposit: number) => { ok: boolean; error?: string };

/** 기준금리 검증 (구현: 패킷 0005) */
export type validateBaseRateFn = (raw: string) => { ok: boolean; error?: string };

/** 통보 폼 검증 (구현: 패킷 0005) */
export type validateNoticeFormFn = (values: { noticeDate: string; depositRate?: string; rentRate?: string; depositAmount?: string; rentAmount?: string }, contract: Contract, today: string) => { ok: true; value: { noticeDate: string; depositRatePercent: number | null; rentRatePercent: number | null } } | { ok: false; errors: FieldErrors; firstErrorField: string };

/** 통보 점검 계산 (구현: 패킷 0002) */
export type computeNoticeCheckFn = (contract: Contract, notice: { noticeDate: string; depositRatePercent: number | null; rentRatePercent: number | null }) => NoticeCheck;

/** 계약 목록 + 손상 복구 플래그 (구현: 패킷 0006) */
export type useContractsFn = () => { status: 'loading' | 'ready' | 'error'; contracts: Contract[]; recovered: boolean; reload: () => void };

/** 단건 계약 (구현: 패킷 0006) */
export type useContractFn = (id: string) => { status: 'loading' | 'ready' | 'not_found'; contract?: Contract; save: (c: Omit<Contract, 'id'>) => SaveResult; remove: () => SaveResult };

/** 설정 (구현: 패킷 0006) */
export type useSettingsFn = () => { settings: Settings; saveBaseRate: (percent: number, today: string) => SaveResult };

/** 체크리스트 (구현: 패킷 0006) */
export type useChecklistFn = (contractId: string) => { checkedIds: string[]; toggle: (itemId: string, on: boolean) => void };

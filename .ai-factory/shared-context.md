# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
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
export type computeConversio
```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
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

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    AmountField.tsx
    BottomCTA.tsx
    Card.tsx
    ContractForm.test.tsx
    ContractForm.tsx
    CountUp.tsx
    DateField.tsx
    DeleteContractButton.test.tsx
    DeleteContractButton.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    NotFoundState.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
    fields.test.tsx
    notice/
    result/
  constants/
    law.ts
    routes.ts
  hooks/
    hooks.test.tsx
    useChecklist.ts
    useContracts.ts
    useSettings.ts
  lib/
    analytics.ts
    contract.ts
    date.ts
    format.test.ts
    format.ts
    money.test.ts
    money.ts
    notice.test.ts
    notice.ts
    noticeValidation.test.ts
    noticeValidation.ts
    renewal.test.ts
    renewal.ts
    review.ts
    settingsStorage.test.ts
    settingsStorage.ts
    share.ts
    storage.test.ts
    storage.ts
    types.ts
    utils.ts
    validation.test.ts
    validation.ts
  main.tsx
  pages/
    ContractEdit.tsx
    Home.test.tsx
    Home.tsx
    Notice.tsx
    Result.test.tsx
    Result.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- analytics.ts: export type LogFields = Record<string, string | number | boolean | null>; export const DWELL_MS = 3000; export function fireAndForget(call: () => unknown): void; export function logScreen(page: string, extra?: LogFields): void; export function logClick(name: string, extra?: LogFields): void; export function logImpression(name: string, extra?: LogFields): void; export function useScreenLog(page: string): void
- contract.ts: export type Contract =; export type ContractInput =; export type Settings =; export type RenewalWindow =; export type NoticeCheck =; export type Scenario =; export type Checklist =; export type SaveResult =
- date.ts: export type InvalidDate =; export function isValidYMD(s: unknown): boolean; export function getToday(): string; export function addMonthsClamped(dateStr: string, months: number): string | InvalidDate; export function diffDays(dateA: string, dateB: string): number; export function formatDateInput(raw: string): string
- format.ts: export function formatKRW(amount: number): string; export function digitsOnly(raw: string): string; export function formatNumberInput(raw: string): string; export function formatRate(rate: number): string; export function formatPercent2(percent: number): string; export function formatDday(days: number): string
- money.ts: export function computeCap(deposit: number, monthlyRent: number): CapResult; export function computeConversionRate(baseRatePercent: number): number; export function computeConversion(amount: number, ratePercent: number): number; export function buildConversionResult( deposit: number, monthlyRent: number, conversionAmount: number, ratePercent: numb; export function computeScenarios( deposit: number, monthlyRent: number, ratePercent: number, ): ScenarioRow[]
- notice.ts: export function computeNoticeCheck( contract: ContractInfo, notice: NoticeInfo, ): NoticeCheck | InvalidDate
- noticeValidation.ts: export interface NoticeFormValues; export type NoticeContract = Pick<Contract, 'endDate' | 'deposit' | 'monthlyRent'>; export type ValidNotice = Pick< LandlordNotice, 'noticeDate' | 'newDeposit' | 'newMonthlyRent' | 'inputMode' >; export type NoticeFormResult = |; export function validateNoticeForm( values: NoticeFormValues, contract: NoticeContract, today: string, ): NoticeFormResu
- renewal.ts: export function computeRenewalWindow(endDate: string, today: string): RenewalWindow | InvalidDate; export function sortContracts<T extends; export function getNoticeTiming(endDate: string, noticeDate: string): NoticeTiming | InvalidDate; export function isWithinOneYearOfIncrease( lastIncreaseDate: string | null | undefined, noticeDate: string, ): boolean
- review.ts: export function requestReviewOnce(key: string = REVIEW_REQUESTED_KEY): void
- settingsStorage.ts: export const SETTINGS_KEY = 'renewwindow:settings:v1'; export const SETTINGS_CORRUPT_KEY = 'renewwindow:settings:corrupt'; export const CHECKLIST_KEY = 'renewwindow:checklist:v1'; export const CHECKLIST_CORRUPT_KEY = 'renewwindow:checklist:corrupt'; export function loadSettings(): Settings; export function saveSettings(settings: Settings): SaveResult; export function loadChecklist(): ChecklistState; export function saveChecklist(contractId: string, checkedIds: string[]): SaveResult
- share.ts: export interface ShareAppOptions; export async function shareApp(opts: ShareAppOptions): Promise<void>
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void; export const CONTRACTS_KEY = 'renewwindow:contracts:v1'; export const CONTRACTS_CO...
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 타입·법령 상수·경로 상수·테스트 환경 (files: src/lib/types.ts, src/constants/law.ts, src/constants/routes.ts, vitest.config.ts, package.json)
- 0002: 날짜 유틸·갱신 기간 엔진·통보 점검 엔진 (files: src/lib/date.ts, src/lib/renewal.ts, src/lib/notice.ts, src/lib/renewal.test.ts, src/lib/notice.test.ts)
- 0003: 금액 엔진·표기 포맷(format.ts) (files: src/lib/money.ts, src/lib/format.ts, src/lib/money.test.ts, src/lib/format.test.ts)
- 0004: 계약·설정·체크리스트 localStorage 저장소 (files: src/lib/storage.ts, src/lib/settingsStorage.ts, src/lib/storage.test.ts, src/lib/settingsStorage.test.ts)
- 0005: 계약 폼·전환 금액·기준금리·통보 폼 검증 (files: src/lib/validation.ts, src/lib/noticeValidation.ts, src/lib/validation.test.ts, src/lib/noticeValidation.test.ts)
- 0006: 상태 훅 — useContracts·useContract·useSettings·useChecklist (files: src/hooks/useContracts.ts, src/hooks/useSettings.ts, src/hooks/useChecklist.ts, src/hooks/hooks.test.tsx)
- 0007: 공용 입력 필드 — 금액·날짜 TextField, 계약 없음 상태 (files: src/components/AmountField.tsx, src/components/DateField.tsx, src/components/NotFoundState.tsx, src/components/fields.test.tsx)
- 0009: 계약 입력 폼 컴포넌트 (ContractForm) (files: src/components/ContractForm.tsx, src/components/ContractForm.test.tsx)
- 0010: 계약 삭제 버튼·확인 다이얼로그 (DeleteContractButton) (files: src/components/DeleteContractButton.tsx, src/components/DeleteContractButton.test.tsx)
- 0012: 결과 무료 층 컴포넌트 (FreeTier) — 타임라인·5% 상한 카드 (files: src/components/result/FreeTier.tsx, src/components/result/FreeTier.test.tsx)
- 0013: 월세 전환 카드·기준금리 BottomSheet (ConversionCard) (files: src/components/result/ConversionCard.tsx, src/components/result/BaseRateSheet.tsx, src/components/result/ConversionCard.test.tsx)
- 0014: 심화 층 컴포넌트 (DeepTier) — 전환 시나리오 비교·협상 체크리스트 (files: src/components/result/DeepTier.tsx, src/components/result/DeepTier.test.tsx)
- 0016: 통보 입력 폼 컴포넌트 (NoticeForm) (files: src/components/notice/NoticeForm.tsx, src/components/notice/NoticeForm.test.tsx)
- 0017: 통보 점검 결과 카드 컴포넌트 (NoticeResultCard) (files: src/components/notice/NoticeResultCard.tsx, src/components/notice/NoticeResultCard.test.tsx)
- 0008: 홈 화면 (/) — 가까운 창구 순 계약 목록 + 배너 (files: src/pages/Home.tsx, src/pages/Home.test.tsx)
- 0015: 결과 화면 (/contracts/:id) — 조립·리워드 게이트·배너·공유 (files: src/pages/Result.tsx, src/pages/Result.test.tsx)

## Available exports from existing files
// src/App.tsx
export default function App() {

// src/components/AdSlot.tsx
export function AdSlot({ adGroupId, className, variant, theme }: AdSlotProps) {

// src/components/Amount.tsx
export function Amount({

// src/components/AmountField.tsx
export function AmountField({

// src/components/BottomCTA.tsx
export function SubmitFooter({
export function ButtonStack({

// src/components/Card.tsx
export function Card({

// src/components/ContractForm.tsx
export function ContractForm({

// src/components/CountUp.tsx
export function CountUp({

// src/components/DateField.tsx
export function DateField({

// src/components/DeleteContractButton.tsx
export function DeleteContractButton({

// src/components/FloatingTabBar.tsx
export type TabItem = {
export function FloatingTabBar({ items }: { items: TabItem[] }) {

// src/components/MiniBar.tsx
export function MiniBar({

// src/components/NotFoundState.tsx
export function NotFoundState({ testId, onBack }: { testId: string; onBack: () => void }) {

// src/components/PageShell.tsx
export function PageShell({

// src/components/ScreenScaffold.tsx
export function ScreenScaffold({

// src/components/Sparkline.tsx
export function Sparkline({

// src/components/StateView.tsx
export function EmptyState({
export function LoadingState({

// src/components/SummaryHero.tsx
export function SummaryHero({

// src/components/TossPurchase.tsx
export interface TossPurchaseResult {
export function TossPurchase({

// src/components/TossRewardAd.tsx
export function TossRewardAd({

// src/components/notice/NoticeForm.tsx
export function NoticeForm({

// src/components/notice/NoticeResultCard.tsx
export function NoticeResultCard({ contract, check }: { contract: Contract; check: NoticeCheck }) {

// src/components/result/BaseRateSheet.tsx
export function BaseRateSheet({

// src/components/result/ConversionCard.tsx
export function ConversionCard({ contract, today }: { contract: Contract; today: string }) {

// src/components/result/DeepTier.tsx
exp

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(4), general(14), testing(2), ui(3)

Key lessons (verify against actual code before applying):
- [general] 진입점 라우터 배선은 맨 끝에 두지 말고 기반 패킷 직후 플레이스홀더 페이지와 함께 먼저 병합하라. 화면 패킷은 그 플레이스홀더를 교체하게 해서, 언제 중단돼도 병합된 화면에 도달할 수 있게 하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 파일 생성 전 디렉토리 구조 확인 — mkdir -p로 경로 보장 (60% · 타 앱 1회 — 맹신 금지)
- [general] 화면·라우팅 등 소비자 모듈은 그것이 import하는 생산자 모듈이 병합된 뒤에만 병합하고, 순서를 지킬 수 없으면 소비자 병합과 동시에 최소 플레이스홀더를 만들어 매 병합 직후 타입체크와 빌드가 항상 통과하도록 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 전역 라우팅·탭바·Provider 배선은 개별 화면보다 먼저(초반 20% 안에) 완료하고 미구현 화면은 스텁 라우트로 연결해, 시간 예산이 소진돼도 앱이 항상 실행 가능한 상태를 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 저장·데이터 접근 등 기반 계층 패킷은 이를 import 하는 화면 패킷보다 반드시 먼저 완료·병합하고, 미완료면 상위 화면 패킷 병합을 차단하라 — 빈 기반 모듈 하나가 전 라우트 스모크를 무너뜨린다. (60% · 타 앱 1회 — 맹신 금지)
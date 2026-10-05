# TASK — 갱신체크 / RenewWindow

> **이번 수정 내용**
> - **Epic 순서**: Epic 이름을 템플릿 그대로 맞췄습니다(Epic 1. Data Layer → Epic 2. API Routes → Epic 3. UI Pages → Epic 4. Integration + Landing).
>   - Epic 1 안에서는 지시한 순서대로 타입 → 계산 엔진 → 저장소 → 상태를 처리합니다. 타입, 저장소, 상태는 각각 다른 Task입니다.
>   - 이 앱에는 서버가 없습니다. 그래서 Epic 2는 Task 없이 "해당 없음"으로만 둡니다.
> - **파일 충돌**: 이제 모든 소스 파일을 **정확히 한 Task만 만들거나 수정합니다**. 겹치던 파일은 다음처럼 나눴습니다.
>   - storage.ts → `storage.ts`와 `settingsStorage.ts`로 분리
>   - validation.ts → `validation.ts`와 `noticeValidation.ts`로 분리
>   - ContractFormPage → `ContractForm` 컴포넌트, `DeleteContractButton` 컴포넌트, 페이지로 분리
>   - HomePage → 광고 배치까지 한 Task에서 처리
>   - ResultPage → 무료 층, 전환 카드, 심화 층을 컴포넌트로 먼저 만들고, 조립·게이트·배너는 한 Task에서 처리
>   - NoticePage → `NoticeForm` 컴포넌트, `NoticeResultCard` 컴포넌트, 페이지로 분리
>   - package.json과 vite.config.ts → 각각 한 Task에서만 수정
>
> **전제**
> - 템플릿에 이미 있는 PageShell/ScreenScaffold, SubmitFooter, SummaryHero, CountUp, MiniBar, Card, AdSlot, TossRewardAd, `logClick`/`logImpression`, `shareApp`, `requestReviewOnce`를 템플릿 경로에서 import해서 씁니다. 새로 설계하지 않습니다.
> - **공통 DoD**: `npx tsc --noEmit`, `npm run build`, 그리고 그 Task의 테스트가 모두 통과해야 합니다.
> - 테스트는 Vitest와 @testing-library/react로 씁니다. today는 `vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 6, 12))`로 "2026-10-06"에 고정합니다.

---

## Epic 1. Data Layer

**Risk**
- **Complexity**: Medium
- **Risk factors**
  - RouteState와 실제 `navigate()` 호출이 서로 어긋날 수 있습니다.
  - 월말 보정, 윤년, UTC와 로컬 시간을 섞어 쓰면 D-day가 하루 틀어질 수 있습니다.
  - 부동소수점 때문에 금액이 1원 틀릴 수 있습니다.
  - localStorage가 손상되거나 SecurityError, QuotaExceededError가 나면 앱이 크래시할 수 있습니다.
  - 사용자가 정하는 분류를 닫힌 유니온 타입으로 만들 위험이 있습니다.
  - 용량은 약 30KB로 5MB 한도보다 훨씬 작아서 위험이 낮습니다.
- **Mitigation**
  - 타입(1.1)을 가장 먼저 고정합니다. 모든 화면이 같은 RouteState를 import합니다.
  - 닫힌 유니온은 계산 결과 상태(`WindowStatus`, `NoticeTiming`)와 법정 체크리스트 id에만 씁니다. 계약은 `{ id, nickname }` 목록으로 둡니다.
  - 날짜는 `YYYY-MM-DD` 문자열과 `Date.UTC`로 구한 일수 차이로만 계산합니다. today는 함수 인자로 받습니다.
  - 금액은 곱셈을 먼저 하고 나눗셈은 나중에 합니다. `Math.floor`는 마지막에 한 번만 적용합니다.
  - 순수 함수(1.3~1.6)의 단위 테스트로 SPEC 수치를 먼저 고정합니다. 저장소(1.7~1.8)와 상태(1.11~1.12)는 그다음에 만듭니다.
  - 저장 함수는 예외를 던지지 않고 결과 객체를 반환합니다.

### Task 1.1 엔티티·계산 결과·RouteState 타입
- **Description**: `src/lib/types.ts`에 런타임 코드 없이 타입만 정의합니다.
  - **엔티티**: `Contract`, `LandlordNotice`, `Settings`, `ChecklistState`, `ChecklistItem { id: string; title: string; source: string }`
  - **계산 결과**:
    - `WindowStatus`, `RenewalWindow`, `RenewalWindowResult = RenewalWindow | { error: 'invalid_date' }`, `CapResult`
    - `ConversionResult { ratePercent; addedRent; remainingDeposit; newMonthlyRent }`
    - `ScenarioRow { percent; remainingDeposit; monthlyRentCap; annualRent }`
    - `NoticeTiming = 'before_period' | 'in_period' | 'after_period'`, `NoticeCheck`
  - **입출력**:
    - `ContractInput = Omit<Contract,'id'|'createdAt'|'updatedAt'> & { id?: string }`
    - `SaveResult = { ok: true } | { ok: false; error: 'quota' | 'limit' }`
    - `SaveContractResult = { ok: true; contract: Contract } | { ok: false; error: 'quota' | 'limit' }`
    - `LoadContractsResult = { contracts: Contract[]; recovered: boolean }`
    - `FieldErrors<K extends string> = Partial<Record<K, string>>`
  - **RouteState**:
    ```ts
    export type RouteState = {
      '/': { toast?: string } | null;
      '/contracts/new': null;
      '/contracts/:id': { justSaved?: boolean } | null;
      '/contracts/:id/edit': null;
      '/contracts/:id/notice': null;
    };
    ```
- **DoD**
  - `tsc --noEmit`가 통과합니다.
  - `export type`/`export interface`가 아닌 런타임 export가 0개입니다.
  - `Contract`, `LandlordNotice`, `Settings`의 필드 이름과 선택 여부(`lastIncreaseDate?`, `notice?`)가 SPEC Data Models와 글자 하나까지 같습니다.
- **Covers**: [] — 기반 작업입니다. 이후 모든 Task가 사용합니다.
- **Files**: [src/lib/types.ts]
- **Depends on**: none

### Task 1.2 법령 상수·경로 상수·테스트 환경
- **Description**
  - `src/constants/law.ts`에 다음 상수를 둡니다.
    - `RENEWAL_START_MONTHS=6`, `RENEWAL_END_MONTHS=2`, `INCREASE_CAP_PERCENT=5`, `CONVERSION_CAP_PERCENT=10`, `CONVERSION_SPREAD_PERCENT=2`
    - `DEFAULT_BASE_RATE`, `DEFAULT_BASE_RATE_AS_OF`. 옆에 `// TODO(Open Question 1): 출시 전 한국은행 공시값 확인` 주석을 붙입니다.
    - `MAX_CONTRACTS=20`
    - `CHECKLIST_ITEMS` 8개. id, title, source는 SPEC F7 목록과 글자 그대로 같습니다. title의 `{마감일}`은 placeholder로 남겨 둡니다.
  - `src/constants/routes.ts`에 경로 빌더를 둡니다: `paths.home()`, `paths.newContract()`, `paths.contract(id)`, `paths.editContract(id)`, `paths.notice(id)`
  - 테스트 환경을 준비합니다. 이 프로젝트에서 package.json은 이 Task만 수정합니다.
    - devDependencies: vitest, jsdom, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom
    - 스크립트: `"test": "vitest run"`
    - `vitest.config.ts`(environment jsdom, setupFiles)와 `src/test/setup.ts`
- **DoD** (`law.test.ts`)
  - `CHECKLIST_ITEMS.length === 8`입니다.
  - id 순서가 SPEC과 같습니다(`deliver_by_deadline` … `tenant_termination`).
  - 모든 항목의 `source`가 비어 있지 않습니다.
  - `paths.contract('a') === '/contracts/a'`입니다.
  - `npm test`가 실행됩니다.
- **Covers**: [F7-AC4] (출처 문자열 데이터)
- **Files**: [src/constants/law.ts, src/constants/routes.ts, src/constants/law.test.ts, vitest.config.ts, src/test/setup.ts, package.json]
- **Depends on**: Task 1.1

### Task 1.3 날짜 유틸
- **Description**: `src/lib/date.ts`
  - `isValidYMD(s)`: `^\d{4}-\d{2}-\d{2}$` 형식이면서 실제로 존재하는 날짜일 때만 true입니다.
  - `getToday()`: 로컬 기준 `YYYY-MM-DD`를 반환합니다.
  - `addMonthsClamped(ymd, n)`: n은 음수도 됩니다. 결과 날짜가 그 달에 없으면 말일로 보정합니다.
  - `diffDays(a, b)`: `Date.UTC`로 b − a 일수를 구합니다.
  - `formatDateInput(raw)`: 숫자만 최대 8자리까지 받고 하이픈을 자동으로 넣습니다.
- **DoD** (`date.test.ts`)
  - `addMonthsClamped('2027-08-31',-6)==='2027-02-28'`
  - `addMonthsClamped('2028-08-31',-6)==='2028-02-29'`
  - `addMonthsClamped('2027-04-30',-6)==='2026-10-30'`
  - `diffDays('2026-10-06','2027-01-31')===117`
  - `isValidYMD('2027-02-30')===false`, `isValidYMD('2027-13-01')===false`
  - `formatDateInput('20270331')==='2027-03-31'`
- **Covers**: [F1-AC2, F1-AC8]
- **Files**: [src/lib/date.ts, src/lib/date.test.ts]
- **Depends on**: Task 1.1

### Task 1.4 갱신 기간 엔진·정렬
- **Description**: `src/lib/renewal.ts`
  - `computeRenewalWindow(endDate, today): RenewalWindowResult`
    - 입력이 유효하지 않으면 예외 없이 `{ error:'invalid_date' }`를 반환합니다.
    - 상태: today < start이면 upcoming, start ≤ today ≤ deadline이면 open, deadline < today ≤ end이면 closed, today > end이면 expired입니다.
  - `sortContracts(contracts, today)`: SPEC F3의 정렬 규칙 ①~④를 따릅니다. 원본 배열은 바꾸지 않습니다.
  - `getNoticeTiming(noticeDate, window)`: start보다 앞이면 before_period, deadline까지는 in_period, 그 뒤는 after_period입니다.
  - `isWithinOneYearOfIncrease(lastIncreaseDate, noticeDate)`: `noticeDate < addMonthsClamped(lastIncreaseDate, 12)`이면 true입니다.
- **DoD** (`renewal.test.ts`)
  - F1-AC1과 F1-AC2의 반환값이 일치합니다.
  - `computeRenewalWindow('2027-02-30','2026-10-06')`가 예외 없이 `{error:'invalid_date'}`를 반환합니다.
  - F3-AC1 데이터를 정렬하면 [D, A, B, C] 순서입니다.
  - 통보 시기: '2027-02-10'은 after_period, '2026-09-01'은 before_period, '2026-12-20'은 in_period입니다.
  - `isWithinOneYearOfIncrease('2026-03-01','2026-12-20')===true`
- **Covers**: [F1-AC1, F1-AC2, F1-AC8, F3-AC1, F6-AC3, F6-AC4]
- **Files**: [src/lib/renewal.ts, src/lib/renewal.test.ts]
- **Depends on**: Task 1.2, Task 1.3

### Task 1.5 금액 엔진·표기
- **Description**: `src/lib/money.ts`
  - `computeCap(deposit, rent)`
  - `computeConversionRate(base) = min(10, base + 2)`
  - `computeConversion(amount, rate) = floor(amount × rate / 100 / 12)`
  - `computeConversionResult(contract, amount, baseRate)`
  - `computeScenarios(contract, baseRate)`
    - 전환 비율은 0/25/50/75%입니다.
    - 전환액 = `floor(deposit × p / 100)`
    - monthlyRentCap = 기존 월세 + 추가 월세 상한
    - annualRent = monthlyRentCap × 12
  - `formatKRW(n)`: 억/만/원 단위로 끊고 콤마를 넣습니다. 0이면 "0원"입니다.
  - `formatComma(n)`
  - `parseAmount(str)`: 숫자가 아닌 문자는 지웁니다. 맨 앞의 `-`는 남깁니다. 빈 값이면 null입니다.
- **DoD** (`money.test.ts`)
  - F1-AC3의 두 케이스가 일치합니다.
  - F1-AC4: 전환율 4.5와 10, 전환 월세 187500이 나옵니다.
  - F5-AC2: 남는 보증금 60,000,000, 추가 월세 150,000, 전환 후 월세 650,000이 나옵니다.
  - F7-AC3의 4행이 SPEC과 일치합니다.
  - `formatKRW`: 210000000 → "2억 1,000만원", 525000 → "52만 5,000원", 187500 → "18만 7,500원", 0 → "0원", 200000000 → "2억원", 2250000 → "225만원"
- **Covers**: [F1-AC3, F1-AC4, F5-AC1, F5-AC2, F7-AC3]
- **Files**: [src/lib/money.ts, src/lib/money.test.ts]
- **Depends on**: Task 1.2

### Task 1.6 통보 점검 엔진
- **Description**: `src/lib/notice.ts`
  - `amountsFromRates(contract, depositRate, rentRate)`: `newDeposit = deposit + floor(deposit × rate / 100)`. 월세도 같은 방식으로 계산합니다.
  - `computeNoticeCheck(contract, notice, window): NoticeCheck`
    - 인상률은 소수 둘째 자리에서 반올림합니다. 기존 금액이 0이면 null입니다.
    - 초과액 = `max(0, 새 금액 − 상한)`
    - `noticeTiming`과 `withinOneYearOfIncrease`는 Task 1.4 함수로 구합니다. lastIncreaseDate가 없으면 false입니다.
- **DoD** (`notice.test.ts`)
  - F6-AC1 입력: 보증금 인상률 8, 보증금 초과 6,000,000, 월세 인상률 10, 월세 초과 25,000, `isOverCap` true, `noticeTiming` in_period
  - F6-AC2 입력: 새 보증금 208,000,000, 새 월세 525,000, `isOverCap` false, 초과액 0/0
  - 보증금이 0인 계약이면 `depositRatePercent`가 null입니다.
- **Covers**: [F6-AC1, F6-AC2, F6-AC3, F6-AC4]
- **Files**: [src/lib/notice.ts, src/lib/notice.test.ts]
- **Depends on**: Task 1.4, Task 1.5

### Task 1.7 계약 저장소
- **Description**: `src/lib/storage.ts`. 이 파일은 이 Task만 만들고 수정합니다.
  - **공용 헬퍼**(export): `readRaw(key)`, `writeRaw(key, value): SaveResult`(setItem 예외를 `{ok:false,error:'quota'}`로 바꿈), `backupCorrupt(key, raw)`
  - `isContract(x)`: 스키마 가드입니다.
  - `loadContracts(): LoadContractsResult`
    - 키는 `renewwindow:contracts:v1`입니다.
    - 파싱 실패, 배열이 아닌 값, 원소 스키마 불일치 중 하나라도 해당하면 원본을 `renewwindow:contracts:corrupt`에 덮어쓰고 `{contracts:[], recovered:true}`를 반환합니다.
    - getItem의 SecurityError는 잡지 않고 그대로 전파합니다. 상태 계층(1.11)에서 처리합니다.
  - `saveContract(input): SaveContractResult`
    - id가 없으면 `crypto.randomUUID`로 만들고, 지원하지 않으면 SPEC의 대체 방식을 씁니다.
    - createdAt/updatedAt을 채웁니다. 같은 id면 기존 항목을 교체하고 updatedAt만 갱신합니다.
    - 새 계약인데 이미 20건이면 `{ok:false,error:'limit'}`를 반환합니다.
    - quota 오류면 기존 데이터를 그대로 둡니다.
    - lastIncreaseDate가 빈 값이면 키 자체를 저장하지 않습니다.
  - `deleteContract(id): SaveResult`
- **DoD** (`storage.test.ts`)
  - F1-AC5: 1건이 저장되고, 같은 id로 다시 저장해도 1건이며 deposit만 바뀌고 updatedAt이 갱신됩니다.
  - F1-AC6: "{not json"이면 `[]`와 recovered true를 반환하고, 원본이 백업됩니다.
  - F1-AC9: `{"id":"x"}`와 `[{"id":"x","deposit":"많음"}]`이 AC-6과 같은 경로로 처리됩니다.
  - F1-AC7: setItem을 QuotaExceededError로 mock하면 `{ok:false,error:'quota'}`를 반환하고 기존 값이 그대로입니다.
  - 21번째 저장은 `error:'limit'`입니다.
- **Covers**: [F1-AC5, F1-AC6, F1-AC7, F1-AC9, F2-AC6]
- **Files**: [src/lib/storage.ts, src/lib/storage.test.ts]
- **Depends on**: Task 1.1, Task 1.2

### Task 1.8 설정·체크리스트 저장소
- **Description**: `src/lib/settingsStorage.ts`(새 파일). Task 1.7의 `readRaw`/`writeRaw`/`backupCorrupt`를 import합니다.
  - `loadSettings()`
    - 저장된 값이 없으면 기본값을 반환합니다.
    - 손상됐거나 타입이 맞지 않으면 `renewwindow:settings:corrupt`에 백업하고 기본값을 반환합니다.
  - `saveSettings(s): SaveResult`
  - `loadChecklist()`: 객체이고 모든 값이 `string[]`이어야 통과입니다. 아니면 `renewwindow:checklist:corrupt`에 백업하고 `{}`를 반환합니다.
  - `saveChecklist(state): SaveResult`
  - `removeChecklistFor(contractId): SaveResult`
  - quota 오류는 모두 `{ok:false,error:'quota'}`로 반환하고 기존 값을 그대로 둡니다.
- **DoD** (`settingsStorage.test.ts`)
  - F1-AC8: 저장된 값이 없으면 기본값을 반환합니다.
  - F1-AC9: "{bad"와 `{"baseRatePercent":"abc"}`는 기본값 반환과 백업, "[1,2"와 `{"c1":"deliver_by_deadline"}`는 `{}` 반환과 백업
  - F1-AC7: saveSettings와 saveChecklist가 quota 상황에서 예외 없이 `{ok:false,error:'quota'}`를 반환하고 기존 값이 유지됩니다.
- **Covers**: [F1-AC7, F1-AC8, F1-AC9]
- **Files**: [src/lib/settingsStorage.ts, src/lib/settingsStorage.test.ts]
- **Depends on**: Task 1.7

### Task 1.9 계약 폼·전환 금액·기준금리 검증
- **Description**: `src/lib/validation.ts`
  - `validateContractForm(raw, today)`
    - 반환: `{ok:true, value: ContractInput} | {ok:false, errors: FieldErrors<'nickname'|'endDate'|'deposit'|'monthlyRent'|'lastIncreaseDate'>, firstErrorField}`
    - 에러 문구는 SPEC F2-AC4·AC5와 글자 그대로 같습니다.
    - 만기일은 today 이상, `addMonthsClamped(today,60)` 이하여야 합니다.
    - 금액 칸이 비어 있으면 0으로 봅니다. "보증금이나 월세 중 하나는…" 에러는 deposit 필드에 붙입니다.
    - firstErrorField 순서: nickname → endDate → deposit → monthlyRent → lastIncreaseDate
  - `validateConversionAmount(raw, deposit)`: "전환할 금액을 입력해주세요" / "현재 보증금보다 많이 전환할 수 없어요"
  - `validateBaseRate(raw)`: 빈 값, 숫자가 아닌 값, 0 미만, 10 초과면 "기준금리는 0~10% 사이로 입력해주세요"
- **DoD** (`validation.test.ts`)
  - F2-AC4: 에러 문구 3개가 일치하고 firstErrorField는 'nickname'입니다.
  - 최근 증액일
    - "2026-13-01", "2026-02-30", "202603"이면 형식 에러가 납니다.
    - 비워 두면 ok이고, value에 `lastIncreaseDate` 키가 없습니다.
  - F2-AC5
    - 에러 문구 4개가 일치합니다.
    - 만기일 "2031-10-07"이면 5년 초과 에러가 납니다.
    - 최근 증액일 "2026-10-07"이면 에러, "2026-10-06"이면 ok입니다.
  - F5-AC4의 문구 2개와 F5-AC5의 "12"/"" 문구가 일치합니다.
- **Covers**: [F2-AC4, F2-AC5, F5-AC4, F5-AC5]
- **Files**: [src/lib/validation.ts, src/lib/validation.test.ts]
- **Depends on**: Task 1.3, Task 1.5

### Task 1.10 통보 폼 검증
- **Description**: `src/lib/noticeValidation.ts`(새 파일)에 `validateNoticeForm(raw, mode, contract, today)`를 만듭니다.
  - 반환: `{ok:true, notice: Omit<LandlordNotice,'checkedAt'>} | {ok:false, errors}`
  - 통보일 규칙과 인상률 0~100% 규칙을 적용합니다.
  - amount 모드
    - 빈 값 문구를 붙입니다.
    - 범위: 새 보증금 0원~100억원, 새 월세 0원~1,000만원
  - rate 모드
    - `amountsFromRates`로 새 금액을 계산합니다.
    - 새 보증금이 100억원을 넘으면 보증금 인상률 필드에 "새 보증금은 0원~100억원 사이로 입력해주세요"를 붙입니다.
  - 월세가 0인 계약은 월세 필드를 검증하지 않고 `newMonthlyRent`를 0으로 둡니다.
- **DoD** (`noticeValidation.test.ts`): F6-AC5의 모든 And 조건이 기대 문구와 각각 일치합니다.
  - 통보일: 미래 날짜, 빈 값
  - 인상률: -3, 101
  - 새 금액: 빈 값, -1000, 10000000001, 10000001
  - 60억원 × 100%
  - 월세 0원 계약에서는 월세 에러가 없음
- **Covers**: [F6-AC5]
- **Files**: [src/lib/noticeValidation.ts, src/lib/noticeValidation.test.ts]
- **Depends on**: Task 1.6, Task 1.9

### Task 1.11 계약 상태 스토어
- **Description**: `src/state/ContractsProvider.tsx`에 React Context와 `useContracts()`를 만듭니다.
  - 상태: `{status:'loading'} | {status:'error'} | {status:'ready'; contracts; recovered}`
  - 첫 렌더는 'loading'입니다. useEffect에서 `loadContracts()`를 부르고, 예외가 나면 'error'로 바꿉니다.
  - 제공 함수
    - `reload()`
    - `upsert(input) → SaveContractResult`
    - `remove(id) → SaveResult`: deleteContract와 removeChecklistFor를 함께 실행합니다.
    - `getById(id)`
    - `consumeRecovered()`: 처음 호출하면 true를 반환하고, 그다음부터는 false입니다.
- **DoD** (`ContractsProvider.test.tsx`)
  - 첫 렌더 상태가 'loading'입니다.
  - loadContracts가 예외를 던지면 'error'가 되고, reload가 성공하면 'ready'가 됩니다.
  - remove 후에는 계약과 `renewwindow:checklist:v1[id]`가 모두 없습니다.
  - consumeRecovered를 두 번째로 호출하면 false입니다.
- **Covers**: [F2-AC3, F2-AC6, F3-AC4, F3-AC5, F3-AC8]
- **Files**: [src/state/ContractsProvider.tsx, src/state/ContractsProvider.test.tsx]
- **Depends on**: Task 1.7, Task 1.8

### Task 1.12 설정·체크리스트 훅
- **Description**
  - `src/state/useSettings.ts`: `{settings, save(rate, today) → SaveResult}`를 반환합니다. 저장에 실패하면 상태를 바꾸지 않습니다.
  - `src/state/useChecklist.ts`: `useChecklist(contractId) → {checked, toggle(itemId) → SaveResult}`를 반환합니다. 저장에 실패하면 이전 배열로 되돌립니다.
- **DoD** (`hooks.test.tsx`)
  - save가 성공하면 settings가 `{3.25, today}`가 됩니다.
  - quota mock이면 settings가 이전 값 그대로입니다.
  - toggle이 성공하면 checked에 id가 들어갑니다.
  - quota mock이면 checked가 이전 값 그대로입니다.
- **Covers**: [F5-AC3, F5-AC8, F7-AC4, F7-AC7]
- **Files**: [src/state/useSettings.ts, src/state/useChecklist.ts, src/state/hooks.test.tsx]
- **Depends on**: Task 1.8

---

## Epic 2. API Routes

**해당 없음.** SPEC에 따라 이 앱은 서버, 외부 API, 생성형 AI를 쓰지 않습니다. 모든 데이터는 Epic 1의 localStorage 계층에서 처리하므로 이 Epic에는 Task가 없습니다.

**Risk**
- **Complexity**: Low
- **Risk factors**: 없음
- **Mitigation**: 해당 없음

---

## Epic 3. UI Pages

**Risk**
- **Complexity**: Medium–High. 결과 화면 하나에 F4, F5, F7이 모두 들어갑니다.
- **Risk factors**
  - 결과 화면이나 폼 화면 패킷이 10분을 넘길 수 있습니다.
  - location.state 없이 직접 들어오면 크래시할 수 있습니다.
  - TossRewardAd가 무료 답까지 가릴 수 있습니다.
  - TDS 여백을 덮어쓰면 검수에서 반려됩니다.
  - 키보드가 입력 필드를 가릴 수 있습니다.
- **Mitigation**
  - 큰 화면은 섹션 컴포넌트(3.2·3.3, 3.6~3.8, 3.10·3.11)를 먼저 만들고, 페이지 Task에서 조립만 합니다. 그래서 파일마다 수정하는 Task가 하나뿐입니다.
  - state를 받는 화면(홈, 결과)은 `?? null` 확인과 "state 없이 직접 진입" 테스트를 DoD에 넣었습니다.
  - 결과 화면 Task에서 free-tier와 conversion-card가 TossRewardAd 바깥에 있는지 DOM 테스트로 확인합니다.
  - 간격은 Spacing(size)만, 색상은 `var(--adaptive*)`만 씁니다.

### Task 3.1 공용 입력 필드
- **Description**
  - `src/components/MoneyField.tsx`
    - TDS TextField에 `inputMode="numeric"`을 두고, 입력할 때 천 단위 콤마를 넣습니다.
    - `allowSign`이 true면 맨 앞의 `-`를 남깁니다.
    - `hasError`/`help`를 TextField에 넘깁니다.
  - `src/components/DateField.tsx`: `inputMode="numeric"`과 `formatDateInput`을 씁니다. `type="date"`는 쓰지 않습니다.
  - `src/components/RateField.tsx`: 숫자와 점 1개만 받고, 소수 둘째 자리까지 허용합니다.
  - `src/hooks/useFocusIntoView.ts`: 포커스되면 `scrollIntoView({block:'center'})`를 호출합니다.
  - 세 필드 모두 `onEnter` prop을 받습니다.
- **DoD** (`fields.test.tsx`)
  - MoneyField에 "200000000"을 입력하면 "200,000,000"이 되고, inputmode 속성이 "numeric"입니다.
  - DateField에 "20270331"을 입력하면 "2027-03-31"이 되고, type="date" 속성이 없습니다.
  - 포커스하면 scrollIntoView가 `{block:'center'}`로 1회 호출됩니다.
  - Enter를 누르면 onEnter가 호출됩니다.
  - 파일 안에 inline padding/margin과 HEX 색상이 0건입니다.
- **Covers**: [F2-AC1, F2-AC8]
- **Files**: [src/components/MoneyField.tsx, src/components/DateField.tsx, src/components/RateField.tsx, src/hooks/useFocusIntoView.ts, src/components/fields.test.tsx]
- **Depends on**: Task 1.3, Task 1.5

### Task 3.2 계약 입력 폼 컴포넌트
- **Description**: `src/components/contract/ContractForm.tsx`
  - props: `{ initial?: Contract; disabled?: boolean; loading?: boolean; today: string; onSubmit(value: ContractInput): void }`
  - 구성
    - TextField: 계약 이름, DateField 만기일, MoneyField 보증금·월세, DateField 최근 증액일(선택)
    - 만기일 아래 도움말 Paragraph.Text: "만기일은 계약서의 계약기간 끝나는 날이에요"
    - ListRow와 Switch: "이 집에서 갱신요구권을 이미 썼어요". 행 전체가 탭 영역입니다.
    - SubmitFooter Button("저장", display="block", loading)
  - 저장을 누르면 `logClick('contract_save')`를 부르고 `validateContractForm`을 실행합니다.
    - 실패하면 필드별로 `hasError`/`help`를 표시하고 firstErrorField로 포커스를 옮깁니다.
    - 성공하면 `onSubmit(value)`를 호출합니다.
  - 마지막 필드에서 Enter를 누르면 제출합니다.
  - `initial`이 있으면 필드 값을 미리 채웁니다(콤마와 하이픈 포맷 적용).
- **DoD** (`ContractForm.test.tsx`)
  - F2-AC4 입력이면 onSubmit이 호출되지 않고, 에러 문구 3개가 보이며, activeElement가 계약 이름 input입니다.
  - F2-AC5 입력이면 에러 문구 4개가 보입니다.
  - 유효한 입력이면 onSubmit이 `{nickname:'망원동 투룸', endDate:'2027-03-31', deposit:200000000, monthlyRent:0, renewalRightUsed:false}`로 1회 호출되고, `logClick('contract_save')`도 1회 호출됩니다.
  - disabled이면 모든 input이 disabled입니다.
- **Covers**: [F2-AC4, F2-AC5, F2-AC8]
- **Files**: [src/components/contract/ContractForm.tsx, src/components/contract/ContractForm.test.tsx]
- **Depends on**: Task 1.9, Task 3.1

### Task 3.3 계약 삭제 버튼·확인 다이얼로그
- **Description**: `src/components/contract/DeleteContractButton.tsx`
  - props: `{ contract: Contract }`
  - Button("계약 삭제", 약한 강조)을 누르면 AlertDialog "{nickname} 계약을 삭제할까요?"가 뜹니다.
    - "삭제"를 누르면 `useContracts().remove(id)`를 부르고 `navigate('/', {replace:true, state:{toast:'계약을 삭제했어요'} satisfies RouteState['/']})`로 이동합니다.
    - "취소"를 누르면 다이얼로그만 닫습니다.
- **DoD** (`DeleteContractButton.test.tsx`)
  - "삭제"를 누르면 계약과 checklist[id]가 모두 없어지고, 경로는 '/', state.toast는 '계약을 삭제했어요'입니다.
  - "취소"를 누르면 저장소가 바뀌지 않습니다.
- **Covers**: [F2-AC3]
- **Files**: [src/components/contract/DeleteContractButton.tsx, src/components/contract/DeleteContractButton.test.tsx]
- **Depends on**: Task 1.11

### Task 3.4 계약 입력 화면 (`/contracts/new`, `/contracts/:id/edit`)
- **Description**: `src/pages/ContractFormPage.tsx`
  - `useParams().id`가 있으면 수정 모드입니다.
  - PageShell: Top "갱신체크", 부제 "계약 등록" 또는 "계약 수정"
  - 수정 모드 상태별 화면
    - 스토어가 loading이면 `<ContractForm disabled loading/>`
    - 계약이 없으면 Asset.ContentIcon, "계약을 찾을 수 없어요", Button("목록으로") → `navigate('/', {replace:true})`
    - 계약이 있으면 `<ContractForm initial/>`과 `<DeleteContractButton/>`
  - onSubmit에서 `upsert`를 부릅니다.
    - limit이면 "계약은 최대 20건까지 등록할 수 있어요" 토스트
    - quota이면 화면에 머문 채 "저장 공간이 부족해 저장하지 못했어요" 토스트
    - 성공하면 `navigate(paths.contract(id), {replace:true, state:{justSaved:true} satisfies RouteState['/contracts/:id']})`
- **DoD** (`ContractFormPage.test.tsx`, MemoryRouter와 ContractsProvider 사용)
  - F2-AC1: 저장하면 1건이 저장되고, 경로는 `/contracts/{id}`, state는 `{justSaved:true}`입니다.
  - F2-AC2: 보증금 180000000으로 수정하면 건수는 1건 그대로이고 deposit이 바뀝니다.
  - F2-AC6: 20건 mock이면 limit 토스트, quota mock이면 quota 토스트가 뜨고 경로는 그대로입니다.
  - F2-AC7: `/contracts/abc/edit`이면 폼 input이 0개이고 "계약을 찾을 수 없어요"가 보입니다. "목록으로"를 누르면 '/'로 이동합니다.
  - 수정 모드 loading 상태에서 input이 disabled입니다.
- **Covers**: [F2-AC1, F2-AC2, F2-AC3, F2-AC6, F2-AC7]
- **Files**: [src/pages/ContractFormPage.tsx, src/pages/ContractFormPage.test.tsx]
- **Depends on**: Task 3.2, Task 3.3

### Task 3.5 홈 화면 (`/`) — 광고 배치 포함
- **Description**: `src/pages/HomePage.tsx`
  - state 받기
    - `const state = (useLocation().state as RouteState['/']) ?? null;`
    - `typeof state?.toast === 'string' && state.toast !== ''`일 때만 토스트를 띄웁니다.
    - state가 있으면 토스트 여부와 관계없이 `navigate('.', {replace:true, state:null})`로 비웁니다.
  - 상태별 화면
    - loading: `home-loading`, 스켈레톤 ListRow 3개
    - error: `home-error`, "계약을 불러오지 못했어요. 잠시 후 다시 시도해주세요", "다시 시도" → `reload()`
    - ready이고 0건: `home-empty`, Asset.ContentIcon, "만기일만 넣으면 갱신 요구 마감일을 알려드려요", "첫 계약 등록하기"
    - ready이고 1건 이상: `sortContracts` 순서로 ListRow 표시
  - ListRow 내용
    - 메인: nickname
    - 서브: "만기 {endDate} · 보증금 {formatKRW}"
    - 오른쪽: Badge(요구 가능/시작 전/기간 지남/만기 지남)와 D-day("마감 D-n"/"시작 D-n"/"-")
    - 행 높이는 56px 이상입니다.
  - 행을 누르면 `logClick('home_contract_open')` 후 상세로 이동합니다.
  - "계약 추가"(SubmitFooter)를 누르면 `logClick('home_add_contract')` 후 `/contracts/new`로 이동합니다.
  - recovered이면 `consumeRecovered()`를 부르고 "저장된 계약을 불러오지 못해 초기화했어요" 토스트를 띄웁니다.
  - 광고: ready이고 1건 이상일 때만 마지막 행 아래에 `Spacing(size=24)`와 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`를 둡니다.
- **DoD** (`HomePage.test.tsx`)
  - F3-AC1: 행 순서와 문구가 SPEC과 일치합니다.
  - F3-AC2: 행을 누르면 경로가 `/contracts/{id}`이고 logClick이 1회 호출됩니다. "계약 추가"는 `/contracts/new`로 갑니다.
  - F3-AC3: home-empty가 보이고 AdSlot은 0개입니다.
  - F3-AC4: 첫 렌더에 home-loading이 보이고 빈 상태 문구는 없습니다.
  - F3-AC5: 토스트가 1회만 뜨고 리렌더해도 다시 뜨지 않습니다.
  - F3-AC8
    - 예외 mock이면 home-error가 보이고 AdSlot은 0개입니다.
    - "다시 시도"를 누르면 loadContracts가 1회 더 호출됩니다.
    - toast가 `123`이나 `''`이면 토스트가 뜨지 않습니다.
  - 1건 이상이면 AdSlot이 1개입니다.
  - **state 없이 '/'로 들어와도 크래시하지 않습니다.**
- **Covers**: [F3-AC1, F3-AC2, F3-AC3, F3-AC4, F3-AC5, F3-AC8]
- **Files**: [src/pages/HomePage.tsx, src/pages/HomePage.test.tsx]
- **Depends on**: Task 1.4, Task 1.11

### Task 3.6 결과 무료 층 컴포넌트
- **Description**
  - `src/hooks/useImpressionOnce.ts`: IntersectionObserver로 처음 보일 때 1회 호출합니다. IntersectionObserver가 없는 환경이면 마운트할 때 1회 호출합니다.
  - `src/components/result/FreeTier.tsx`(`data-testid="free-tier"`). props는 `{contract, today}`입니다.
    - 첫 줄: Paragraph.Text(t3)로 nickname을 표시합니다.
    - SummaryHero: status에 맞는 문구와 CountUp "D-n". open일 때 서브 문구는 "{deadline}까지 집주인에게 도달해야 해요"입니다.
    - `renewal-timeline` Card
      - ListRow 3행(요구 시작, 요구 마감과 Badge "마감", 계약 만기)
      - MiniBar: start~deadline 구간에서 today의 비율. 0~1로 자릅니다.
      - 근거 문구
    - renewalRightUsed이면 경고 문구를 표시합니다.
    - `cap-card`
      - t2 크기로 최대 보증금, 서브 "지금보다 최대 …"
      - 월세가 0보다 크면 월세 행
      - 근거 "주택임대차보호법 제7조: 증액은 5% 이내"
    - `logImpression('result_free_tier')`는 useImpressionOnce로 1회만 호출합니다.
    - status가 open이나 upcoming이면 렌더 후 `requestReviewOnce()`를 호출합니다.
- **DoD** (`FreeTier.test.tsx`)
  - F4-AC1: 문자열 5개가 모두 보입니다.
  - F4-AC2: timeline과 cap-card가 각 1개이고, 첫 텍스트가 "망원동 투룸"입니다.
  - F4-AC3: upcoming 문구, "D-24", 날짜 2개가 보입니다.
  - F4-AC4: closed 문구가 보이고 cap-card가 있으며 requestReviewOnce는 호출되지 않습니다.
  - F4-AC5: 월세 행이 0개입니다.
  - F4-AC6: 경고 문구가 DOM 순서상 cap-card보다 앞에 있습니다.
  - F4-AC8: 리렌더해도 logImpression은 1회입니다.
- **Covers**: [F4-AC1, F4-AC2, F4-AC3, F4-AC4, F4-AC5, F4-AC6, F4-AC8]
- **Files**: [src/hooks/useImpressionOnce.ts, src/components/result/FreeTier.tsx, src/components/result/FreeTier.test.tsx]
- **Depends on**: Task 1.4, Task 1.5

### Task 3.7 월세 전환 카드·기준금리 시트
- **Description**: `src/components/result/ConversionCard.tsx`(`data-testid="conversion-card"`), `src/components/result/BaseRateSheet.tsx`
  - 입력: MoneyField("월세로 바꿀 보증금(원)")와 Button("계산하기", display="block"). 누르면 `logClick('conversion_calc')`를 호출합니다.
  - 계산 전: "바꿀 금액을 넣으면 법정 상한 월세를 계산해요"
  - 계산 후: 결과 ListRow 3행
  - ListRow "적용 전환율 {r}% · 기준금리 {b.toFixed(2)}% ({asOf} 확인)"와 "수정" 버튼(44×44px 이상). "수정"을 누르면 BottomSheet가 열립니다.
  - BottomSheet 저장
    - 성공: 시트를 닫고, 문구를 갱신하고, 마지막 입력 금액으로 다시 계산합니다.
    - quota: 시트와 입력값을 그대로 두고 "저장 공간이 부족해 기준금리를 저장하지 못했어요" 토스트를 띄웁니다.
  - deposit이 0이면 입력과 버튼을 disabled로 두고 "보증금이 없어 월세 전환 계산을 할 수 없어요"를 표시합니다.
  - 근거 Paragraph.Text를 표시합니다.
- **DoD** (`ConversionCard.test.tsx`)
  - F5-AC1~AC2의 문구가 일치합니다.
  - F5-AC3: 저장소 값이 `{3.25,'2026-10-06'}`이고, 시트가 닫히며, "적용 전환율 5.25% · 기준금리 3.25%"가 보이고 다시 계산됩니다.
  - F5-AC4~AC5: 에러가 표시되고 결과 행은 0개이며 settings는 그대로입니다.
  - F5-AC6: disabled 상태이고 안내 문구가 보입니다.
  - F5-AC7: 빈 상태 문구가 보입니다.
  - F5-AC8: 시트가 열린 채이고, input 값 "3.25"가 그대로이며, 토스트가 뜨고, "4.5% · 기준금리 2.50%"가 유지됩니다.
- **Covers**: [F5-AC1, F5-AC2, F5-AC3, F5-AC4, F5-AC5, F5-AC6, F5-AC7, F5-AC8]
- **Files**: [src/components/result/ConversionCard.tsx, src/components/result/BaseRateSheet.tsx, src/components/result/ConversionCard.test.tsx]
- **Depends on**: Task 1.9, Task 1.12, Task 3.1

### Task 3.8 심화 층 컴포넌트 — 시나리오 비교·협상 체크리스트
- **Description**: `src/components/result/LockedTier.tsx`(`data-testid="locked-tier"`)
  - 이 컴포넌트는 광고 게이트를 모릅니다. 게이트로 감싸는 일은 3.9에서 합니다.
  - 시나리오 Card
    - deposit > 0이면 `scenario-row` 4행: "전환 {p}% · 보증금 {…} · 월세 상한 {…} · 연 {…}"과 MiniBar
    - deposit이 0이면 "보증금이 없어 전환 시나리오가 없어요"
  - 체크리스트 Card: `checklist-item` 8행
    - title의 `{마감일}`을 deadlineDate로 바꿉니다.
    - 서브 텍스트에 source를 표시합니다.
    - 오른쪽에 Switch를 둡니다. 행 전체가 탭 영역입니다.
  - Switch를 누르면 `toggle`을 부릅니다. 실패하면 Switch를 되돌리고 "저장 공간이 부족해 체크를 저장하지 못했어요" 토스트를 띄웁니다.
  - 처음 보일 때 `logImpression('locked_tier')`를 호출합니다(useImpressionOnce).
- **DoD** (`LockedTier.test.tsx`)
  - F7-AC3: 4행 문구가 SPEC과 일치합니다.
  - F7-AC2: scenario-row 4개, checklist-item 8개입니다.
  - F7-AC4: Switch를 켜면 저장소에 반영되고, 다시 마운트해도 켜져 있습니다. 출처 서브 텍스트가 보입니다.
  - F7-AC6: 안내 문구가 보이고 scenario-row 0개, checklist-item 8개입니다.
  - F7-AC7: quota mock이면 Switch가 꺼진 상태이고 토스트가 뜹니다.
- **Covers**: [F7-AC2, F7-AC3, F7-AC4, F7-AC6, F7-AC7]
- **Files**: [src/components/result/LockedTier.tsx, src/components/result/LockedTier.test.tsx]
- **Depends on**: Task 1.2, Task 1.4, Task 1.5, Task 1.12, Task 3.6

### Task 3.9 결과 화면 (`/contracts/:id`) — 조립·리워드 게이트·배너
- **Description**: `src/pages/ResultPage.tsx`
  - state 받기
    - `const state = (useLocation().state as RouteState['/contracts/:id']) ?? null;`
    - `state?.justSaved === true`이면 "계약을 저장했어요" 토스트를 1회 띄우고 state를 비웁니다.
  - 상태별 화면
    - loading: `result-loading`, 스켈레톤 Card 2개
    - 계약이 없으면 `result-not-found`, "계약을 찾을 수 없어요", "목록으로" → `navigate('/', {replace:true})`. FreeTier를 렌더하지 않으므로 impression도 호출되지 않습니다.
  - 배치 순서
    1. `<FreeTier/>`
    2. `<ConversionCard/>`
    3. ListRow "집주인 인상 통보 점검하기" → `logClick('result_notice_check')` 후 notice 경로로 이동
    4. `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`로 `<LockedTier/>`만 감쌉니다.
       - 닫힌 상태의 안내 문구 "광고 보고 전환 시나리오 비교·협상 체크리스트 보기"는 템플릿 TossRewardAd가 받는 안내 문구 prop에 넣습니다. 그런 prop이 없으면 게이트 바로 위 Paragraph.Text로 둡니다.
       - 템플릿의 시청 시작 콜백에 `logClick('locked_tier_unlock')`을 연결합니다.
    5. Paragraph.Text "법률 자문이 아닌 참고용 계산이에요"
    6. `Spacing(size=24)`와 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`. 보일 때 `logImpression('ad_banner_result')`를 호출합니다.
  - SubmitFooter
    - "결과 공유하기": `logClick('result_share')` 후 `await shareApp()`. reject나 예외가 나면 "공유하지 못했어요. 잠시 후 다시 시도해주세요" 토스트
    - 보조 버튼 "계약 수정": edit 경로로 이동
- **DoD** (`ResultPage.test.tsx`)
  - 구조 테스트: TossRewardAd를 `<div data-testid="reward-gate">{children}</div>`로 mock합니다.
    - `free-tier`와 `conversion-card`에서 `.closest('[data-testid="reward-gate"]')`가 null입니다.
    - locked-tier는 reward-gate 안에 있습니다.
  - F7-AC5: AdSlot이 정확히 1개이고, DOM 순서상 locked-tier 뒤에 있으며, 세 블록 어디에도 들어 있지 않습니다.
  - 실제 컴포넌트와 `vi.stubEnv('VITE_TOSS_AD_SLOT_ID','')`로 테스트합니다.
    - F7-AC1: free-tier 안에 문자열 4개가 있습니다.
    - F7-AC2: 게이트가 자동으로 열려 scenario-row 4개, checklist-item 8개가 보입니다.
  - F4-AC7: not-found가 보이고 logImpression은 0회입니다.
  - F4-AC8: 공유를 누르면 logClick 다음에 shareApp이 호출되고, 각각 1회입니다.
  - F4-AC9: shareApp이 reject하면 토스트가 1회 뜨고 free-tier가 그대로 남습니다.
  - 참고용 고지 문구가 보입니다.
  - **state 없이 직접 들어와도 크래시하지 않고 결과를 렌더합니다.**
- **Covers**: [F4-AC1, F4-AC7, F4-AC8, F4-AC9, F7-AC1, F7-AC2, F7-AC5]
- **Files**: [src/pages/ResultPage.tsx, src/pages/ResultPage.test.tsx]
- **Depends on**: Task 1.11, Task 3.6, Task 3.7, Task 3.8

### Task 3.10 통보 입력 폼 컴포넌트
- **Description**: `src/components/notice/NoticeForm.tsx`
  - props: `{ contract; initial?: LandlordNotice; disabled?; loading?; today; onValid(n: Omit<LandlordNotice,'checkedAt'>): void }`
  - 구성
    - Tab 2개: "인상률로 입력" / "새 금액으로 입력"
    - DateField: 통보일
    - rate 탭: RateField 보증금·월세
    - amount 탭: MoneyField(allowSign) 보증금·월세
    - 월세가 0인 계약이면 월세 필드를 렌더하지 않습니다.
    - SubmitFooter "점검하기"
  - 제출하면 `logClick('notice_check_submit')`를 부르고 `validateNoticeForm`을 실행합니다.
    - 실패하면 필드별로 `hasError`/`help`를 표시합니다.
    - 성공하면 `onValid`를 호출합니다.
  - 복원: `initial`이 있으면 `inputMode` 탭을 선택하고 값을 미리 채웁니다.
    - amount 모드: 새 금액을 그대로 넣습니다.
    - rate 모드: `(new−old)/old×100`을 소수 둘째 자리로 반올림해 넣습니다.
- **DoD** (`NoticeForm.test.tsx`)
  - F6-AC5: 각 입력의 에러 문구가 해당 필드의 help로 보이고, onValid는 호출되지 않습니다.
  - 월세가 0인 계약이면 월세 필드가 0개입니다.
  - F6-AC6: amount initial을 넣으면 "새 금액으로 입력" 탭이 aria-selected이고 input 값이 복원됩니다.
  - F6-AC2: rate 탭에서 4와 5를 넣으면 onValid가 `{newDeposit:208000000, newMonthlyRent:525000, inputMode:'rate'}`를 포함해 호출됩니다.
- **Covers**: [F6-AC2, F6-AC5, F6-AC6]
- **Files**: [src/components/notice/NoticeForm.tsx, src/components/notice/NoticeForm.test.tsx]
- **Depends on**: Task 1.10, Task 3.1

### Task 3.11 통보 점검 결과 카드 컴포넌트
- **Description**: `src/components/notice/NoticeResultCard.tsx`(`data-testid="notice-result"`)
  - props: `{ contract; check: NoticeCheck }`
  - Badge: "상한 초과" / "상한 이내"
  - ListRow "보증금 {rate.toFixed(2)}% 인상 · {formatKRW(over)} 초과". 초과액이 0이면 "초과 없음"으로 표시합니다. 월세 행도 같은 방식입니다.
  - 통보 시기 ListRow
    - in_period: "집주인 통지 기간 안에 받은 통보예요"
    - after_period: "집주인 통지 기간(만기 6개월~2개월 전)이 지난 뒤 받은 통보예요 · 주택임대차보호법 제6조 제1항"
    - before_period: "집주인 통지 기간 전에 받은 통보예요"
  - withinOneYear가 true일 때만 "최근 증액({date}) 후 1년이 지나지 않았어요 · 제7조 제1항: 증액 후 1년 이내 재증액 불가" 행을 표시합니다.
  - 근거 Paragraph.Text를 표시합니다.
  - 처음 보일 때 `logImpression('notice_result')`를 호출합니다(useImpressionOnce).
- **DoD** (`NoticeResultCard.test.tsx`)
  - F6-AC1: 문구 4개가 보입니다.
  - F6-AC2: "상한 이내", "4.00%", "5.00%", "초과 없음"이 보입니다.
  - F6-AC3: after 문구와 before 문구가 각 케이스에서 보입니다.
  - F6-AC4: 1년 행이 보이고, lastIncreaseDate가 없으면 0건입니다.
- **Covers**: [F6-AC1, F6-AC2, F6-AC3, F6-AC4]
- **Files**: [src/components/notice/NoticeResultCard.tsx, src/components/notice/NoticeResultCard.test.tsx]
- **Depends on**: Task 1.6, Task 3.6

### Task 3.12 통보 점검 화면 (`/contracts/:id/notice`)
- **Description**: `src/pages/NoticePage.tsx`
  - PageShell: Top "갱신체크", 부제 "{nickname} 인상 통보 점검". Top 뒤로가기는 `navigate(-1)`입니다.
  - 상태별 화면
    - loading: `<NoticeForm disabled loading/>`
    - 계약이 없으면 `notice-not-found`, Asset.ContentIcon, "계약을 찾을 수 없어요", "목록으로" → `navigate('/', {replace:true})`. Tab, TextField, "점검하기"는 렌더하지 않습니다.
  - onValid에서 다음 순서로 처리합니다.
    1. `computeRenewalWindow`와 `computeNoticeCheck`로 결과를 구해 `<NoticeResultCard/>`를 렌더합니다.
    2. `upsert({...contract, notice:{...n, checkedAt}})`로 저장합니다. quota면 결과는 그대로 보여 주고 "저장 공간이 부족해 점검 내용을 저장하지 못했어요" 토스트를 띄웁니다.
    3. 결과가 나온 뒤 `requestReviewOnce()`를 호출합니다.
  - 진입할 때
    - `contract.notice`가 있으면 `initial`로 넘기고, 결과 카드도 바로 계산해 렌더합니다.
    - 없으면 "통보 받은 내용을 넣으면 5% 상한 초과 여부를 알려드려요"를 표시합니다.
- **DoD** (`NoticePage.test.tsx`)
  - F6-AC1: 점검하면 저장된 notice가 `{noticeDate:'2026-12-20', newDeposit:216000000, newMonthlyRent:550000, inputMode:'amount'}`입니다.
  - F6-AC6: 다시 들어오면 탭, 입력값, notice-result가 복원됩니다. notice가 없는 계약이면 빈 상태 문구가 보입니다.
  - F6-AC7: quota mock이면 notice-result가 보이고 토스트가 뜹니다.
  - F6-AC8: `/contracts/zzz/notice`이면 not-found가 보이고 tab, input, 점검하기가 0개입니다. "목록으로"를 누르면 '/'로 가고, logClick, logImpression, requestReviewOnce는 모두 0회입니다.
  - 결과가 나오면 requestReviewOnce가 1회 호출됩니다.
- **Covers**: [F6-AC1, F6-AC6, F6-AC7, F6-AC8]
- **Files**: [src/pages/NoticePage.tsx, src/pages/NoticePage.test.tsx]
- **Depends on**: Task 1.11, Task 3.10, Task 3.11

---

## Epic 4. Integration + Landing

**Risk**
- **Complexity**: Medium
- **Risk factors**
  - 라우트 연결이 빠지면 화면에 들어갈 수 없습니다.
  - 검수 금지 항목(HEX 색상, 외부 이동, 설치 유도, es2017에서 지원하지 않는 API, 금지 UI 라이브러리)이 섞일 수 있습니다.
  - 광고 ID는 빌드할 때 주입되므로 값이 바뀌면 다시 빌드해야 합니다.
- **Mitigation**
  - 4.1에서 모든 경로와 직접 진입을 테스트합니다.
  - 4.2에서 grep 스크립트로 금지 항목이 0건인지 기계적으로 검사합니다.
  - 4.3의 E2E로 Value AC를 전체 흐름에서 검증합니다.

### Task 4.1 라우팅 연결
- **Description**: `src/App.tsx`
  - 앱 전체를 `<ContractsProvider>`로 감쌉니다.
  - 경로
    - `/` → HomePage
    - `/contracts/new` → ContractFormPage
    - `/contracts/:id/edit` → ContractFormPage
    - `/contracts/:id/notice` → NoticePage
    - `/contracts/:id` → ResultPage
    - 그 밖의 경로 → `<Navigate to="/" replace />`
- **DoD** (`App.routes.test.tsx`)
  - 각 경로에 들어가면 해당 페이지의 고유 텍스트나 testid가 렌더됩니다.
  - `/unknown`은 홈으로 갑니다.
  - `/contracts/x`에 state 없이 들어와도 크래시하지 않습니다.
  - 결과 화면에서 "목록으로"(F4-AC7)와 수정 화면의 "목록으로"(F2-AC7)를 누르면 홈이 렌더됩니다.
  - `npm run build`가 통과합니다.
- **Covers**: [F2-AC7, F4-AC7]
- **Files**: [src/App.tsx, src/App.routes.test.tsx]
- **Depends on**: Task 3.4, Task 3.5, Task 3.9, Task 3.12

### Task 4.2 검수 컴플라이언스 점검
- **Description**
  - `vite.config.ts`에 `build.target = 'es2017'`을 설정합니다. 이 파일은 이 Task만 수정합니다.
  - `scripts/check-compliance.mjs`를 만들어 `node scripts/check-compliance.mjs`로 실행합니다. package.json은 수정하지 않습니다.
    - `src/` 안에서 다음 항목이 각각 0건이어야 합니다. 하나라도 있으면 exit 1입니다.
      - HEX `#[0-9a-fA-F]{3,8}\b`
      - "앱을 설치하세요", "다운로드"
      - `window.open`, `window.location.href`
      - GA·Amplitude import
      - `.at(`, `structuredClone`
      - `type="date"`
      - shadcn·@mui·antd·@chakra-ui import
  - 키보드 통합 테스트 `ContractFormPage.keyboard.test.tsx`
    - 만기일에 포커스하면 scrollIntoView가 호출됩니다.
    - SubmitFooter의 "저장"이 렌더됩니다.
    - 금액 input의 inputmode가 numeric입니다.
- **DoD**
  - 스크립트가 exit 0입니다.
  - 임시 파일에 `#fff`를 넣으면 exit 1이 되는 것을 확인한 뒤 그 파일을 지웁니다.
  - `vite.config`의 target이 'es2017'입니다.
  - 키보드 테스트가 통과합니다.
- **Covers**: [F3-AC6, F3-AC7, F2-AC8]
- **Files**: [vite.config.ts, scripts/check-compliance.mjs, src/pages/ContractFormPage.keyboard.test.tsx]
- **Depends on**: Task 4.1

### Task 4.3 전체 흐름 E2E (Value AC)
- **Description**: `src/e2e/flow.test.tsx`에서 `<App/>`을 MemoryRouter로 렌더합니다. today는 2026-10-06이고, `console.error`에 spy를 겁니다.
  1. 홈 빈 상태에서 "첫 계약 등록하기"를 누릅니다.
  2. F2-AC1 값과 월세 500000을 입력하고 저장합니다.
  3. 결과 화면에서 "계약을 저장했어요" 토스트와 F4-AC1 값을 확인합니다.
  4. 통보 점검 화면에서 F6-AC1 값을 입력하고 "상한 초과"를 확인합니다.
  5. 홈에서 목록 1행을 확인합니다.
- **DoD**
  - 모든 단계의 assert가 통과합니다.
  - 흐름 전체에서 `console.error`가 0회입니다.
  - free-tier에 "D-117", "요구 마감 2027-01-31", "2억 1,000만원", "52만 5,000원"이 있습니다(Value AC F4-AC-1).
- **Covers**: [F4-AC1, F2-AC1, F3-AC7, F6-AC1]
- **Files**: [src/e2e/flow.test.tsx]
- **Depends on**: Task 4.2

---

## 파일 소유권 점검 (한 파일 = 한 Task)
| 파일 | Task |
|---|---|
| src/lib/storage.ts | 1.7 |
| src/lib/settingsStorage.ts | 1.8 |
| src/lib/validation.ts | 1.9 |
| src/lib/noticeValidation.ts | 1.10 |
| src/pages/ContractFormPage.tsx | 3.4 |
| src/pages/HomePage.tsx | 3.5 |
| src/pages/ResultPage.tsx | 3.9 |
| src/pages/NoticePage.tsx | 3.12 |
| package.json | 1.2 |
| vite.config.ts | 4.2 |
| src/App.tsx | 4.1 |

이 밖의 소스·테스트 파일도 모두 한 Task의 Files에만 나옵니다.

---

## 구현 중 확인 필요 (SPEC 미정 — 지어내지 않고 남김)
1. **기존 보증금·월세가 0원일 때 통보 점검 문구**: `depositRatePercent = null`일 때 보여 줄 ListRow 문구가 SPEC에 없습니다. 구현할 때는 초과액만 표시하고, 문구는 SPEC 작성자에게 확인해야 합니다.
2. **시나리오의 "월세 상한" 정의**: 이 문서는 F5의 "전환 후 월세 상한"과 같은 뜻인 "기존 월세 + 추가 상한"으로 정의했습니다. F7-AC3은 월세 0원 계약만 검증하므로 두 해석의 결과가 같습니다. 월세가 있는 계약에서 어느 쪽을 의도했는지 확인이 필요합니다.
3. **TossRewardAd의 안내 문구·시청 콜백 prop 이름**: 템플릿 시그니처를 확인한 뒤 Task 3.9에서 연결합니다. 해당 prop이 없으면 게이트 바로 위 Paragraph.Text로 대신합니다.
4. **Open Questions 1~6**은 SPEC 그대로 유지합니다. 특히 `DEFAULT_BASE_RATE`는 출시 전에 한국은행 공시값으로 확인해야 합니다.

---

## AC Coverage
- Total ACs in SPEC: **57** (F1 9 · F2 8 · F3 8 · F4 9 · F5 8 · F6 8 · F7 7)
- Covered by tasks: **57**
  - **F1**
    - F1-AC1 (1.4), F1-AC2 (1.3, 1.4), F1-AC3 (1.5), F1-AC4 (1.5)
    - F1-AC5 (1.7), F1-AC6 (1.7), F1-AC7 (1.7, 1.8), F1-AC8 (1.3, 1.4, 1.8), F1-AC9 (1.7, 1.8)
  - **F2**
    - F2-AC1 (3.1, 3.4, 4.3), F2-AC2 (3.4), F2-AC3 (1.11, 3.3, 3.4), F2-AC4 (1.9, 3.2)
    - F2-AC5 (1.9, 3.2), F2-AC6 (1.7, 1.11, 3.4), F2-AC7 (3.4, 4.1), F2-AC8 (3.1, 3.2, 4.2)
  - **F3**
    - F3-AC1 (1.4, 3.5), F3-AC2 (3.5), F3-AC3 (3.5), F3-AC4 (1.11, 3.5)
    - F3-AC5 (1.11, 3.5), F3-AC6 (4.2), F3-AC7 (4.2, 4.3), F3-AC8 (1.11, 3.5)
  - **F4**
    - F4-AC1 (3.6, 3.9, 4.3), F4-AC2 (3.6), F4-AC3 (3.6), F4-AC4 (3.6), F4-AC5 (3.6)
    - F4-AC6 (3.6), F4-AC7 (3.9, 4.1), F4-AC8 (3.6, 3.9), F4-AC9 (3.9)
  - **F5**
    - F5-AC1 (1.5, 3.7), F5-AC2 (1.5, 3.7), F5-AC3 (1.12, 3.7), F5-AC4 (1.9, 3.7)
    - F5-AC5 (1.9, 3.7), F5-AC6 (3.7), F5-AC7 (3.7), F5-AC8 (1.12, 3.7)
  - **F6**
    - F6-AC1 (1.6, 3.11, 3.12, 4.3), F6-AC2 (1.6, 3.10, 3.11), F6-AC3 (1.4, 1.6, 3.11), F6-AC4 (1.4, 1.6, 3.11)
    - F6-AC5 (1.10, 3.10), F6-AC6 (3.10, 3.12), F6-AC7 (3.12), F6-AC8 (3.12)
  - **F7**
    - F7-AC1 (3.9), F7-AC2 (3.8, 3.9), F7-AC3 (1.5, 3.8), F7-AC4 (1.2, 1.12, 3.8)
    - F7-AC5 (3.9), F7-AC6 (3.8), F7-AC7 (1.12, 3.8)
- Uncovered: **0**

---

참고: 이 세션의 claude.ai Canva 커넥터는 인증되지 않아 쓸 수 없습니다. 이번 작업에는 필요하지 않았습니다. 나중에 쓰려면 claude.ai 커넥터 설정에서 먼저 인증해야 합니다.
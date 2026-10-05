# SPEC — RenewWindow
앱 이름: 갱신체크 / RenewWindow

## Value Contract
- 결과: 이 앱을 쓰고 나면 사용자는 갱신 요구 통보를 보낼 마감일과 5% 상한을 적용한 최대 보증금·월세를 안다.
- 바뀌는 행동: 사용자는 집주인의 인상 통보를 그대로 받아들이지 않는다. 5%를 넘는 금액을 원 단위로 짚어 수정을 요구하거나, 마감일 전에 갱신 요구 통보를 보낸다.
- 매번 얻는 결과물: 갱신 요구 가능 기간 타임라인(시작일·마감일·D-day)과 상한 적용 후 보증금·월세 금액 카드
- 앱이 더하는 것: 주택임대차보호법 제6조의3 제1항(만기 6개월 전~2개월 전)에 따른 기간 역산(월말 보정 포함), 제7조 제2항의 5% 증액 상한 적용, 제7조의2와 같은 법 시행령 제9조에 따른 월차임 전환율 상한 min(연 10%, 한국은행 기준금리 + 연 2%p)으로 월세 환산, 제6조 제1항의 임대인 통지 기간(만기 6개월~2개월 전)과 비교한 집주인 통보일 점검
- 앱 없이: 달력으로 만기일에서 6개월·2개월을 거꾸로 세고, 법령 검색으로 전환율 조문과 현재 기준금리를 찾은 뒤 계산기로 5%와 전환 월세를 계산한다. 약 10~15분 걸린다.
- Value AC: F4-AC-1

## Common Principles
- 기술 스택: Vite + React + TypeScript, `@toss/tds-mobile`(TDS), react-router-dom, localStorage. 서버·외부 API·생성형 AI는 쓰지 않는다. AI 고지 의무는 해당되지 않는다.
- 모든 화면의 Top title은 "갱신체크"(글자·띄어쓰기 그대로)다. 화면별 부제목도 한국어로 쓴다.
- 화면 골격은 템플릿의 ScreenScaffold(PageShell)로 감싼다. raw div로 골격을 만들지 않는다. 1차 액션은 SubmitFooter(하단 고정) 또는 `display="block"` Button으로 둔다.
- 간격은 TDS Spacing(size 필수)으로만 조절한다. TDS 컴포넌트의 padding·margin을 인라인 스타일이나 Tailwind로 덮어쓰지 않는다. 커스텀 CSS는 flex·grid 배치에만 쓴다.
- 색상은 `var(--adaptive*)` CSS 변수(예: `var(--adaptiveGrey600)`) 또는 TDS 컴포넌트 기본값만 쓴다. HEX 하드코딩은 금지한다. 다크모드를 지원한다.
- 모든 터치 요소의 최소 크기는 44×44px다.
- 금액 입력 TextField는 `inputMode="numeric"`으로 두고, 입력할 때 천 단위 콤마를 자동으로 넣는다. 날짜 입력 TextField는 `inputMode="numeric"`으로 두고, 8자리 숫자를 입력하면 `YYYY-MM-DD`로 자동 하이픈 처리한다. Android 7 WebView 호환을 위해 `type="date"`는 쓰지 않는다.
- 모바일 키보드: 포커스된 TextField는 `scrollIntoView({ block: 'center' })`로 보이게 한다. SubmitFooter는 키보드 위에 붙는다. 마지막 필드에서 Enter를 누르면 제출한다.
- 날짜 계산은 모두 로컬 타임존 기준의 `YYYY-MM-DD` 문자열로 하고, `today`는 함수 인자로 받아 테스트에서 주입한다.
- 금액은 원 단위 정수다. 계산 결과는 `Math.floor`로 원 미만을 버린다.
- 금액 표기는 `formatKRW`를 쓴다. 예: 210000000 → "2억 1,000만원", 525000 → "52만 5,000원", 187500 → "18만 7,500원", 0 → "0원"
- 법령 근거는 화면에 텍스트로만 표기한다(예: "주택임대차보호법 제7조"). 외부 웹 링크는 넣지 않는다.
- 광고: 배너는 템플릿의 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`, 리워드 게이트는 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`를 쓴다. 두 ID는 빌드 시점에 주입되므로 값이 바뀌면 재빌드·재배포해야 한다. 슬롯 ID가 없으면 게이트가 자동으로 열린다(fail-open).
- 계측: 화면 진입·체류 로그는 PageShell이 자동으로 남기므로 화면 정의에 쓰지 않는다. 전환 지점에만 `logClick`/`logImpression`을 단다. 외부 분석 솔루션(GA, Amplitude 등)은 쓰지 않는다.
- 인앱 결제(TossPurchase)와 프로모션 리워드(grantPromotionReward)는 이 앱에서 쓰지 않는다.

## Data Models

### Contract — 사용자가 등록한 임대차 계약 1건
```ts
interface Contract {
  id: string;                 // crypto.randomUUID() 미지원 시 Date.now().toString(36)+Math.random().toString(36).slice(2,8)
  nickname: string;           // 사용자가 붙인 계약 이름, trim 후 1~20자 (예: "망원동 투룸")
  endDate: string;            // 계약 만기일 'YYYY-MM-DD', 오늘 이후 ~ 오늘+5년 이내
  deposit: number;            // 현재 보증금(원), 0 ~ 10,000,000,000
  monthlyRent: number;        // 현재 월세(원), 0 ~ 10,000,000 (0이면 전세)
  renewalRightUsed: boolean;  // 이 집에서 계약갱신요구권을 이미 1회 썼는지 (기본 false)
  lastIncreaseDate?: string;  // 최근 보증금·월세가 오른 날짜 'YYYY-MM-DD' (선택). 오늘 또는 오늘 이전만 허용, 빈 값이면 필드를 저장하지 않음
  notice?: LandlordNotice;    // 집주인 통보 점검 내용 (F6에서 저장)
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601
}
```
- 제약: `deposit + monthlyRent > 0`, 최대 20건
- 전세/월세 여부는 따로 저장하지 않고 `monthlyRent > 0`으로 판단한다.

### LandlordNotice — 집주인 인상 통보
```ts
interface LandlordNotice {
  noticeDate: string;     // 통보 받은 날 'YYYY-MM-DD', 오늘 이전 또는 오늘
  newDeposit: number;     // 통보된 새 보증금(원), 0 ~ 10,000,000,000 (Contract.deposit과 같은 범위)
  newMonthlyRent: number; // 통보된 새 월세(원), 0 ~ 10,000,000 (Contract.monthlyRent와 같은 범위). 월세 0원 계약은 입력 필드가 없으므로 0으로 저장
  inputMode: 'rate' | 'amount'; // 입력 방식 UI 복원용 (인상률 / 새 금액)
  checkedAt: string;      // ISO 8601
}
```

### Settings — 전환율 계산 기준
```ts
interface Settings {
  baseRatePercent: number; // 한국은행 기준금리(%), 0.00 ~ 10.00, 소수 둘째 자리까지
  baseRateAsOf: string;    // 사용자가 확인·수정한 날 'YYYY-MM-DD'
}
```
- 기본값: `{ baseRatePercent: DEFAULT_BASE_RATE, baseRateAsOf: DEFAULT_BASE_RATE_AS_OF }`. 두 상수는 `src/constants/law.ts`에 둔다. 출시할 때 실제 기준금리로 확인해야 한다(Open Questions 2).

### ChecklistState — 협상 체크리스트 확인 여부
```ts
type ChecklistState = Record<string /* contractId */, string[] /* 체크한 항목 id */>;
```
- 체크리스트 항목은 앱이 제공하는 법령 근거 목록(`CHECKLIST_ITEMS: { id: string; title: string; source: string }[]`)이다. 법정 규정이라 닫힌 집합으로 둬도 된다.

### 계산 결과 타입 (저장하지 않음)
```ts
type WindowStatus = 'upcoming' | 'open' | 'closed' | 'expired'; // 계산 결과 상태(사용자 분류 아님)
interface RenewalWindow {
  startDate: string;     // endDate - 6개월 (월말 보정)
  deadlineDate: string;  // endDate - 2개월 (월말 보정)
  endDate: string;
  status: WindowStatus;  // today<start: upcoming / start≤today≤deadline: open / deadline<today≤end: closed / today>end: expired
  daysToStart: number;   // start - today (일)
  daysToDeadline: number;
  daysToEnd: number;
}
interface CapResult { maxDeposit: number; maxMonthlyRent: number; depositIncrease: number; rentIncrease: number; }
interface NoticeCheck {
  depositRatePercent: number | null; // 소수 둘째 자리 반올림, 기존 보증금 0이면 null
  rentRatePercent: number | null;    // 기존 월세 0이면 null
  depositOver: number;               // 상한 초과액(원), 초과 없으면 0
  rentOver: number;
  isOverCap: boolean;
  noticeTiming: 'before_period' | 'in_period' | 'after_period'; // 임대인 통지 기간(제6조 제1항) 대비
  withinOneYearOfIncrease: boolean;  // lastIncreaseDate로부터 1년 미만이면 true (제7조 제1항)
}
```

### localStorage 키·용량
| 키 | 형태 | 예상 크기 |
|---|---|---|
| `renewwindow:contracts:v1` | `Contract[]` | 건당 약 600B × 최대 20건 ≈ 12KB |
| `renewwindow:settings:v1` | `Settings` | 약 80B |
| `renewwindow:checklist:v1` | `ChecklistState` | 약 20건 × 200B ≈ 4KB |
| `renewwindow:contracts:corrupt` | 손상 원본 문자열 백업(1개) | 최대 12KB |
| `renewwindow:settings:corrupt` | 손상된 settings 원본 문자열 백업(1개) | 약 80B |
| `renewwindow:checklist:corrupt` | 손상된 checklist 원본 문자열 백업(1개) | 최대 4KB |
- 손상 판정: JSON 파싱 실패, 또는 파싱은 됐지만 스키마 검증에 실패한 경우(예: contracts가 배열이 아님, 필수 필드 누락·타입 불일치). 백업 키에는 마지막 손상 원본 1개만 덮어써서 저장한다.
- 합계 약 30KB 이하로, 5MB 한도를 크게 밑돈다.

## Feature List

### F1. 법정 기간·금액 계산 엔진 & 저장소 (데이터 계층)
- Description: 순수 함수로 계산 엔진을 만든다. 만기일로 갱신 요구 가능 기간과 상태를 계산하고, 5% 상한 금액, 법정 전환율 상한, 전환 월세를 계산한다. 계약·설정·체크리스트를 localStorage에 읽고 쓰는 저장소 모듈도 이 기능에 포함한다. UI는 포함하지 않는다(`src/lib/renewal.ts`, `src/lib/money.ts`, `src/lib/storage.ts`).
- Data: Contract, Settings, ChecklistState, RenewalWindow, CapResult
- API: 없음 (외부 API 호출 없음)
- 법령 상수(`src/constants/law.ts`): `RENEWAL_START_MONTHS = 6`(제6조의3 제1항), `RENEWAL_END_MONTHS = 2`(제6조의3 제1항), `INCREASE_CAP_PERCENT = 5`(제7조 제2항), `CONVERSION_CAP_PERCENT = 10`(제7조의2 제1호), `CONVERSION_SPREAD_PERCENT = 2`(시행령 제9조 제2항)
- Requirements:
- AC-1 [U][P0]: Scenario: 갱신 요구 가능 기간 계산 (기간 진행 중)
    Given today = "2026-10-06"
    When computeRenewalWindow("2027-03-31", "2026-10-06") 호출
    Then { startDate: "2026-09-30", deadlineDate: "2027-01-31", status: "open", daysToDeadline: 117 }를 반환
- AC-2 [U][P0]: Scenario: 월말 보정과 시작 전 상태
    Given today = "2026-10-06"
    When computeRenewalWindow("2027-04-30", "2026-10-06")와 computeRenewalWindow("2027-08-31", "2026-10-06") 호출
    Then 첫 번째는 { startDate: "2026-10-30", deadlineDate: "2027-02-28", status: "upcoming", daysToStart: 24 }를 반환
    And 두 번째는 { startDate: "2027-02-28", deadlineDate: "2027-06-30" }을 반환 (2월 30·31일 → 2월 말일로 보정)
    And computeRenewalWindow("2028-08-31", ...)의 startDate는 "2028-02-29" (윤년)
- AC-3 [U][P0]: Scenario: 5% 상한 금액 계산
    Given 보증금 200,000,000원, 월세 500,000원
    When computeCap(200000000, 500000) 호출
    Then { maxDeposit: 210000000, maxMonthlyRent: 525000, depositIncrease: 10000000, rentIncrease: 25000 }를 반환
    And computeCap(123456789, 333333)은 원 미만을 버려 { maxDeposit: 129629628, maxMonthlyRent: 349999 }를 반환
- AC-4 [U][P0]: Scenario: 법정 전환율 상한과 전환 월세
    Given 기준금리 2.50%
    When computeConversionRate(2.5)와 computeConversion(50000000, 4.5) 호출
    Then 전환율은 4.5 (min(10, 2.5+2))이고, 추가 월세 상한은 187500 (floor(50,000,000×4.5/100/12))
    And computeConversionRate(9.0)은 10 (10% 상한 적용)
- AC-5 [E][P0]: Scenario: 계약 저장·불러오기
    Given localStorage가 비어 있을 때
    When saveContract({ nickname: "망원동 투룸", endDate: "2027-03-31", deposit: 200000000, monthlyRent: 0, renewalRightUsed: false }) 호출
    Then `renewwindow:contracts:v1`에 id·createdAt·updatedAt이 채워진 1건이 저장되고 loadContracts()가 그 1건을 반환
    And 같은 id로 deposit: 180000000을 저장하면 건수는 1건으로 유지되고 deposit만 바뀌며 updatedAt이 갱신됨
- AC-6 [W][P1]: Scenario: 손상된 저장 데이터
    Given `renewwindow:contracts:v1` 값이 "{not json"일 때
    When loadContracts() 호출
    Then 빈 배열을 반환하고 원본 문자열을 `renewwindow:contracts:corrupt`에 백업
    And 반환 객체의 `recovered: true` 플래그로 UI가 "저장된 계약을 불러오지 못해 초기화했어요" 토스트를 띄울 수 있게 함
- AC-7 [W][P1]: Scenario: 저장 공간 부족
    Given localStorage.setItem이 QuotaExceededError를 던질 때
    When saveContract(...) 호출
    Then 예외를 던지지 않고 `{ ok: false, error: "quota" }`를 반환하며 기존 데이터는 그대로 유지됨
    And saveSettings(...)와 saveChecklist(...)도 같은 조건에서 예외를 던지지 않고 `{ ok: false, error: "quota" }`를 반환하며 기존 값은 그대로 유지됨
- AC-8 [W][P1]: Scenario: 잘못된 날짜·설정 기본값
    Given 저장된 settings가 없을 때
    When loadSettings() 호출
    Then { baseRatePercent: DEFAULT_BASE_RATE, baseRateAsOf: DEFAULT_BASE_RATE_AS_OF }를 반환
    And computeRenewalWindow("2027-02-30", ...)은 `{ error: "invalid_date" }`를 반환하고 예외를 던지지 않음
- AC-9 [W][P1]: Scenario: settings·checklist 손상과 계약 스키마 불일치
    Given `renewwindow:settings:v1` 값이 "{bad"이거나 `{ "baseRatePercent": "abc" }`(타입 불일치)일 때
    When loadSettings() 호출
    Then 예외를 던지지 않고 { baseRatePercent: DEFAULT_BASE_RATE, baseRateAsOf: DEFAULT_BASE_RATE_AS_OF }를 반환하며 원본 문자열을 `renewwindow:settings:corrupt`에 백업함
    And `renewwindow:checklist:v1` 값이 "[1,2"이거나 `{ "c1": "deliver_by_deadline" }`(값이 문자열 배열이 아님)이면 loadChecklist()는 `{}`를 반환하고 원본을 `renewwindow:checklist:corrupt`에 백업함
    And `renewwindow:contracts:v1` 값이 JSON으로 유효한 `{"id":"x"}`(배열 아님) 또는 `[{"id":"x","deposit":"많음"}]`(필드 타입 불일치)이면 loadContracts()는 AC-6과 같은 경로로 빈 배열과 `recovered: true`를 반환하고 원본을 `renewwindow:contracts:corrupt`에 백업함

### F2. 계약 입력·수정·삭제 화면
- Description: 계약 이름, 만기일, 현재 보증금·월세, 갱신요구권 사용 여부, 최근 증액일(선택)을 입력해 계약을 등록한다. 같은 화면에서 등록한 계약을 수정하고 삭제할 수 있다. 저장하면 바로 그 계약의 결과 화면으로 이동한다.
- Data: Contract
- API: 없음
- Screen: 계약 입력 — `/contracts/new`(등록), `/contracts/:id/edit`(수정)
  - Top title "갱신체크", 부제 "계약 등록" / "계약 수정"
  - TDS 컴포넌트: TextField 4개(계약 이름, 만기일 `YYYY-MM-DD`, 현재 보증금(원), 현재 월세(원)), TextField 1개(최근 증액일, 선택), ListRow + Switch("이 집에서 갱신요구권을 이미 썼어요"), Paragraph.Text(필드 아래 도움말: "만기일은 계약서의 계약기간 끝나는 날이에요"), SubmitFooter의 Button("저장", display="block"), 수정 모드에서는 Button("계약 삭제", 약한 강조) + AlertDialog(삭제 확인), Toast
  - 로딩: 수정 모드에서 계약을 읽기 전에는 TextField를 비활성화하고 SubmitFooter 버튼을 loading 상태로 둔다.
  - 빈 상태: 수정 모드에서 id에 해당하는 계약이 없으면 Asset.ContentIcon과 "계약을 찾을 수 없어요", Button("목록으로")을 보여 준다.
  - 에러: 필드별 TextField `hasError` + `help` 문구(아래 AC)
  - 터치: 모든 입력·버튼은 높이 44px 이상이다. Switch 행은 ListRow 전체가 탭 영역이다.
  - Navigation state contract:
    - Outgoing: 저장 → `navigate(\`/contracts/${id}\`, { replace: true, state: { justSaved: true } })`
    - Outgoing: 삭제 확인 → `navigate('/', { replace: true, state: { toast: '계약을 삭제했어요' } })`
    - Outgoing: "목록으로" → `navigate('/', { replace: true })`
    - Incoming: route param `id?: string`, `location.state = null`
  - Instrumentation contract: 저장 Button → `logClick('contract_save')`
- Requirements:
- AC-1 [E][P0]: Scenario: 계약 등록 성공
    Given 저장된 계약이 0건이고 /contracts/new에 있을 때
    When { 계약 이름: "망원동 투룸", 만기일: "20270331", 보증금: "200000000", 월세: "0" }을 입력하고 저장 탭
    Then 만기일 필드는 "2027-03-31", 보증금 필드는 "200,000,000"으로 표시되고
    And 계약 1건이 저장된 뒤 /contracts/{새 id}로 이동하며 "계약을 저장했어요" 토스트가 표시됨
- AC-2 [E][P0]: Scenario: 계약 수정
    Given "망원동 투룸"(보증금 200,000,000) 계약이 있을 때
    When /contracts/{id}/edit에서 보증금을 "180000000"으로 바꾸고 저장 탭
    Then 계약 건수는 1건으로 유지되고, 결과 화면의 5% 상한 보증금이 "1억 8,900만원"으로 표시됨
- AC-3 [E][P0]: Scenario: 계약 삭제
    Given "망원동 투룸" 계약이 있을 때
    When 수정 화면에서 "계약 삭제" 탭 → AlertDialog "망원동 투룸 계약을 삭제할까요?"에서 "삭제" 탭
    Then 계약과 그 계약의 체크리스트 상태(`renewwindow:checklist:v1`[id])가 지워지고 홈으로 이동해 "계약을 삭제했어요" 토스트가 표시됨
    And AlertDialog에서 "취소"를 탭하면 아무것도 지워지지 않음
- AC-4 [W][P1]: Scenario: 필수값·형식 오류
    Given /contracts/new에 있을 때
    When 계약 이름 "", 만기일 "2027-13-01", 보증금 "0", 월세 "0"으로 저장 탭
    Then 저장되지 않고 각 필드에 "계약 이름을 입력해주세요", "만기일을 YYYY-MM-DD 형식으로 입력해주세요", "보증금이나 월세 중 하나는 입력해주세요" 에러가 표시되며 첫 번째 에러 필드로 포커스가 이동함
    And 최근 증액일에 "2026-13-01" 또는 "2026-02-30"(존재하지 않는 날짜)이나 8자리 미만 숫자 "202603"을 입력하고 저장하면 저장되지 않고 최근 증액일 필드에 "최근 증액일을 YYYY-MM-DD 형식으로 입력해주세요" 에러가 표시됨
    And 최근 증액일을 비워 두고 다른 필드가 유효하면 에러 없이 저장되고, 저장된 계약에는 lastIncreaseDate 필드가 없음
- AC-5 [W][P1]: Scenario: 범위 초과 입력
    Given today = "2026-10-06"
    When 계약 이름 21자, 만기일 "2026-10-05", 보증금 "10000000001", 월세 "10000001" 입력 후 저장 탭
    Then "계약 이름은 20자 이내로 입력해주세요", "만기일이 오늘 이전이에요. 다음 계약 만기일을 입력해주세요", "보증금은 100억원 이하로 입력해주세요", "월세는 1,000만원 이하로 입력해주세요" 에러가 표시됨
    And 만기일 "2031-10-07"(오늘+5년 초과)은 "만기일은 5년 이내로 입력해주세요" 에러가 표시됨
    And 최근 증액일 "2026-10-07"(오늘 이후)을 입력하고 저장하면 저장되지 않고 "최근 증액일은 오늘 이전이어야 해요" 에러가 표시됨
    And 최근 증액일 "2026-10-06"(오늘)은 에러 없이 저장됨
- AC-6 [W][P1]: Scenario: 최대 건수·저장 실패
    Given 계약이 20건 저장돼 있을 때
    When /contracts/new에서 유효한 값으로 저장 탭
    Then 저장되지 않고 "계약은 최대 20건까지 등록할 수 있어요" 토스트가 표시됨
    And saveContract가 `{ ok: false, error: "quota" }`를 반환하면 화면에 머문 채 "저장 공간이 부족해 저장하지 못했어요" 토스트가 표시됨
- AC-7 [S][P1]: Scenario: 수정 대상 없음
    Given 존재하지 않는 id "abc"로 /contracts/abc/edit에 진입했을 때
    When 화면이 렌더되면
    Then 폼 대신 "계약을 찾을 수 없어요"와 "목록으로" Button이 표시되고, 탭하면 홈으로 이동함
- AC-8 [U][P2]: Scenario: 모바일 키보드 동작
    Given 만기일 TextField에 포커스가 있을 때
    When 키보드가 올라오면
    Then 포커스된 필드가 화면 안에 보이고, SubmitFooter의 "저장" 버튼이 키보드 바로 위에 표시됨
    And 금액 필드는 숫자 키패드(inputMode="numeric")로 열림

### F3. 홈 — 계약 목록 & 가까운 창구 순 정렬
- Description: 등록한 계약을 갱신 요구 창구가 가까운 순서로 보여 준다. 각 행에 사용자가 붙인 계약 이름, 상태 배지, D-day를 표시한다. 계약이 없으면 첫 계약 등록으로 안내한다.
- Data: Contract, RenewalWindow
- API: 없음
- 정렬 규칙(`sortContracts(contracts, today)`): ① status "open"을 deadlineDate 오름차순 → ② "upcoming"을 startDate 오름차순 → ③ "closed"를 endDate 오름차순 → ④ "expired"를 endDate 내림차순
- Screen: 홈 — `/`
  - Top title "갱신체크"
  - TDS 컴포넌트: ListRow(계약 1건 = 1행: 메인 텍스트 계약 이름, 서브 텍스트 "만기 2027-03-31 · 보증금 2억원", 오른쪽에 상태 Badge + D-day 텍스트), Button("계약 추가", SubmitFooter), Toast, Spacing. 빈 상태는 Asset.ContentIcon + Paragraph.Text + Button
  - 상태 배지 문구: open "요구 가능", upcoming "시작 전", closed "기간 지남", expired "만기 지남". D-day 문구: open "마감 D-117", upcoming "시작 D-24", closed/expired "-"
  - 목록 스크롤: 최대 20건이라 가상 스크롤 없이 페이지 스크롤을 쓴다.
  - 광고: 목록 마지막 행 아래에 Spacing(size=24)을 두고 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />` 1개를 둔다. 계약이 0건이면 표시하지 않는다.
  - 터치: ListRow 행 전체가 탭 영역이고 높이 56px 이상이다.
  - Navigation state contract:
    - Outgoing: "계약 추가" → `navigate('/contracts/new')`
    - Outgoing: 행 탭 → `navigate(\`/contracts/${contract.id}\`)`
    - Incoming: `location.state = { toast?: string } | null` — toast가 있으면 1회 표시한 뒤 `navigate('.', { replace: true, state: null })`로 비운다.
  - Instrumentation contract: 행 탭 → `logClick('home_contract_open')`, "계약 추가" → `logClick('home_add_contract')`
- Requirements:
- AC-1 [U][P0]: Scenario: 가까운 창구 순 정렬
    Given today = "2026-10-06"이고 계약 { A: 만기 2027-03-31, B: 만기 2027-04-30, C: 만기 2026-11-30, D: 만기 2027-01-15 }가 A,B,C,D 순서로 저장돼 있을 때
    When 홈에 진입
    Then 목록은 D("요구 가능", "마감 D-40") → A("요구 가능", "마감 D-117") → B("시작 전", "시작 D-24") → C("기간 지남") 순서로 표시됨
- AC-2 [E][P0]: Scenario: 계약 행 탭
    Given "망원동 투룸" 계약이 목록에 있을 때
    When 해당 ListRow 탭
    Then /contracts/{id}로 이동하고 logClick('home_contract_open')이 1회 호출됨
- AC-3 [S][P1]: Scenario: 빈 상태
    Given 저장된 계약이 0건일 때
    When 홈에 진입
    Then data-testid="home-empty" 영역에 Asset.ContentIcon, "만기일만 넣으면 갱신 요구 마감일을 알려드려요" 문구, "첫 계약 등록하기" Button이 표시되고 AdSlot은 렌더되지 않음
- AC-4 [S][P1]: Scenario: 불러오는 중
    Given loadContracts() 결과를 아직 상태에 반영하지 않은 첫 렌더일 때
    Then data-testid="home-loading"에 스켈레톤 ListRow 3개가 표시되고 빈 상태 문구는 표시되지 않음
- AC-5 [W][P1]: Scenario: 손상 데이터 복구 안내
    Given loadContracts()가 `recovered: true`를 반환할 때
    When 홈에 진입
    Then "저장된 계약을 불러오지 못해 초기화했어요" 토스트가 1회 표시되고 빈 상태가 표시됨
- AC-6 [W][P1]: Scenario: 앱 설치 유도·외부 이동 금지
    Given 홈과 모든 화면에서
    Then "앱을 설치하세요", "다운로드" 문구·배너·링크가 없고, `window.open`이나 `window.location.href`로 외부 URL에 이동하는 코드가 없음 (코드 grep 결과 0건)
- AC-7 [U][P1]: Scenario: 검수 공통 — 콘솔 에러·색상·호환
    Given 프로덕션 빌드(`vite build`)로 홈 → 계약 등록 → 결과 → 통보 점검 흐름을 실행할 때
    Then console.error 출력 0건, `src/` 안 HEX 색상 리터럴(`#[0-9a-fA-F]{3,8}`) 0건, 외부 분석 SDK(GA·Amplitude) import 0건
    And 빌드 target은 `es2017` 이하로, Android 7+·iOS 16+에서 지원하지 않는 API(`Array.prototype.at`, `structuredClone` 등)를 쓰지 않음
- AC-8 [W][P1]: Scenario: 계약 불러오기 예외
    Given loadContracts()가 예외를 던질 때(예: WebView에서 localStorage 접근 시 SecurityError)
    When 홈에 진입
    Then data-testid="home-error"에 "계약을 불러오지 못했어요. 잠시 후 다시 시도해주세요" 문구와 Button("다시 시도")이 표시되고, 빈 상태 문구와 AdSlot은 렌더되지 않음
    And "다시 시도"를 탭하면 loadContracts()를 1회 다시 호출하고, 성공하면 계약 목록(또는 빈 상태)이 표시됨
    And `location.state.toast`가 문자열이 아니거나 빈 문자열이면 토스트를 띄우지 않고 state를 null로 비움

### F4. 결과 화면 — 갱신 기간 타임라인 & 5% 상한 카드 (무료 층)
- Description: 이 앱의 핵심 답을 보여 주는 화면이다. 계약별로 갱신 요구 가능 기간(시작일·마감일·만기일)을 타임라인과 D-day로 보여 주고, 5% 상한을 적용한 최대 보증금·월세를 금액 카드로 보여 준다. 광고와 관계없이 항상 보인다.
- Data: Contract, RenewalWindow, CapResult
- API: 없음
- Screen: 결과 — `/contracts/:id`
  - Top title "갱신체크"이고, 화면 첫 줄에 Paragraph.Text(t3)로 사용자의 계약 이름(예: "망원동 투룸")을 표시한다.
  - 무료 층 `data-testid="free-tier"`(TossRewardAd 바깥):
    - SummaryHero: status별 히어로. open이면 "갱신 요구 마감까지" + CountUp 값 "D-117" + 서브 "2027-01-31까지 집주인에게 도달해야 해요". upcoming이면 "갱신 요구 시작까지 D-24", closed면 "갱신 요구 기간이 지났어요", expired면 "계약 만기가 지났어요"
    - Card `data-testid="renewal-timeline"`: ListRow 3행 "요구 시작 2026-09-30", "요구 마감 2027-01-31"(Badge "마감" 강조), "계약 만기 2027-03-31"과 오늘 위치를 표시하는 진행 바(MiniBar, 시작일~마감일 구간에서 오늘의 비율). 하단 Paragraph.Text "주택임대차보호법 제6조의3: 만기 6개월 전부터 2개월 전까지"
    - Card `data-testid="cap-card"`: "갱신 시 최대 보증금" 강조 타이포(t2) "2억 1,000만원" + 서브 "지금보다 최대 1,000만원". 월세가 있으면 "갱신 시 최대 월세" "52만 5,000원" + "지금보다 최대 2만 5,000원". 하단 "주택임대차보호법 제7조: 증액은 5% 이내"
    - renewalRightUsed가 true면 cap-card 위에 경고 Paragraph.Text: "갱신요구권은 1회만 쓸 수 있어요(제6조의3 제2항). 이번 만기에는 갱신을 요구할 수 없어 5% 상한이 적용되지 않을 수 있어요"
  - 이어서 F5 전환 카드, F6 진입 ListRow("집주인 인상 통보 점검하기"), F7 잠금 층, 마지막으로 Spacing(size=24) + AdSlot 배너 순서로 놓는다.
  - 하단 SubmitFooter: Button("결과 공유하기", display="block") → `shareApp()`. 보조 Button("계약 수정")
  - 로딩: 계약을 읽기 전에는 data-testid="result-loading" 스켈레톤 Card 2개를 보여 준다.
  - 빈/에러: id가 없으면 "계약을 찾을 수 없어요" + Button("목록으로")
  - 터치: 모든 버튼·ListRow는 높이 44px 이상이다.
  - Navigation state contract:
    - Incoming: route param `id: string`, `location.state = { justSaved?: boolean } | null`. justSaved가 true면 "계약을 저장했어요" 토스트를 1회 띄운다.
    - Outgoing: "계약 수정" → `navigate(\`/contracts/${id}/edit\`)`
    - Outgoing: "집주인 인상 통보 점검하기" → `navigate(\`/contracts/${id}/notice\`)`
    - Outgoing: "목록으로" → `navigate('/', { replace: true })`
  - Instrumentation contract: free-tier가 처음 보일 때 `logImpression('result_free_tier')`. "결과 공유하기" → `logClick('result_share')` 후 `shareApp()`. free-tier를 렌더한 뒤 status가 "open"이나 "upcoming"이면 `requestReviewOnce()`를 호출한다. 통보 점검 ListRow → `logClick('result_notice_check')`
- Requirements:
- AC-1 [E][P0]: Given 계약 { nickname: "망원동 투룸", endDate: "2027-03-31", deposit: 200000000, monthlyRent: 500000 }과 today = "2026-10-06" When 결과 화면 /contracts/{id}에 진입 Then data-testid="free-tier" 안에 "D-117", "요구 시작 2026-09-30", "요구 마감 2027-01-31", "갱신 시 최대 보증금 2억 1,000만원", "갱신 시 최대 월세 52만 5,000원"이 표시됨
- AC-2 [U][P0]: Scenario: 핵심 레이아웃
    Given 월세가 있는 계약의 결과 화면일 때
    Then data-testid="renewal-timeline" Card 1개와 data-testid="cap-card" Card 1개가 data-testid="free-tier" 안에 있고
    And cap-card의 최대 보증금 금액은 t2 강조 타이포로 렌더되며, 화면 첫 줄에 계약 이름 "망원동 투룸"이 표시됨
- AC-3 [S][P0]: Scenario: 시작 전 상태 표시
    Given 계약 만기 "2027-04-30", today = "2026-10-06"
    When 결과 화면 진입
    Then SummaryHero에 "갱신 요구 시작까지"와 "D-24"가 표시되고 타임라인에 "요구 시작 2026-10-30", "요구 마감 2027-02-28"이 표시됨
- AC-4 [S][P1]: Scenario: 기간 지남 상태
    Given 계약 만기 "2026-11-30", today = "2026-10-06"
    When 결과 화면 진입
    Then SummaryHero에 "갱신 요구 기간이 지났어요"가 표시되고 cap-card는 그대로 표시되며 requestReviewOnce는 호출되지 않음
- AC-5 [S][P1]: Scenario: 전세 계약의 상한 카드
    Given monthlyRent = 0, deposit = 200000000
    When 결과 화면 진입
    Then cap-card에 "갱신 시 최대 보증금 2억 1,000만원"만 표시되고 "갱신 시 최대 월세" 행은 렌더되지 않음
- AC-6 [S][P1]: Scenario: 갱신요구권 사용한 계약
    Given renewalRightUsed = true
    When 결과 화면 진입
    Then cap-card 위에 "갱신요구권은 1회만 쓸 수 있어요(제6조의3 제2항)"로 시작하는 경고 문구가 표시됨
- AC-7 [W][P1]: Scenario: 없는 계약
    Given /contracts/zzz로 진입했고 해당 id가 없을 때
    Then data-testid="result-not-found"에 "계약을 찾을 수 없어요"와 "목록으로" Button이 표시되고 logImpression('result_free_tier')는 호출되지 않음
- AC-8 [E][P2]: Scenario: 공유·계측
    Given 결과 화면이 렌더됐을 때
    When "결과 공유하기" 탭
    Then logClick('result_share')가 호출된 뒤 shareApp()이 1회 호출됨
    And free-tier가 처음 보일 때 logImpression('result_free_tier')가 1회만 호출됨
- AC-9 [W][P1]: Scenario: 공유 실패
    Given shareApp()이 reject되거나 예외를 던질 때
    When "결과 공유하기" 탭
    Then 결과 화면에 머문 채 "공유하지 못했어요. 잠시 후 다시 시도해주세요" 토스트가 1회 표시되고 free-tier 내용은 그대로 유지됨

### F5. 월세 전환 시뮬레이션 (결과 화면 섹션)
- Description: 보증금 일부를 월세로 바꿀 때, 법정 전환율 상한(min(연 10%, 기준금리 + 2%p))을 적용해 최대로 늘어날 수 있는 월세를 계산한다. 적용한 기준금리와 확인 날짜를 표시하고, 사용자가 BottomSheet에서 기준금리를 고칠 수 있다.
- Data: Contract, Settings
- API: 없음
- Screen: 결과 화면 `/contracts/:id` 안의 Card `data-testid="conversion-card"`(무료 층 바로 아래, TossRewardAd 바깥)
  - TDS 컴포넌트: TextField("월세로 바꿀 보증금(원)", inputMode="numeric"), Button("계산하기", display="block"), 결과 ListRow 3행("남는 보증금", "늘어날 수 있는 월세 상한", "전환 후 월세 상한"), ListRow("적용 전환율 4.5% · 기준금리 2.50% (2026-10-06 확인)") 오른쪽 "수정" 텍스트 버튼, BottomSheet(TextField "한국은행 기준금리(%)" + Button "저장"), Paragraph.Text 근거 "주택임대차보호법 제7조의2, 시행령 제9조: 연 10%와 기준금리+2%p 중 낮은 비율"
  - 빈 상태: 계산 전에는 결과 ListRow 대신 Paragraph.Text "바꿀 금액을 넣으면 법정 상한 월세를 계산해요"를 보여 준다.
  - 터치: "수정" 버튼 영역은 44×44px 이상이다.
  - Navigation: 같은 화면 안의 동작이라 이동이 없다.
  - Instrumentation contract: "계산하기" → `logClick('conversion_calc')`
- Requirements:
- AC-1 [E][P0]: Scenario: 전환 월세 계산
    Given 계약 { deposit: 200000000, monthlyRent: 0 }, settings.baseRatePercent = 2.5
    When conversion-card에 "50000000" 입력 후 "계산하기" 탭
    Then "남는 보증금 1억 5,000만원", "늘어날 수 있는 월세 상한 18만 7,500원", "전환 후 월세 상한 18만 7,500원", "적용 전환율 4.5%"가 표시됨
- AC-2 [E][P0]: Scenario: 기존 월세가 있는 계약
    Given 계약 { deposit: 100000000, monthlyRent: 500000 }, 기준금리 2.5
    When "40000000" 입력 후 계산
    Then "남는 보증금 6,000만원", "늘어날 수 있는 월세 상한 15만원", "전환 후 월세 상한 65만원"이 표시됨
- AC-3 [E][P0]: Scenario: 기준금리 수정
    Given 적용 전환율이 4.5%로 표시될 때
    When "수정" 탭 → BottomSheet에서 "3.25" 입력 후 "저장" 탭
    Then `renewwindow:settings:v1`에 { baseRatePercent: 3.25, baseRateAsOf: today }가 저장되고 BottomSheet가 닫히며 "적용 전환율 5.25% · 기준금리 3.25%"로 바뀌고 계산 결과가 다시 계산됨
- AC-4 [W][P1]: Scenario: 전환 금액 오류
    Given 계약 deposit = 200000000
    When "0" 입력 후 계산 / "250000000" 입력 후 계산
    Then 각각 "전환할 금액을 입력해주세요" / "현재 보증금보다 많이 전환할 수 없어요" 에러가 TextField에 표시되고 결과 ListRow는 렌더되지 않음
- AC-5 [W][P1]: Scenario: 기준금리 범위 오류
    Given BottomSheet가 열려 있을 때
    When "12" 또는 "" 입력 후 저장
    Then "기준금리는 0~10% 사이로 입력해주세요" 에러가 표시되고 settings는 바뀌지 않음
- AC-6 [S][P1]: Scenario: 보증금 0원 계약
    Given 계약 deposit = 0, monthlyRent = 800000
    When 결과 화면 진입
    Then conversion-card의 TextField와 버튼은 비활성화되고 "보증금이 없어 월세 전환 계산을 할 수 없어요"가 표시됨
- AC-7 [S][P1]: Scenario: 계산 전 빈 상태
    Given 아직 계산하지 않았을 때
    Then conversion-card에 "바꿀 금액을 넣으면 법정 상한 월세를 계산해요"가 표시되고 결과 ListRow 3행은 렌더되지 않음
- AC-8 [W][P1]: Scenario: 기준금리 저장 실패
    Given 적용 전환율이 4.5%로 표시되고 saveSettings가 `{ ok: false, error: "quota" }`를 반환할 때
    When "수정" 탭 → BottomSheet에서 "3.25" 입력 후 "저장" 탭
    Then BottomSheet는 열린 채 입력값 "3.25"가 유지되고 "저장 공간이 부족해 기준금리를 저장하지 못했어요" 토스트가 표시됨
    And 표시 문구는 "적용 전환율 4.5% · 기준금리 2.50%" 그대로이고 `renewwindow:settings:v1` 값은 바뀌지 않음

### F6. 집주인 통보 점검 화면
- Description: 집주인이 통보한 인상률이나 새 금액과 통보일을 넣으면, 5% 상한을 넘는지와 초과 금액을 원 단위로 알려 준다. 통보일이 임대인 통지 기간(만기 6개월~2개월 전, 제6조 제1항) 안인지, 최근 증액 후 1년이 지났는지(제7조 제1항)도 함께 점검한다. 점검 내용은 계약에 저장되고 다시 열면 복원된다.
- Data: Contract, LandlordNotice, NoticeCheck
- API: 없음
- Screen: 통보 점검 — `/contracts/:id/notice`
  - Top title "갱신체크", 부제 "{계약 이름} 인상 통보 점검"
  - TDS 컴포넌트: Tab 2개("인상률로 입력" / "새 금액으로 입력"), TextField(통보일 `YYYY-MM-DD`), 인상률 탭은 TextField("보증금 인상률(%)", "월세 인상률(%)"), 새 금액 탭은 TextField("새 보증금(원)", "새 월세(원)"), SubmitFooter Button("점검하기"), 결과 Card `data-testid="notice-result"`(Badge "상한 초과" 또는 "상한 이내", ListRow "보증금 8.00% 인상 · 600만원 초과", ListRow "월세 10.00% 인상 · 2만 5,000원 초과", 통보 시기 ListRow, 1년 이내 재증액 ListRow), Paragraph.Text 근거, Toast
  - 월세가 0인 계약은 월세 입력 필드를 렌더하지 않는다.
  - 빈 상태: 저장된 notice가 없으면 결과 Card 대신 "통보 받은 내용을 넣으면 5% 상한 초과 여부를 알려드려요"를 보여 준다.
  - 계약 없음: id에 해당하는 계약이 없으면 입력 폼 대신 `data-testid="notice-not-found"`에 Asset.ContentIcon과 "계약을 찾을 수 없어요", Button("목록으로")을 보여 준다.
  - 에러: 필드별 TextField `hasError` + `help` 문구(AC-5). 새 보증금 범위는 0~10,000,000,000원, 새 월세 범위는 0~10,000,000원이다(Contract와 같은 범위).
  - 로딩: 계약을 읽기 전에는 TextField를 비활성화하고 버튼을 loading 상태로 둔다.
  - 터치: Tab 항목·버튼은 높이 44px 이상이다.
  - Navigation state contract:
    - Incoming: route param `id: string`, `location.state = null`
    - Outgoing: Top 뒤로가기 → `navigate(-1)`. 계약이 없을 때 "목록으로" → `navigate('/', { replace: true })`
  - Instrumentation contract: "점검하기" → `logClick('notice_check_submit')`. notice-result가 처음 보일 때 `logImpression('notice_result')`. 결과가 나온 뒤 `requestReviewOnce()`를 호출한다.
- Requirements:
- AC-1 [E][P0]: Scenario: 상한 초과 판정 (새 금액 입력)
    Given 계약 { endDate: "2027-03-31", deposit: 200000000, monthlyRent: 500000 }
    When "새 금액으로 입력" 탭에서 { 통보일: "2026-12-20", 새 보증금: "216000000", 새 월세: "550000" } 입력 후 "점검하기" 탭
    Then notice-result에 Badge "상한 초과", "보증금 8.00% 인상 · 600만원 초과", "월세 10.00% 인상 · 2만 5,000원 초과", "집주인 통지 기간 안에 받은 통보예요"가 표시됨
    And 계약의 notice에 { noticeDate: "2026-12-20", newDeposit: 216000000, newMonthlyRent: 550000, inputMode: "amount" }가 저장됨
- AC-2 [E][P0]: Scenario: 인상률 입력과 상한 이내
    Given 같은 계약
    When "인상률로 입력" 탭에서 { 통보일: "2026-12-20", 보증금 인상률: "4", 월세 인상률: "5" } 입력 후 점검
    Then 새 보증금 208,000,000·새 월세 525,000으로 계산되고 Badge "상한 이내", "보증금 4.00% 인상", "월세 5.00% 인상"이 표시되며 초과액 행은 "초과 없음"으로 표시됨
- AC-3 [E][P0]: Scenario: 통지 기간 밖에서 받은 통보
    Given 계약 endDate "2027-03-31" (임대인 통지 기간 2026-09-30 ~ 2027-01-31)
    When 통보일 "2027-02-10"으로 점검
    Then "집주인 통지 기간(만기 6개월~2개월 전)이 지난 뒤 받은 통보예요 · 주택임대차보호법 제6조 제1항"이 표시됨
    And 통보일 "2026-09-01"이면 "집주인 통지 기간 전에 받은 통보예요"가 표시됨
- AC-4 [S][P1]: Scenario: 1년 이내 재증액
    Given 계약 lastIncreaseDate = "2026-03-01"
    When 통보일 "2026-12-20"으로 점검
    Then "최근 증액(2026-03-01) 후 1년이 지나지 않았어요 · 제7조 제1항: 증액 후 1년 이내 재증액 불가" 행이 표시됨
    And lastIncreaseDate가 없으면 이 행은 렌더되지 않음
- AC-5 [W][P1]: Scenario: 입력 오류
    Given today = "2026-10-06"
    When 통보일 "2026-10-07"(미래) 또는 "" 입력 후 점검
    Then 각각 "통보일은 오늘 이전 날짜로 입력해주세요" / "통보일을 YYYY-MM-DD 형식으로 입력해주세요"가 표시되고 저장되지 않음
    And 인상률 "-3" 또는 "101" 입력 시 "인상률은 0~100% 사이로 입력해주세요"가 표시됨
    And "새 금액으로 입력" 탭에서 새 보증금이 "" 이면 "새 보증금을 입력해주세요", 새 월세가 "" 이면 "새 월세를 입력해주세요"가 해당 TextField에 표시되고 저장되지 않음
    And 새 보증금 "-1000" 또는 "10000000001" 입력 시 "새 보증금은 0원~100억원 사이로 입력해주세요", 새 월세 "-1000" 또는 "10000001" 입력 시 "새 월세는 0원~1,000만원 사이로 입력해주세요"가 표시되고 저장되지 않음
    And "인상률로 입력" 탭에서 계산한 새 보증금이 10,000,000,000원을 넘으면(예: 보증금 6,000,000,000원 · 인상률 "100") 보증금 인상률 필드에 "새 보증금은 0원~100억원 사이로 입력해주세요"가 표시되고 저장되지 않음
    And 월세가 0인 계약은 새 월세 필드가 없으므로 새 월세 오류가 표시되지 않음
- AC-6 [S][P1]: Scenario: 저장된 점검 복원 / 빈 상태
    Given 계약에 AC-1의 notice가 저장돼 있을 때
    When 통보 점검 화면에 다시 진입
    Then "새 금액으로 입력" 탭이 선택되고 입력값과 notice-result가 그대로 복원됨
    And notice가 없는 계약이면 "통보 받은 내용을 넣으면 5% 상한 초과 여부를 알려드려요"가 표시됨
- AC-7 [W][P1]: Scenario: 저장 실패
    Given saveContract가 `{ ok: false, error: "quota" }`를 반환할 때
    When 점검하기 탭
    Then notice-result는 화면에 표시되고 "저장 공간이 부족해 점검 내용을 저장하지 못했어요" 토스트가 표시됨
- AC-8 [W][P1]: Scenario: 점검 대상 계약 없음
    Given 존재하지 않는 id "zzz"로 /contracts/zzz/notice에 진입했을 때
    When 화면이 렌더되면
    Then data-testid="notice-not-found"에 "계약을 찾을 수 없어요"와 "목록으로" Button이 표시되고, Tab·TextField·"점검하기" 버튼은 렌더되지 않음
    And "목록으로"를 탭하면 `navigate('/', { replace: true })`로 홈으로 이동하고, logClick('notice_check_submit')·logImpression('notice_result')·requestReviewOnce()는 호출되지 않음

### F7. 심화 층 — 월세 전환 시나리오 비교 & 협상 체크리스트 (리워드 게이트)
- Description: 결과 화면 맨 아래에 리워드 광고 게이트 뒤로 심화 층 한 블록을 둔다. 보증금의 0/25/50/75%를 월세로 바꿨을 때 남는 보증금, 월세 상한, 연간 월세 부담을 한 표로 비교한다. 협상 전에 확인할 법령 근거 체크리스트도 제공하며, 체크 상태는 계약별로 저장된다.
- Data: Contract, Settings, ChecklistState
- API: 없음
- 체크리스트 항목(`CHECKLIST_ITEMS`, 법령 출처 필수):
  1. `deliver_by_deadline` — "갱신 요구는 {마감일}까지 집주인에게 도달해야 해요" · 민법 제111조 제1항(도달주의), 주택임대차보호법 제6조의3 제1항
  2. `once_two_years` — "갱신요구권은 1회만 쓸 수 있고, 갱신되면 계약기간은 2년이에요" · 제6조의3 제2항
  3. `cap_5_percent` — "갱신 시 보증금·월세 증액은 5% 이내예요" · 제6조의3 제3항, 제7조 제2항
  4. `local_ordinance` — "시·도 조례로 상한이 5%보다 낮을 수 있어요" · 제7조 제2항 단서
  5. `one_year_rule` — "증액 후 1년 안에는 다시 올릴 수 없어요" · 제7조 제1항
  6. `conversion_cap` — "보증금을 월세로 바꿀 땐 연 10%와 기준금리+2%p 중 낮은 비율이 상한이에요" · 제7조의2, 시행령 제9조
  7. `owner_residence` — "집주인(직계존속·비속 포함)이 실제 거주하려는 경우 갱신을 거절할 수 있어요" · 제6조의3 제1항 제8호
  8. `tenant_termination` — "갱신된 계약은 세입자가 언제든 해지를 통지할 수 있고 3개월 뒤 효력이 생겨요" · 제6조의3 제4항, 제6조의2
- Screen: 결과 화면 `/contracts/:id`의 마지막 콘텐츠 블록(F5 카드 아래, AdSlot 위)
  - **무료 층**: F4의 `data-testid="free-tier"`(타임라인 + 5% 상한 카드)다. 이것만으로 앱의 목적이 달성된다.
  - **잠금 층**: `data-testid="locked-tier"` — 시나리오 비교 Card(`data-testid="scenario-row"` ListRow 4행 + 행마다 월세 상한 비율 MiniBar)와 체크리스트 Card(`data-testid="checklist-item"` ListRow 8행, 각 행 오른쪽에 체크 Switch, 서브 텍스트로 법령 출처)
  - **코드 구조 규칙**: free-tier와 conversion-card는 `<TossRewardAd>` **바깥**에 둔다. 잠금 층만 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`의 자식으로 둔다. 화면 전체를 감싸지 않는다.
  - 게이트가 닫혀 있을 때 TossRewardAd가 보여 주는 안내 문구: "광고 보고 전환 시나리오 비교·협상 체크리스트 보기"
  - 체크리스트 스크롤: 8행 고정이라 페이지 스크롤을 쓴다.
  - 터치: Switch를 포함한 ListRow 행 전체가 44px 이상의 탭 영역이다.
  - Navigation: 이동이 없다.
  - Instrumentation contract: locked-tier가 처음 보일 때 `logImpression('locked_tier')`. 게이트 버튼 → `logClick('locked_tier_unlock')`. 결과 화면 AdSlot이 보일 때 `logImpression('ad_banner_result')`
- Requirements:
- AC-1 [U][P0]: Scenario: 무료 층은 광고와 무관하게 보인다
    Given 광고가 한 번도 뜨지 않는 환경 (슬롯 ID 미설정·광고 로드 실패·타임아웃 — 템플릿 TossRewardAd는 이때 게이트를 자동으로 연다)
    When 사용자가 계약 { endDate: "2027-03-31", deposit: 200000000, monthlyRent: 500000 }의 결과 화면에 진입 (today = "2026-10-06")
    Then data-testid="free-tier" 영역에 "D-117", "요구 마감 2027-01-31", "갱신 시 최대 보증금 2억 1,000만원", "갱신 시 최대 월세 52만 5,000원"이 표시되고 PRD 목표(마감일·상한 금액 확인)가 달성됨
- AC-2 [E][P1]: Scenario: 더 깊은 층은 게이트 뒤에 있다
    Given 결과 화면의 data-testid="locked-tier" 영역이 TossRewardAd의 자식으로 렌더될 때
    When 광고 시청이 완료되거나, 광고를 띄울 수 없어 게이트가 자동으로 열림
    Then data-testid="locked-tier" 영역에 data-testid="scenario-row" 4행(전환 0%/25%/50%/75%)과 data-testid="checklist-item" 8행이 표시됨
- AC-3 [U][P0]: Scenario: 전환 시나리오 비교 값
    Given 계약 { deposit: 200000000, monthlyRent: 0 }, 기준금리 2.5 (전환율 4.5%), 게이트가 열린 상태
    Then scenario-row는 순서대로 { "전환 0% · 보증금 2억원 · 월세 상한 0원 · 연 0원" }, { "전환 25% · 보증금 1억 5,000만원 · 월세 상한 18만 7,500원 · 연 225만원" }, { "전환 50% · 보증금 1억원 · 월세 상한 37만 5,000원 · 연 450만원" }, { "전환 75% · 보증금 5,000만원 · 월세 상한 56만 2,500원 · 연 675만원" }을 표시함
- AC-4 [E][P0]: Scenario: 체크리스트 체크 저장
    Given 게이트가 열린 결과 화면
    When "갱신 요구는 2027-01-31까지 집주인에게 도달해야 해요" 행의 Switch를 켬
    Then `renewwindow:checklist:v1`[contractId]에 "deliver_by_deadline"이 저장되고, 화면을 다시 열어도 해당 Switch가 켜져 있음
    And 각 행 서브 텍스트에 출처(예: "민법 제111조 제1항 · 주택임대차보호법 제6조의3 제1항")가 표시됨
- AC-5 [U][P1]: Scenario: 광고 배치
    Given 계약 결과 화면
    Then AdSlot 배너는 locked-tier 블록 아래에 1개만 있고 free-tier·conversion-card·locked-tier 콘텐츠와 겹치지 않음
- AC-6 [S][P1]: Scenario: 보증금 0원 계약의 시나리오
    Given 계약 deposit = 0, monthlyRent = 800000, 게이트가 열린 상태
    Then scenario-row 대신 "보증금이 없어 전환 시나리오가 없어요"가 표시되고 체크리스트 8행은 그대로 표시됨
- AC-7 [W][P1]: Scenario: 체크리스트 저장 실패
    Given localStorage.setItem이 QuotaExceededError를 던질 때
    When 체크리스트 Switch를 켬
    Then Switch는 꺼진 상태로 되돌아가고 "저장 공간이 부족해 체크를 저장하지 못했어요" 토스트가 표시됨

## Assumptions
- 대상은 주택임대차보호법이 적용되는 **주거용** 전월세 계약이다. 상가건물 임대차는 범위에 넣지 않는다.
- 갱신 요구 기간은 PRD대로 "만기 6개월 전부터 2개월 전까지"(제6조의3 제1항, 2020-12-10 이후 체결·갱신된 계약 기준)로 계산한다. 역산은 같은 날짜 기준으로 하고, 그 날짜가 없는 달이면 말일로 보정한다.
- 5% 상한은 보증금과 월세에 **각각** 적용한다. 동시에 인상되면 두 항목을 따로 점검한다.
- 월세 전환 계산은 **현재 보증금**을 기준으로 하며, 5% 갱신 상한과 합산하지 않는다.
- 사용자 식별은 필요 없다. 데이터는 이 기기의 localStorage에만 저장한다(기기를 바꾸면 사라진다).
- 이 앱은 법률 정보를 계산해 보여 줄 뿐 법률 자문이 아니다. 결과 화면 하단에 "법률 자문이 아닌 참고용 계산이에요" Paragraph.Text를 표시한다.
- 체크리스트 항목은 법령 근거가 있는 고정 목록이다(법정 규정이라 닫힌 집합). 사용자가 등록하는 대상인 계약은 이름·값을 자유롭게 추가·수정·삭제할 수 있다.

## Open Questions
1. **한국은행 기준금리 기본값**: `DEFAULT_BASE_RATE`와 `DEFAULT_BASE_RATE_AS_OF`의 출시 시점 실제 값은 무엇인가? (한국은행 공시값으로 확인해야 한다. 앱은 사용자가 고칠 수 있게 했지만 기본값이 틀리면 전환 상한이 틀린다.)
2. **기간 역산 경계**: "6개월 전부터 2개월 전까지"를 민법 기간 계산(제157~160조 역산)으로 엄밀하게 따질 때 마감일이 하루 달라질 수 있는가? 다르다면 앱이 계산한 마감일 하루 전을 "권장 발송일"로 따로 표시할까?
3. **2020-12-10 이전 계약**: 그 이전에 체결된 계약(종전 1개월 규정)을 구분하는 입력을 추가할까? 현재는 모두 2개월로 계산한다.
4. **조례로 상한이 낮은 지역**: 시·도 조례로 5%보다 낮은 상한을 정한 지역이 있으면 상한 비율을 사용자가 입력하게 할까? 현재는 체크리스트에 안내만 넣었다.
5. **보증금·월세 동시 변경 점검**: 집주인이 보증금을 낮추고 월세를 올리는(일부 전환) 통보에서 전환율 상한까지 합쳐 판정해야 하는가? 그렇다면 근거로 삼을 공개 계산 방식(예: 정부 계산기)은 무엇인가?
6. **갱신요구권을 이미 쓴 계약**: renewalRightUsed = true일 때 cap-card를 경고와 함께 계속 보여 줄지, 숨길지 운영 판단이 필요하다.
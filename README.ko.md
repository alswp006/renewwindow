🇰🇷 [English](./README.md)

# 갱신체크 — RenewWindow

갱신체크는 한국 세입자를 위한 전월세 갱신 법률 정보 미니앱입니다. 사용자가 계약 종료일, 현재 보증금/월세를 입력하면 주택임차차보호법에 따른 갱신 요청 기한과 최대 허용 월세 인상률을 즉시 계산합니다.

앱은 법적 6개월~2개월 갱신 기간을 계산하고, 주택임차차보호법 §6(3)에 따른 월말 조정을 적용하며, 5% 월세 인상 상한선(§7)을 확인하고 임대인의 통지가 법적 기한을 준수했는지 검증합니다. 모든 계산은 브라우저에서 로컬로 수행되며 서버가 필요하지 않습니다.

## 기능

- 📋 **계약 관리** — 계약 별칭, 종료일, 보증금, 월세를 입력해 계약을 등록 및 저장
- 📅 **갱신 기간 계산기** — 주택임차차보호법 §6(3)에 따른 법적 6개월~2개월 통지 기간을 월말 조정과 함께 자동 계산
- 💰 **월세 인상 검증** — 보증금과 월세 인상의 5% 법정 상한선(§7)을 적용하고 임대인 통지가 한계를 초과하는지 확인
- 🕐 **임대인 통지 기한 확인** — 임대인의 통지가 법적 6개월~2개월 기간 내에 있는지 검증(§6(1))
- 📊 **비교 및 협상 체크리스트** — 리워드 광고 뒤에 보호됨; 시나리오 비교 및 법적 근거와 함께 협상 포인트 제시
- 💾 **로컬 우선 저장소** — 모든 데이터는 브라우저 localStorage에 저장되며 오류 발생 시 자동 복구
- 📱 **인앱 광고** — Toss Ads를 통한 배너 및 리워드 광고 지원

## 기술 스택

- **프레임워크**: Vite + React 18 + TypeScript
- **디자인 시스템**: @toss/tds-mobile (Toss Design System)
- **라우팅**: React Router 7
- **스타일링**: Emotion (TDS 경유) + CSS 변수 (다크 모드 지원)
- **저장소**: 브라우저 localStorage (최대 20개 계약)
- **광고 및 SDK**: @apps-in-toss/web-framework (토스 앱인토스 플랫폼)
- **아이콘**: lucide-react
- **테스트**: vitest + @testing-library/react + Playwright (비주얼 스모크 테스트)

## 시작하기

### 의존성 설치
```bash
npm install
```

### 프로덕션 빌드
```bash
npm run build
```

### 앱인토스 플랫폼용 빌드
```bash
npx ait build
```
그 다음 앱인토스 개발자 콘솔을 통해 검수에 제출합니다.

### 테스트 실행
```bash
npx vitest run          # 단위 및 통합 테스트
npm run test:visual     # Playwright 비주얼 스모크 테스트
```

### 타입 체크
```bash
npx tsc --noEmit
```

## 환경 변수

| 변수 | 설명 | 필수 |
|---|---|---|
| `VITE_TOSS_AD_SLOT_ID` | 리워드 광고 슬롯 ID (앱인토스 콘솔) | 아니오* |
| `VITE_TOSS_AD_GROUP_ID` | 배너 광고 그룹 ID (앱인토스 콘솔) | 아니오* |
| `VITE_SHARE_OG_URL` | 공유 미리보기용 Open Graph 이미지 URL (카카오톡, SMS) | 아니오 |

*광고 슬롯이 설정되지 않으면 우아하게 성능 저하됨 (실패 오픈: 리워드 게이트 해제, 배너 영역 숨김).

`.env.example`을 `.env`로 복사하고 앱인토스 개발자 콘솔의 값을 입력합니다. **`"test_slot"` 또는 `"demo_123"` 같은 테스트 값을 하드코딩하지 마세요** — 사용 가능하지 않으면 비워 둡니다.

## 프로젝트 구조

```
src/
├── pages/              # 라우트 컴포넌트 (Home, Result, ContractEdit, Notice)
├── components/         # 재사용 가능한 TDS 기반 컴포넌트
│   ├── ScreenScaffold.tsx
│   ├── SubmitFooter.tsx
│   ├── Card.tsx
│   ├── SummaryHero.tsx
│   ├── StateView.tsx (EmptyState, LoadingState)
│   ├── AdSlot.tsx
│   └── result/         # 결과 페이지 하위 컴포넌트
├── hooks/              # useContracts (localStorage 동기화)
├── lib/
│   ├── types.ts        # 공유 타입 (Contract, RenewalWindow 등)
│   ├── renewal.ts      # 전월세 갱신 계산
│   ├── format.ts       # 표시 포매팅 (날짜, KRW 금액)
│   ├── date.ts         # 날짜 유틸리티
│   ├── analytics.ts    # SDK 분석 래퍼
│   ├── share.ts        # SDK 공유 래퍼
│   └── storage.ts      # localStorage 헬퍼
├── constants/
│   ├── routes.ts       # 라우트 경로
│   └── law.ts          # 법적 상수
└── __tests__/          # 단위 및 통합 테스트

e2e/
├── visual-smoke.spec.ts    # Playwright 비주얼 테스트
└── __shots__/              # 스크린샷 기준선
```

## 배포

### 앱인토스 파이프라인

1. **빌드**
   ```bash
   npm run build
   ```

2. **토스용 번들링**
   ```bash
   npx ait build
   ```

3. **검수 제출** [앱인토스 개발자 콘솔](https://console.tossmini.com) 경유

### 제출 전 체크리스트
- ✅ 프로덕션 빌드에 console.error 없음
- ✅ 외부 도메인 네비게이션 없음
- ✅ 테스트 광고 코드 하드코딩 없음 (환경 변수 사용)
- ✅ Android 7+, iOS 16+ 호환
- ✅ CORS 오류 없음 (앱은 `*.web.tossmini.com`과 `*.private-web.tossmini.com` 모두에서 실행)

## 라이선스

MIT

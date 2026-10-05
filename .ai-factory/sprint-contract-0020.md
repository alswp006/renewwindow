# Sprint Contract — 패킷 0020
<!-- 파이프라인이 이 패킷을 위해 생성(순수 생성 콜) — 다른 패킷의 계약서가 아니다 -->

# Sprint Contract: 검수 컴플라이언스·E2E·빌드 설정

## 만들 항목
- **src/test/compliance.test.ts**: src/**/*.{ts,tsx} (테스트 파일 제외) 스캔. HEX 색상, 설치/다운로드, window.open/location, 외부 분석 SDK, .at(), structuredClone, type="date", '취소' 버튼 문구 0건 확인
- **src/test/flow.test.tsx**: 빈 저장소 → '첫 계약 등록하기' → 망원동/20270331/200000000/500000 → '계약을 저장했어요' 토스트 확인. free-tier에 'D-117', '요구 마감 2027-01-31', '2억 1,000만원', '52만 5,000원' 표시 검증. 이후 '집주인 인상 통보 점검' → 2026-12-20/216000000/550000 → '상한 초과', '보증금 8.00% 인상 · 600만원 초과' 확인. 전체 흐름 console.error 0회
- **vite.config.ts**: build.target을 'es2017'로 설정. npm run build 실행 확인

## 사용 타입
Contract, LandlordNotice, Settings, RenewalWindow, CapResult, NoticeCheck

## 검증 방법
- 스캔: compliance 테스트 모두 통과 (0건)
- E2E: flow.test.tsx 수행 후 UI 텍스트·금액 정확성 확인
- 빌드: es2017 트랜스파일 결과물 dist/ 생성

## 금지사항
- src/App.tsx, main.tsx 수정 금지
- 광고 컴포넌트 신규 작성 금지 (템플릿 재사용)

# Sprint Contract — 패킷 0019
<!-- 파이프라인이 이 패킷을 위해 생성(순수 생성 콜) — 다른 패킷의 계약서가 아니다 -->

## 라우팅 연결 Sprint Contract

**작업 항목**
- `src/App.tsx`: Routes 컴포넌트로 5개 경로('/', '/contracts/new', '/contracts/:id', '/contracts/:id/edit', '/contracts/:id/notice') 매핑, '/contracts/new' 우선 배치, 미매칭은 Navigate('/')
- `src/App.test.tsx`: 경로별 렌더링(부제/고유요소), '/unknown' → '/' 리다이렉트 검증

**타입 사용**
- `Contract`, `LandlordNotice` from `src/lib/types.ts` (컴포넌트 prop typing용)

**검증 조건**
1. MemoryRouter initialEntries={['/contracts/new']} → '계약 등록' 부제 렌더, Result의 ':id' 매칭 아님
2. '/', '/contracts/123', '/contracts/123/edit', '/contracts/123/notice' → 각 페이지 고유 요소 (홈/목록, free-tier, 수정폼, 인상통보 점검) 노출
3. '/unknown' 접속 → useNavigate로 '/'로 전환
4. 파일 변경: src/App.tsx만, main.tsx git diff = 0

**금지사항**
- main.tsx 수정 금지
- 결제/IAP Provider 추가 금지

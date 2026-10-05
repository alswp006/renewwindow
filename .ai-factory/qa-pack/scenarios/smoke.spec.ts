import { test, expect } from '@playwright/test';

// nightcrew Sentinel smoke 팩 — Factory 산출(§7.1)
// 핵심 막: 계약 만기일 입력 시 갱신 요구 가능 기간의 시작일과 마감일을 D-day로 표시, 현재 보증금·월세를 넣으면 5% 상한 기준 최대 인상 금액을 계산, 보증금 일부를 월세로 바꿀 때의 법정 전환율 상한 기준 월세 시뮬레이션, 집주인 통보 내용(인상률·통보일)을 넣어 상한 초과 여부 점검, 계약을 여러 건 등록하고 가장 가까운 창구 순으로 정렬
// 토스 브릿지 의존 구간(로그인·결제)은 외부 재현 불가 — 화면 도달 확인까지만.
const ROUTES = ["/","/ContractEdit.test","/ContractEdit","/Home.test","/Home"];
// WebView 밖 실행에서만 나는 콘솔 에러는 무시(앱인토스 관례 — toss visual-smoke 템플릿 계승)
const IGNORED_CONSOLE = [/SafeAreaInsets/i, /granite/i, /apps-in-toss/i];

for (const route of ROUTES) {
  test(`smoke: ${route} 렌더링과 콘솔 에러 없음`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !IGNORED_CONSOLE.some((re) => re.test(msg.text()))) errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto(route);
    await expect(page.locator('body')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

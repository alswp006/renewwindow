/**
 * react-router-dom 목 — **vitest.setup.ts가 먼저 import한다.**
 *
 * vi.mock은 선언한 모듈 평가 시점에 등록된다. 이 목이 mocks.ts 안에 있으면 테스트가 mocks.ts를
 * import하는 순간 등록돼, 테스트 파일이 자기 `vi.mock("react-router-dom", …)`으로 건 목(자기
 * mockNavigate를 돌려주는)을 덮어쓴다 — 그러면 테스트가 단언하는 navigate는 영영 호출되지 않는다.
 * setup에서 먼저 등록해 두면 테스트 파일의 목이 이 기본값을 덮어쓰고, 테스트가 목을 안 걸면 이
 * 기본값(mocks.ts의 mockNavigate)이 그대로 쓰인다.
 */
import { vi } from "vitest";

export const mockNavigate = vi.fn();
export const mockLocation = { pathname: "/", search: "", state: null, key: "default" };

// mocks.ts를 import한 테스트만 목을 쓴다 — 헬퍼를 안 쓰는 테스트(실제 라우터가 필요한 것)는 진짜를 받는다.
// 판정은 호출 시점에 한다(react-router-dom은 테스트가 mocks.ts보다 먼저 import할 수 있다).
let enabled = false;
export function enableRouterMock() {
  enabled = true;
}

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: (...args: Parameters<typeof actual.useNavigate>) =>
      enabled ? mockNavigate : actual.useNavigate(...args),
    useLocation: () => (enabled ? mockLocation : actual.useLocation()),
  };
});

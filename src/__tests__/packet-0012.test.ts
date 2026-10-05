import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { FreeTier } from "@/components/result/FreeTier";
import { logImpression } from "@/lib/analytics";
import { requestReviewOnce } from "@/lib/review";
import type { Contract } from "@/lib/types";

mockAll();

vi.mock("@/lib/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics")>()),
  logImpression: vi.fn(),
}));
vi.mock("@/lib/review", () => ({ requestReviewOnce: vi.fn() }));

const TODAY = "2026-10-06";

const base: Contract = {
  id: "c-mangwon",
  nickname: "망원동 투룸",
  endDate: "2027-03-31",
  deposit: 200_000_000,
  monthlyRent: 500_000,
  renewalRightUsed: false,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

function ui(contract: Contract) {
  return React.createElement(
    MemoryRouter,
    null,
    React.createElement(FreeTier, { contract, today: TODAY }),
  );
}

describe("결과 무료 층 컴포넌트 (FreeTier) — 타임라인·5% 상한 카드", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-06T09:00:00+09:00"));
    // 보이는 즉시 교차한 것으로 처리 (IntersectionObserver 없는 환경 폴백과 동일하게 1회 호출되어야 한다)
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        cb: (e: unknown[]) => void;
        constructor(cb: (e: unknown[]) => void) {
          this.cb = cb;
        }
        observe() {
          this.cb([{ isIntersecting: true }]);
        }
        disconnect() {}
        unobserve() {}
      },
    );
  });

  it("AC-1: open 상태에서 D-day·날짜·상한 금액이 보이고 첫 텍스트가 계약 이름이다", () => {
    render(ui(base));
    const tier = screen.getByTestId("free-tier");
    for (const text of [
      "D-117",
      "요구 시작 2026-09-30",
      "요구 마감 2027-01-31",
      "갱신 시 최대 보증금",
      "2억 1,000만원",
      "갱신 시 최대 월세",
      "52만 5,000원",
    ]) {
      expect(tier.textContent).toContain(text);
    }
    expect(tier.textContent!.trim().startsWith("망원동 투룸")).toBe(true);
  });

  it("AC-2: renewal-timeline과 cap-card가 각 1개이고 최대 보증금은 t2로 렌더된다", () => {
    render(ui(base));
    expect(screen.getAllByTestId("renewal-timeline")).toHaveLength(1);
    expect(screen.getAllByTestId("cap-card")).toHaveLength(1);
    const amount = within(screen.getByTestId("cap-card")).getByText("2억 1,000만원");
    expect(amount.getAttribute("data-typography")).toBe("t2");
    expect(amount.tagName).toBe("SPAN");
  });

  it("AC-3: upcoming이면 시작까지 D-day와 날짜가 보이고 review를 요청한다", () => {
    render(ui({ ...base, endDate: "2027-04-30" }));
    const tier = screen.getByTestId("free-tier");
    for (const text of ["갱신 요구 시작까지", "D-24", "요구 시작 2026-10-30", "요구 마감 2027-02-28"]) {
      expect(tier.textContent).toContain(text);
    }
    expect(requestReviewOnce).toHaveBeenCalledTimes(1);
  });

  it("AC-3: closed면 지났다는 문구와 cap-card가 있고 review는 요청하지 않는다", () => {
    render(ui({ ...base, endDate: "2026-11-30" }));
    expect(screen.getByTestId("free-tier").textContent).toContain("갱신 요구 기간이 지났어요");
    expect(screen.getAllByTestId("cap-card")).toHaveLength(1);
    expect(requestReviewOnce).toHaveBeenCalledTimes(0);
  });

  it("AC-4: monthlyRent 0이면 월세 행이 없다", () => {
    render(ui({ ...base, monthlyRent: 0 }));
    expect(screen.queryAllByText("갱신 시 최대 월세")).toHaveLength(0);
    expect(screen.getByTestId("cap-card").textContent).toContain("2억 1,000만원");
  });

  it("AC-4: renewalRightUsed면 경고 문구가 cap-card보다 앞에 있다", () => {
    render(ui({ ...base, renewalRightUsed: true }));
    const warning = screen.getByText(/^갱신요구권은 1회만 쓸 수 있어요\(제6조의3 제2항\)/);
    const cap = screen.getByTestId("cap-card");
    expect(warning.textContent!.startsWith("갱신요구권은 1회만 쓸 수 있어요(제6조의3 제2항)")).toBe(true);
    expect(warning.compareDocumentPosition(cap) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cap.contains(warning)).toBe(false);
  });

  it("AC-5: 리렌더해도 logImpression('result_free_tier')은 1회만 호출된다", () => {
    const { rerender } = render(ui(base));
    rerender(ui({ ...base, nickname: "망원동 투룸 2" }));
    rerender(ui({ ...base, nickname: "망원동 투룸 2" }));
    const calls = vi.mocked(logImpression).mock.calls.filter((c) => c[0] === "result_free_tier");
    expect(calls).toHaveLength(1);
    expect(screen.getByTestId("free-tier").textContent).toContain("망원동 투룸 2");
  });
});

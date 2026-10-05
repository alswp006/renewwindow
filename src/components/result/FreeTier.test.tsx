import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
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
  id: "c1",
  nickname: "망원동 투룸",
  endDate: "2027-03-31",
  deposit: 200_000_000,
  monthlyRent: 500_000,
  renewalRightUsed: false,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("FreeTier", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", undefined);
  });

  it("open: D-day·날짜·상한이 보이고 노출 로그·리뷰를 1회 남긴다", () => {
    render(<FreeTier contract={base} today={TODAY} />);
    const tier = screen.getByTestId("free-tier");
    for (const t of ["D-117", "요구 시작 2026-09-30", "요구 마감 2027-01-31", "2억 1,000만원", "52만 5,000원"]) {
      expect(tier.textContent).toContain(t);
    }
    expect(tier.textContent!.startsWith("망원동 투룸")).toBe(true);
    const amount = within(screen.getByTestId("cap-card")).getByText("2억 1,000만원");
    expect(amount.getAttribute("data-typography")).toBe("t2");
    expect(logImpression).toHaveBeenCalledWith("result_free_tier");
    expect(requestReviewOnce).toHaveBeenCalledTimes(1);
  });

  it("closed: 지났다는 문구, 리뷰 요청 없음", () => {
    render(<FreeTier contract={{ ...base, endDate: "2026-11-30" }} today={TODAY} />);
    expect(screen.getByTestId("free-tier").textContent).toContain("갱신 요구 기간이 지났어요");
    expect(requestReviewOnce).not.toHaveBeenCalled();
  });

  it("expired: 만기 지남 문구와 cap-card", () => {
    render(<FreeTier contract={{ ...base, endDate: "2026-09-01" }} today={TODAY} />);
    expect(screen.getByTestId("free-tier").textContent).toContain("계약 만기가 지났어요");
    expect(screen.getAllByTestId("cap-card")).toHaveLength(1);
  });

  it("월세 0이면 월세 행이 없고, 갱신요구권 사용 경고는 cap-card 앞에 온다", () => {
    render(<FreeTier contract={{ ...base, monthlyRent: 0, renewalRightUsed: true }} today={TODAY} />);
    expect(screen.queryByText("갱신 시 최대 월세")).toBeNull();
    const warning = screen.getByText(/^갱신요구권은 1회만 쓸 수 있어요\(제6조의3 제2항\)/);
    expect(warning.compareDocumentPosition(screen.getByTestId("cap-card")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("잘못된 만기일이어도 이름과 cap-card는 렌더한다", () => {
    render(<FreeTier contract={{ ...base, endDate: "2027-02-31" }} today={TODAY} />);
    expect(screen.queryAllByTestId("renewal-timeline")).toHaveLength(0);
    expect(screen.getAllByTestId("cap-card")).toHaveLength(1);
  });
});

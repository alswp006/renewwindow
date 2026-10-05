import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { mockTds, mockAppsInToss, mockOpenToast } from "@/__tests__/__helpers__/mocks";
import Result from "@/pages/Result";
import * as analytics from "@/lib/analytics";
import { shareApp } from "@/lib/share";
import type { Contract } from "@/lib/types";

// TossRewardAd는 mock하지 않는다 — 실제 게이트가 슬롯 ID 없음으로 자동 열리는 것이 AC다.
mockTds();
mockAppsInToss();

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")),
  useNavigate: () => mockNavigate,
}));

vi.mock("@/lib/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics")>()),
  logClick: vi.fn(),
  logImpression: vi.fn(),
}));

vi.mock("@/lib/share", () => ({ shareApp: vi.fn(async () => {}) }));
vi.mock("@/lib/review", () => ({ requestReviewOnce: vi.fn() }));

vi.mock("@/components/AdSlot", () => ({
  AdSlot: () => React.createElement("div", { "data-testid": "ad-slot" }),
}));

const CONTRACT: Contract = {
  id: "c1",
  nickname: "망원동 투룸",
  endDate: "2027-03-31",
  deposit: 200_000_000,
  monthlyRent: 500_000,
  renewalRightUsed: false,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const SHARE_FAIL = "공유하지 못했어요. 잠시 후 다시 시도해주세요";

function seed(contracts: Contract[] = [CONTRACT]) {
  localStorage.setItem("renewwindow:contracts:v1", JSON.stringify(contracts));
}

function renderResult(id = "c1", state?: unknown) {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [{ pathname: `/contracts/${id}`, state }] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, { path: "/contracts/:id", element: React.createElement(Result) }),
      ),
    ),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 6, 12));
  vi.stubEnv("VITE_TOSS_AD_SLOT_ID", "");
  mockNavigate.mockClear();
  mockOpenToast.mockClear();
  vi.mocked(analytics.logClick).mockClear();
  vi.mocked(analytics.logImpression).mockClear();
  vi.mocked(shareApp).mockReset();
  vi.mocked(shareApp).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("결과 화면 (/contracts/:id) — 조립·리워드 게이트·배너·공유", () => {
  it("AC-1[P0]: 무료 층에 D-day·마감일·상한 금액이 보이고 게이트가 자동으로 열려 잠금 층이 나온다", async () => {
    seed();
    renderResult();
    const free = await screen.findByTestId("free-tier");
    expect(within(free).getByText("D-117")).toBeInTheDocument();
    expect(within(free).getByText(/요구 마감 2027-01-31/)).toBeInTheDocument();
    expect(within(free).getByText(/2억 1,000만원/)).toBeInTheDocument();
    expect(within(free).getByText(/52만 5,000원/)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByTestId("locked-tier")).toBeInTheDocument());
    expect(screen.getAllByTestId("scenario-row")).toHaveLength(4);
    expect(screen.getAllByTestId("checklist-item")).toHaveLength(8);
  });

  it("AC-2[P0]: free-tier·conversion-card는 게이트 밖이고 AdSlot은 locked-tier 뒤에 1개만 있다", async () => {
    seed();
    renderResult();
    const free = await screen.findByTestId("free-tier");
    const conversion = screen.getByTestId("conversion-card");
    const locked = await screen.findByTestId("locked-tier");
    const ads = screen.getAllByTestId("ad-slot");

    expect(ads).toHaveLength(1);
    const ad = ads[0];
    expect(locked.compareDocumentPosition(ad) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const tier of [free, conversion, locked]) {
      expect(tier.contains(ad)).toBe(false);
    }
    // 게이트(.reward-ad-gate)가 아니라 잠금 층만 TossRewardAd의 자식이다 — free/conversion은 잠금 층과 서로 포함하지 않는다.
    expect(free.contains(locked)).toBe(false);
    expect(conversion.contains(locked)).toBe(false);
    expect(screen.getByText("법률 자문이 아닌 참고용 계산이에요")).toBeInTheDocument();
  });

  it("AC-3[P0]: 없는 계약이면 result-not-found를 보이고 free-tier 노출 로그는 0회, 목록으로는 replace 이동한다", async () => {
    seed();
    renderResult("zzz");
    const nf = await screen.findByTestId("result-not-found");
    expect(within(nf).getByText("계약을 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.queryByTestId("free-tier")).toBeNull();
    expect(analytics.logImpression).not.toHaveBeenCalledWith("result_free_tier");

    fireEvent.click(within(nf).getByRole("button", { name: "목록으로" }));
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("AC-3[P0]: 계약을 읽기 전 첫 렌더에는 result-loading이 보이고 이후 사라진다", async () => {
    seed();
    renderResult();
    expect(screen.getByTestId("result-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("free-tier")).toBeNull();
    await screen.findByTestId("free-tier");
    expect(screen.queryByTestId("result-loading")).toBeNull();
  });

  it("AC-4[P0]: 결과 공유하기는 logClick('result_share') 다음 shareApp을 각각 1회 부른다", async () => {
    seed();
    renderResult();
    await screen.findByTestId("free-tier");
    fireEvent.click(screen.getByRole("button", { name: "결과 공유하기" }));

    await waitFor(() => expect(shareApp).toHaveBeenCalledTimes(1));
    expect(analytics.logClick).toHaveBeenCalledTimes(1);
    expect(analytics.logClick).toHaveBeenCalledWith("result_share");
    const clickOrder = vi.mocked(analytics.logClick).mock.invocationCallOrder[0];
    const shareOrder = vi.mocked(shareApp).mock.invocationCallOrder[0];
    expect(clickOrder).toBeLessThan(shareOrder);
    expect(mockOpenToast).not.toHaveBeenCalled();
  });

  it("AC-4[P0]: shareApp이 reject되면 실패 토스트가 1회 뜨고 free-tier는 그대로다", async () => {
    seed();
    vi.mocked(shareApp).mockRejectedValue(new Error("share failed"));
    renderResult();
    await screen.findByTestId("free-tier");
    fireEvent.click(screen.getByRole("button", { name: "결과 공유하기" }));

    await waitFor(() => expect(mockOpenToast).toHaveBeenCalledTimes(1));
    expect(String(mockOpenToast.mock.calls[0][0])).toBe(SHARE_FAIL);
    expect(within(screen.getByTestId("free-tier")).getByText("D-117")).toBeInTheDocument();
  });

  it("AC-5[P1]: justSaved 진입이면 저장 토스트가 1회 뜬다", async () => {
    seed();
    renderResult("c1", { justSaved: true });
    await screen.findByTestId("free-tier");
    await waitFor(() => expect(mockOpenToast).toHaveBeenCalledTimes(1));
    expect(String(mockOpenToast.mock.calls[0][0])).toBe("계약을 저장했어요");
  });

  it("AC-5[P1]: state 없이 진입하면 토스트 없이 결과가 렌더되고, 통보 점검 행은 로그 후 이동한다", async () => {
    seed();
    renderResult();
    const free = await screen.findByTestId("free-tier");
    expect(within(free).getByText("D-117")).toBeInTheDocument();
    expect(mockOpenToast).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /집주인 인상 통보 점검하기/ }));
    expect(analytics.logClick).toHaveBeenCalledWith("result_notice_check");
    expect(mockNavigate).toHaveBeenCalledWith("/contracts/c1/notice");
  });
});

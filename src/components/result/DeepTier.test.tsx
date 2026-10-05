import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { mockAll, mockOpenToast } from "@/__tests__/__helpers__/mocks";
import { DeepTier } from "@/components/result/DeepTier";
import { logImpression } from "@/lib/analytics";
import { loadChecklist, SETTINGS_KEY } from "@/lib/settingsStorage";
import type { Contract } from "@/lib/types";

mockAll();

vi.mock("@/lib/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics")>()),
  logImpression: vi.fn(),
}));

const TODAY = "2026-10-06";
const DEADLINE = "2027-01-31";

const base: Contract = {
  id: "c1",
  nickname: "망원동 투룸",
  endDate: "2027-03-31",
  deposit: 200_000_000,
  monthlyRent: 0,
  renewalRightUsed: false,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

function setup(contract: Contract = base) {
  return render(React.createElement(DeepTier, { contract, deadlineDate: DEADLINE }));
}

const rows = () => screen.queryAllByTestId("scenario-row");
const items = () => screen.getAllByTestId("checklist-item");

describe("심화 층 컴포넌트 (DeepTier) — 전환 시나리오 비교·협상 체크리스트", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(`${TODAY}T09:00:00+09:00`));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ baseRatePercent: 2.5, baseRateAsOf: TODAY }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AC-1[P0]: 보증금 2억·월세 0·기준금리 2.5 → scenario-row 4행 문구", () => {
    setup();
    expect(screen.getByTestId("locked-tier")).toBeInTheDocument();
    expect(rows().map((r) => r.textContent)).toEqual([
      expect.stringContaining("전환 0% · 보증금 2억원 · 월세 상한 0원 · 연 0원"),
      expect.stringContaining("전환 25% · 보증금 1억 5,000만원 · 월세 상한 18만 7,500원 · 연 225만원"),
      expect.stringContaining("전환 50% · 보증금 1억원 · 월세 상한 37만 5,000원 · 연 450만원"),
      expect.stringContaining("전환 75% · 보증금 5,000만원 · 월세 상한 56만 2,500원 · 연 675만원"),
    ]);
    expect(rows()).toHaveLength(4);
  });

  it("AC-2[P0]: checklist-item 8행, 첫 행은 마감일 치환 + 법령 출처", () => {
    setup();
    expect(items()).toHaveLength(8);
    const first = items()[0];
    expect(first.textContent).toContain("갱신 요구는 2027-01-31까지 집주인에게 도달해야 해요");
    expect(first.textContent).not.toContain("{마감일}");
    expect(first.textContent).toContain("민법 제111조 제1항 · 주택임대차보호법 제6조의3 제1항");
    expect(within(first).getByRole("switch")).not.toBeChecked();
  });

  it("AC-3[P0]: 첫 행 Switch를 켜면 저장되고 다시 마운트해도 켜져 있다", () => {
    const { unmount } = setup();
    fireEvent.click(within(items()[0]).getByRole("switch"));
    expect(loadChecklist()["c1"]).toContain("deliver_by_deadline");
    expect(within(items()[0]).getByRole("switch")).toBeChecked();
    unmount();
    setup();
    expect(within(items()[0]).getByRole("switch")).toBeChecked();
    expect(within(items()[1]).getByRole("switch")).not.toBeChecked();
  });

  it("AC-4[P0]: 보증금 0이면 안내 문구, scenario-row 0개, checklist-item 8개", () => {
    setup({ ...base, deposit: 0, monthlyRent: 800_000 });
    expect(screen.getByText("보증금이 없어 전환 시나리오가 없어요")).toBeInTheDocument();
    expect(rows()).toHaveLength(0);
    expect(items()).toHaveLength(8);
  });

  it("AC-5[P0]: 저장 공간 부족이면 Switch가 꺼진 채 남고 토스트가 뜬다", () => {
    setup();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    fireEvent.click(within(items()[0]).getByRole("switch"));
    expect(within(items()[0]).getByRole("switch")).not.toBeChecked();
    expect(mockOpenToast).toHaveBeenCalledWith("저장 공간이 부족해 체크를 저장하지 못했어요");
    expect(loadChecklist()["c1"] ?? []).not.toContain("deliver_by_deadline");
  });

  it("마운트되면 logImpression('locked_tier')를 1회 호출한다", () => {
    setup();
    expect(logImpression).toHaveBeenCalledTimes(1);
    expect(logImpression).toHaveBeenCalledWith("locked_tier");
  });
});

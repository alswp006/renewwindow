import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { mockAll, mockOpenToast } from "@/__tests__/__helpers__/mocks";
import { ConversionCard } from "@/components/result/ConversionCard";
import { logClick } from "@/lib/analytics";
import { SETTINGS_KEY } from "@/lib/settingsStorage";
import type { Contract } from "@/lib/types";

mockAll();

vi.mock("@/lib/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics")>()),
  logClick: vi.fn(),
}));

const TODAY = "2026-10-06";
const AMOUNT_LABEL = "월세로 바꿀 보증금(원)";
const RATE_LABEL = "한국은행 기준금리(%)";

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
  return render(React.createElement(ConversionCard, { contract, today: TODAY }));
}

function calc(value: string) {
  fireEvent.change(screen.getByLabelText(AMOUNT_LABEL), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "계산하기" }));
}

const card = () => screen.getByTestId("conversion-card");
const stored = () => JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");

describe("월세 전환 카드·기준금리 BottomSheet (ConversionCard)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(`${TODAY}T09:00:00+09:00`));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ baseRatePercent: 2.5, baseRateAsOf: TODAY }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AC-1[P0]: 보증금 2억·월세 0, 5,000만원 전환 → 3행과 전환율 4.5%, conversion_calc 1회", () => {
    setup();
    calc("50000000");
    for (const t of ["남는 보증금", "1억 5,000만원", "늘어날 수 있는 월세 상한", "전환 후 월세 상한", "적용 전환율 4.5%"]) {
      expect(card().textContent).toContain(t);
    }
    expect(card().textContent!.match(/18만 7,500원/g)).toHaveLength(2);
    expect(logClick).toHaveBeenCalledTimes(1);
    expect(logClick).toHaveBeenCalledWith("conversion_calc");
  });

  it("AC-1[P0]: 보증금 1억·월세 50만원, 4,000만원 전환 → 6,000만원·15만원·65만원", () => {
    setup({ ...base, deposit: 100_000_000, monthlyRent: 500_000 });
    calc("40000000");
    for (const t of ["6,000만원", "15만원", "65만원"]) {
      expect(card().textContent).toContain(t);
    }
    expect(card().textContent).toContain("적용 전환율 4.5% · 기준금리 2.50%");
  });

  it("AC-2[P0]: 수정 → 3.25 저장하면 저장소 갱신·시트 닫힘·5.25%로 재계산", () => {
    setup();
    calc("50000000");
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    const sheet = screen.getByRole("dialog");
    fireEvent.change(within(sheet).getByLabelText(RATE_LABEL), { target: { value: "3.25" } });
    fireEvent.click(within(sheet).getByRole("button", { name: "저장" }));

    expect(stored()).toEqual({ baseRatePercent: 3.25, baseRateAsOf: TODAY });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(card().textContent).toContain("적용 전환율 5.25% · 기준금리 3.25%");
    // 5,000만 × 5.25% / 12 = 218,750
    expect(card().textContent).toContain("21만 8,750원");
  });

  it("AC-3[P0]: 0원·현재 보증금 초과 입력은 help 문구를 보이고 결과 행이 없다", () => {
    setup();
    calc("0");
    expect(card().textContent).toContain("전환할 금액을 입력해주세요");
    expect(screen.queryByText("남는 보증금")).toBeNull();
    calc("250000000");
    expect(card().textContent).toContain("현재 보증금보다 많이 전환할 수 없어요");
    expect(screen.queryByText("남는 보증금")).toBeNull();
    expect(screen.queryByText("늘어날 수 있는 월세 상한")).toBeNull();
  });

  it("AC-3[P0]: 기준금리 12·빈 값은 범위 오류를 보이고 settings는 그대로다", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    const sheet = screen.getByRole("dialog");
    for (const v of ["12", ""]) {
      fireEvent.change(within(sheet).getByLabelText(RATE_LABEL), { target: { value: v } });
      fireEvent.click(within(sheet).getByRole("button", { name: "저장" }));
      expect(sheet.textContent).toContain("기준금리는 0~10% 사이로 입력해주세요");
    }
    expect(stored()).toEqual({ baseRatePercent: 2.5, baseRateAsOf: TODAY });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("AC-4[P1]: 계산 전엔 안내 문구만 있고, 보증금 0이면 입력·버튼이 비활성이다", () => {
    const { unmount } = setup();
    expect(card().textContent).toContain("바꿀 금액을 넣으면 법정 상한 월세를 계산해요");
    expect(screen.queryByText("남는 보증금")).toBeNull();
    unmount();

    setup({ ...base, deposit: 0 });
    expect(screen.getByLabelText(AMOUNT_LABEL)).toBeDisabled();
    expect(screen.getByRole("button", { name: "계산하기" })).toBeDisabled();
    expect(card().textContent).toContain("보증금이 없어 월세 전환 계산을 할 수 없어요");
  });

  it("AC-5[P0]: 저장 공간 부족이면 시트·입력값·표시 전환율을 유지하고 토스트를 띄운다", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    const sheet = screen.getByRole("dialog");
    const input = within(sheet).getByLabelText(RATE_LABEL) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "3.25" } });

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    fireEvent.click(within(sheet).getByRole("button", { name: "저장" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect((within(screen.getByRole("dialog")).getByLabelText(RATE_LABEL) as HTMLInputElement).value).toBe("3.25");
    expect(mockOpenToast).toHaveBeenCalledWith("저장 공간이 부족해 기준금리를 저장하지 못했어요");
    expect(card().textContent).toContain("적용 전환율 4.5% · 기준금리 2.50%");
    expect(stored()).toEqual({ baseRatePercent: 2.5, baseRateAsOf: TODAY });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll, mockLogImpression } from "@/__tests__/__helpers__/mocks";
import { NoticeResultCard } from "./NoticeResultCard";
import type { Contract, NoticeCheck } from "@/lib/types";

mockAll();

const baseContract: Contract = {
  id: "c1",
  nickname: "우리집",
  endDate: "2027-05-20",
  deposit: 200000000,
  monthlyRent: 500000,
  renewalRightUsed: false,
  createdAt: "2026-10-01T00:00:00+09:00",
  updatedAt: "2026-10-01T00:00:00+09:00",
};

const baseCheck: NoticeCheck = {
  depositRatePercent: 4,
  rentRatePercent: 5,
  depositOver: 0,
  rentOver: 0,
  isOverCap: false,
  noticeTiming: "in_period",
  withinOneYearOfIncrease: false,
};

function renderCard(check: Partial<NoticeCheck> = {}, contract: Partial<Contract> = {}) {
  return render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(NoticeResultCard, {
        check: { ...baseCheck, ...check },
        contract: { ...baseContract, ...contract },
      }),
    ),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-06T09:00:00+09:00"));
});

describe("통보 점검 결과 카드 컴포넌트 (NoticeResultCard)", () => {
  it("AC-1: 상한 초과면 배지·인상률·초과액·통지 기간 안 문구가 보인다", () => {
    renderCard({
      depositRatePercent: 8,
      rentRatePercent: 10,
      depositOver: 6000000,
      rentOver: 25000,
      isOverCap: true,
    });
    expect(screen.getByTestId("notice-result")).toBeInTheDocument();
    expect(screen.getByText("상한 초과")).toBeInTheDocument();
    expect(screen.queryByText("상한 이내")).toBeNull();
    expect(screen.getByText("보증금 8.00% 인상 · 600만원 초과")).toBeInTheDocument();
    expect(screen.getByText("월세 10.00% 인상 · 2만 5,000원 초과")).toBeInTheDocument();
    expect(screen.getByText("집주인 통지 기간 안에 받은 통보예요")).toBeInTheDocument();
  });

  it("AC-2: 상한 이내면 배지와 인상률만 보이고 초과액은 '초과 없음'이다", () => {
    renderCard();
    expect(screen.getByText("상한 이내")).toBeInTheDocument();
    expect(screen.queryByText("상한 초과")).toBeNull();
    expect(screen.getByText("보증금 4.00% 인상")).toBeInTheDocument();
    expect(screen.getByText("월세 5.00% 인상")).toBeInTheDocument();
    expect(screen.getAllByText("초과 없음").length).toBeGreaterThanOrEqual(1);
  });

  it("AC-2: 인상률이 null인 항목과 월세 0원 계약의 월세 행은 그리지 않는다", () => {
    renderCard({ depositRatePercent: null, rentRatePercent: 5 });
    expect(screen.queryByText(/보증금 .*% 인상/)).toBeNull();
    expect(screen.getByText("월세 5.00% 인상")).toBeInTheDocument();
  });

  it("AC-2: 월세 0원 계약이면 월세 행이 없다", () => {
    renderCard({ rentRatePercent: null }, { monthlyRent: 0 });
    expect(screen.queryByText(/월세 .*% 인상/)).toBeNull();
    expect(screen.getByText("보증금 4.00% 인상")).toBeInTheDocument();
  });

  it("AC-3: 통지 기간이 지난 뒤·전 통보 문구가 각각 보인다", () => {
    const { unmount } = renderCard({ noticeTiming: "after_period" });
    expect(
      screen.getByText(
        "집주인 통지 기간(만기 6개월~2개월 전)이 지난 뒤 받은 통보예요 · 주택임대차보호법 제6조 제1항",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("집주인 통지 기간 안에 받은 통보예요")).toBeNull();
    unmount();
    renderCard({ noticeTiming: "before_period" });
    expect(screen.getByText("집주인 통지 기간 전에 받은 통보예요")).toBeInTheDocument();
    expect(screen.queryByText(/제6조 제1항/)).toBeNull();
  });

  it("AC-4: 1년 이내 재증액이면 최근 증액 문구가 보인다", () => {
    renderCard({ withinOneYearOfIncrease: true }, { lastIncreaseDate: "2026-03-01" });
    expect(
      screen.getByText(
        "최근 증액(2026-03-01) 후 1년이 지나지 않았어요 · 제7조 제1항: 증액 후 1년 이내 재증액 불가",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/제7조 제1항/)).toHaveLength(1);
  });

  it("AC-4: lastIncreaseDate가 없으면 재증액 문구는 0건이다", () => {
    renderCard({ withinOneYearOfIncrease: true });
    expect(screen.queryAllByText(/제7조 제1항/)).toHaveLength(0);
    expect(screen.queryAllByText(/최근 증액/)).toHaveLength(0);
  });

  it("마운트되면 logImpression('notice_result')를 1회 호출한다", () => {
    mockLogImpression.mockClear();
    renderCard();
    expect(mockLogImpression).toHaveBeenCalledTimes(1);
    expect(mockLogImpression).toHaveBeenCalledWith("notice_result");
  });
});

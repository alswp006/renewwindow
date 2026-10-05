import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll, mockLogClick } from "@/__tests__/__helpers__/mocks";
import { NoticeForm } from "@/components/notice/NoticeForm";

mockAll();

const baseContract = {
  endDate: "2027-05-20",
  deposit: 200000000,
  monthlyRent: 500000,
};

type Props = React.ComponentProps<typeof NoticeForm>;

function setToday(iso: string) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${iso}T09:00:00+09:00`));
}

function renderForm(props: Partial<Props> = {}) {
  const onValid = vi.fn();
  render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(NoticeForm, {
        contract: baseContract,
        onValid,
        ...props,
      } as Props),
    ),
  );
  return onValid;
}

const change = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: "점검하기" }));
const textboxes = () => screen.queryAllByRole("textbox") as HTMLInputElement[];

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  setToday("2026-10-06");
});

describe("통보 입력 폼 컴포넌트 (NoticeForm)", () => {
  it("AC-1[P0]: 인상률 입력을 제출하면 계산된 금액으로 onValid와 logClick이 1회 호출된다", () => {
    setToday("2027-01-10");
    const onValid = renderForm();
    change(/통보일/, "20261220");
    change(/보증금 인상률/, "4");
    change(/월세 인상률/, "5");
    submit();
    expect(onValid).toHaveBeenCalledTimes(1);
    expect(onValid).toHaveBeenCalledWith(
      expect.objectContaining({
        noticeDate: "2026-12-20",
        newDeposit: 208000000,
        newMonthlyRent: 525000,
        inputMode: "rate",
      }),
    );
    expect(mockLogClick).toHaveBeenCalledTimes(1);
    expect(mockLogClick).toHaveBeenCalledWith("notice_check_submit");
  });

  it("AC-2[P0]: 미래 통보일·빈 통보일은 통보일 help에 문구가 보이고 onValid는 0회다", () => {
    const onValid = renderForm();
    change(/보증금 인상률/, "4");
    change(/월세 인상률/, "5");
    change(/통보일/, "");
    submit();
    expect(screen.getByText("통보일을 YYYY-MM-DD 형식으로 입력해주세요")).toBeInTheDocument();
    expect(screen.queryByText("통보일은 오늘 이전 날짜로 입력해주세요")).not.toBeInTheDocument();
    expect(onValid).toHaveBeenCalledTimes(0);
  });

  it("AC-2[P0]: 인상률이 101이면 범위 문구가 보이고 onValid는 0회다", () => {
    const onValid = renderForm();
    change(/통보일/, "20260930");
    change(/보증금 인상률/, "101");
    change(/월세 인상률/, "5");
    submit();
    expect(screen.getByText("인상률은 0~100% 사이로 입력해주세요")).toBeInTheDocument();
    expect(onValid).toHaveBeenCalledTimes(0);
    expect(mockLogClick).not.toHaveBeenCalled();
  });

  it("AC-3[P0]: 새 금액 탭에서 보증금이 비면 필드 문구가 보이고 onValid는 0회다", () => {
    const onValid = renderForm();
    fireEvent.click(screen.getByRole("tab", { name: "새 금액으로 입력" }));
    change(/통보일/, "20260930");
    change(/새 월세/, "550000");
    submit();
    expect(screen.getByText("새 보증금을 입력해주세요")).toBeInTheDocument();
    expect(onValid).toHaveBeenCalledTimes(0);
  });

  it("AC-3[P0]: 새 월세가 10000001이면 범위 문구가 보이고 onValid는 0회다", () => {
    const onValid = renderForm();
    fireEvent.click(screen.getByRole("tab", { name: "새 금액으로 입력" }));
    change(/통보일/, "20260930");
    change(/새 보증금/, "216000000");
    change(/새 월세/, "10000001");
    submit();
    expect(screen.getByText("새 월세는 0원~1,000만원 사이로 입력해주세요")).toBeInTheDocument();
    expect(screen.queryByText("새 보증금을 입력해주세요")).not.toBeInTheDocument();
    expect(onValid).toHaveBeenCalledTimes(0);
  });

  it("AC-4[P1]: 월세 0원 계약이면 월세 입력칸이 없고 통보일·보증금 2칸만 렌더된다", () => {
    renderForm({ contract: { ...baseContract, monthlyRent: 0 } });
    expect(screen.queryByLabelText(/월세/)).not.toBeInTheDocument();
    expect(textboxes()).toHaveLength(2);
    fireEvent.click(screen.getByRole("tab", { name: "새 금액으로 입력" }));
    expect(screen.queryByLabelText(/월세/)).not.toBeInTheDocument();
    expect(textboxes()).toHaveLength(2);
  });

  it("AC-4[P1]: initial로 새 금액 탭과 입력값이 복원된다", () => {
    renderForm({
      initial: {
        inputMode: "amount",
        noticeDate: "2026-12-20",
        newDeposit: 216000000,
        newMonthlyRent: 550000,
      },
    } as Partial<Props>);
    expect(screen.getByRole("tab", { name: "새 금액으로 입력" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "인상률로 입력" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(textboxes().map((e) => e.value)).toEqual(["2026-12-20", "216,000,000", "550,000"]);
  });
});

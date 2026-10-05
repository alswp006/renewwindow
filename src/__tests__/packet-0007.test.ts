import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { AmountField } from "@/components/AmountField";
import { DateField } from "@/components/DateField";
import { NotFoundState } from "@/components/NotFoundState";

mockAll();

const wrap = (el: React.ReactElement) => render(React.createElement(MemoryRouter, null, el));

const scrollSpy = vi.fn();

beforeEach(() => {
  scrollSpy.mockClear();
  Element.prototype.scrollIntoView = scrollSpy;
});

describe("공용 입력 필드 — 금액·날짜 TextField, 계약 없음 상태", () => {
  it("AC-1: AmountField는 천 단위 콤마로 보이고 onChange에는 숫자만 넘긴다", () => {
    const onChange = vi.fn();
    wrap(React.createElement(AmountField, { label: "보증금", value: "", onChange, placeholder: "예: 200,000,000" }));
    const input = screen.getByPlaceholderText("예: 200,000,000") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "200000000" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("200000000");
    expect(input.getAttribute("inputmode")).toBe("numeric");
  });

  it("AC-1: AmountField는 value가 숫자 문자열이면 콤마 포맷으로 표시하고 숫자 외 문자는 버린다", () => {
    const onChange = vi.fn();
    wrap(React.createElement(AmountField, { label: "보증금", value: "200000000", onChange, placeholder: "금액" }));
    const input = screen.getByPlaceholderText("금액") as HTMLInputElement;
    expect(input.value).toBe("200,000,000");
    fireEvent.change(input, { target: { value: "1,2a3" } });
    expect(onChange).toHaveBeenLastCalledWith("123");
  });

  it("AC-2: DateField는 8자리 입력을 YYYY-MM-DD로 보여주고 type=date를 쓰지 않는다", () => {
    const Harness = () => {
      const [v, setV] = React.useState("");
      return React.createElement(DateField, { label: "만기일", value: v, onChange: setV, placeholder: "예: 2027-03-31" });
    };
    wrap(React.createElement(Harness));
    const input = screen.getByPlaceholderText("예: 2027-03-31") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "20270331" } });
    expect(input.value).toBe("2027-03-31");
    expect(input.getAttribute("inputmode")).toBe("numeric");
    expect(input.getAttribute("type")).not.toBe("date");
  });

  it("AC-3: AmountField 포커스 시 scrollIntoView({block:'center'})가 1회 호출되고 Enter로 onEnter가 호출된다", () => {
    const onEnter = vi.fn();
    wrap(React.createElement(AmountField, { label: "보증금", value: "", onChange: vi.fn(), onEnter, placeholder: "금액" }));
    const input = screen.getByPlaceholderText("금액");
    fireEvent.focus(input);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy).toHaveBeenCalledWith({ block: "center" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it("AC-3: DateField 포커스 시 scrollIntoView({block:'center'})가 1회 호출되고 Enter로 onEnter가 호출된다", () => {
    const onEnter = vi.fn();
    wrap(React.createElement(DateField, { label: "만기일", value: "", onChange: vi.fn(), onEnter, placeholder: "날짜" }));
    const input = screen.getByPlaceholderText("날짜");
    fireEvent.focus(input);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy).toHaveBeenCalledWith({ block: "center" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it("AC-4: NotFoundState는 문구와 '목록으로' 버튼을 보여주고 탭하면 onBack이 1회 호출된다", () => {
    const onBack = vi.fn();
    wrap(React.createElement(NotFoundState, { testId: "result-not-found", onBack }));
    const area = screen.getByTestId("result-not-found");
    expect(within(area).getByText("계약을 찾을 수 없어요")).toBeInTheDocument();
    const btn = within(area).getByRole("button", { name: "목록으로" });
    fireEvent.click(btn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

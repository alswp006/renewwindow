import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { AmountField } from "@/components/AmountField";
import { DateField } from "@/components/DateField";
import { NotFoundState } from "@/components/NotFoundState";

mockAll();

const scrollSpy = vi.fn();

beforeEach(() => {
  scrollSpy.mockClear();
  Element.prototype.scrollIntoView = scrollSpy;
});

describe("공용 입력 필드", () => {
  it("AC-1: AmountField — 콤마로 보이고 onChange는 숫자만 받는다", () => {
    const onChange = vi.fn();
    const { rerender } = render(<AmountField label="보증금" value="" onChange={onChange} placeholder="금액" />);
    const input = screen.getByPlaceholderText("금액") as HTMLInputElement;
    expect(input.getAttribute("inputmode")).toBe("numeric");
    fireEvent.change(input, { target: { value: "200000000" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("200000000");
    rerender(<AmountField label="보증금" value="200000000" onChange={onChange} placeholder="금액" />);
    expect(input.value).toBe("200,000,000");
  });

  it("AC-2: DateField — 8자리를 YYYY-MM-DD로 바꾸고 type=date를 쓰지 않는다", () => {
    const Harness = () => {
      const [v, setV] = React.useState("");
      return <DateField label="만기일" value={v} onChange={setV} placeholder="날짜" />;
    };
    render(<Harness />);
    const input = screen.getByPlaceholderText("날짜") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "20270331" } });
    expect(input.value).toBe("2027-03-31");
    expect(input.getAttribute("inputmode")).toBe("numeric");
    expect(input.getAttribute("type")).not.toBe("date");
  });

  it("AC-3: 포커스하면 scrollIntoView를 1회 부르고 Enter로 onEnter를 부른다", () => {
    const onEnterA = vi.fn();
    const onEnterD = vi.fn();
    render(
      <>
        <AmountField label="보증금" value="" onChange={vi.fn()} onEnter={onEnterA} placeholder="금액" />
        <DateField label="만기일" value="" onChange={vi.fn()} onEnter={onEnterD} placeholder="날짜" />
      </>,
    );
    const amount = screen.getByPlaceholderText("금액");
    fireEvent.focus(amount);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy).toHaveBeenCalledWith({ block: "center" });
    fireEvent.keyDown(amount, { key: "Enter" });
    expect(onEnterA).toHaveBeenCalledTimes(1);

    scrollSpy.mockClear();
    const date = screen.getByPlaceholderText("날짜");
    fireEvent.focus(date);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy).toHaveBeenCalledWith({ block: "center" });
    fireEvent.keyDown(date, { key: "Enter" });
    expect(onEnterD).toHaveBeenCalledTimes(1);
  });

  it("AC-4: NotFoundState — 문구와 목록으로 버튼, 탭하면 onBack 1회", () => {
    const onBack = vi.fn();
    render(<NotFoundState testId="result-not-found" onBack={onBack} />);
    const area = screen.getByTestId("result-not-found");
    expect(within(area).getByText("계약을 찾을 수 없어요")).toBeInTheDocument();
    fireEvent.click(within(area).getByRole("button", { name: "목록으로" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

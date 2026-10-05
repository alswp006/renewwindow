import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll, mockLogClick } from "@/__tests__/__helpers__/mocks";
import { NoticeForm } from "@/components/notice/NoticeForm";

mockAll();

const contract = { endDate: "2027-05-20", deposit: 200000000, monthlyRent: 500000 };

function renderForm(props: Partial<React.ComponentProps<typeof NoticeForm>> = {}) {
  const onValid = vi.fn();
  render(
    <MemoryRouter>
      <NoticeForm contract={contract} onValid={onValid} {...props} />
    </MemoryRouter>,
  );
  return onValid;
}

const change = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: "점검하기" }));
const textboxes = () => screen.queryAllByRole("textbox") as HTMLInputElement[];

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-06T09:00:00+09:00"));
});

describe("NoticeForm", () => {
  it("인상률 입력을 제출하면 계산된 금액으로 onValid·logClick이 1회 호출된다", () => {
    const onValid = renderForm();
    change(/통보일/, "20261001");
    change(/보증금 인상률/, "4");
    change(/월세 인상률/, "5");
    submit();
    expect(onValid).toHaveBeenCalledTimes(1);
    expect(onValid).toHaveBeenCalledWith({
      noticeDate: "2026-10-01",
      newDeposit: 208000000,
      newMonthlyRent: 525000,
      inputMode: "rate",
    });
    expect(mockLogClick).toHaveBeenCalledWith("notice_check_submit");
  });

  it("빈 통보일은 통보일 help에 문구가 보이고 onValid는 0회다", () => {
    const onValid = renderForm();
    change(/보증금 인상률/, "4");
    change(/월세 인상률/, "5");
    change(/통보일/, "");
    submit();
    expect(screen.getByText("통보일을 YYYY-MM-DD 형식으로 입력해주세요")).toBeInTheDocument();
    expect(onValid).not.toHaveBeenCalled();
    expect(mockLogClick).not.toHaveBeenCalled();
  });

  it("새 금액 탭에서 월세가 범위를 넘으면 해당 필드에 문구가 보인다", () => {
    const onValid = renderForm();
    fireEvent.click(screen.getByRole("tab", { name: "새 금액으로 입력" }));
    change(/통보일/, "20261001");
    change(/새 보증금/, "216000000");
    change(/새 월세/, "10000001");
    submit();
    expect(screen.getByText("새 월세는 0원~1,000만원 사이로 입력해주세요")).toBeInTheDocument();
    expect(onValid).not.toHaveBeenCalled();
  });

  it("월세 0원 계약은 월세 칸이 없다", () => {
    renderForm({ contract: { ...contract, monthlyRent: 0 } });
    expect(screen.queryByLabelText(/월세/)).not.toBeInTheDocument();
    expect(textboxes()).toHaveLength(2);
  });

  it("initial로 탭과 입력값이 복원된다", () => {
    renderForm({
      initial: { inputMode: "amount", noticeDate: "2026-12-20", newDeposit: 216000000, newMonthlyRent: 550000 },
    });
    expect(screen.getByRole("tab", { name: "새 금액으로 입력" })).toHaveAttribute("aria-selected", "true");
    expect(textboxes().map((e) => e.value)).toEqual(["2026-12-20", "216,000,000", "550,000"]);
  });
});

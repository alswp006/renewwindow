import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { DeleteContractButton } from "@/components/DeleteContractButton";
import { CONTRACTS_KEY, loadContracts } from "@/lib/storage";
import { CHECKLIST_KEY, loadChecklist } from "@/lib/settingsStorage";
import type { Contract } from "@/lib/types";

mockAll();

const target: Contract = {
  id: "c-mangwon",
  nickname: "망원동 투룸",
  endDate: "2027-03-31",
  deposit: 200_000_000,
  monthlyRent: 0,
  renewalRightUsed: false,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};
const other: Contract = { ...target, id: "c-other", nickname: "성수동 원룸" };

function setup() {
  const onDeleted = vi.fn();
  render(<DeleteContractButton contract={target} onDeleted={onDeleted} />);
  return { onDeleted };
}

describe("DeleteContractButton", () => {
  beforeEach(() => {
    localStorage.setItem(CONTRACTS_KEY, JSON.stringify([target, other]));
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify({ [target.id]: ["a"], [other.id]: ["c"] }));
  });

  it("AC-1: '계약 삭제'를 누르면 계약 이름이 든 확인 다이얼로그가 열린다", () => {
    setup();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "계약 삭제" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("망원동 투룸 계약을 삭제할까요?");
    expect(within(dialog).getByRole("button", { name: "닫기" })).toBeInTheDocument();
    expect(dialog.textContent).not.toContain("취소");
  });

  it("AC-2: '삭제'를 누르면 계약·체크리스트가 지워지고 onDeleted가 1회 호출된다", () => {
    const { onDeleted } = setup();
    fireEvent.click(screen.getByRole("button", { name: "계약 삭제" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "삭제" }));

    expect(loadContracts().contracts.map((c) => c.id)).toEqual(["c-other"]);
    expect(loadChecklist()[target.id]).toBeUndefined();
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("AC-3: '닫기'를 누르면 다이얼로그가 닫히고 저장소는 그대로이며 onDeleted는 0회다", () => {
    const { onDeleted } = setup();
    fireEvent.click(screen.getByRole("button", { name: "계약 삭제" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "닫기" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(loadContracts().contracts).toHaveLength(2);
    expect(loadChecklist()[target.id]).toEqual(["a"]);
    expect(onDeleted).not.toHaveBeenCalled();
  });
});

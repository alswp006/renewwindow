import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { DeleteContractButton } from "@/components/DeleteContractButton";
import { CONTRACTS_KEY, loadContracts } from "@/lib/storage";
import { CHECKLIST_KEY, loadChecklist } from "@/lib/settingsStorage";
import type { Contract } from "@/lib/types";

mockAll();

const h = React.createElement;

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

function seed() {
  localStorage.setItem(CONTRACTS_KEY, JSON.stringify([target, other]));
  localStorage.setItem(
    CHECKLIST_KEY,
    JSON.stringify({ [target.id]: ["a", "b"], [other.id]: ["c"] }),
  );
}

function setup() {
  const onDeleted = vi.fn();
  render(
    h(MemoryRouter, null, h(DeleteContractButton, { contract: target, onDeleted })),
  );
  return { onDeleted };
}

describe("계약 삭제 버튼·확인 다이얼로그 (DeleteContractButton)", () => {
  beforeEach(() => {
    seed();
  });

  it("AC-1: 처음엔 다이얼로그가 없고 '계약 삭제'를 누르면 계약 이름이 든 확인 문구가 열린다", () => {
    setup();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "계약 삭제" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("망원동 투룸 계약을 삭제할까요?");
    expect(within(dialog).getByRole("button", { name: "닫기" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "삭제" })).toBeInTheDocument();
  });

  it("AC-1: 다이얼로그에 '취소' 문구가 없다", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "계약 삭제" }));
    expect(screen.getByRole("alertdialog").textContent).not.toContain("취소");
    expect(screen.queryByRole("button", { name: "취소" })).toBeNull();
  });

  it("AC-2: '삭제'를 누르면 계약·체크리스트가 지워지고 onDeleted가 1회 호출된다", () => {
    const { onDeleted } = setup();
    fireEvent.click(screen.getByRole("button", { name: "계약 삭제" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "삭제" }));

    const ids = loadContracts().contracts.map((c) => c.id);
    expect(ids).toEqual(["c-other"]);
    expect(loadChecklist()[target.id]).toBeUndefined();
    expect(loadChecklist()[other.id]).toEqual(["c"]);
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("AC-2: 컴포넌트가 직접 페이지 이동하지 않는다(이동은 부모 몫)", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "계약 삭제" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "삭제" }));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(loadContracts().contracts).toHaveLength(1);
  });

  it("AC-3: '닫기'를 누르면 다이얼로그만 닫히고 저장소는 그대로이며 onDeleted는 0회다", () => {
    const { onDeleted } = setup();
    fireEvent.click(screen.getByRole("button", { name: "계약 삭제" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "닫기" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(loadContracts().contracts.map((c) => c.id)).toEqual(["c-mangwon", "c-other"]);
    expect(loadChecklist()[target.id]).toEqual(["a", "b"]);
    expect(onDeleted).toHaveBeenCalledTimes(0);
  });

  it("AC-3: 닫은 뒤 다시 '계약 삭제'를 눌러도 다이얼로그가 다시 열린다", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "계약 삭제" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "닫기" }));
    fireEvent.click(screen.getByRole("button", { name: "계약 삭제" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("망원동 투룸 계약을 삭제할까요?");
    expect(loadContracts().contracts).toHaveLength(2);
  });
});

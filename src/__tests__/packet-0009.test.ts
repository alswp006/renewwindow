import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { mockAll, mockLogClick } from "@/__tests__/__helpers__/mocks";
import { ContractForm } from "@/components/ContractForm";
import type { Contract } from "@/lib/types";

mockAll();

const h = React.createElement;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-06T09:00:00+09:00"));
  Element.prototype.scrollIntoView = vi.fn();
});

function renderForm(props: Record<string, unknown> = {}) {
  const onSubmit = vi.fn();
  render(h(MemoryRouter, null, h(ContractForm, { onSubmit, ...props } as never)));
  return onSubmit;
}

// 입력 순서: 계약 이름, 만기일, 보증금, 월세, 최근 증액일
const inputs = () => screen.getAllByRole("textbox") as HTMLInputElement[];

function fill(values: (string | undefined)[]) {
  const els = inputs();
  values.forEach((v, i) => {
    if (v !== undefined) fireEvent.change(els[i], { target: { value: v } });
  });
}

const save = () => fireEvent.click(screen.getByRole("button", { name: "저장" }));

describe("계약 입력 폼 컴포넌트 (ContractForm)", () => {
  it("AC-1[P0]: 유효한 값을 저장하면 포맷된 값이 보이고 onSubmit·logClick이 1회 호출된다", () => {
    const onSubmit = renderForm();
    fill(["망원동 투룸", "20270331", "200000000", "0"]);
    save();
    const els = inputs();
    expect(els[1].value).toBe("2027-03-31");
    expect(els[2].value).toBe("200,000,000");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      nickname: "망원동 투룸",
      endDate: "2027-03-31",
      deposit: 200000000,
      monthlyRent: 0,
      renewalRightUsed: false,
    });
    expect(mockLogClick).toHaveBeenCalledTimes(1);
    expect(mockLogClick).toHaveBeenCalledWith("contract_save");
  });

  it("AC-2[P0]: 검증 실패면 필드별 help를 보이고 첫 에러 필드(계약 이름)로 포커스한다", () => {
    const onSubmit = renderForm();
    fill(["", "2027-13-01", "0", "0"]);
    save();
    expect(onSubmit).toHaveBeenCalledTimes(0);
    expect(screen.getByText("계약 이름을 입력해주세요")).toBeInTheDocument();
    expect(screen.getByText("만기일을 YYYY-MM-DD 형식으로 입력해주세요")).toBeInTheDocument();
    expect(screen.getByText("보증금이나 월세 중 하나는 입력해주세요")).toBeInTheDocument();
    expect(document.activeElement).toBe(inputs()[0]);
  });

  it("AC-3[P0]: 최근 증액일이 오늘 이후면 에러를 보이고 onSubmit은 호출되지 않는다", () => {
    const onSubmit = renderForm();
    fill(["망원동 투룸", "20270331", "200000000", "0", "20261007"]);
    save();
    expect(screen.getByText("최근 증액일은 오늘 이전이어야 해요")).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledTimes(0);
    expect(document.activeElement).toBe(inputs()[4]);
  });

  it("AC-3[P1]: initial을 주면 기존 값이 콤마 포함으로 채워진다", () => {
    const initial: Contract = {
      id: "c1",
      nickname: "합정 원룸",
      endDate: "2027-05-20",
      deposit: 50000000,
      monthlyRent: 650000,
      renewalRightUsed: true,
      lastIncreaseDate: "2025-05-21",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    renderForm({ initial });
    const els = inputs();
    expect(els.map((e) => e.value)).toEqual(["합정 원룸", "2027-05-20", "50,000,000", "650,000", "2025-05-21"]);
    expect((screen.getByRole("switch") as HTMLInputElement).checked).toBe(true);
  });

  it("AC-4[P1]: loading이면 모든 입력이 disabled다", () => {
    renderForm({ loading: true });
    const els = inputs();
    expect(els).toHaveLength(5);
    expect(els.every((e) => e.disabled)).toBe(true);
  });

  it("AC-4[P1]: Switch 행을 탭하면 토글되고 저장 값에 반영된다", () => {
    const onSubmit = renderForm();
    const sw = screen.getByRole("switch") as HTMLInputElement;
    expect(sw.checked).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /갱신요구권/ }));
    expect((screen.getByRole("switch") as HTMLInputElement).checked).toBe(true);
    fill(["망원동 투룸", "20270331", "200000000", "0"]);
    save();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ renewalRightUsed: true }));
  });

  it("AC-4[P1]: 마지막 필드에서 Enter를 누르면 저장과 같은 검증이 실행된다", () => {
    const onSubmit = renderForm();
    fill(["망원동 투룸", "20270331", "200000000", "0"]);
    fireEvent.keyDown(inputs()[4], { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ nickname: "망원동 투룸", deposit: 200000000 }));
  });

  it("AC-4[P2]: extra 슬롯 내용이 렌더된다", () => {
    renderForm({ extra: h("button", { type: "button" }, "계약 삭제") });
    expect(screen.getByRole("button", { name: "계약 삭제" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument();
  });
});

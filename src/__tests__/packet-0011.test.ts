import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { mockTds, mockAppsInToss, mockAnalytics, mockOpenToast } from "@/__tests__/__helpers__/mocks";
import ContractEdit from "@/pages/ContractEdit";
import type { Contract } from "@/lib/types";

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  forceQuota: false,
  forceLoading: false,
}));

mockTds();
mockAppsInToss();
mockAnalytics();

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")),
  useNavigate: () => h.navigate,
}));

vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>();
  return {
    ...actual,
    saveContract: (draft: Parameters<typeof actual.saveContract>[0]) =>
      h.forceQuota ? { ok: false, error: "quota", quota: true } : actual.saveContract(draft),
  };
});

vi.mock("@/hooks/useContracts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useContracts")>();
  return {
    ...actual,
    useContract: (id: string) => {
      const real = actual.useContract(id);
      return h.forceLoading ? { ...real, status: "loading", contract: undefined } : real;
    },
  };
});

const KEY = "renewwindow:contracts:v1";

function make(id: string, nickname: string, deposit = 200000000): Contract {
  return {
    id,
    nickname,
    endDate: "2027-03-31",
    deposit,
    monthlyRent: 0,
    renewalRightUsed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const stored = (): Contract[] => JSON.parse(localStorage.getItem(KEY) ?? "[]");

function renderAt(path: string) {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [path] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, { path: "/contracts/new", element: React.createElement(ContractEdit) }),
        React.createElement(Route, { path: "/contracts/:id/edit", element: React.createElement(ContractEdit) }),
      ),
    ),
  );
}

// 입력 순서: 계약 이름, 만기일, 보증금, 월세, 최근 증액일
const inputs = () => screen.getAllByRole("textbox") as HTMLInputElement[];
const save = () => fireEvent.click(screen.getByRole("button", { name: "저장" }));

function fillNew() {
  const els = inputs();
  fireEvent.change(els[0], { target: { value: "망원동 투룸" } });
  fireEvent.change(els[1], { target: { value: "20270331" } });
  fireEvent.change(els[2], { target: { value: "200000000" } });
  fireEvent.change(els[3], { target: { value: "0" } });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-06T09:00:00+09:00"));
  Element.prototype.scrollIntoView = vi.fn();
  h.navigate.mockClear();
  mockOpenToast.mockClear();
  h.forceQuota = false;
  h.forceLoading = false;
});

describe("계약 입력 화면 (/contracts/new, /contracts/:id/edit)", () => {
  it("AC-1[P0]: 신규 저장하면 1건이 생기고 /contracts/{id}로 replace 이동하며 state {justSaved:true}를 넘긴다", async () => {
    renderAt("/contracts/new");
    expect(await screen.findByText("계약 등록")).toBeInTheDocument();
    fillNew();
    save();
    const list = stored();
    expect(list).toHaveLength(1);
    expect(list[0].nickname).toBe("망원동 투룸");
    expect(h.navigate).toHaveBeenCalledTimes(1);
    expect(h.navigate).toHaveBeenCalledWith(`/contracts/${list[0].id}`, {
      replace: true,
      state: { justSaved: true },
    });
  });

  it("AC-1[P0]: 검증에 실패하면 저장하지 않고 이동하지 않는다", async () => {
    renderAt("/contracts/new");
    await screen.findByText("계약 등록");
    save();
    expect(stored()).toHaveLength(0);
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it("AC-2[P0]: 수정 모드에서 보증금을 180000000으로 바꿔 저장하면 1건 그대로 deposit만 바뀐다", async () => {
    localStorage.setItem(KEY, JSON.stringify([make("m1", "망원동 투룸")]));
    renderAt("/contracts/m1/edit");
    expect(await screen.findByText("계약 수정")).toBeInTheDocument();
    expect(inputs()[0].value).toBe("망원동 투룸");
    fireEvent.change(inputs()[2], { target: { value: "180000000" } });
    save();
    const list = stored();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("m1");
    expect(list[0].deposit).toBe(180000000);
    expect(h.navigate).toHaveBeenCalledWith("/contracts/m1", { replace: true, state: { justSaved: true } });
  });

  it("AC-3[P0]: 계약 20건에서 신규 저장하면 최대 건수 토스트를 띄우고 이동하지 않는다", async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify(Array.from({ length: 20 }, (_, i) => make(`c${i}`, `계약 ${i}`))),
    );
    renderAt("/contracts/new");
    await screen.findByText("계약 등록");
    fillNew();
    save();
    expect(mockOpenToast).toHaveBeenCalledTimes(1);
    expect(mockOpenToast.mock.calls[0][0]).toBe("계약은 최대 20건까지 등록할 수 있어요");
    expect(stored()).toHaveLength(20);
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it("AC-3[P0]: saveContract가 quota를 반환하면 저장 공간 토스트를 띄우고 이동하지 않는다", async () => {
    h.forceQuota = true;
    renderAt("/contracts/new");
    await screen.findByText("계약 등록");
    fillNew();
    save();
    expect(mockOpenToast).toHaveBeenCalledTimes(1);
    expect(mockOpenToast.mock.calls[0][0]).toBe("저장 공간이 부족해 저장하지 못했어요");
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it("AC-4[P0]: 없는 id의 수정 화면은 폼 없이 NotFoundState를 보이고 목록으로를 누르면 /로 replace 이동한다", async () => {
    renderAt("/contracts/abc/edit");
    expect(await screen.findByText("계약을 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
    expect(h.navigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("AC-4[P0]: 계약을 읽기 전 loading 상태에서는 input이 disabled다", () => {
    localStorage.setItem(KEY, JSON.stringify([make("m1", "망원동 투룸")]));
    h.forceLoading = true;
    renderAt("/contracts/m1/edit");
    const els = inputs();
    expect(els.length).toBe(5);
    expect(els.every((el) => el.disabled)).toBe(true);
    expect(screen.queryByText("계약을 찾을 수 없어요")).toBeNull();
  });

  it("AC-5[P0]: 수정 모드에서 삭제를 확인하면 저장소에서 지우고 /로 replace 이동하며 toast state를 넘긴다", async () => {
    localStorage.setItem(KEY, JSON.stringify([make("m1", "망원동 투룸"), make("m2", "연남동 원룸")]));
    renderAt("/contracts/m1/edit");
    await screen.findByText("계약 수정");
    fireEvent.click(screen.getByRole("button", { name: "계약 삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(stored().map((c) => c.id)).toEqual(["m2"]);
    expect(h.navigate).toHaveBeenCalledWith("/", { replace: true, state: { toast: "계약을 삭제했어요" } });
  });

  it("AC-5[P1]: 신규 모드에는 삭제 버튼이 없다", async () => {
    renderAt("/contracts/new");
    await screen.findByText("계약 등록");
    expect(screen.queryByRole("button", { name: "계약 삭제" })).toBeNull();
    expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import {
  mockTds,
  mockAppsInToss,
  mockAnalytics,
  mockNavigate,
  mockOpenToast,
  mockLogClick,
} from "@/__tests__/__helpers__/mocks";
import Home from "@/pages/Home";
import * as storage from "@/lib/storage";
import type { Contract } from "@/lib/types";

mockTds();
mockAppsInToss();
mockAnalytics();

// 실제 라우터를 쓰되 navigate 호출만 기록한다(state 비우기는 실제 location으로 확인).
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => {
      const real = actual.useNavigate();
      return (to: any, opts?: any) => {
        mockNavigate(to, opts);
        return real(to, opts);
      };
    },
  };
});

vi.mock("@/components/AdSlot", () => ({
  AdSlot: () => React.createElement("div", { "data-testid": "ad-slot" }),
  default: () => React.createElement("div", { "data-testid": "ad-slot" }),
}));

vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>();
  return { ...actual, loadContracts: vi.fn(actual.loadContracts) };
});

const realLoad = (await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage")).loadContracts;

function make(id: string, nickname: string, endDate: string): Contract {
  return {
    id,
    nickname,
    endDate,
    deposit: 50000000,
    monthlyRent: 650000,
    renewalRightUsed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function seed(list: Contract[]) {
  localStorage.setItem("renewwindow:contracts:v1", JSON.stringify(list));
}

const StateProbe = () => {
  const loc = useLocation();
  return React.createElement("div", { "data-testid": "probe" }, JSON.stringify(loc.state ?? null));
};

function renderHome(state?: unknown) {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [{ pathname: "/", state }] },
      React.createElement(Home),
      React.createElement(StateProbe),
    ),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-06T09:00:00+09:00"));
  vi.mocked(storage.loadContracts).mockReset();
  vi.mocked(storage.loadContracts).mockImplementation(realLoad);
  mockNavigate.mockClear();
  mockOpenToast.mockClear();
  mockLogClick.mockClear();
});

const four = () => [
  make("a", "A 계약", "2027-03-31"),
  make("b", "B 계약", "2027-04-30"),
  make("c", "C 계약", "2026-11-30"),
  make("d", "D 계약", "2027-01-15"),
];

const rowOf = (name: string) =>
  screen.getByText(name).closest('[role="button"], li, button') as HTMLElement;

describe("홈 화면 (/) — 가까운 창구 순 계약 목록 + 배너", () => {
  it("AC-1: 가까운 창구 순서로 행·상태·D-day를 보이고 AdSlot은 1개다", async () => {
    seed(four());
    renderHome();
    await screen.findByText("D 계약");

    const text = document.body.textContent ?? "";
    const idx = ["D 계약", "A 계약", "B 계약", "C 계약"].map((n) => text.indexOf(n));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((x, y) => x - y)).toEqual(idx);

    const d = within(rowOf("D 계약"));
    expect(d.getByText("요구 가능")).toBeInTheDocument();
    expect(d.getByText("마감 D-40")).toBeInTheDocument();
    const a = within(rowOf("A 계약"));
    expect(a.getByText("요구 가능")).toBeInTheDocument();
    expect(a.getByText("마감 D-117")).toBeInTheDocument();
    const b = within(rowOf("B 계약"));
    expect(b.getByText("시작 전")).toBeInTheDocument();
    expect(b.getByText("시작 D-24")).toBeInTheDocument();
    const c = within(rowOf("C 계약"));
    expect(c.getByText("기간 지남")).toBeInTheDocument();
    expect(c.getByText("-")).toBeInTheDocument();

    expect(screen.getAllByTestId("ad-slot")).toHaveLength(1);
    expect(screen.queryByTestId("home-empty")).toBeNull();
    expect(screen.queryByTestId("home-loading")).toBeNull();
  });

  it("AC-2: 행을 탭하면 /contracts/{id}로 가고 home_contract_open이 1회 기록된다", async () => {
    seed(four());
    renderHome();
    await screen.findByText("D 계약");

    fireEvent.click(screen.getByText("D 계약"));
    expect(mockNavigate.mock.calls.map((c) => c[0])).toContain("/contracts/d");
    expect(mockLogClick.mock.calls.filter((c) => c[0] === "home_contract_open")).toHaveLength(1);
  });

  it("AC-2: '계약 추가'를 탭하면 /contracts/new로 가고 home_add_contract가 기록된다", async () => {
    seed(four());
    renderHome();
    await screen.findByText("D 계약");

    fireEvent.click(screen.getByRole("button", { name: "계약 추가" }));
    expect(mockNavigate.mock.calls.map((c) => c[0])).toContain("/contracts/new");
    expect(mockLogClick).toHaveBeenCalledWith("home_add_contract");
  });

  it("AC-3: 첫 렌더는 스켈레톤 3개이고, 0건이면 빈 상태만 보이며 AdSlot·하단 CTA가 없다", async () => {
    renderHome();
    const loading = screen.getByTestId("home-loading");
    expect(loading.querySelectorAll('[data-skeleton="true"]')).toHaveLength(3);
    expect(screen.queryByText("만기일만 넣으면 갱신 요구 마감일을 알려드려요")).toBeNull();

    const empty = await screen.findByTestId("home-empty");
    expect(within(empty).getByText("만기일만 넣으면 갱신 요구 마감일을 알려드려요")).toBeInTheDocument();
    expect(within(empty).getByText("첫 계약 등록하기")).toBeInTheDocument();
    expect(screen.queryByTestId("home-loading")).toBeNull();
    expect(screen.queryAllByTestId("ad-slot")).toHaveLength(0);
    // SubmitFooter가 없으면 버튼은 빈 상태의 보조 CTA 하나뿐이다
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["첫 계약 등록하기"]);
  });

  it("AC-4: recovered면 초기화 안내 토스트가 1회 뜬다", async () => {
    localStorage.setItem("renewwindow:contracts:v1", "{broken");
    renderHome();
    await screen.findByTestId("home-empty");
    await waitFor(() => expect(mockOpenToast).toHaveBeenCalledTimes(1));
    expect(mockOpenToast.mock.calls[0][0]).toBe("저장된 계약을 불러오지 못해 초기화했어요");
  });

  it("AC-4: location.state.toast 문자열이면 토스트 1회 후 state를 비운다", async () => {
    seed(four());
    renderHome({ toast: "계약을 삭제했어요" });
    await screen.findByText("D 계약");
    await waitFor(() => expect(mockOpenToast).toHaveBeenCalledTimes(1));
    expect(mockOpenToast.mock.calls[0][0]).toBe("계약을 삭제했어요");
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("null"));
  });

  it.each([[123], [""]])("AC-4: toast가 %j이면 토스트 없이 state만 비운다", async (bad) => {
    seed(four());
    renderHome({ toast: bad });
    await screen.findByText("D 계약");
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("null"));
    expect(mockOpenToast).not.toHaveBeenCalled();
  });

  it("AC-4: state 없이 진입해도 크래시하지 않고 토스트도 없다", async () => {
    seed(four());
    renderHome();
    expect(await screen.findByText("A 계약")).toBeInTheDocument();
    expect(mockOpenToast).not.toHaveBeenCalled();
  });

  it("AC-5: loadContracts가 throw하면 에러 상태가 보이고 '다시 시도'로 한 번 더 읽는다", async () => {
    seed(four());
    vi.mocked(storage.loadContracts).mockImplementation(() => {
      throw new Error("denied");
    });
    renderHome();
    const err = await screen.findByTestId("home-error");
    expect(within(err).getByText("계약을 불러오지 못했어요. 잠시 후 다시 시도해주세요")).toBeInTheDocument();
    expect(screen.queryAllByTestId("ad-slot")).toHaveLength(0);
    expect(screen.queryByTestId("home-empty")).toBeNull();

    const before = vi.mocked(storage.loadContracts).mock.calls.length;
    fireEvent.click(within(err).getByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(vi.mocked(storage.loadContracts).mock.calls.length).toBe(before + 1));
  });
});

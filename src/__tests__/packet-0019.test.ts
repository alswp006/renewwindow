import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  mockTds,
  mockAppsInToss,
  mockAnalytics,
  mockTossRewardAd,
} from "@/__tests__/__helpers__/mocks";
import App from "@/App";
import type { Contract } from "@/lib/types";

mockTds();
mockAppsInToss();
mockAnalytics();
mockTossRewardAd();

vi.mock("@/components/AdSlot", () => ({
  AdSlot: () => React.createElement("div", { "data-testid": "ad-slot" }),
}));

const KEY = "renewwindow:contracts:v1";
const CONTRACT: Contract = {
  id: "c1",
  nickname: "망원동 투룸",
  endDate: "2027-03-31",
  deposit: 200_000_000,
  monthlyRent: 500_000,
  renewalRightUsed: false,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

function LocationProbe() {
  const loc = useLocation();
  return React.createElement("div", { "data-testid": "probe" }, loc.pathname);
}

function renderApp(path: string, contracts: Contract[] = [CONTRACT]) {
  localStorage.setItem(KEY, JSON.stringify(contracts));
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [path] },
      React.createElement(App),
      React.createElement(LocationProbe),
    ),
  );
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-06T09:00:00+09:00"));
});

describe("라우팅 연결 (src/App.tsx 단일 소유)", () => {
  it("AC-1[P0]: '/contracts/new'는 등록 화면('계약 등록')이고 Result로 매칭되지 않는다", async () => {
    renderApp("/contracts/new");
    expect(await screen.findByText("계약 등록")).toBeInTheDocument();
    expect(screen.queryByTestId("free-tier")).not.toBeInTheDocument();
    expect(screen.getByTestId("probe").textContent).toBe("/contracts/new");
  });

  it("AC-1[P0]: Result 경로 '/contracts/c1'은 등록 화면이 아니다", async () => {
    renderApp("/contracts/c1");
    expect(await screen.findByTestId("free-tier")).toBeInTheDocument();
    expect(screen.queryByText("계약 등록")).not.toBeInTheDocument();
  });

  it("AC-2[P0]: '/'는 계약이 없으면 home-empty를 보인다", async () => {
    renderApp("/", []);
    expect(await screen.findByTestId("home-empty")).toBeInTheDocument();
    expect(screen.getByTestId("probe").textContent).toBe("/");
  });

  it("AC-2[P0]: '/'는 계약이 있으면 목록(닉네임)을 보인다", async () => {
    renderApp("/");
    expect(await screen.findByText("망원동 투룸")).toBeInTheDocument();
    expect(screen.queryByTestId("home-empty")).not.toBeInTheDocument();
  });

  it("AC-2[P0]: '/contracts/c1/edit'는 '계약 수정' 화면, '/contracts/c1/notice'는 '인상 통보 점검' 화면이다", async () => {
    const edit = renderApp("/contracts/c1/edit");
    expect(await screen.findByText("계약 수정")).toBeInTheDocument();
    expect(screen.queryByTestId("free-tier")).not.toBeInTheDocument();
    edit.unmount();

    renderApp("/contracts/c1/notice");
    expect(await screen.findByText("망원동 투룸 인상 통보 점검")).toBeInTheDocument();
    expect(screen.queryByTestId("free-tier")).not.toBeInTheDocument();
  });

  it("AC-3[P0]: 알 수 없는 경로는 '/'(홈)로 이동한다", async () => {
    renderApp("/unknown", []);
    expect(await screen.findByTestId("home-empty")).toBeInTheDocument();
    expect(screen.getByTestId("probe").textContent).toBe("/");
  });

  it("AC-3: 하위 알 수 없는 경로('/contracts/c1/zzz')도 홈으로 이동한다", async () => {
    renderApp("/contracts/c1/zzz", []);
    expect(await screen.findByTestId("home-empty")).toBeInTheDocument();
    expect(screen.getByTestId("probe").textContent).toBe("/");
  });

  it("AC-4: App.tsx는 '/contracts/new'를 ':id'보다 먼저 선언하고 main.tsx diff는 0줄이다", () => {
    const src = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
    const newIdx = src.indexOf("/contracts/new");
    const idIdx = src.indexOf("/contracts/:id");
    expect(newIdx).toBeGreaterThan(-1);
    expect(idIdx).toBeGreaterThan(newIdx);
    expect(src).toContain("/contracts/:id/edit");
    expect(src).toContain("/contracts/:id/notice");
    const diff = execSync("git diff HEAD -- src/main.tsx", { cwd: process.cwd() }).toString();
    expect(diff).toBe("");
  });
});

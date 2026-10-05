import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { Contract } from "@/lib/types";

vi.mock("@toss/tds-mobile", () => ({}));

const storage = vi.hoisted(() => ({
  loadContracts: vi.fn(),
  getContract: vi.fn(),
  saveContract: vi.fn(),
  deleteContract: vi.fn(),
}));
const settingsStorage = vi.hoisted(() => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
  loadChecklist: vi.fn(),
  saveChecklist: vi.fn(),
}));

vi.mock("@/lib/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage")>()),
  ...storage,
}));
vi.mock("@/lib/settingsStorage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/settingsStorage")>()),
  ...settingsStorage,
}));

import { useContracts } from "@/hooks/useContracts";
import { useContract } from "@/hooks/useContracts";
import { useSettings } from "@/hooks/useSettings";
import { useChecklist } from "@/hooks/useChecklist";

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(MemoryRouter, null, children);

const abc: Contract = {
  id: "abc",
  nickname: "망원동 투룸",
  endDate: "2027-03-31",
  deposit: 200000000,
  monthlyRent: 0,
  renewalRightUsed: false,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("상태 훅 — useContracts·useContract·useSettings·useChecklist", () => {
  it("AC-1[P0]: useContracts 첫 렌더는 loading, 이후 ready + contracts 채움", async () => {
    storage.loadContracts.mockReturnValue({ contracts: [abc], recovered: true });
    const { result } = renderHook(() => useContracts(), { wrapper });
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.contracts).toEqual([abc]);
    expect(result.current.recovered).toBe(true);
  });

  it("AC-1[P0]: loadContracts가 throw하면 status는 error", async () => {
    storage.loadContracts.mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const { result } = renderHook(() => useContracts(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.contracts).toEqual([]);
  });

  it("AC-1[P0]: reload()는 loadContracts를 정확히 1회 더 호출한다", async () => {
    storage.loadContracts.mockReturnValue({ contracts: [], recovered: false });
    const { result } = renderHook(() => useContracts(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    const before = storage.loadContracts.mock.calls.length;
    act(() => {
      result.current.reload();
    });
    await waitFor(() => expect(storage.loadContracts.mock.calls.length).toBe(before + 1));
    expect(result.current.status).toBe("ready");
  });

  it("AC-2[P0]: useContract('abc')는 id가 없으면 not_found", async () => {
    storage.getContract.mockReturnValue(undefined);
    storage.loadContracts.mockReturnValue({ contracts: [], recovered: false });
    const { result } = renderHook(() => useContract("abc"), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("not_found"));
    expect(result.current.contract).toBeUndefined();
  });

  it("AC-2[P0]: save()가 ok이면 contract가 갱신된 값으로 바뀐다", async () => {
    let stored: Contract = abc;
    const updated: Contract = { ...abc, nickname: "수정된 이름", updatedAt: "2026-10-06T00:00:00.000Z" };
    storage.getContract.mockImplementation(() => stored);
    storage.loadContracts.mockImplementation(() => ({ contracts: [stored], recovered: false }));
    storage.saveContract.mockImplementation(() => {
      stored = updated;
      return { ok: true, id: "abc", contract: updated };
    });
    const { result } = renderHook(() => useContract("abc"), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.contract?.nickname).toBe("망원동 투룸");

    let res: { ok: boolean } | undefined;
    await act(async () => {
      res = await result.current.save({
        id: "abc",
        nickname: "수정된 이름",
        endDate: abc.endDate,
        deposit: abc.deposit,
        monthlyRent: abc.monthlyRent,
        renewalRightUsed: false,
      });
    });
    expect(res?.ok).toBe(true);
    expect(result.current.contract?.nickname).toBe("수정된 이름");
  });

  it("AC-3[P0]: saveBaseRate ok이면 settings가 바뀐다", async () => {
    settingsStorage.loadSettings.mockReturnValue({ baseRatePercent: 2.5, baseRateAsOf: "2026-01-01" });
    settingsStorage.saveSettings.mockReturnValue({ ok: true });
    const { result } = renderHook(() => useSettings(), { wrapper });
    let res: { ok: boolean } | undefined;
    await act(async () => {
      res = await result.current.saveBaseRate(3.25, "2026-10-06");
    });
    expect(res?.ok).toBe(true);
    expect(settingsStorage.saveSettings).toHaveBeenCalledWith({
      baseRatePercent: 3.25,
      baseRateAsOf: "2026-10-06",
    });
    expect(result.current.settings).toEqual({ baseRatePercent: 3.25, baseRateAsOf: "2026-10-06" });
  });

  it("AC-3[P0]: saveBaseRate가 quota면 에러를 돌려주고 settings는 그대로", async () => {
    const initial = { baseRatePercent: 2.5, baseRateAsOf: "2026-01-01" };
    settingsStorage.loadSettings.mockReturnValue(initial);
    settingsStorage.saveSettings.mockReturnValue({ ok: false, error: "quota" });
    const { result } = renderHook(() => useSettings(), { wrapper });
    let res: { ok: boolean; error?: string } | undefined;
    await act(async () => {
      res = await result.current.saveBaseRate(3.25, "2026-10-06");
    });
    expect(res).toEqual({ ok: false, error: "quota" });
    expect(result.current.settings).toEqual(initial);
  });

  it("AC-4[P0]: toggle ok이면 checkedIds에 포함된다", async () => {
    settingsStorage.loadChecklist.mockReturnValue({ c1: [] });
    settingsStorage.saveChecklist.mockReturnValue({ ok: true });
    const { result } = renderHook(() => useChecklist("c1"), { wrapper });
    let res: { ok: boolean } | undefined;
    await act(async () => {
      res = await result.current.toggle("deliver_by_deadline", true);
    });
    expect(res?.ok).toBe(true);
    expect(settingsStorage.saveChecklist).toHaveBeenCalledWith("c1", ["deliver_by_deadline"]);
    expect(result.current.checkedIds).toContain("deliver_by_deadline");
  });

  it("AC-4[P0]: toggle이 quota면 checkedIds는 그대로, {ok:false,error:'quota'} 반환", async () => {
    settingsStorage.loadChecklist.mockReturnValue({ c1: ["keep_proof"] });
    settingsStorage.saveChecklist.mockReturnValue({ ok: false, error: "quota" });
    const { result } = renderHook(() => useChecklist("c1"), { wrapper });
    let res: { ok: boolean; error?: string } | undefined;
    await act(async () => {
      res = await result.current.toggle("deliver_by_deadline", true);
    });
    expect(res).toEqual({ ok: false, error: "quota" });
    expect(result.current.checkedIds).toEqual(["keep_proof"]);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { Contract } from "@/lib/types";

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

import { useContracts, useContract } from "@/hooks/useContracts";
import { useSettings } from "@/hooks/useSettings";
import { useChecklist } from "@/hooks/useChecklist";

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

describe("상태 훅", () => {
  it("useContracts: loading → ready, reload는 1회 더 호출", async () => {
    storage.loadContracts.mockReturnValue({ contracts: [abc], recovered: false });
    const { result } = renderHook(() => useContracts());
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.contracts).toEqual([abc]);
    act(() => result.current.reload());
    await waitFor(() => expect(storage.loadContracts).toHaveBeenCalledTimes(2));
    expect(result.current.status).toBe("ready");
  });

  it("useContracts: throw하면 error", async () => {
    storage.loadContracts.mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const { result } = renderHook(() => useContracts());
    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("useContract: 없는 id는 not_found, save 실패는 contract를 바꾸지 않는다", async () => {
    storage.getContract.mockReturnValue(abc);
    storage.saveContract.mockReturnValue({ ok: false, error: "quota", quota: true });
    const { result } = renderHook(() => useContract("abc"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    let res: { ok: boolean } | undefined;
    act(() => {
      res = result.current.save({ ...abc });
    });
    expect(res?.ok).toBe(false);
    expect(result.current.contract).toEqual(abc);

    storage.getContract.mockReturnValue(undefined);
    const missing = renderHook(() => useContract("zzz"));
    await waitFor(() => expect(missing.result.current.status).toBe("not_found"));
  });

  it("useSettings: quota면 settings 유지", () => {
    const initial = { baseRatePercent: 2.5, baseRateAsOf: "2026-01-01" };
    settingsStorage.loadSettings.mockReturnValue(initial);
    settingsStorage.saveSettings.mockReturnValue({ ok: false, error: "quota" });
    const { result } = renderHook(() => useSettings());
    let res: unknown;
    act(() => {
      res = result.current.saveBaseRate(3.25, "2026-10-06");
    });
    expect(res).toEqual({ ok: false, error: "quota" });
    expect(result.current.settings).toEqual(initial);
  });

  it("useChecklist: 체크 후 해제하면 목록에서 빠진다", () => {
    settingsStorage.loadChecklist.mockReturnValue({ c1: ["keep_proof"] });
    settingsStorage.saveChecklist.mockReturnValue({ ok: true });
    const { result } = renderHook(() => useChecklist("c1"));
    act(() => {
      result.current.toggle("deliver_by_deadline", true);
    });
    expect(result.current.checkedIds).toEqual(["keep_proof", "deliver_by_deadline"]);
    act(() => {
      result.current.toggle("keep_proof", false);
    });
    expect(result.current.checkedIds).toEqual(["deliver_by_deadline"]);
  });
});

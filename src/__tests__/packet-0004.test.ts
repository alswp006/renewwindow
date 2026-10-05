import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  saveContract,
  loadContracts,
  deleteContract,
  getContract,
} from "@/lib/storage";
import {
  saveSettings,
  loadSettings,
  saveChecklist,
  loadChecklist,
  removeChecklistFor,
} from "@/lib/settingsStorage";
import type { Contract, Settings, ChecklistState, SaveResult } from "@/lib/types";
import {
  DEFAULT_BASE_RATE,
  DEFAULT_BASE_RATE_AS_OF,
  MAX_CONTRACTS,
} from "@/constants/law";

// Extend SaveResult to include contract (from packet spec AC-1)
interface SaveContractResponse extends SaveResult {
  id?: string;
  contract?: Contract;
}

describe("AC-1: Contract 저장·업데이트·limit", () => {
  it("AC-1[P0]: should save new contract and return ok:true with id, createdAt, updatedAt", async () => {
    const result = (await saveContract({
      nickname: "망원동 투룸",
      endDate: "2027-03-31",
      deposit: 200000000,
      monthlyRent: 0,
      renewalRightUsed: false,
    })) as SaveContractResponse;

    expect(result.ok).toBe(true);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe("string");
    expect(result.contract).toBeDefined();
    expect(result.contract!.id).toBe(result.id);
    expect(result.contract!.nickname).toBe("망원동 투룸");
    expect(result.contract!.deposit).toBe(200000000);
    expect(result.contract!.createdAt).toBeDefined();
    expect(result.contract!.updatedAt).toBeDefined();

    const stored = loadContracts();
    expect(stored.contracts).toHaveLength(1);
    expect(stored.contracts[0].id).toBe(result.id);
  });

  it("AC-1[P0]: should update existing contract by id without changing createdAt, incrementing updatedAt", async () => {
    const save1 = (await saveContract({
      nickname: "test contract",
      endDate: "2027-06-30",
      deposit: 100000000,
      monthlyRent: 1000000,
      renewalRightUsed: false,
    })) as SaveContractResponse;

    const contractId = save1.id!;
    const createdAtFirst = save1.contract!.createdAt;
    const updatedAtFirst = save1.contract!.updatedAt;

    // Wait to ensure time passes (or could use vi.useFakeTimers)
    await new Promise((r) => setTimeout(r, 10));

    const save2 = (await saveContract({
      id: contractId,
      nickname: "test contract",
      endDate: "2027-06-30",
      deposit: 180000000, // Changed
      monthlyRent: 1000000,
      renewalRightUsed: false,
    })) as SaveContractResponse;

    expect(save2.ok).toBe(true);
    expect(save2.id).toBe(contractId);
    expect(save2.contract!.deposit).toBe(180000000);
    expect(save2.contract!.createdAt).toBe(createdAtFirst); // Unchanged
    expect(save2.contract!.updatedAt).not.toBe(updatedAtFirst); // Changed

    const stored = loadContracts();
    expect(stored.contracts).toHaveLength(1);
    expect(stored.contracts[0].deposit).toBe(180000000);
  });

  it("AC-1[P0]: should reject 21st new contract with error:limit", async () => {
    for (let i = 0; i < MAX_CONTRACTS; i++) {
      const result = (await saveContract({
        nickname: `contract-${i}`,
        endDate: "2027-12-31",
        deposit: 100000000,
        monthlyRent: 0,
        renewalRightUsed: false,
      })) as SaveContractResponse;
      expect(result.ok).toBe(true);
    }

    const overLimit = (await saveContract({
      nickname: "over-limit",
      endDate: "2027-12-31",
      deposit: 100000000,
      monthlyRent: 0,
      renewalRightUsed: false,
    })) as SaveContractResponse;

    expect(overLimit.ok).toBe(false);
    expect(overLimit.error).toBe("limit");
    expect(overLimit.id).toBeUndefined();

    const stored = loadContracts();
    expect(stored.contracts).toHaveLength(MAX_CONTRACTS);
  });
});

describe("AC-2: loadContracts 손상된 데이터 복구", () => {
  it("AC-2[P0]: should recover from malformed JSON and backup corrupt data", () => {
    localStorage.setItem("renewwindow:contracts:v1", "{not json");

    const result = loadContracts();

    expect(result.contracts).toEqual([]);
    expect(result.recovered).toBe(true);
    expect(localStorage.getItem("renewwindow:contracts:corrupt")).toBe(
      "{not json"
    );
  });

  it("AC-2[P1]: should recover from non-array JSON object", () => {
    const corruptData = '{"id":"x"}';
    localStorage.setItem("renewwindow:contracts:v1", corruptData);

    const result = loadContracts();

    expect(result.contracts).toEqual([]);
    expect(result.recovered).toBe(true);
    expect(localStorage.getItem("renewwindow:contracts:corrupt")).toBe(
      corruptData
    );
  });

  it("AC-2[P1]: should recover from invalid contract type (deposit as string)", () => {
    const corruptData = '[{"id":"x","deposit":"많음"}]';
    localStorage.setItem("renewwindow:contracts:v1", corruptData);

    const result = loadContracts();

    expect(result.contracts).toEqual([]);
    expect(result.recovered).toBe(true);
    expect(localStorage.getItem("renewwindow:contracts:corrupt")).toBe(
      corruptData
    );
  });
});

describe("AC-3: QuotaExceededError 처리", () => {
  it("AC-3[P0]: saveContract should return error:quota on QuotaExceededError without throwing", async () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    const result = (await saveContract({
      nickname: "test",
      endDate: "2027-12-31",
      deposit: 100000000,
      monthlyRent: 0,
      renewalRightUsed: false,
    })) as SaveContractResponse;

    expect(result.ok).toBe(false);
    expect(result.error).toBe("quota");

    spy.mockRestore();
  });

  it("AC-3[P1]: saveSettings should return error:quota on QuotaExceededError without throwing", async () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    const result = await saveSettings({
      baseRatePercent: 2.5,
      baseRateAsOf: "2026-10-06",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("quota");

    spy.mockRestore();
  });

  it("AC-3[P1]: saveChecklist should return error:quota on QuotaExceededError without throwing", async () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    const result = await saveChecklist("contract-1", [
      "deliver_by_deadline",
    ]);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("quota");

    spy.mockRestore();
  });
});

describe("AC-4: loadSettings 손상된 데이터 처리", () => {
  it("AC-4[P0]: should return default settings when localStorage is empty", () => {
    const result = loadSettings();

    expect(result.baseRatePercent).toBe(DEFAULT_BASE_RATE);
    expect(result.baseRateAsOf).toBe(DEFAULT_BASE_RATE_AS_OF);
  });

  it("AC-4[P1]: should return default settings and backup when JSON is malformed", () => {
    localStorage.setItem("renewwindow:settings:v1", "{bad");

    const result = loadSettings();

    expect(result.baseRatePercent).toBe(DEFAULT_BASE_RATE);
    expect(result.baseRateAsOf).toBe(DEFAULT_BASE_RATE_AS_OF);
    expect(localStorage.getItem("renewwindow:settings:corrupt")).toBe("{bad");
  });

  it("AC-4[P1]: should return default settings and backup when baseRatePercent is invalid type", () => {
    const corruptData = '{"baseRatePercent":"abc"}';
    localStorage.setItem("renewwindow:settings:v1", corruptData);

    const result = loadSettings();

    expect(result.baseRatePercent).toBe(DEFAULT_BASE_RATE);
    expect(result.baseRateAsOf).toBe(DEFAULT_BASE_RATE_AS_OF);
    expect(localStorage.getItem("renewwindow:settings:corrupt")).toBe(
      corruptData
    );
  });
});

describe("AC-5: loadChecklist 손상·deleteContract 연쇄 삭제", () => {
  it("AC-5[P0]: should return empty checklist and backup when JSON is malformed", () => {
    localStorage.setItem("renewwindow:checklist:v1", "[1,2");

    const result = loadChecklist();

    expect(result).toEqual({});
    expect(localStorage.getItem("renewwindow:checklist:corrupt")).toBe(
      "[1,2"
    );
  });

  it("AC-5[P1]: should return empty checklist and backup when stored as object instead of array", () => {
    const corruptData = '{"c1":"deliver_by_deadline"}';
    localStorage.setItem("renewwindow:checklist:v1", corruptData);

    const result = loadChecklist();

    expect(result).toEqual({});
    expect(localStorage.getItem("renewwindow:checklist:corrupt")).toBe(
      corruptData
    );
  });

  it("AC-5[P0]: deleteContract should remove contract and its checklist items", async () => {
    const saveResult = (await saveContract({
      nickname: "test contract",
      endDate: "2027-12-31",
      deposit: 100000000,
      monthlyRent: 0,
      renewalRightUsed: false,
    })) as SaveContractResponse;

    const contractId = saveResult.id!;

    await saveChecklist(contractId, ["deliver_by_deadline", "cap_5_percent"]);

    let checklist = loadChecklist();
    expect(checklist[contractId]).toEqual([
      "deliver_by_deadline",
      "cap_5_percent",
    ]);

    await deleteContract(contractId);

    checklist = loadChecklist();
    expect(checklist[contractId]).toBeUndefined();

    const contracts = loadContracts();
    expect(contracts.contracts).not.toContainEqual(
      expect.objectContaining({ id: contractId })
    );
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  computeRenewalWindow,
  sortContracts,
  getNoticeTiming,
  isWithinOneYearOfIncrease,
  computeNoticeCheck,
} from "@/lib/renewal";
import { isValidYMD, diffDays, addMonthsClamped } from "@/lib/date";

describe("packet-0002: 날짜 유틸·갱신 기간 엔진·통보 점검 엔진", () => {
  // Date를 고정하지 않음 — 테스트는 순수 함수 입출력만 검증

  // ═══════════════════════════════════════════════════════════════
  // AC-1: computeRenewalWindow with open status
  // ═══════════════════════════════════════════════════════════════

  it("AC-1[P0]: computeRenewalWindow('2027-03-31','2026-10-06') returns open status", () => {
    const result = computeRenewalWindow("2027-03-31", "2026-10-06");

    expect(result).not.toHaveProperty("error");
    const window = result as any; // passed AC-1 validation
    expect(window.startDate).toBe("2026-09-30");
    expect(window.deadlineDate).toBe("2027-01-31");
    expect(window.status).toBe("open");
    expect(window.daysToDeadline).toBe(117);
  });

  // ═══════════════════════════════════════════════════════════════
  // AC-2a: computeRenewalWindow with upcoming status
  // ═══════════════════════════════════════════════════════════════

  it("AC-2a[P0]: computeRenewalWindow('2027-04-30','2026-10-06') returns upcoming status", () => {
    const result = computeRenewalWindow("2027-04-30", "2026-10-06");

    expect(result).not.toHaveProperty("error");
    const window = result as any;
    expect(window.startDate).toBe("2026-10-30");
    expect(window.deadlineDate).toBe("2027-02-28");
    expect(window.status).toBe("upcoming");
    expect(window.daysToStart).toBe(24);
  });

  // ═══════════════════════════════════════════════════════════════
  // AC-2b: Edge case — various month-end dates
  // ═══════════════════════════════════════════════════════════════

  it("AC-2b[P0]: computeRenewalWindow('2027-08-31') calculates correct month-end dates", () => {
    const result = computeRenewalWindow("2027-08-31", "2026-10-06");

    expect(result).not.toHaveProperty("error");
    const window = result as any;
    expect(window.startDate).toBe("2027-02-28"); // 6 months before, Feb has 28 days in 2027
    expect(window.deadlineDate).toBe("2027-06-30"); // 2 months before
  });

  it("AC-2b[P0]: computeRenewalWindow('2028-08-31') handles leap year (Feb 29)", () => {
    const result = computeRenewalWindow("2028-08-31", "2027-01-01");

    expect(result).not.toHaveProperty("error");
    const window = result as any;
    expect(window.startDate).toBe("2028-02-29"); // Leap year: Feb has 29 days
  });

  it("AC-2c[P0]: computeRenewalWindow('2027-02-30') returns error for invalid date", () => {
    const result = computeRenewalWindow("2027-02-30", "2026-10-06");

    expect(result).toHaveProperty("error");
    expect((result as any).error).toBe("invalid_date");
  });

  // ═══════════════════════════════════════════════════════════════
  // AC-3: sortContracts orders by renewal status and timing
  // ═══════════════════════════════════════════════════════════════

  it("AC-3[P0]: sortContracts orders contracts by open→upcoming→closed and startDate", () => {
    const contracts = [
      { endDate: "2027-03-31", id: "A" }, // startDate: 2026-09-30 (open)
      { endDate: "2027-04-30", id: "B" }, // startDate: 2026-10-30 (upcoming)
      { endDate: "2026-11-30", id: "C" }, // startDate: 2026-05-30 (closed)
      { endDate: "2027-01-15", id: "D" }, // startDate: 2026-07-15 (open)
    ];
    const sorted = sortContracts(contracts, "2026-10-06");

    // Expected order: D (open, earliest), A (open, later), B (upcoming), C (closed)
    expect(sorted[0].id).toBe("D"); // 2027-01-15, open, earliest startDate
    expect(sorted[1].id).toBe("A"); // 2027-03-31, open, later startDate
    expect(sorted[2].id).toBe("B"); // 2027-04-30, upcoming
    expect(sorted[3].id).toBe("C"); // 2026-11-30, closed
  });

  it("AC-3[P0]: sortContracts does not mutate original array", () => {
    const contracts = [
      { endDate: "2027-03-31", id: "A" },
      { endDate: "2027-04-30", id: "B" },
    ];
    const originalOrder = contracts.map((c) => c.id);

    sortContracts(contracts, "2026-10-06");

    // Original should not change
    expect(contracts.map((c) => c.id)).toEqual(originalOrder);
  });

  // ═══════════════════════════════════════════════════════════════
  // AC-4: computeNoticeCheck calculates rates, amounts, and timing
  // ═══════════════════════════════════════════════════════════════

  it("AC-4[P0]: computeNoticeCheck calculates deposit and rent rates", () => {
    const result = computeNoticeCheck(
      { endDate: "2027-03-31", deposit: 200000000, monthlyRent: 500000 },
      { noticeDate: "2026-12-20", newDeposit: 216000000, newMonthlyRent: 550000 }
    );

    expect(result).not.toHaveProperty("error");
    const check = result as any;
    expect(check.depositRatePercent).toBe(8); // (216M - 200M) / 200M * 100 = 8%
    expect(check.rentRatePercent).toBe(10); // (550k - 500k) / 500k * 100 = 10%
    expect(check.isOverCap).toBe(true); // Exceeds legal cap (5% deposit, 10% rent)
    expect(check.noticeTiming).toBe("in_period"); // noticeDate 2026-12-20 is within renewal period
  });

  it("AC-4[P0]: computeNoticeCheck noticeTiming after_period when noticeDate too late", () => {
    const result = computeNoticeCheck(
      { endDate: "2027-03-31", deposit: 200000000, monthlyRent: 500000 },
      { noticeDate: "2027-02-10", newDeposit: 216000000, newMonthlyRent: 550000 }
    );

    expect(result).not.toHaveProperty("error");
    const check = result as any;
    expect(check.noticeTiming).toBe("after_period"); // After deadline 2027-01-31
  });

  it("AC-4[P0]: computeNoticeCheck noticeTiming before_period when noticeDate too early", () => {
    const result = computeNoticeCheck(
      { endDate: "2027-03-31", deposit: 200000000, monthlyRent: 500000 },
      { noticeDate: "2026-09-01", newDeposit: 216000000, newMonthlyRent: 550000 }
    );

    expect(result).not.toHaveProperty("error");
    const check = result as any;
    expect(check.noticeTiming).toBe("before_period"); // Before startDate 2026-09-30
  });

  // ═══════════════════════════════════════════════════════════════
  // AC-5: computeNoticeCheck with zero deposit and withinOneYearOfIncrease
  // ═══════════════════════════════════════════════════════════════

  it("AC-5[P0]: computeNoticeCheck returns null depositRatePercent when existing deposit is 0", () => {
    const result = computeNoticeCheck(
      { endDate: "2027-03-31", deposit: 0, monthlyRent: 500000 },
      { noticeDate: "2026-12-20", newDeposit: 10000000, newMonthlyRent: 550000 }
    );

    expect(result).not.toHaveProperty("error");
    const check = result as any;
    expect(check.depositRatePercent).toBe(null); // Cannot calculate rate from 0
    expect(check.rentRatePercent).toBe(10); // Can calculate rent rate
  });

  it("AC-5[P0]: isWithinOneYearOfIncrease returns true when lastIncreaseDate within 1 year", () => {
    const result = isWithinOneYearOfIncrease(
      "2026-03-01", // lastIncreaseDate
      "2026-12-20" // noticeDate (9.5 months later)
    );

    expect(result).toBe(true);
  });

  it("AC-5[P0]: isWithinOneYearOfIncrease returns false when lastIncreaseDate is absent", () => {
    const result = isWithinOneYearOfIncrease(null, "2026-12-20");

    expect(result).toBe(false);
  });

  // ═══════════════════════════════════════════════════════════════
  // Helper: Date utilities (should not throw, return error objects)
  // ═══════════════════════════════════════════════════════════════

  it("isValidYMD returns true for valid dates", () => {
    expect(isValidYMD("2026-10-06")).toBe(true);
    expect(isValidYMD("2027-02-28")).toBe(true);
    expect(isValidYMD("2028-02-29")).toBe(true); // leap year
  });

  it("isValidYMD returns false for invalid dates", () => {
    expect(isValidYMD("2027-02-30")).toBe(false); // Feb never has 30 days
    expect(isValidYMD("2026-13-01")).toBe(false); // No month 13
    expect(isValidYMD("2026-10-32")).toBe(false); // Oct has 31 days
    expect(isValidYMD("invalid")).toBe(false);
  });

  it("diffDays calculates correct day differences", () => {
    const days = diffDays("2027-01-31", "2026-10-06");
    expect(days).toBe(117); // Matches AC-1 daysToDeadline
  });

  it("addMonthsClamped handles month overflow to day-end", () => {
    const result = addMonthsClamped("2027-01-31", 1);
    expect(result).not.toHaveProperty("error");
    // Jan 31 + 1 month = Feb 28 (or 29 in leap year)
    expect((result as any)).toBe("2027-02-28");
  });

  it("addMonthsClamped returns error for invalid input date", () => {
    const result = addMonthsClamped("2027-02-30", 1);
    expect(result).toHaveProperty("error");
    expect((result as any).error).toBe("invalid_date");
  });
});

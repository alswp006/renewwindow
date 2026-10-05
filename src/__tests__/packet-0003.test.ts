import { describe, it, expect } from "vitest";
import {
  computeCap,
  computeConversionRate,
  computeConversion,
  buildConversionResult,
  computeScenarios,
} from "@/lib/money";
import {
  formatKRW,
  formatNumberInput,
  formatRate,
  formatPercent2,
  formatDday,
} from "@/lib/format";

describe("금액 엔진·표기 포맷(format.ts) — AC별 테스트", () => {
  describe("AC-1: computeCap — 보증금 갱신 상한선 계산", () => {
    it("should calculate cap with 5% increase (example 1)", () => {
      const result = computeCap(200000000, 500000);

      expect(result.maxDeposit).toBe(210000000);
      expect(result.maxMonthlyRent).toBe(525000);
      expect(result.depositIncrease).toBe(10000000);
      expect(result.rentIncrease).toBe(25000);
    });

    it("should calculate cap with floor rounding (example 2)", () => {
      const result = computeCap(123456789, 333333);

      expect(result.maxDeposit).toBe(129629628);
      expect(result.maxMonthlyRent).toBe(349999);
      expect(result.depositIncrease).toBe(6172839);
      expect(result.rentIncrease).toBe(16666);
    });
  });

  describe("AC-2: computeConversionRate — 환산 금리 계산", () => {
    it("should apply +2% premium for rate 2.5%", () => {
      expect(computeConversionRate(2.5)).toBe(4.5);
    });

    it("should apply +1% premium for rate 9.0%", () => {
      expect(computeConversionRate(9.0)).toBe(10);
    });

    it("should apply +2% premium for rate 3.25%", () => {
      expect(computeConversionRate(3.25)).toBe(5.25);
    });
  });

  describe("AC-2: computeConversion — 보증금을 월세로 환산", () => {
    it("should convert deposit to monthly rent via formula: floor(amount * rate / 1200)", () => {
      // 50,000,000 × 4.5% ÷ 1200 = 187,500
      expect(computeConversion(50000000, 4.5)).toBe(187500);
    });

    it("should apply floor rounding correctly", () => {
      // 40,000,000 × 4.5% ÷ 1200 = 150,000
      expect(computeConversion(40000000, 4.5)).toBe(150000);
    });
  });

  describe("AC-3: buildConversionResult — 환산 결과 구성", () => {
    it("should build conversion result with correct remaining deposit and added rent", () => {
      const result = buildConversionResult(100000000, 500000, 40000000, 4.5);

      expect(result.remainingDeposit).toBe(60000000);
      expect(result.addedRent).toBe(150000);
      expect(result.newMonthlyRent).toBe(650000);
      expect(result.ratePercent).toBe(4.5);
    });
  });

  describe("AC-4: computeScenarios — 4가지 환산 시나리오 (0%, 25%, 50%, 75%)", () => {
    it("should compute all 4 scenarios with correct values", () => {
      const scenarios = computeScenarios(200000000, 0, 4.5);

      expect(scenarios).toHaveLength(4);

      // Scenario 0%: 전환 없음
      expect(scenarios[0].percent).toBe(0);
      expect(scenarios[0].remainingDeposit).toBe(200000000);
      expect(scenarios[0].monthlyRentCap).toBe(0);
      expect(scenarios[0].annualRent).toBe(0);

      // Scenario 25%: 보증금 50M 전환
      // monthlyRentCap = 50M × 4.5% ÷ 1200 = 187,500
      expect(scenarios[1].percent).toBe(25);
      expect(scenarios[1].remainingDeposit).toBe(150000000);
      expect(scenarios[1].monthlyRentCap).toBe(187500);
      expect(scenarios[1].annualRent).toBe(2250000);

      // Scenario 50%: 보증금 100M 전환
      expect(scenarios[2].percent).toBe(50);
      expect(scenarios[2].remainingDeposit).toBe(100000000);
      expect(scenarios[2].monthlyRentCap).toBe(375000);
      expect(scenarios[2].annualRent).toBe(4500000);

      // Scenario 75%: 보증금 150M 전환
      expect(scenarios[3].percent).toBe(75);
      expect(scenarios[3].remainingDeposit).toBe(50000000);
      expect(scenarios[3].monthlyRentCap).toBe(562500);
      expect(scenarios[3].annualRent).toBe(6750000);
    });
  });

  describe("AC-5: formatKRW — 원화 표시 포맷 (억/만/원)", () => {
    it("should format 210000000 as '2억 1,000만원'", () => {
      expect(formatKRW(210000000)).toBe("2억 1,000만원");
    });

    it("should format 525000 as '52만 5,000원'", () => {
      expect(formatKRW(525000)).toBe("52만 5,000원");
    });

    it("should format 187500 as '18만 7,500원'", () => {
      expect(formatKRW(187500)).toBe("18만 7,500원");
    });

    it("should format 0 as '0원'", () => {
      expect(formatKRW(0)).toBe("0원");
    });

    it("should omit 만 unit when zero: 200000000 → '2억원'", () => {
      expect(formatKRW(200000000)).toBe("2억원");
    });

    it("should format 2250000 as '225만원' (no 원 unit when zero)", () => {
      expect(formatKRW(2250000)).toBe("225만원");
    });

    it("should format 60000000 as '6,000만원' (no 억 unit)", () => {
      expect(formatKRW(60000000)).toBe("6,000만원");
    });

    it("should format 150000 as '15만원'", () => {
      expect(formatKRW(150000)).toBe("15만원");
    });
  });

  describe("AC-5: formatNumberInput — 입력 필드용 쉼표 포맷", () => {
    it("should add commas to number string", () => {
      expect(formatNumberInput("200000000")).toBe("200,000,000");
    });

    it("should handle empty string", () => {
      expect(formatNumberInput("")).toBe("");
    });

    it("should handle single digit", () => {
      expect(formatNumberInput("5")).toBe("5");
    });
  });

  describe("AC-5: formatRate — 금리 표시 (소수점 유지)", () => {
    it("should format 4.5 as '4.5'", () => {
      expect(formatRate(4.5)).toBe("4.5");
    });

    it("should format 9 as '9'", () => {
      expect(formatRate(9)).toBe("9");
    });

    it("should format 3.25 as '3.25'", () => {
      expect(formatRate(3.25)).toBe("3.25");
    });
  });

  describe("AC-5: formatPercent2 — 백분율 (소수점 2자리 고정)", () => {
    it("should format 2.5 as '2.50'", () => {
      expect(formatPercent2(2.5)).toBe("2.50");
    });

    it("should format 100 as '100.00'", () => {
      expect(formatPercent2(100)).toBe("100.00");
    });

    it("should format 0.1 as '0.10'", () => {
      expect(formatPercent2(0.1)).toBe("0.10");
    });
  });

  describe("AC-5: formatDday — D-day 포맷", () => {
    it("should format 117 as 'D-117'", () => {
      expect(formatDday(117)).toBe("D-117");
    });

    it("should format 1 as 'D-1'", () => {
      expect(formatDday(1)).toBe("D-1");
    });

    it("should format 0 as 'D-0'", () => {
      expect(formatDday(0)).toBe("D-0");
    });
  });
});

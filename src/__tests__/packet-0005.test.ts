import { describe, it, expect, beforeEach, vi } from "vitest";
import { validateContractForm, validateConversionAmount, validateBaseRate } from "@/lib/validation";
import { validateNoticeForm } from "@/lib/noticeValidation";

describe("packet-0005: 계약 폼·전환 금액·기준금리·통보 폼 검증", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-06T09:00:00+09:00"));
  });

  describe("AC-1: validateContractForm 기본 에러 검증", () => {
    it("AC-1[P0]: should return errors for empty nickname, invalid endDate format, and zero deposit/monthlyRent", () => {

      const result = validateContractForm({
        nickname: "",
        endDate: "2027-13-01",
        deposit: "0",
        monthlyRent: "0",
      }, "2026-10-06");

      expect(result.ok).toBe(false);
      expect((result as any).errors).toBeDefined();
      expect((result as any).errors.nickname).toBe("계약 이름을 입력해주세요");
      expect((result as any).errors.endDate).toBe("만기일을 YYYY-MM-DD 형식으로 입력해주세요");
      expect((result as any).errors.deposit).toBe("보증금이나 월세 중 하나는 입력해주세요");
      expect((result as any).firstErrorField).toBe("nickname");
    });
  });

  describe("AC-2: validateContractForm 범위·형식·오늘 기준 검증", () => {
    it("AC-2[P0]: should validate nickname length (max 20 chars)", () => {

      const result = validateContractForm({
        nickname: "a".repeat(21),
        endDate: "2026-10-06",
        deposit: "1000000",
        monthlyRent: "0",
      }, "2026-10-06");

      expect(result.ok).toBe(false);
      expect((result as any).errors.nickname).toBe("계약 이름은 20자 이내로 입력해주세요");
    });

    it("AC-2[P0]: should reject endDate before today", () => {

      const result = validateContractForm({
        nickname: "계약",
        endDate: "2026-10-05",
        deposit: "1000000",
        monthlyRent: "0",
      }, "2026-10-06");

      expect(result.ok).toBe(false);
      expect((result as any).errors.endDate).toBe("만기일이 오늘 이전이에요. 다음 계약 만기일을 입력해주세요");
    });

    it("AC-2[P0]: should reject endDate more than 5 years from today", () => {

      const result = validateContractForm({
        nickname: "계약",
        endDate: "2031-10-07",
        deposit: "1000000",
        monthlyRent: "0",
      }, "2026-10-06");

      expect(result.ok).toBe(false);
      expect((result as any).errors.endDate).toBe("만기일은 5년 이내로 입력해주세요");
    });

    it("AC-2[P0]: should reject deposit exceeding 100억원", () => {

      const result = validateContractForm({
        nickname: "계약",
        endDate: "2027-10-06",
        deposit: "10000000001",
        monthlyRent: "0",
      }, "2026-10-06");

      expect(result.ok).toBe(false);
      expect((result as any).errors.deposit).toBe("보증금은 100억원 이하로 입력해주세요");
    });

    it("AC-2[P0]: should reject monthlyRent exceeding 1,000만원", () => {

      const result = validateContractForm({
        nickname: "계약",
        endDate: "2027-10-06",
        deposit: "0",
        monthlyRent: "10000001",
      }, "2026-10-06");

      expect(result.ok).toBe(false);
      expect((result as any).errors.monthlyRent).toBe("월세는 1,000만원 이하로 입력해주세요");
    });
  });

  describe("AC-3: validateContractForm lastIncreaseDate 검증", () => {
    it("AC-3[P0]: should reject lastIncreaseDate with invalid format", () => {

      const result = validateContractForm({
        nickname: "계약",
        endDate: "2027-10-06",
        deposit: "1000000",
        monthlyRent: "0",
        lastIncreaseDate: "2026-13-01",
      }, "2026-10-06");

      expect(result.ok).toBe(false);
      expect((result as any).errors.lastIncreaseDate).toBe("최근 증액일을 YYYY-MM-DD 형식으로 입력해주세요");
    });

    it("AC-3[P0]: should reject lastIncreaseDate in the future", () => {

      const result = validateContractForm({
        nickname: "계약",
        endDate: "2027-10-06",
        deposit: "1000000",
        monthlyRent: "0",
        lastIncreaseDate: "2026-10-07",
      }, "2026-10-06");

      expect(result.ok).toBe(false);
      expect((result as any).errors.lastIncreaseDate).toBe("최근 증액일은 오늘 이전이어야 해요");
    });

    it("AC-3[P0]: should accept lastIncreaseDate on today or past", () => {

      const result = validateContractForm({
        nickname: "계약",
        endDate: "2027-10-06",
        deposit: "1000000",
        monthlyRent: "0",
        lastIncreaseDate: "2026-10-06",
      }, "2026-10-06");

      expect(result.ok).toBe(true);
      expect((result as any).value.lastIncreaseDate).toBe("2026-10-06");
    });

    it("AC-3[P0]: should accept empty lastIncreaseDate and not include it in value", () => {

      const result = validateContractForm({
        nickname: "계약",
        endDate: "2027-10-06",
        deposit: "1000000",
        monthlyRent: "0",
        lastIncreaseDate: "",
      }, "2026-10-06");

      expect(result.ok).toBe(true);
      expect((result as any).value.lastIncreaseDate).toBeUndefined();
    });
  });

  describe("AC-4: validateConversionAmount 및 validateBaseRate", () => {
    it("AC-4[P0]: validateConversionAmount should reject empty amount", () => {

      const result = validateConversionAmount("0", 200000000);

      expect(result.ok).toBe(false);
      expect((result as any).error).toBe("전환할 금액을 입력해주세요");
    });

    it("AC-4[P0]: validateConversionAmount should reject amount exceeding current deposit", () => {

      const result = validateConversionAmount("250000000", 200000000);

      expect(result.ok).toBe(false);
      expect((result as any).error).toBe("현재 보증금보다 많이 전환할 수 없어요");
    });

    it("AC-4[P0]: validateConversionAmount should accept valid amount", () => {

      const result = validateConversionAmount("100000000", 200000000);

      expect(result.ok).toBe(true);
      expect((result as any).value).toBe(100000000);
    });

    it("AC-4[P0]: validateBaseRate should reject rate > 10%", () => {

      const result = validateBaseRate("12");

      expect(result.ok).toBe(false);
      expect((result as any).error).toBe("기준금리는 0~10% 사이로 입력해주세요");
    });

    it("AC-4[P0]: validateBaseRate should reject empty rate", () => {

      const result = validateBaseRate("");

      expect(result.ok).toBe(false);
      expect((result as any).error).toBe("기준금리는 0~10% 사이로 입력해주세요");
    });

    it("AC-4[P0]: validateBaseRate should accept valid rate including decimals", () => {

      const result = validateBaseRate("3.25");

      expect(result.ok).toBe(true);
      expect((result as any).value).toBe(3.25);
    });
  });

  describe("AC-5: validateNoticeForm 통보 폼 검증", () => {
    it("AC-5[P0]: should accept noticeDate in the future", () => {

      const result = validateNoticeForm({
        noticeDate: "2026-10-07",
        increaseRate: "5",
      }, { endDate: "2027-10-06", deposit: 200000000, monthlyRent: 500000 }, "2026-10-06");

      expect(result.ok).toBe(true);
    });

    it("AC-5[P0]: should reject noticeDate with invalid format", () => {

      const result = validateNoticeForm({
        noticeDate: "",
        increaseRate: "5",
      }, { endDate: "2027-10-06", deposit: 200000000, monthlyRent: 500000 }, "2026-10-06");

      expect(result.ok).toBe(false);
      expect((result as any).errors.noticeDate).toBe("통보일을 YYYY-MM-DD 형식으로 입력해주세요");
    });

    it("AC-5[P0]: should reject increaseRate out of range (negative)", () => {

      const result = validateNoticeForm({
        noticeDate: "2026-10-05",
        increaseRate: "-3",
      }, { endDate: "2027-10-06", deposit: 200000000, monthlyRent: 500000 }, "2026-10-06");

      expect(result.ok).toBe(false);
      expect((result as any).errors.increaseRate).toBe("인상률은 0~100% 사이로 입력해주세요");
    });

    it("AC-5[P0]: should reject increaseRate out of range (>100)", () => {

      const result = validateNoticeForm({
        noticeDate: "2026-10-05",
        increaseRate: "101",
      }, { endDate: "2027-10-06", deposit: 200000000, monthlyRent: 500000 }, "2026-10-06");

      expect(result.ok).toBe(false);
      expect((result as any).errors.increaseRate).toBe("인상률은 0~100% 사이로 입력해주세요");
    });

    it("AC-5[P0]: should reject empty newDeposit in amount mode", () => {

      const result = validateNoticeForm({
        noticeDate: "2026-10-05",
        newDeposit: "",
        newMonthlyRent: "600000",
        inputMode: "amount",
      }, { endDate: "2027-10-06", deposit: 200000000, monthlyRent: 500000 }, "2026-10-06");

      expect(result.ok).toBe(false);
      expect((result as any).errors.newDeposit).toBe("새 보증금을 입력해주세요");
    });

    it("AC-5[P0]: should reject newDeposit exceeding 100억원 in amount mode", () => {

      const result = validateNoticeForm({
        noticeDate: "2026-10-05",
        newDeposit: "10000000001",
        newMonthlyRent: "600000",
        inputMode: "amount",
      }, { endDate: "2027-10-06", deposit: 200000000, monthlyRent: 500000 }, "2026-10-06");

      expect(result.ok).toBe(false);
      expect((result as any).errors.newDeposit).toBe("새 보증금은 0원~100억원 사이로 입력해주세요");
    });

    it("AC-5[P0]: should reject empty newMonthlyRent in amount mode", () => {

      const result = validateNoticeForm({
        noticeDate: "2026-10-05",
        newDeposit: "250000000",
        newMonthlyRent: "",
        inputMode: "amount",
      }, { endDate: "2027-10-06", deposit: 200000000, monthlyRent: 500000 }, "2026-10-06");

      expect(result.ok).toBe(false);
      expect((result as any).errors.newMonthlyRent).toBe("새 월세를 입력해주세요");
    });

    it("AC-5[P0]: should reject newMonthlyRent exceeding 1,000만원 in amount mode", () => {

      const result = validateNoticeForm({
        noticeDate: "2026-10-05",
        newDeposit: "250000000",
        newMonthlyRent: "10000001",
        inputMode: "amount",
      }, { endDate: "2027-10-06", deposit: 200000000, monthlyRent: 500000 }, "2026-10-06");

      expect(result.ok).toBe(false);
      expect((result as any).errors.newMonthlyRent).toBe("새 월세는 0원~1,000만원 사이로 입력해주세요");
    });

    it("AC-5[P0]: should accept valid rate mode and calculate newDeposit & newMonthlyRent", () => {

      const result = validateNoticeForm({
        noticeDate: "2026-10-05",
        increaseRate: "4",
      }, { endDate: "2027-10-06", deposit: 200000000, monthlyRent: 500000 }, "2026-10-06");

      expect(result.ok).toBe(true);
      expect((result as any).value.newDeposit).toBe(208000000);
      expect((result as any).value.newMonthlyRent).toBe(520000);
      expect((result as any).value.inputMode).toBe("rate");
    });

    it("AC-5[P0]: should handle zero monthlyRent contract in rate mode", () => {

      const result = validateNoticeForm({
        noticeDate: "2026-10-05",
        increaseRate: "5",
      }, { endDate: "2027-10-06", deposit: 200000000, monthlyRent: 0 }, "2026-10-06");

      expect(result.ok).toBe(true);
      expect((result as any).value.newDeposit).toBe(210000000);
      expect((result as any).value.newMonthlyRent).toBe(0);
      expect((result as any).value.inputMode).toBe("rate");
    });

    it("AC-5[P0]: should reject rate mode when calculated newDeposit exceeds limit", () => {

      const result = validateNoticeForm({
        noticeDate: "2026-10-05",
        increaseRate: "100",
      }, { endDate: "2027-10-06", deposit: 6000000000, monthlyRent: 0 }, "2026-10-06");

      expect(result.ok).toBe(false);
      expect((result as any).errors.depositRate).toBe("새 보증금은 0원~100억원 사이로 입력해주세요");
    });
  });
});

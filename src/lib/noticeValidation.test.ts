import { describe, it, expect } from "vitest";
import { validateNoticeForm } from "@/lib/noticeValidation";

const TODAY = "2026-10-06";
const contract = {
  endDate: "2027-10-06",
  deposit: 200000000,
  monthlyRent: 500000,
};

function errorsOf(
  values: Parameters<typeof validateNoticeForm>[0],
  c = contract,
) {
  const r = validateNoticeForm(values, c, TODAY);
  if (r.ok) throw new Error("expected failure");
  return r;
}

describe("validateNoticeForm — 공통", () => {
  it("통보일 미래·형식 오류", () => {
    expect(
      errorsOf({ noticeDate: "2026-10-07", depositRate: "5", rentRate: "5" })
        .errors.noticeDate,
    ).toBe("통보일은 오늘 이전 날짜로 입력해주세요");
    const r = errorsOf({ noticeDate: "", depositRate: "5", rentRate: "5" });
    expect(r.errors.noticeDate).toBe(
      "통보일을 YYYY-MM-DD 형식으로 입력해주세요",
    );
    expect(r.firstErrorField).toBe("noticeDate");
  });
});

describe("validateNoticeForm — rate 모드", () => {
  it("인상률 범위 밖은 해당 필드에 에러", () => {
    const msg = "인상률은 0~100% 사이로 입력해주세요";
    for (const depositRate of ["-3", "101", ""]) {
      const r = errorsOf({
        noticeDate: "2026-10-05",
        depositRate,
        rentRate: "5",
      });
      expect(r.errors.depositRate).toBe(msg);
      expect(r.errors.rentRate).toBeUndefined();
      expect(r.firstErrorField).toBe("depositRate");
    }
    expect(
      errorsOf({ noticeDate: "2026-10-05", depositRate: "4", rentRate: "101" })
        .errors.rentRate,
    ).toBe(msg);
  });

  it("increaseRate 약식 입력은 둘 다에 같은 인상률을 쓴다", () => {
    expect(
      errorsOf({ noticeDate: "2026-10-05", increaseRate: "-3" }).errors
        .increaseRate,
    ).toBe("인상률은 0~100% 사이로 입력해주세요");
    const r = validateNoticeForm(
      { noticeDate: "2026-10-05", increaseRate: "5" },
      contract,
      TODAY,
    );
    expect(r.ok && [r.value.newDeposit, r.value.newMonthlyRent]).toEqual([
      210000000, 525000,
    ]);
  });

  it("보증금 4%·월세 5% → 새 금액 floor 계산", () => {
    const r = validateNoticeForm(
      { noticeDate: "2026-10-05", depositRate: "4", rentRate: "5" },
      contract,
      TODAY,
    );
    expect(r).toEqual({
      ok: true,
      value: {
        noticeDate: "2026-10-05",
        newDeposit: 208000000,
        newMonthlyRent: 525000,
        inputMode: "rate",
      },
    });
  });

  it("소수 인상률도 부동소수점 오차 없이 계산", () => {
    const r = validateNoticeForm(
      { noticeDate: "2026-10-05", depositRate: "4.1", rentRate: "4.1" },
      { endDate: "2027-10-06", deposit: 100000000, monthlyRent: 1000 },
      TODAY,
    );
    expect(r.ok && r.value.newDeposit).toBe(104100000);
    expect(r.ok && r.value.newMonthlyRent).toBe(1041);
  });

  it("월세 0 계약은 newMonthlyRent 0", () => {
    const r = validateNoticeForm(
      { noticeDate: "2026-10-05", depositRate: "5" },
      { ...contract, monthlyRent: 0 },
      TODAY,
    );
    expect(r.ok && r.value.newDeposit).toBe(210000000);
    expect(r.ok && r.value.newMonthlyRent).toBe(0);
  });

  it("계산한 새 보증금이 100억원을 넘으면 depositRate 에러", () => {
    const r = errorsOf(
      { noticeDate: "2026-10-05", depositRate: "100" },
      { ...contract, deposit: 6000000000, monthlyRent: 0 },
    );
    expect(r.errors.depositRate).toBe(
      "새 보증금은 0원~100억원 사이로 입력해주세요",
    );
    expect(r.errors.rentRate).toBeUndefined();
  });

  it("계산한 새 월세가 1,000만원을 넘으면 rentRate 에러", () => {
    const r = errorsOf(
      { noticeDate: "2026-10-05", depositRate: "0", rentRate: "100" },
      { ...contract, deposit: 1000, monthlyRent: 6000000 },
    );
    expect(r.errors.rentRate).toBe(
      "새 월세는 0원~1,000만원 사이로 입력해주세요",
    );
  });
});

describe("validateNoticeForm — amount 모드", () => {
  const base = { noticeDate: "2026-10-05", inputMode: "amount" as const };

  it("빈 값", () => {
    const r = errorsOf({ ...base, newDeposit: "", newMonthlyRent: "" });
    expect(r.errors.newDeposit).toBe("새 보증금을 입력해주세요");
    expect(r.errors.newMonthlyRent).toBe("새 월세를 입력해주세요");
    expect(r.firstErrorField).toBe("newDeposit");
  });

  it("범위 초과·음수", () => {
    const over = errorsOf({
      ...base,
      newDeposit: "10000000001",
      newMonthlyRent: "10000001",
    });
    expect(over.errors.newDeposit).toBe(
      "새 보증금은 0원~100억원 사이로 입력해주세요",
    );
    expect(over.errors.newMonthlyRent).toBe(
      "새 월세는 0원~1,000만원 사이로 입력해주세요",
    );
    const neg = errorsOf({
      ...base,
      newDeposit: "-1000",
      newMonthlyRent: "-1000",
    });
    expect(neg.errors.newDeposit).toBe(
      "새 보증금은 0원~100억원 사이로 입력해주세요",
    );
    expect(neg.errors.newMonthlyRent).toBe(
      "새 월세는 0원~1,000만원 사이로 입력해주세요",
    );
  });

  it("정상 값은 그대로 value에 담긴다", () => {
    const r = validateNoticeForm(
      { ...base, newDeposit: "250,000,000", newMonthlyRent: "600000" },
      contract,
      TODAY,
    );
    expect(r).toEqual({
      ok: true,
      value: {
        noticeDate: "2026-10-05",
        newDeposit: 250000000,
        newMonthlyRent: 600000,
        inputMode: "amount",
      },
    });
  });

  it("월세 0 계약은 새 월세 입력 없이 통과", () => {
    const r = validateNoticeForm(
      { ...base, newDeposit: "250000000" },
      { ...contract, monthlyRent: 0 },
      TODAY,
    );
    expect(r.ok && r.value.newMonthlyRent).toBe(0);
  });
});

import { useRef, useState } from "react";
import type { RefObject } from "react";
import { Spacing, Tab, TextField } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { AmountField } from "@/components/AmountField";
import { DateField } from "@/components/DateField";
import { SubmitFooter } from "@/components/BottomCTA";
import { logClick } from "@/lib/analytics";
import { getToday } from "@/lib/date";
import { validateNoticeForm } from "@/lib/noticeValidation";
import type { NoticeContract, ValidNotice } from "@/lib/noticeValidation";
import type { FieldErrors } from "@/lib/types";

type InputMode = "rate" | "amount";
type FieldName = "noticeDate" | "depositRate" | "rentRate" | "newDeposit" | "newMonthlyRent";

const MODES: InputMode[] = ["rate", "amount"];

/** 탭 전환 햅틱 — SDK는 WebView 밖에서 throw하므로 가드한다. */
function tickWeak() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/jsdom)에서는 throw — 무시 */
  }
}

/** 저장된 새 금액에서 인상률 입력값을 되살린다. 기준 금액이 0이면 빈 칸. */
function restoreRate(current: number, next: number | undefined): string {
  if (next === undefined || current <= 0) return "";
  return String(Number((((next - current) / current) * 100).toFixed(2)));
}

/** 인상률 입력 — 숫자와 소수점 하나만 남긴다. */
function sanitizeRate(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  return dot < 0 ? cleaned : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
}

/**
 * 집주인 통보 입력 폼 본문 + 하단 '점검하기' CTA. 헤더(Top)·골격(ScreenScaffold)은 페이지가 렌더한다.
 * 검증 문구는 validateNoticeForm이 돌려준 것만 쓴다.
 */
export function NoticeForm({
  contract,
  initial,
  loading,
  onValid,
}: {
  contract: NoticeContract;
  /** 저장된 통보 — 탭과 입력값을 복원한다 */
  initial?: ValidNotice;
  loading?: boolean;
  onValid: (draft: ValidNotice) => void;
}) {
  const hasRent = contract.monthlyRent > 0;
  const [mode, setMode] = useState<InputMode>(initial?.inputMode ?? "rate");
  const [noticeDate, setNoticeDate] = useState(initial?.noticeDate ?? "");
  const [depositRate, setDepositRate] = useState(
    restoreRate(contract.deposit, initial?.newDeposit),
  );
  const [rentRate, setRentRate] = useState(
    restoreRate(contract.monthlyRent, initial?.newMonthlyRent),
  );
  const [newDeposit, setNewDeposit] = useState(
    initial ? String(initial.newDeposit) : "",
  );
  const [newMonthlyRent, setNewMonthlyRent] = useState(
    initial ? String(initial.newMonthlyRent) : "",
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  const refs: Record<FieldName, RefObject<HTMLInputElement>> = {
    noticeDate: useRef<HTMLInputElement>(null),
    depositRate: useRef<HTMLInputElement>(null),
    rentRate: useRef<HTMLInputElement>(null),
    newDeposit: useRef<HTMLInputElement>(null),
    newMonthlyRent: useRef<HTMLInputElement>(null),
  };

  /** 고친 칸의 에러는 바로 지운다 — 점검하기를 다시 눌러야 새 검증이 돈다. */
  const edit = <T,>(field: FieldName, set: (v: T) => void) => (v: T) => {
    set(v);
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const selectMode = (index: number) => {
    const next = MODES[index];
    if (!next || next === mode) return;
    tickWeak();
    setMode(next);
    setErrors({});
  };

  const handleSubmit = () => {
    if (loading) return;
    const result = validateNoticeForm(
      { noticeDate, inputMode: mode, depositRate, rentRate, newDeposit, newMonthlyRent },
      contract,
      getToday(),
    );
    if (!result.ok) {
      setErrors(result.errors);
      refs[result.firstErrorField as FieldName]?.current?.focus();
      return;
    }
    setErrors({});
    logClick("notice_check_submit");
    onValid(result.value);
  };

  const rateField = (
    field: "depositRate" | "rentRate",
    label: string,
    value: string,
    set: (v: string) => void,
    isLast: boolean,
  ) => (
    <TextField
      ref={refs[field]}
      variant="box"
      label={label}
      labelOption="sustain"
      placeholder="예: 4"
      inputMode="decimal"
      enterKeyHint={isLast ? "done" : "next"}
      value={value}
      hasError={!!errors[field]}
      help={errors[field]}
      disabled={loading}
      onChange={(e) => edit(field, set)(sanitizeRate(e.target.value))}
      onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center" })}
      onKeyDown={(e) => {
        if (isLast && e.key === "Enter") handleSubmit();
      }}
    />
  );

  return (
    <>
      <Tab onChange={selectMode}>
        <Tab.Item selected={mode === "rate"}>인상률로 입력</Tab.Item>
        <Tab.Item selected={mode === "amount"}>새 금액으로 입력</Tab.Item>
      </Tab>
      <Spacing size={16} />
      <DateField
        inputRef={refs.noticeDate}
        label="통보일"
        placeholder="예: 20261220"
        value={noticeDate}
        onChange={edit("noticeDate", setNoticeDate)}
        hasError={!!errors.noticeDate}
        help={errors.noticeDate ?? "집주인에게 증액 통보를 받은 날이에요"}
        disabled={loading}
      />
      <Spacing size={12} />
      {mode === "rate" ? (
        <>
          {rateField("depositRate", "보증금 인상률(%)", depositRate, setDepositRate, !hasRent)}
          {hasRent && (
            <>
              <Spacing size={12} />
              {rateField("rentRate", "월세 인상률(%)", rentRate, setRentRate, true)}
            </>
          )}
        </>
      ) : (
        <>
          <AmountField
            inputRef={refs.newDeposit}
            label="새 보증금(원)"
            placeholder="예: 216,000,000"
            value={newDeposit}
            onChange={edit("newDeposit", setNewDeposit)}
            hasError={!!errors.newDeposit}
            help={errors.newDeposit}
            disabled={loading}
            onEnter={hasRent ? undefined : handleSubmit}
          />
          {hasRent && (
            <>
              <Spacing size={12} />
              <AmountField
                inputRef={refs.newMonthlyRent}
                label="새 월세(원)"
                placeholder="예: 550,000"
                value={newMonthlyRent}
                onChange={edit("newMonthlyRent", setNewMonthlyRent)}
                hasError={!!errors.newMonthlyRent}
                help={errors.newMonthlyRent}
                disabled={loading}
                onEnter={handleSubmit}
              />
            </>
          )}
        </>
      )}
      <SubmitFooter label="점검하기" onClick={handleSubmit} loading={loading} />
    </>
  );
}

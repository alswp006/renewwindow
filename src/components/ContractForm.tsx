import { useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { ListRow, Spacing, Switch, TextField } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { AmountField } from "@/components/AmountField";
import { DateField } from "@/components/DateField";
import { SubmitFooter } from "@/components/BottomCTA";
import { logClick } from "@/lib/analytics";
import { getToday } from "@/lib/date";
import { validateContractForm } from "@/lib/validation";
import type { ValidContract } from "@/lib/validation";
import type { Contract, FieldErrors } from "@/lib/types";

type FieldName = "nickname" | "endDate" | "deposit" | "monthlyRent" | "lastIncreaseDate";

const END_DATE_HINT = "만기일은 계약서의 계약기간 끝나는 날이에요";

/** 토글 햅틱 — SDK는 WebView 밖에서 throw하므로 가드한다. */
function tickWeak() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/jsdom)에서는 throw — 무시 */
  }
}

/**
 * 계약 입력·수정 폼 본문 + 하단 저장 CTA. 헤더(Top)·골격(ScreenScaffold)은 페이지가 렌더한다.
 * 검증 문구는 validateContractForm이 돌려준 것만 쓴다.
 */
export function ContractForm({
  initial,
  loading,
  extra,
  onSubmit,
}: {
  /** 수정 모드에서 채울 기존 계약 */
  initial?: Contract;
  loading?: boolean;
  /** 수정 모드의 삭제 버튼 등 — 스위치 행 아래에 렌더 */
  extra?: ReactNode;
  onSubmit: (value: ValidContract) => void;
}) {
  const [nickname, setNickname] = useState(initial?.nickname ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [deposit, setDeposit] = useState(initial ? String(initial.deposit) : "");
  const [monthlyRent, setMonthlyRent] = useState(initial ? String(initial.monthlyRent) : "");
  const [lastIncreaseDate, setLastIncreaseDate] = useState(initial?.lastIncreaseDate ?? "");
  const [renewalRightUsed, setRenewalRightUsed] = useState(initial?.renewalRightUsed ?? false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const refs: Record<FieldName, RefObject<HTMLInputElement>> = {
    nickname: useRef<HTMLInputElement>(null),
    endDate: useRef<HTMLInputElement>(null),
    deposit: useRef<HTMLInputElement>(null),
    monthlyRent: useRef<HTMLInputElement>(null),
    lastIncreaseDate: useRef<HTMLInputElement>(null),
  };

  /** 고친 칸의 에러는 바로 지운다 — 저장을 다시 눌러야 새 검증이 돈다. */
  const edit = <T,>(field: FieldName, set: (v: T) => void) => (v: T) => {
    set(v);
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const toggleUsed = () => {
    if (loading) return;
    tickWeak();
    setRenewalRightUsed((v) => !v);
  };

  const handleSave = () => {
    if (loading) return;
    logClick("contract_save");
    const result = validateContractForm(
      { nickname, endDate, deposit, monthlyRent, lastIncreaseDate, renewalRightUsed },
      getToday(),
    );
    if (!result.ok) {
      setErrors(result.errors);
      refs[result.firstErrorField as FieldName]?.current?.focus();
      return;
    }
    setErrors({});
    onSubmit(result.value);
  };

  return (
    <>
      <Spacing size={16} />
      <TextField
        ref={refs.nickname}
        variant="box"
        label="계약 이름"
        labelOption="sustain"
        placeholder="예: 망원동 투룸"
        enterKeyHint="next"
        value={nickname}
        hasError={!!errors.nickname}
        help={errors.nickname}
        disabled={loading}
        onChange={(e) => edit("nickname", setNickname)(e.target.value)}
      />
      <Spacing size={12} />
      <DateField
        inputRef={refs.endDate}
        label="만기일"
        placeholder="예: 20270331"
        value={endDate}
        onChange={edit("endDate", setEndDate)}
        hasError={!!errors.endDate}
        help={errors.endDate ?? END_DATE_HINT}
        disabled={loading}
      />
      <Spacing size={12} />
      <AmountField
        inputRef={refs.deposit}
        label="현재 보증금(원)"
        placeholder="예: 200,000,000"
        value={deposit}
        onChange={edit("deposit", setDeposit)}
        hasError={!!errors.deposit}
        help={errors.deposit}
        disabled={loading}
      />
      <Spacing size={12} />
      <AmountField
        inputRef={refs.monthlyRent}
        label="현재 월세(원)"
        placeholder="예: 500,000 (전세는 0)"
        value={monthlyRent}
        onChange={edit("monthlyRent", setMonthlyRent)}
        hasError={!!errors.monthlyRent}
        help={errors.monthlyRent}
        disabled={loading}
      />
      <Spacing size={12} />
      <DateField
        inputRef={refs.lastIncreaseDate}
        label="최근 증액일(선택)"
        placeholder="예: 20260301"
        value={lastIncreaseDate}
        onChange={edit("lastIncreaseDate", setLastIncreaseDate)}
        hasError={!!errors.lastIncreaseDate}
        help={errors.lastIncreaseDate}
        disabled={loading}
        onEnter={handleSave}
      />
      <Spacing size={16} />
      <ListRow
        onClick={toggleUsed}
        contents={<ListRow.Texts type="1RowTypeA" top="이 집에서 갱신요구권을 이미 썼어요" />}
        right={
          <Switch
            checked={renewalRightUsed}
            disabled={loading}
            // 스위치를 직접 눌러도 클릭이 행까지 올라가 두 번 토글되지 않게 막는다.
            onClick={(e) => e.stopPropagation()}
            onChange={toggleUsed}
          />
        }
      />
      {extra}
      <SubmitFooter label="저장" onClick={handleSave} loading={loading} />
    </>
  );
}

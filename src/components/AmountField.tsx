import type { Ref } from "react";
import { TextField } from "@toss/tds-mobile";
import { digitsOnly, formatNumberInput } from "@/lib/format";

/** 금액 입력 — 천 단위 콤마로 보이고, 부모에는 숫자만 남긴 문자열을 넘긴다. */
export function AmountField({
  label,
  value,
  onChange,
  placeholder,
  hasError,
  help,
  disabled,
  onEnter,
  inputRef,
}: {
  label: string;
  /** 숫자만 */
  value: string;
  onChange: (digits: string) => void;
  placeholder?: string;
  hasError?: boolean;
  help?: string;
  disabled?: boolean;
  onEnter?: () => void;
  inputRef?: Ref<HTMLInputElement>;
}) {
  return (
    <TextField
      ref={inputRef}
      variant="box"
      label={label}
      labelOption="sustain"
      inputMode="numeric"
      enterKeyHint={onEnter ? "done" : "next"}
      placeholder={placeholder}
      value={formatNumberInput(value)}
      hasError={hasError}
      help={help}
      disabled={disabled}
      onChange={(e) => onChange(digitsOnly(e.target.value))}
      onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center" })}
      onKeyDown={(e) => {
        if (e.key === "Enter") onEnter?.();
      }}
    />
  );
}

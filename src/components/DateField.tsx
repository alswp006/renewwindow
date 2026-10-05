import type { Ref } from "react";
import { TextField } from "@toss/tds-mobile";
import { formatDateInput } from "@/lib/date";

/** 날짜 입력 — 숫자 8자리를 YYYY-MM-DD로 자동 하이픈. type=date는 쓰지 않는다(Android 7 WebView). */
export function DateField({
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
  /** 'YYYY-MM-DD' (입력 중에는 부분 값) */
  value: string;
  onChange: (value: string) => void;
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
      value={value}
      hasError={hasError}
      help={help}
      disabled={disabled}
      onChange={(e) => onChange(formatDateInput(e.target.value))}
      onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center" })}
      onKeyDown={(e) => {
        if (e.key === "Enter") onEnter?.();
      }}
    />
  );
}

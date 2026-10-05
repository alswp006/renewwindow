import { useEffect, useState } from "react";
import { BottomSheet, Spacing, TextField, useToast } from "@toss/tds-mobile";
import { formatRate } from "@/lib/format";
import type { SaveResult } from "@/lib/types";

const RANGE_ERROR = "기준금리는 0~10% 사이로 입력해주세요";
const QUOTA_TOAST = "저장 공간이 부족해 기준금리를 저장하지 못했어요";

/** "3.25" → 3.25. 0~10 밖이거나 숫자가 아니면 null */
function parseRate(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const n = Number(text);
  return n >= 0 && n <= 10 ? n : null;
}

/** 기준금리 입력·저장 시트. ok면 닫고, quota면 열어 둔 채 토스트를 띄운다. */
export function BaseRateSheet({
  open,
  initialValue,
  onSave,
  onClose,
}: {
  open: boolean;
  initialValue: number;
  onSave: (percent: number) => SaveResult;
  onClose: () => void;
}) {
  const { openToast } = useToast();
  const [value, setValue] = useState(formatRate(initialValue));
  const [error, setError] = useState<string | undefined>();

  // 열릴 때마다 현재 저장값으로 시작한다(닫힌 뒤 남은 입력·오류는 버린다)
  useEffect(() => {
    if (!open) return;
    setValue(formatRate(initialValue));
    setError(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = () => {
    const percent = parseRate(value);
    if (percent === null) {
      setError(RANGE_ERROR);
      return;
    }
    setError(undefined);
    const result = onSave(percent);
    if (result.ok) {
      onClose();
    } else if (result.quota) {
      openToast(QUOTA_TOAST);
    } else {
      setError("기준금리를 저장하지 못했어요. 다시 시도해 주세요");
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      header={<BottomSheet.Header>기준금리 수정</BottomSheet.Header>}
      cta={<BottomSheet.CTA onClick={save}>저장</BottomSheet.CTA>}
    >
      <TextField
        variant="box"
        label="한국은행 기준금리(%)"
        labelOption="sustain"
        inputMode="decimal"
        enterKeyHint="done"
        placeholder="예: 2.50"
        value={value}
        hasError={!!error}
        help={error}
        onChange={(e) => {
          setValue(e.target.value);
          setError(undefined);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
        }}
      />
      <Spacing size={16} />
    </BottomSheet>
  );
}

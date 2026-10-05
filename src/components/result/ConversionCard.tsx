import { useState } from "react";
import { Button, ListRow, Paragraph, Spacing } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { AmountField } from "@/components/AmountField";
import { Card } from "@/components/Card";
import { BaseRateSheet } from "@/components/result/BaseRateSheet";
import { useSettings } from "@/hooks/useSettings";
import { logClick } from "@/lib/analytics";
import { formatKRW, formatPercent2, formatRate } from "@/lib/format";
import { buildConversionResult, computeConversionRate } from "@/lib/money";
import type { Contract } from "@/lib/types";

const GREY = "var(--adaptiveGrey600)";

function fireSuccessHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "success" })).catch(() => {});
  } catch {
    /* WebView 밖에서는 throw — 무시 */
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <ListRow
      contents={<ListRow.Texts type="1RowTypeA" top={label} />}
      right={<Paragraph.Text typography="t5">{value}</Paragraph.Text>}
    />
  );
}

/** 결과 ②: 보증금 일부를 월세로 바꿀 때의 법정 상한 계산 */
export function ConversionCard({ contract, today }: { contract: Contract; today: string }) {
  const { settings, saveBaseRate } = useSettings();
  const { deposit, monthlyRent } = contract;
  const noDeposit = deposit === 0;

  const [input, setInput] = useState("");
  // 계산을 끝낸 전환 금액. 전환율이 바뀌면 이 값으로 다시 계산한다
  const [calculated, setCalculated] = useState<number | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [sheetOpen, setSheetOpen] = useState(false);

  const rate = computeConversionRate(settings.baseRatePercent);
  const result = calculated === null ? null : buildConversionResult(deposit, monthlyRent, calculated, rate);

  const calc = () => {
    if (noDeposit) return;
    const amount = Number(input || "0");
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("전환할 금액을 입력해주세요");
      setCalculated(null);
      return;
    }
    if (amount > deposit) {
      setError("현재 보증금보다 많이 전환할 수 없어요");
      setCalculated(null);
      return;
    }
    setError(undefined);
    setCalculated(amount);
    logClick("conversion_calc");
    fireSuccessHaptic();
  };

  return (
    <Card testId="conversion-card">
      <Paragraph.Text typography="t5">보증금 일부를 월세로 바꾸면</Paragraph.Text>
      <Spacing size={12} />
      <AmountField
        label="월세로 바꿀 보증금(원)"
        placeholder="예: 50,000,000"
        value={input}
        onChange={(digits) => {
          setInput(digits);
          setError(undefined);
        }}
        disabled={noDeposit}
        hasError={!!error}
        help={error}
        onEnter={calc}
      />
      <Spacing size={12} />
      <Button display="block" disabled={noDeposit} onClick={calc}>
        계산하기
      </Button>
      <Spacing size={16} />
      {noDeposit ? (
        <Paragraph.Text typography="t6" color={GREY}>
          보증금이 없어 월세 전환 계산을 할 수 없어요
        </Paragraph.Text>
      ) : result ? (
        <>
          <Row label="남는 보증금" value={formatKRW(result.remainingDeposit)} />
          <Row label="늘어날 수 있는 월세 상한" value={formatKRW(result.addedRent)} />
          <Row label="전환 후 월세 상한" value={formatKRW(result.newMonthlyRent)} />
        </>
      ) : (
        <Paragraph.Text typography="t6" color={GREY}>
          바꿀 금액을 넣으면 법정 상한 월세를 계산해요
        </Paragraph.Text>
      )}
      <Spacing size={8} />
      <ListRow
        contents={
          <ListRow.Texts
            type="1RowTypeA"
            top={`적용 전환율 ${formatRate(rate)}% · 기준금리 ${formatPercent2(settings.baseRatePercent)}% (${settings.baseRateAsOf} 확인)`}
          />
        }
        right={
          <Button variant="weak" size="medium" onClick={() => setSheetOpen(true)}>
            수정
          </Button>
        }
      />
      <Spacing size={8} />
      <Paragraph.Text typography="t7" color={GREY}>
        주택임대차보호법 제7조의2, 시행령 제9조: 연 10%와 기준금리+2%p 중 낮은 비율
      </Paragraph.Text>
      <BaseRateSheet
        open={sheetOpen}
        initialValue={settings.baseRatePercent}
        onSave={(percent) => saveBaseRate(percent, today)}
        onClose={() => setSheetOpen(false)}
      />
    </Card>
  );
}

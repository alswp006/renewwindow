import { useEffect, useRef } from "react";
import { ListRow, Paragraph, Spacing, Switch, useToast } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { Card } from "@/components/Card";
import { MiniBar } from "@/components/MiniBar";
import { CHECKLIST_ITEMS } from "@/constants/law";
import { useChecklist } from "@/hooks/useChecklist";
import { useSettings } from "@/hooks/useSettings";
import { logImpression } from "@/lib/analytics";
import { formatKRW } from "@/lib/format";
import { computeConversionRate, computeScenarios } from "@/lib/money";
import type { Contract } from "@/lib/types";

const GREY = "var(--adaptiveGrey600)";

function fireTickHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖에서는 throw — 무시 */
  }
}

/** 결과 ③ 잠금 층: 전환 시나리오 비교 + 협상 전 확인할 법령 체크리스트 */
export function DeepTier({ contract, deadlineDate }: { contract: Contract; deadlineDate: string }) {
  const { settings } = useSettings();
  const { checkedIds, toggle } = useChecklist(contract.id);
  const { openToast } = useToast();
  const impressionLogged = useRef(false);

  useEffect(() => {
    if (impressionLogged.current) return;
    impressionLogged.current = true;
    logImpression("locked_tier");
  }, []);

  const rate = computeConversionRate(settings.baseRatePercent);
  const rows = contract.deposit === 0 ? [] : computeScenarios(contract.deposit, contract.monthlyRent, rate);
  const maxCap = Math.max(0, ...rows.map((r) => r.monthlyRentCap));

  const setChecked = (itemId: string, on: boolean) => {
    fireTickHaptic();
    const result = toggle(itemId, on);
    if (!result.ok) {
      openToast(
        result.quota ? "저장 공간이 부족해 체크를 저장하지 못했어요" : "체크를 저장하지 못했어요. 다시 눌러주세요",
      );
    }
  };

  return (
    <div data-testid="locked-tier">
      <Card>
        <Paragraph.Text typography="t5">보증금 전환 시나리오 비교</Paragraph.Text>
        <Spacing size={12} />
        {rows.length === 0 ? (
          <Paragraph.Text typography="t6" color={GREY}>
            보증금이 없어 전환 시나리오가 없어요
          </Paragraph.Text>
        ) : (
          rows.map((r) => (
            <div key={r.percent} data-testid="scenario-row">
              <ListRow
                contents={
                  <ListRow.Texts
                    type="1RowTypeA"
                    top={`전환 ${r.percent}% · 보증금 ${formatKRW(r.remainingDeposit)} · 월세 상한 ${formatKRW(r.monthlyRentCap)} · 연 ${formatKRW(r.annualRent)}`}
                  />
                }
              />
              <MiniBar ratio={maxCap > 0 ? r.monthlyRentCap / maxCap : 0} />
              <Spacing size={8} />
            </div>
          ))
        )}
      </Card>
      <Spacing size={16} />
      <Card>
        <Paragraph.Text typography="t5">협상 전 확인할 법령</Paragraph.Text>
        <Spacing size={8} />
        {CHECKLIST_ITEMS.map((item) => {
          const checked = checkedIds.includes(item.id);
          return (
            <div key={item.id} data-testid="checklist-item">
              <ListRow
                onClick={() => setChecked(item.id, !checked)}
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={item.title.replace("{마감일}", deadlineDate)}
                    bottom={item.source}
                  />
                }
                right={
                  // 스위치 클릭이 행 onClick으로 번져 두 번 토글되는 것을 막는다
                  <span onClick={(e) => e.stopPropagation()}>
                    <Switch checked={checked} onChange={(_e, next) => setChecked(item.id, next)} />
                  </span>
                }
              />
            </div>
          );
        })}
      </Card>
    </div>
  );
}

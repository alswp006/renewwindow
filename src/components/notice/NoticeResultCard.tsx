import { useEffect, useRef } from "react";
import { Badge, ListRow, Paragraph, Spacing } from "@toss/tds-mobile";
import { Card } from "@/components/Card";
import { logImpression } from "@/lib/analytics";
import { formatKRW, formatPercent2 } from "@/lib/format";
import type { Contract, NoticeCheck, NoticeTiming } from "@/lib/types";

const TIMING_TEXT: Record<NoticeTiming, string> = {
  in_period: "집주인 통지 기간 안에 받은 통보예요",
  after_period:
    "집주인 통지 기간(만기 6개월~2개월 전)이 지난 뒤 받은 통보예요 · 주택임대차보호법 제6조 제1항",
  before_period: "집주인 통지 기간 전에 받은 통보예요",
};

/** 인상률 행 — 초과면 한 줄에 초과액까지, 이내면 아래 줄에 '초과 없음' */
function RateRow({ label, percent, over }: { label: string; percent: number; over: number }) {
  const rate = `${label} ${formatPercent2(percent)}% 인상`;
  return over > 0 ? (
    <ListRow contents={<ListRow.Texts type="1RowTypeA" top={`${rate} · ${formatKRW(over)} 초과`} />} />
  ) : (
    <ListRow contents={<ListRow.Texts type="2RowTypeA" top={rate} bottom="초과 없음" />} />
  );
}

/** 통보 점검 결과 카드 — 상한 초과 여부, 인상률·초과액, 통보 시기, 1년 이내 재증액 */
export function NoticeResultCard({ contract, check }: { contract: Contract; check: NoticeCheck }) {
  const logged = useRef(false);
  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    logImpression("notice_result");
  }, []);

  const showRecentIncrease = check.withinOneYearOfIncrease && Boolean(contract.lastIncreaseDate);

  return (
    <Card testId="notice-result">
      <Badge size="medium" variant="fill" color={check.isOverCap ? "red" : "green"}>
        {check.isOverCap ? "상한 초과" : "상한 이내"}
      </Badge>
      <Spacing size={12} />
      {check.depositRatePercent !== null && (
        <RateRow label="보증금" percent={check.depositRatePercent} over={check.depositOver} />
      )}
      {contract.monthlyRent > 0 && check.rentRatePercent !== null && (
        <RateRow label="월세" percent={check.rentRatePercent} over={check.rentOver} />
      )}
      <ListRow contents={<ListRow.Texts type="1RowTypeA" top={TIMING_TEXT[check.noticeTiming]} />} />
      {showRecentIncrease && (
        <ListRow
          contents={
            <ListRow.Texts
              type="1RowTypeA"
              top={`최근 증액(${contract.lastIncreaseDate}) 후 1년이 지나지 않았어요 · 제7조 제1항: 증액 후 1년 이내 재증액 불가`}
            />
          }
        />
      )}
      <Spacing size={12} />
      <Paragraph.Text typography="t7" color="var(--adaptiveGrey600)">
        주택임대차보호법 제7조 제2항: 갱신 시 증액은 5% 이내
      </Paragraph.Text>
    </Card>
  );
}

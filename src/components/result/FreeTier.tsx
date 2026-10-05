import { useEffect, useRef } from "react";
import { Badge, ListRow, Paragraph, Spacing } from "@toss/tds-mobile";
import { Card } from "@/components/Card";
import { MiniBar } from "@/components/MiniBar";
import { SummaryHero } from "@/components/SummaryHero";
import { logImpression } from "@/lib/analytics";
import { diffDays } from "@/lib/date";
import { formatDday, formatKRW } from "@/lib/format";
import { computeCap } from "@/lib/money";
import { computeRenewalWindow } from "@/lib/renewal";
import { requestReviewOnce } from "@/lib/review";
import type { Contract, RenewalWindow } from "@/lib/types";

const GREY = "var(--adaptiveGrey600)";

/** 상태별 히어로 문구. open/upcoming은 D-day, 그 외는 지났다는 안내 */
function heroOf(w: RenewalWindow): { label: string; value: string; caption?: string } {
  switch (w.status) {
    case "open":
      return {
        label: "갱신 요구 마감까지",
        value: formatDday(w.daysToDeadline),
        caption: `${w.deadlineDate}까지 집주인에게 도달해야 해요`,
      };
    case "upcoming":
      return {
        label: "갱신 요구 시작까지",
        value: formatDday(w.daysToStart),
        caption: `${w.startDate}부터 갱신을 요구할 수 있어요`,
      };
    case "closed":
      return { label: "갱신 요구 마감", value: "갱신 요구 기간이 지났어요", caption: `마감일은 ${w.deadlineDate}였어요` };
    case "expired":
      return { label: "계약 만기", value: "계약 만기가 지났어요", caption: `만기일은 ${w.endDate}였어요` };
  }
}

/** 결과 무료 층: 갱신 요구 타임라인 + 5% 상한 카드 */
export function FreeTier({ contract, today }: { contract: Contract; today: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const impressionLogged = useRef(false);
  const reviewRequested = useRef(false);

  const w = computeRenewalWindow(contract.endDate, today);
  const win = "error" in w ? null : w;
  const cap = computeCap(contract.deposit, contract.monthlyRent);

  // 뷰포트에 처음 들어온 순간 1회 — IntersectionObserver가 없으면 마운트 시점으로 대체
  useEffect(() => {
    const fire = () => {
      if (impressionLogged.current) return;
      impressionLogged.current = true;
      logImpression("result_free_tier");
    };
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      fire();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          fire();
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 갱신 요구를 할 수 있는 시점에 결과를 본 직후 1회
  const status = win?.status;
  useEffect(() => {
    if (reviewRequested.current) return;
    if (status === "open" || status === "upcoming") {
      reviewRequested.current = true;
      requestReviewOnce();
    }
  }, [status]);

  const hero = win ? heroOf(win) : null;
  const barRatio = win ? -win.daysToStart / diffDays(win.deadlineDate, win.startDate) : 0;

  return (
    <div data-testid="free-tier" ref={rootRef}>
      <div style={{ overflowWrap: "break-word" }}>
        <Paragraph.Text typography="t3">{contract.nickname}</Paragraph.Text>
      </div>
      <Spacing size={16} />

      {win && hero ? (
        <>
          <SummaryHero
            label={hero.label}
            value={
              <span style={{ display: "inline-block", maxWidth: "100%", fontVariantNumeric: "tabular-nums" }}>
                <Paragraph.Text typography="t1">{hero.value}</Paragraph.Text>
              </span>
            }
            caption={hero.caption}
          />
          <Spacing size={16} />

          <Card testId="renewal-timeline">
            <ListRow contents={<ListRow.Texts type="1RowTypeA" top={`요구 시작 ${win.startDate}`} />} />
            <ListRow
              contents={<ListRow.Texts type="1RowTypeA" top={`요구 마감 ${win.deadlineDate}`} />}
              right={
                <Badge size="small" variant="fill" color="blue">
                  마감
                </Badge>
              }
            />
            <ListRow contents={<ListRow.Texts type="1RowTypeA" top={`계약 만기 ${win.endDate}`} />} />
            <Spacing size={8} />
            <MiniBar ratio={barRatio} />
            <Spacing size={8} />
            <Paragraph.Text typography="t7" color={GREY}>
              주택임대차보호법 제6조의3: 만기 6개월 전부터 2개월 전까지
            </Paragraph.Text>
          </Card>
          <Spacing size={16} />
        </>
      ) : null}

      {contract.renewalRightUsed ? (
        <>
          <Paragraph.Text typography="t6" color="var(--adaptiveRed500)">
            갱신요구권은 1회만 쓸 수 있어요(제6조의3 제2항). 이번 만기에는 갱신을 요구할 수 없어 5% 상한이 적용되지 않을 수 있어요
          </Paragraph.Text>
          <Spacing size={16} />
        </>
      ) : null}

      <Card testId="cap-card">
        <Paragraph.Text typography="t6">갱신 시 최대 보증금</Paragraph.Text>
        <Spacing size={4} />
        <Paragraph.Text typography="t2">{formatKRW(cap.maxDeposit)}</Paragraph.Text>
        <Spacing size={4} />
        <Paragraph.Text typography="t7" color={GREY}>
          지금보다 최대 {formatKRW(cap.depositIncrease)}
        </Paragraph.Text>
        {contract.monthlyRent > 0 ? (
          <>
            <Spacing size={16} />
            <Paragraph.Text typography="t6">갱신 시 최대 월세</Paragraph.Text>
            <Spacing size={4} />
            <Paragraph.Text typography="t3">{formatKRW(cap.maxMonthlyRent)}</Paragraph.Text>
            <Spacing size={4} />
            <Paragraph.Text typography="t7" color={GREY}>
              지금보다 최대 {formatKRW(cap.rentIncrease)}
            </Paragraph.Text>
          </>
        ) : null}
        <Spacing size={16} />
        <Paragraph.Text typography="t7" color={GREY}>
          주택임대차보호법 제7조: 증액은 5% 이내
        </Paragraph.Text>
      </Card>
    </div>
  );
}

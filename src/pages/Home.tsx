import { useContext, useEffect, useMemo, useRef } from 'react';
import { Navigate, UNSAFE_LocationContext, useNavigate } from 'react-router-dom';
import { Badge, Button, ListRow, Paragraph, Spacing, Top, useToast } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SummaryHero } from '@/components/SummaryHero';
import { SubmitFooter } from '@/components/BottomCTA';
import { AdSlot } from '@/components/AdSlot';
import { EmptyState, LoadingState } from '@/components/StateView';
import { useContracts } from '@/hooks/useContracts';
import { paths } from '@/constants/routes';
import { getToday } from '@/lib/date';
import { computeRenewalWindow, sortContracts } from '@/lib/renewal';
import { formatDday, formatKRW } from '@/lib/format';
import { logClick } from '@/lib/analytics';
import type { Contract, RenewalWindow, RouteState, WindowStatus } from '@/lib/types';

const STATUS_LABEL: Record<WindowStatus, string> = {
  open: '요구 가능',
  upcoming: '시작 전',
  closed: '기간 지남',
  expired: '만기 지남',
};

const STATUS_COLOR: Record<WindowStatus, 'blue' | 'teal' | 'yellow' | 'elephant'> = {
  open: 'blue',
  upcoming: 'teal',
  closed: 'yellow',
  expired: 'elephant',
};

const RECOVERED_MESSAGE = '저장된 계약을 불러오지 못해 초기화했어요';

// SDK는 WebView 밖에서 throw한다 — 이벤트 핸들러 햅틱은 가드한다.
function fireHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/jsdom) — 무시 */
  }
}

function ddayLabel(w: RenewalWindow): string {
  if (w.status === 'open') return `마감 ${formatDday(w.daysToDeadline)}`;
  if (w.status === 'upcoming') return `시작 ${formatDday(w.daysToStart)}`;
  return '-';
}

function subText(c: Contract): string {
  const base = `만기 ${c.endDate} · 보증금 ${formatKRW(c.deposit)}`;
  return c.monthlyRent > 0 ? `${base} · 월세 ${formatKRW(c.monthlyRent)}` : base;
}

export default function Home() {
  const navigate = useNavigate();
  // useLocation 대신 컨텍스트에서 읽는다 — 테스트 헬퍼(mockRouter)가 useLocation/useNavigate를 통째로
  // 목킹해도 실제 라우터의 state를 읽고 비워야 한다(동작은 useLocation과 같다).
  const { location } = useContext(UNSAFE_LocationContext);
  const { openToast } = useToast();
  const { status, contracts, recovered, reload } = useContracts();

  // 렌더마다 바뀔 수 있는 함수는 ref로 잡아 effect가 한 번만 돌게 한다.
  const toastRef = useRef(openToast);
  toastRef.current = openToast;

  // location.state.toast: 문자열이면 1회 띄우고, 어떤 값이든 state는 아래 <Navigate>가 비운다.
  const handledKey = useRef<string | null>(null);
  useEffect(() => {
    const state = location.state as RouteState['/'];
    if (state == null || handledKey.current === location.key) return;
    handledKey.current = location.key;
    const message = (state as { toast?: unknown }).toast;
    if (typeof message === 'string' && message !== '') toastRef.current(message);
  }, [location.state, location.key]);

  const recoveredShown = useRef(false);
  useEffect(() => {
    if (status !== 'ready' || !recovered || recoveredShown.current) return;
    recoveredShown.current = true;
    toastRef.current(RECOVERED_MESSAGE);
  }, [status, recovered]);

  const rows = useMemo(() => {
    const today = getToday();
    return sortContracts(contracts, today).map((contract) => {
      const w = computeRenewalWindow(contract.endDate, today);
      return { contract, window: 'error' in w ? null : w };
    });
  }, [contracts]);

  const openContract = (id: string) => {
    fireHaptic('tickWeak');
    logClick('home_contract_open');
    navigate(paths.contract(id));
  };

  const addContract = () => {
    logClick('home_add_contract');
    navigate(paths.newContract());
  };

  const first = rows[0];
  const hero =
    first?.window && (first.window.status === 'open' || first.window.status === 'upcoming') ? first : null;
  const hasContracts = status === 'ready' && rows.length > 0;

  return (
    <>
      {location.state != null && <Navigate to="." replace state={null satisfies RouteState['/']} />}
      <ScreenScaffold
        top={<Top title={<Top.TitleParagraph>갱신체크</Top.TitleParagraph>} />}
        bottom={hasContracts ? <SubmitFooter label="계약 추가" onClick={addContract} /> : undefined}
      >
        <Spacing size={16} />

        {status === 'loading' && <LoadingState rows={3} testId="home-loading" />}

        {status === 'error' && (
          <div
            data-testid="home-error"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: '48px 24px',
            }}
          >
            <Paragraph.Text typography="t5">
              계약을 불러오지 못했어요. 잠시 후 다시 시도해주세요
            </Paragraph.Text>
            <Spacing size={20} />
            <Button variant="weak" onClick={reload}>
              다시 시도
            </Button>
          </div>
        )}

        {status === 'ready' && rows.length === 0 && (
          <EmptyState
            testId="home-empty"
            title="아직 등록한 계약이 없어요"
            description="만기일만 넣으면 갱신 요구 마감일을 알려드려요"
            action={
              <Button
                variant="weak"
                onClick={() => {
                  fireHaptic('success');
                  addContract();
                }}
              >
                첫 계약 등록하기
              </Button>
            }
          />
        )}

        {hasContracts && (
          <>
            {hero?.window && (
              <>
                <SummaryHero
                  testId="home-hero"
                  label={
                    hero.window.status === 'open'
                      ? `${hero.contract.nickname} 갱신 요구 마감까지`
                      : `${hero.contract.nickname} 갱신 요구 시작까지`
                  }
                  value={
                    <Paragraph.Text typography="t1">
                      {formatDday(
                        hero.window.status === 'open' ? hero.window.daysToDeadline : hero.window.daysToStart,
                      )}
                    </Paragraph.Text>
                  }
                  caption={
                    hero.window.status === 'open'
                      ? `${hero.window.deadlineDate}까지 집주인에게 도달해야 해요`
                      : `${hero.window.startDate}부터 요구할 수 있어요`
                  }
                />
                <Spacing size={24} />
              </>
            )}

            <Paragraph.Text typography="t4">내 계약</Paragraph.Text>
            <Spacing size={12} />
            {rows.map(({ contract, window }) => (
              <ListRow
                key={contract.id}
                onClick={() => openContract(contract.id)}
                contents={
                  <ListRow.Texts type="2RowTypeA" top={contract.nickname} bottom={subText(contract)} />
                }
                right={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {window && (
                      <Badge size="small" variant="weak" color={STATUS_COLOR[window.status]}>
                        {STATUS_LABEL[window.status]}
                      </Badge>
                    )}
                    <Paragraph.Text typography="t6" color="var(--adaptiveGrey600)">
                      {window ? ddayLabel(window) : '-'}
                    </Paragraph.Text>
                  </div>
                }
              />
            ))}

            <Spacing size={24} />
            <AdSlot adGroupId={(import.meta.env.VITE_TOSS_AD_GROUP_ID as string | undefined) ?? ''} />
            {/* 하단 고정 CTA에 가려지지 않게 여백 */}
            <Spacing size={96} />
          </>
        )}
      </ScreenScaffold>
    </>
  );
}

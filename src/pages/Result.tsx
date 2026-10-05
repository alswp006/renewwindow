import { useContext, useEffect, useMemo, useRef } from 'react';
import { UNSAFE_LocationContext, useNavigate, useParams } from 'react-router-dom';
import { Button, ListRow, Paragraph, Spacing, Top, useToast } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SubmitFooter } from '@/components/BottomCTA';
import { Card } from '@/components/Card';
import { AdSlot } from '@/components/AdSlot';
import { TossRewardAd } from '@/components/TossRewardAd';
import { NotFoundState } from '@/components/NotFoundState';
import { FreeTier } from '@/components/result/FreeTier';
import { ConversionCard } from '@/components/result/ConversionCard';
import { DeepTier } from '@/components/result/DeepTier';
import { useContracts } from '@/hooks/useContracts';
import { paths } from '@/constants/routes';
import { getToday } from '@/lib/date';
import { computeRenewalWindow } from '@/lib/renewal';
import { logClick, logImpression } from '@/lib/analytics';
import { shareApp } from '@/lib/share';
import type { Contract, RouteState } from '@/lib/types';

const SHARE_FAIL_MESSAGE = '공유하지 못했어요. 잠시 후 다시 시도해주세요';
const SAVED_MESSAGE = '계약을 저장했어요';

function ResultSkeleton() {
  const block = (height: number) => (
    <div style={{ height, borderRadius: 12, backgroundColor: 'var(--adaptiveGrey100)' }} />
  );
  return (
    <div data-testid="result-loading" aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card>
        {block(20)}
        <Spacing size={12} />
        {block(48)}
        <Spacing size={12} />
        {block(20)}
      </Card>
      <Card>
        {block(20)}
        <Spacing size={12} />
        {block(64)}
      </Card>
    </div>
  );
}

/** 배너가 화면에 들어온 순간 1회 노출 로그 — IntersectionObserver가 없으면 마운트 시점으로 대체 */
function BannerSlot() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    let logged = false;
    const fire = () => {
      if (logged) return;
      logged = true;
      logImpression('ad_banner_result');
    };
    if (!el || typeof IntersectionObserver === 'undefined') {
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
  return (
    <div ref={ref}>
      <AdSlot adGroupId={(import.meta.env.VITE_TOSS_AD_GROUP_ID as string | undefined) ?? ''} />
    </div>
  );
}

function ResultBody({ contract, today }: { contract: Contract; today: string }) {
  const navigate = useNavigate();
  const { openToast } = useToast();
  const toastRef = useRef(openToast);
  toastRef.current = openToast;

  const w = computeRenewalWindow(contract.endDate, today);
  const deadlineDate = 'error' in w ? contract.endDate : w.deadlineDate;

  const goNotice = () => {
    logClick('result_notice_check');
    navigate(paths.notice(contract.id));
  };

  const goEdit = () => navigate(paths.editContract(contract.id));

  const share = async () => {
    logClick('result_share');
    try {
      await shareApp({ message: `${contract.nickname} 갱신 요구 마감일을 확인했어요`, path: paths.contract(contract.id) });
    } catch {
      toastRef.current(SHARE_FAIL_MESSAGE);
    }
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>갱신체크</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="결과 공유하기" onClick={share} />}
    >
      <Spacing size={16} />
      <FreeTier contract={contract} today={today} />
      <Spacing size={24} />
      <ConversionCard contract={contract} today={today} />
      <Spacing size={16} />
      <ListRow
        onClick={goNotice}
        withArrow
        contents={
          <ListRow.Texts
            type="2RowTypeA"
            top="집주인 인상 통보 점검하기"
            bottom="통보 금액이 5% 상한을 넘는지 확인해요"
          />
        }
      />
      <Spacing size={24} />
      {/* TODO: TossRewardAd에 게이트 버튼 클릭 콜백이 없다 — 생기면 logClick('locked_tier_unlock')을 연결한다. */}
      <TossRewardAd
        slotId={(import.meta.env.VITE_TOSS_AD_SLOT_ID as string | undefined) ?? ''}
        description="광고를 시청하면 더 깊은 분석을 볼 수 있어요"
        buttonText="광고 보고 전환 시나리오 비교·협상 체크리스트 보기"
      >
        <DeepTier contract={contract} deadlineDate={deadlineDate} />
      </TossRewardAd>
      <Spacing size={16} />
      <Paragraph.Text typography="t7" color="var(--adaptiveGrey600)">
        법률 자문이 아닌 참고용 계산이에요
      </Paragraph.Text>
      <Spacing size={24} />
      <BannerSlot />
      <Spacing size={16} />
      <Button variant="weak" display="block" onClick={goEdit}>
        계약 수정
      </Button>
      {/* 하단 고정 CTA에 가려지지 않게 여백 */}
      <Spacing size={96} />
    </ScreenScaffold>
  );
}

export default function Result() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // useLocation 대신 컨텍스트에서 읽는다 — 테스트 헬퍼(mockRouter)가 useLocation을 통째로 목킹해도 실제 state를 읽는다.
  const { location } = useContext(UNSAFE_LocationContext);
  const { openToast } = useToast();
  // 저장소 읽기가 다음 마이크로태스크로 미뤄져 첫 렌더는 항상 loading이다.
  const { status, contracts } = useContracts();
  const contract = useMemo(() => contracts.find((c) => c.id === id), [contracts, id]);
  const today = useMemo(() => getToday(), []);

  const toastRef = useRef(openToast);
  toastRef.current = openToast;

  // 저장 직후 진입이면 1회만 알린다
  const savedShown = useRef(false);
  const justSaved = (location.state as RouteState['/contracts/:id'])?.justSaved === true;
  useEffect(() => {
    if (!justSaved || savedShown.current) return;
    savedShown.current = true;
    toastRef.current(SAVED_MESSAGE);
  }, [justSaved]);

  if (status === 'error' || (status === 'ready' && !contract)) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>갱신체크</Top.TitleParagraph>} />}>
        <NotFoundState testId="result-not-found" onBack={() => navigate(paths.home(), { replace: true })} />
      </ScreenScaffold>
    );
  }

  if (!contract) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>갱신체크</Top.TitleParagraph>} />}>
        <Spacing size={16} />
        <ResultSkeleton />
      </ScreenScaffold>
    );
  }

  return <ResultBody contract={contract} today={today} />;
}

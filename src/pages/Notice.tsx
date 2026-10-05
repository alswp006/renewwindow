import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Paragraph, Spacing, Top, useToast } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { NotFoundState } from '@/components/NotFoundState';
import { NoticeForm } from '@/components/notice/NoticeForm';
import { NoticeResultCard } from '@/components/notice/NoticeResultCard';
import { useContract } from '@/hooks/useContracts';
import { paths } from '@/constants/routes';
import { computeNoticeCheck } from '@/lib/notice';
import { requestReviewOnce } from '@/lib/review';
import type { ValidNotice } from '@/lib/noticeValidation';
import type { Contract, NoticeCheck } from '@/lib/types';

const EMPTY_MESSAGE = '통보 받은 내용을 넣으면 5% 상한 초과 여부를 알려드려요';
const QUOTA_MESSAGE = '저장 공간이 부족해 점검 내용을 저장하지 못했어요';

/** 계약을 읽기 전 자리 — 폼은 disabled·버튼 loading으로만 보여 준다 */
const LOADING_CONTRACT = { endDate: '', deposit: 0, monthlyRent: 0 };

function restoreCheck(contract: Contract): NoticeCheck | null {
  if (!contract.notice) return null;
  const result = computeNoticeCheck(contract, contract.notice);
  return 'error' in result ? null : result;
}

export default function Notice() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { openToast } = useToast();
  const toastRef = useRef(openToast);
  toastRef.current = openToast;

  const { status, contract, save } = useContract(id);
  // 방금 점검한 결과 — 저장이 실패해도 화면에는 남긴다
  const [fresh, setFresh] = useState<NoticeCheck | null>(null);
  const restored = useMemo(() => (contract ? restoreCheck(contract) : null), [contract]);
  const check = fresh ?? restored;

  const top = (
    <Top
      title={<Top.TitleParagraph>갱신체크</Top.TitleParagraph>}
      lower={
        contract ? (
          <Paragraph.Text typography="t5" color="var(--adaptiveGrey600)">
            {`${contract.nickname} 인상 통보 점검`}
          </Paragraph.Text>
        ) : undefined
      }
    />
  );

  if (status === 'not_found') {
    return (
      <ScreenScaffold top={top}>
        <NotFoundState testId="notice-not-found" onBack={() => navigate(paths.home(), { replace: true })} />
      </ScreenScaffold>
    );
  }

  const handleValid = (draft: ValidNotice) => {
    if (!contract) return;
    const result = computeNoticeCheck(contract, draft);
    if ('error' in result) return;
    setFresh(result);

    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...fields } = contract;
    const saved = save({ ...fields, notice: { ...draft, checkedAt: new Date().toISOString() } });
    if (!saved.ok) toastRef.current(QUOTA_MESSAGE);
    requestReviewOnce();
  };

  return (
    <ScreenScaffold top={top}>
      <Spacing size={16} />
      {contract ? (
        <NoticeForm key="ready" contract={contract} initial={contract.notice} onValid={handleValid} />
      ) : (
        <NoticeForm key="loading" contract={LOADING_CONTRACT} loading onValid={handleValid} />
      )}
      <Spacing size={24} />
      {check && contract ? (
        <NoticeResultCard contract={contract} check={check} />
      ) : (
        <Paragraph.Text typography="t6" color="var(--adaptiveGrey600)">
          {EMPTY_MESSAGE}
        </Paragraph.Text>
      )}
      <Spacing size={16} />
      <Paragraph.Text typography="t7" color="var(--adaptiveGrey600)">
        법률 자문이 아닌 참고용 계산이에요
      </Paragraph.Text>
      {/* 하단 고정 CTA에 가려지지 않게 여백 */}
      <Spacing size={96} />
    </ScreenScaffold>
  );
}

import { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spacing, Top, useToast } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { NotFoundState } from '@/components/NotFoundState';
import { ContractForm } from '@/components/ContractForm';
import { DeleteContractButton } from '@/components/DeleteContractButton';
import { useContract } from '@/hooks/useContracts';
import { saveContract } from '@/lib/storage';
import { paths } from '@/constants/routes';
import type { ValidContract } from '@/lib/validation';
import type { RouteState, SaveResult } from '@/lib/types';

const LIMIT_MESSAGE = '계약은 최대 20건까지 등록할 수 있어요';
const QUOTA_MESSAGE = '저장 공간이 부족해 저장하지 못했어요';
const FAIL_MESSAGE = '저장하지 못했어요. 잠시 후 다시 눌러 주세요';
const DELETED_MESSAGE = '계약을 삭제했어요';

function failMessage(result: SaveResult): string {
  if (result.quota) return QUOTA_MESSAGE;
  if (result.error === 'limit') return LIMIT_MESSAGE;
  return FAIL_MESSAGE;
}

export default function ContractEdit() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { openToast } = useToast();
  const toastRef = useRef(openToast);
  toastRef.current = openToast;

  const isNew = !id;
  const existing = useContract(id ?? '');
  const status = isNew ? 'ready' : existing.status;
  const contract = isNew ? undefined : existing.contract;

  const top = (
    <Top
      title={<Top.TitleParagraph>갱신체크</Top.TitleParagraph>}
      subtitleBottom={<Top.SubtitleParagraph>{isNew ? '계약 등록' : '계약 수정'}</Top.SubtitleParagraph>}
    />
  );

  if (status === 'not_found') {
    return (
      <ScreenScaffold top={top}>
        <NotFoundState testId="contract-edit-not-found" onBack={() => navigate(paths.home(), { replace: true })} />
      </ScreenScaffold>
    );
  }

  const handleSubmit = (value: ValidContract) => {
    const result = isNew ? saveContract(value) : existing.save(value);
    if (!result.ok || !result.id) {
      toastRef.current(failMessage(result));
      return;
    }
    const state: RouteState['/contracts/:id'] = { justSaved: true };
    // 저장 후 폼으로 되돌아오지 않게 replace — 뒤로가기는 홈으로 간다.
    navigate(paths.contract(result.id), { replace: true, state });
  };

  const handleDeleted = () => {
    const state: RouteState['/'] = { toast: DELETED_MESSAGE };
    navigate(paths.home(), { replace: true, state });
  };

  return (
    <ScreenScaffold top={top}>
      {status === 'loading' ? (
        <ContractForm key="loading" loading onSubmit={handleSubmit} />
      ) : (
        <ContractForm
          key={contract?.id ?? 'new'}
          initial={contract}
          onSubmit={handleSubmit}
          extra={
            contract ? (
              <>
                <Spacing size={24} />
                <DeleteContractButton contract={contract} onDeleted={handleDeleted} />
                <Spacing size={16} />
              </>
            ) : undefined
          }
        />
      )}
      {/* 하단 고정 저장 CTA에 마지막 행이 가려지지 않게 여백 */}
      <Spacing size={96} />
    </ScreenScaffold>
  );
}

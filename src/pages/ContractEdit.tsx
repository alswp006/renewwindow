import { useParams, useNavigate } from 'react-router-dom';
import { Paragraph, Spacing, Top } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { NotFoundState } from '@/components/NotFoundState';
import { useContract } from '@/hooks/useContracts';
import { paths } from '@/constants/routes';

export default function ContractEdit() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const isNew = !id;
  const { status, contract } = isNew ? { status: 'ready' as const, contract: undefined } : useContract(id);

  const top = (
    <Top
      title={<Top.TitleParagraph>갱신체크</Top.TitleParagraph>}
      lower={
        isNew ? (
          <Paragraph.Text typography="t5" color="var(--adaptiveGrey600)">
            계약 등록
          </Paragraph.Text>
        ) : (
          <Paragraph.Text typography="t5" color="var(--adaptiveGrey600)">
            계약 수정
          </Paragraph.Text>
        )
      }
    />
  );

  if (!isNew && status === 'not_found') {
    return (
      <ScreenScaffold top={top}>
        <NotFoundState testId="contract-edit-not-found" onBack={() => navigate(paths.home(), { replace: true })} />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold top={top}>
      <Spacing size={16} />
      {/* TODO: Implement contract edit form */}
      <Paragraph.Text typography="t6" color="var(--adaptiveGrey600)">
        계약 정보 입력 폼 준비 중
      </Paragraph.Text>
      <Spacing size={16} />
    </ScreenScaffold>
  );
}

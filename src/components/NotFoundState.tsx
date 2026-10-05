import { Asset, Button, Paragraph, Spacing } from "@toss/tds-mobile";

/** 계약을 못 찾았을 때(삭제됐거나 잘못된 주소) — 목록으로 돌아가는 길을 둔다. */
export function NotFoundState({ testId, onBack }: { testId: string; onBack: () => void }) {
  return (
    <div
      data-testid={testId}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}
    >
      <Asset.ContentIcon name="icon-search-bold" alt="" />
      <Spacing size={16} />
      <Paragraph.Text typography="t5">계약을 찾을 수 없어요</Paragraph.Text>
      <Spacing size={16} />
      <Button variant="weak" display="block" onClick={onBack}>
        목록으로
      </Button>
    </div>
  );
}

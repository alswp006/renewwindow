import { useState } from "react";
import { AlertDialog, Button } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { logClick } from "@/lib/analytics";
import { deleteContract } from "@/lib/storage";
import type { Contract } from "@/lib/types";

/** 삭제 확정 햅틱 — SDK는 WebView 밖에서 throw하므로 가드한다. */
function successHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "success" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/jsdom)에서는 throw — 무시 */
  }
}

/**
 * 계약 삭제 버튼 + 확인 다이얼로그. 저장소 삭제까지만 하고 페이지 이동은 부모가 onDeleted로 한다.
 * 저장소 삭제가 실패하면 다이얼로그를 닫지 않아 다시 시도할 수 있다(onDeleted는 호출하지 않는다).
 */
export function DeleteContractButton({
  contract,
  onDeleted,
}: {
  contract: Contract;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  const openDelete = () => {
    setFailed(false);
    setOpen(true);
  };
  const closeDelete = () => setOpen(false);

  const confirmDelete = () => {
    logClick("contract_delete_confirm");
    successHaptic();
    const result = deleteContract(contract.id);
    if (!result.ok) {
      setFailed(true);
      return;
    }
    setOpen(false);
    onDeleted();
  };

  return (
    <>
      <Button variant="weak" color="danger" size="large" display="block" onClick={openDelete}>
        계약 삭제
      </Button>
      <AlertDialog
        open={open}
        title={`${contract.nickname} 계약을 삭제할까요?`}
        description={
          failed
            ? "삭제하지 못했어요. 잠시 후 다시 눌러 주세요"
            : "삭제하면 체크리스트 기록도 함께 사라져요"
        }
        onClose={closeDelete}
        alertButton={
          <>
            <AlertDialog.AlertButton onClick={closeDelete}>닫기</AlertDialog.AlertButton>
            <AlertDialog.AlertButton onClick={confirmDelete}>삭제</AlertDialog.AlertButton>
          </>
        }
      />
    </>
  );
}

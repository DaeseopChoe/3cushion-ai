import React from "react";
import ModalShell from "./common/ModalShell";

const BUTTON_STYLE = {
  padding: "8px 12px",
  fontSize: 14,
  borderRadius: 6,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

/**
 * Shown when a new-Family SAVE is still waiting for Derived Approval (after a
 * reload, or when that work is recalled from History). Without onClose the
 * user must resume the review or cancel the SAVE.
 */
export default function PendingSaveRecoveryPrompt({
  open,
  familyId,
  busy = false,
  onResume,
  onCancelSave,
  onClose,
}) {
  return (
    <ModalShell
      open={open}
      disableBackdropClick
      draggable={false}
      fixed
      zIndex={120}
      title="파생 승인 대기 중인 새 작업"
      panelStyle={{ width: "min(440px, 92vw)", maxWidth: 440 }}
    >
      <div data-testid="pending-save-recovery-prompt" style={{ display: "grid", gap: 12 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>파생 승인이 완료되지 않은 새 작업이 있습니다.</p>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "#475569" }}>
          [파생 승인 재개]는 같은 Family로 파생 검토를 다시 엽니다 (새 Family나 History 기록을 만들지
          않습니다). [새 SAVE 취소]는 이 새 저장을 통째로 취소하고 History에서 이 작업 기록만
          지웁니다. 다른 작업·Published 데이터·AI 문장은 바뀌지 않습니다.
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
          승인 전 작업은 Publish할 수 없습니다.
        </p>
        {familyId ? (
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Family: {familyId}</p>
        ) : null}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {onClose ? (
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              style={{ ...BUTTON_STYLE, border: "1px solid #cbd5e1", background: "#fff", color: "#334155" }}
            >
              닫기
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={onCancelSave}
            style={{ ...BUTTON_STYLE, border: "1px solid #fca5a5", background: "#fff1f2", color: "#b91c1c" }}
          >
            새 SAVE 취소
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onResume}
            style={{ ...BUTTON_STYLE, border: "1px solid #2563eb", background: "#2563eb", color: "#fff" }}
          >
            파생 승인 재개
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

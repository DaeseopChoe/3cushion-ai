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
 * ADMIN entry: earlier work still kept inside the browser. The move runs only
 * from [옮기기]; [나중에] changes nothing and asks again next time.
 */
export default function LegacyWorkMigrationPrompt({ open, busy = false, summary, onConfirm, onLater }) {
  const rows = summary?.historyRowCount ?? 0;
  const families = summary?.familyCount ?? 0;
  const pending = summary?.pendingCount ?? 0;
  return (
    <ModalShell
      open={open}
      disableBackdropClick
      draggable={false}
      fixed
      zIndex={125}
      title="이전 작업을 History로 옮길까요?"
      panelStyle={{ width: "min(460px, 92vw)", maxWidth: 460 }}
    >
      <div data-testid="legacy-work-migration-prompt" style={{ display: "grid", gap: 12 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>
          이 브라우저 안에 예전 방식으로 보관된 작업이 남아 있습니다.
        </p>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "#475569" }}>
          이제 모든 작업은 관리자 컴퓨터의 History에만 저장됩니다. [옮기기]를 누르면 남아 있는 작업을
          History로 옮기고, 옮긴 내용이 맞는지 확인한 뒤에만 브라우저 안의 예전 보관본을 정리합니다.
          옮기다 실패하면 예전 보관본은 그대로 둡니다. Published 데이터는 바뀌지 않습니다.
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#334155" }}>
          <li>History 기록: {rows}개</li>
          <li>Family: {families}개</li>
          {pending > 0 ? <li>파생 승인 전 작업: {pending}개 (옮긴 뒤 이어서 승인할 수 있습니다)</li> : null}
        </ul>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            disabled={busy}
            onClick={onLater}
            style={{ ...BUTTON_STYLE, border: "1px solid #cbd5e1", background: "#fff", color: "#334155" }}
          >
            나중에
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            style={{ ...BUTTON_STYLE, border: "1px solid #2563eb", background: "#2563eb", color: "#fff" }}
          >
            {busy ? "옮기는 중…" : "옮기기"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

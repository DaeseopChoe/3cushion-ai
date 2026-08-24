/**
 * Compact non-blocking Review HUD for Cue→Impact Derived approval.
 * Does not use ModalShell — table pointer policy remains active.
 */

import { FAMILY_TRACKS } from "../../domain/family/trackSymmetry";

export default function DerivedReviewOverlay({
  visible = true,
  viewingTrack,
  authoredTrack,
  title = "Cue→Impact Derived Review",
  reviewKind = "CUE_IMPACT",
  onTrackChange,
  onApprove,
  onCancel,
  onHide,
  approveDisabled = false,
}) {
  if (!visible) return null;

  return (
    <div
      className="derived-review-hud"
      data-derived-review-hud="1"
      data-derived-review-kind={reviewKind}
      data-derived-review-title={title}
      style={{
        position: "absolute",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "10px 12px",
        borderRadius: 10,
        background: "rgba(15, 23, 42, 0.92)",
        color: "#f8fafc",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        pointerEvents: "auto",
        minWidth: 220,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.02em" }}>
        {title}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 11, opacity: 0.85 }}>Track</span>
        {FAMILY_TRACKS.map((track) => {
          const active = viewingTrack === track;
          const isAuthored = authoredTrack === track;
          return (
            <button
              key={track}
              type="button"
              onClick={() => onTrackChange?.(track)}
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                border: active ? "1px solid #38bdf8" : "1px solid rgba(148,163,184,0.45)",
                background: active ? "rgba(56,189,248,0.18)" : "rgba(30,41,59,0.8)",
                color: "#f8fafc",
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
              }}
              title={isAuthored ? "AUTHORED source track" : undefined}
            >
              {track}
              {isAuthored ? " *" : ""}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          disabled={approveDisabled}
          onClick={onApprove}
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: 8,
            border: "none",
            background: approveDisabled ? "#64748b" : "#0ea5e9",
            color: "white",
            fontWeight: 700,
            fontSize: 12,
            cursor: approveDisabled ? "not-allowed" : "pointer",
          }}
        >
          파생승인
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: 8,
            border: "none",
            background: "#475569",
            color: "white",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          취소
        </button>
        <button
          type="button"
          onClick={onHide}
          aria-label="HUD 숨기기"
          title="HUD 숨기기 (테이블 빈 공간 탭으로 다시 표시)"
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid rgba(148,163,184,0.45)",
            background: "transparent",
            color: "#cbd5e1",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          숨김
        </button>
      </div>
    </div>
  );
}

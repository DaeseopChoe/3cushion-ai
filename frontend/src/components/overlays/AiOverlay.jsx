import { useState, useEffect, useRef } from "react";
import {
  canAcceptProofreadResponse,
  fetchProofreading,
} from "../../domain/lesson/proofreadingClient";
import { formatOnePointDropdownLabel } from "../../domain/lesson/onePointLibrary";

export { ensureLessonItems } from "../../domain/lesson/ensureLessonItems";

const headingStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: "#0f172a",
  marginBottom: 8,
  letterSpacing: "0.02em",
};

/**
 * Phase 3A.1 AiOverlay:
 * - Upper: Strategy Summary + current-shot PRO ONE POINT (real controlled values)
 * - Lower: new-entry library workspace (no select duplicate)
 * - AI 교정 routes to last-edited shot|library surface
 */
export function AiOverlay({
  data,
  sysData,
  strData,
  slotRenderSys,
  resolvedSlotSysValues,
  resolvedSlotBaseSysValues,
  onSave,
  onCancel,
  applyDisabled = false,
  onePointLibrary,
  sortedOnePointLibrary,
  onePointSelectedId,
  strategySummaryDraft,
  setStrategySummaryDraft,
  strategySummaryApplyError = "",
  strategySummaryStale = false,
  onRestoreStrategySummaryToGenerated,
  shotOnePointDraft,
  setShotOnePointDraft,
  libraryDraft,
  setLibraryDraft,
  aiOnePointEditTarget = "shot",
  setAiOnePointEditTarget,
  onSelectOnePoint,
  applyOnePointToShot,
  updateSelectedOnePointLibraryItem,
  registerOnePointLibraryItemFromDraft,
  proofreadClearNonce = 0,
}) {
  const [proofreadPhase, setProofreadPhase] = useState("idle");
  const [proofreadOriginal, setProofreadOriginal] = useState("");
  const [proofreadCorrected, setProofreadCorrected] = useState("");
  const [proofreadError, setProofreadError] = useState("");
  const [proofreadRequestTarget, setProofreadRequestTarget] = useState(null);
  const proofreadGenerationRef = useRef(0);
  const proofreadAbortRef = useRef(null);
  const shotDraftRef = useRef(shotOnePointDraft);
  const libraryDraftRef = useRef(libraryDraft);
  shotDraftRef.current = shotOnePointDraft;
  libraryDraftRef.current = libraryDraft;

  const libraryOptions = sortedOnePointLibrary || onePointLibrary || [];
  const newestPreviewLabel =
    libraryOptions.length > 0
      ? formatOnePointDropdownLabel(libraryOptions[0].text)
      : "등록 문장";
  const proofreadBusy = proofreadPhase === "loading";
  const libraryTrimmed = String(libraryDraft || "").trim();
  const shotTrimmed = String(shotOnePointDraft || "").trim();
  const canUpdateLibrary = Boolean(onePointSelectedId);
  const canRegisterLibrary = Boolean(libraryTrimmed);

  const resolveProofreadTarget = () => {
    const prefer = aiOnePointEditTarget === "library" ? "library" : "shot";
    if (prefer === "library" && libraryTrimmed) {
      return { target: "library", text: libraryTrimmed };
    }
    if (prefer === "shot" && shotTrimmed) {
      return { target: "shot", text: shotTrimmed };
    }
    if (shotTrimmed) return { target: "shot", text: shotTrimmed };
    if (libraryTrimmed) return { target: "library", text: libraryTrimmed };
    return null;
  };

  const canProofread = Boolean(resolveProofreadTarget());

  const clearProofreadPreview = () => {
    setProofreadPhase("idle");
    setProofreadOriginal("");
    setProofreadCorrected("");
    setProofreadError("");
    setProofreadRequestTarget(null);
  };

  useEffect(() => {
    return () => {
      proofreadGenerationRef.current += 1;
      proofreadAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!proofreadClearNonce) return;
    proofreadGenerationRef.current += 1;
    proofreadAbortRef.current?.abort();
    clearProofreadPreview();
  }, [proofreadClearNonce]);

  const markShotEdit = () => setAiOnePointEditTarget?.("shot");
  const markLibraryEdit = () => setAiOnePointEditTarget?.("library");

  const handleProofreadRequest = async () => {
    const resolved = resolveProofreadTarget();
    if (!resolved || proofreadBusy) return;
    const { target, text: requestText } = resolved;

    proofreadAbortRef.current?.abort();
    const controller = new AbortController();
    proofreadAbortRef.current = controller;
    const generation = proofreadGenerationRef.current + 1;
    proofreadGenerationRef.current = generation;

    setProofreadRequestTarget(target);
    setProofreadPhase("loading");
    setProofreadError("");
    setProofreadOriginal(requestText);
    setProofreadCorrected("");

    const result = await fetchProofreading(requestText, {
      signal: controller.signal,
    });

    const currentDraft =
      target === "shot"
        ? String(shotDraftRef.current || "").trim()
        : String(libraryDraftRef.current || "").trim();

    if (
      !canAcceptProofreadResponse({
        generation,
        currentGeneration: proofreadGenerationRef.current,
        requestText,
        currentDraft,
      })
    ) {
      return;
    }

    if (!result.ok) {
      if (result.error.code === "ABORTED") return;
      setProofreadPhase("error");
      setProofreadError(result.error.message);
      return;
    }

    if (!result.data.changed) {
      setProofreadPhase("unchanged");
      setProofreadCorrected(result.data.corrected_text);
      return;
    }

    setProofreadPhase("preview");
    setProofreadCorrected(result.data.corrected_text);
  };

  const handleProofreadApply = () => {
    if (proofreadPhase !== "preview") return;
    const corrected = String(proofreadCorrected || "");
    if (!corrected.trim()) return;
    const target = proofreadRequestTarget || "library";
    if (target === "shot") {
      setShotOnePointDraft?.(corrected);
      setAiOnePointEditTarget?.("shot");
    } else {
      setLibraryDraft?.(corrected);
      setAiOnePointEditTarget?.("library");
    }
    clearProofreadPreview();
  };

  const handleProofreadCancel = () => {
    if (proofreadBusy) {
      proofreadGenerationRef.current += 1;
      proofreadAbortRef.current?.abort();
    }
    clearProofreadPreview();
  };

  const handleGlobalApplySubmit = (e) => {
    e.preventDefault();
    if (applyDisabled) return;
    if (typeof applyOnePointToShot === "function") {
      applyOnePointToShot();
      return;
    }
    onSave?.();
  };

  const redirectEnterToApply = (e) => {
    if (e.key !== "Enter" || e.isComposing) return;
    e.preventDefault();
    e.currentTarget.form?.requestSubmit();
  };

  const handleAiFormKeyDown = (e) => {
    if (e.key !== "Enter" || e.isComposing) return;
    if (e.target.tagName === "TEXTAREA") return;
    if (e.target.tagName === "BUTTON") return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
    e.preventDefault();
    e.currentTarget.requestSubmit();
  };

  const btnBase = {
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: 600,
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
  };

  const editorStyle = {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    lineHeight: 1.5,
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    marginBottom: 0,
    fontFamily: "inherit",
    resize: "vertical",
    backgroundColor: "#fff",
    boxSizing: "border-box",
  };

  return (
    <form
      className="admin-ai-overlay"
      onSubmit={handleGlobalApplySubmit}
      onKeyDown={handleAiFormKeyDown}
      style={{ color: "#334155", fontSize: "14px", maxWidth: "720px" }}
    >
      <div
        className="strategy-box"
        style={{
          border: "1px solid #d0d7de",
          borderRadius: 8,
          padding: "12px 14px",
          background: "#ffffff",
        }}
      >
        <div style={headingStyle}>공략 요약</div>
        {strategySummaryStale ? (
          <div
            role="status"
            style={{
              marginBottom: 8,
              padding: "8px 10px",
              fontSize: 13,
              lineHeight: 1.45,
              color: "#92400e",
              background: "#fffbeb",
              border: "1px solid #fcd34d",
              borderRadius: 6,
            }}
          >
            <div style={{ marginBottom: onRestoreStrategySummaryToGenerated ? 8 : 0 }}>
              공략 조건이 변경되었습니다. 공략 요약 내용을 확인해 주세요.
            </div>
            {onRestoreStrategySummaryToGenerated ? (
              <button
                type="button"
                onClick={() => onRestoreStrategySummaryToGenerated()}
                style={{
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#92400e",
                  background: "#fff",
                  border: "1px solid #f59e0b",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                원본 요약으로 되돌리기
              </button>
            ) : null}
          </div>
        ) : null}
        <textarea
          value={strategySummaryDraft ?? ""}
          onChange={(e) => setStrategySummaryDraft?.(e.target.value)}
          placeholder="공략 요약을 입력하세요."
          rows={4}
          aria-label="공략 요약"
          style={{ ...editorStyle, marginBottom: strategySummaryApplyError ? 8 : 14 }}
        />
        {strategySummaryApplyError ? (
          <div
            role="alert"
            style={{
              marginBottom: 14,
              fontSize: 13,
              lineHeight: 1.45,
              color: "#b91c1c",
            }}
          >
            {strategySummaryApplyError}
          </div>
        ) : null}

        <hr
          className="ai-comment-divider"
          style={{ border: 0, borderTop: "1px solid #e2e8f0", margin: "4px 0 14px" }}
        />

        <div style={headingStyle}>PRO ONE POINT</div>
        <textarea
          value={shotOnePointDraft ?? ""}
          onChange={(e) => {
            markShotEdit();
            setShotOnePointDraft?.(e.target.value);
          }}
          onFocus={markShotEdit}
          placeholder="PRO ONE POINT"
          rows={4}
          aria-label="현재 샷 PRO ONE POINT"
          style={editorStyle}
        />
      </div>

      <div style={{ marginTop: 16, marginBottom: 12 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#64748b",
            marginBottom: 8,
          }}
        >
          등록 문장 라이브러리
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <select
            value={onePointSelectedId || ""}
            onChange={(e) => onSelectOnePoint?.(e.target.value)}
            aria-label="등록 문장"
            style={{
              flex: 1,
              minWidth: 0,
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              backgroundColor: "#fff",
            }}
          >
            <option value="">{newestPreviewLabel}</option>
            {libraryOptions.map((item) => (
              <option key={item.id} value={item.id} title={item.text}>
                {formatOnePointDropdownLabel(item.text)}
              </option>
            ))}
          </select>
        </div>

        <textarea
          value={libraryDraft ?? ""}
          onChange={(e) => {
            markLibraryEdit();
            setLibraryDraft?.(e.target.value);
          }}
          onFocus={markLibraryEdit}
          readOnly={proofreadBusy}
          placeholder="새로운 PRO ONE POINT를 입력하세요."
          rows={5}
          aria-label="새로운 PRO ONE POINT 입력"
          style={{
            ...editorStyle,
            marginBottom: 10,
            backgroundColor: proofreadBusy ? "#f8fafc" : "#fff",
          }}
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <button
            type="button"
            onClick={() => updateSelectedOnePointLibraryItem?.()}
            disabled={!canUpdateLibrary || proofreadBusy}
            onKeyDown={redirectEnterToApply}
            style={{
              ...btnBase,
              color: "#1e3a8a",
              backgroundColor: "#dbeafe",
              opacity: !canUpdateLibrary || proofreadBusy ? 0.55 : 1,
              cursor: !canUpdateLibrary || proofreadBusy ? "not-allowed" : "pointer",
            }}
          >
            문장 수정
          </button>
          <button
            type="button"
            onClick={() => registerOnePointLibraryItemFromDraft?.()}
            disabled={!canRegisterLibrary || proofreadBusy}
            onKeyDown={redirectEnterToApply}
            style={{
              ...btnBase,
              color: "#fff",
              backgroundColor: "#3b82f6",
              opacity: !canRegisterLibrary || proofreadBusy ? 0.55 : 1,
              cursor: !canRegisterLibrary || proofreadBusy ? "not-allowed" : "pointer",
            }}
          >
            문장 등록
          </button>
          <button
            type="button"
            onClick={handleProofreadRequest}
            disabled={proofreadBusy || !canProofread}
            style={{
              ...btnBase,
              color: "#0f766e",
              backgroundColor: "#ccfbf1",
              border: "1px solid #5eead4",
              opacity: proofreadBusy || !canProofread ? 0.6 : 1,
              cursor: proofreadBusy || !canProofread ? "not-allowed" : "pointer",
            }}
          >
            {proofreadBusy ? "교정 중…" : "AI 교정"}
          </button>
        </div>

        {proofreadPhase === "error" && proofreadError ? (
          <div
            role="alert"
            style={{
              marginBottom: 10,
              padding: "10px 12px",
              fontSize: 13,
              color: "#991b1b",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 6,
            }}
          >
            {proofreadError}
          </div>
        ) : null}
        {proofreadPhase === "unchanged" ? (
          <div
            style={{
              marginBottom: 10,
              padding: "10px 12px",
              fontSize: 13,
              color: "#334155",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
            }}
          >
            교정할 내용이 없습니다.
            <button
              type="button"
              onClick={handleProofreadCancel}
              style={{
                marginLeft: 8,
                fontSize: 13,
                border: "none",
                background: "transparent",
                color: "#64748b",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              닫기
            </button>
          </div>
        ) : null}
        {proofreadPhase === "preview" ? (
          <div
            style={{
              marginBottom: 10,
              padding: "12px",
              background: "#f0fdfa",
              border: "1px solid #99f6e4",
              borderRadius: 6,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>
              원문
              {proofreadRequestTarget
                ? ` (${proofreadRequestTarget === "shot" ? "현재 샷" : "신규 입력"})`
                : ""}
            </div>
            <div
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 14,
                lineHeight: 1.5,
                color: "#334155",
                marginBottom: 12,
                maxHeight: 160,
                overflowY: "auto",
              }}
            >
              {proofreadOriginal}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f766e", marginBottom: 4 }}>
              교정안
            </div>
            <div
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 14,
                lineHeight: 1.5,
                color: "#0f172a",
                marginBottom: 12,
                maxHeight: 160,
                overflowY: "auto",
              }}
            >
              {proofreadCorrected}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleProofreadApply}
                style={{
                  ...btnBase,
                  padding: "8px 12px",
                  color: "#fff",
                  backgroundColor: "#0f766e",
                }}
              >
                교정안 적용
              </button>
              <button
                type="button"
                onClick={handleProofreadCancel}
                style={{
                  ...btnBase,
                  padding: "8px 12px",
                  color: "#334155",
                  backgroundColor: "#e2e8f0",
                }}
              >
                취소
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
        <button
          type="submit"
          disabled={applyDisabled}
          style={{
            flex: 1,
            padding: "10px 16px",
            backgroundColor: applyDisabled ? "#94a3b8" : "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontWeight: "600",
            fontSize: "14px",
            cursor: applyDisabled ? "not-allowed" : "pointer",
          }}
        >
          적용
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            padding: "10px 16px",
            backgroundColor: "#e2e8f0",
            color: "#334155",
            border: "none",
            borderRadius: "6px",
            fontWeight: "600",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          취소
        </button>
      </div>
    </form>
  );
}

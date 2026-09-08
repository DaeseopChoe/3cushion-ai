import { useState, useEffect, useMemo, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { buildAiAutoCommentFromContext } from "../../domain/userInfoPanelModel";
import { hasRenderableOutputsResult } from "../../domain/slotSysResolve";
import {
  canAcceptProofreadResponse,
  fetchProofreading,
} from "../../domain/lesson/proofreadingClient";
import { AiAutoCommentDisplay } from "../user/UserAiPanel";

export function ensureLessonItems(items) {
  if (!items || !Array.isArray(items)) return [];
  return items.map((item, idx) => {
    if (typeof item === "string") {
      return { id: `legacy-${idx}-${item.slice(0, 40).replace(/\s/g, "_")}`, text: item };
    }
    if (item && typeof item === "object" && item.id != null && item.text != null) {
      return item;
    }
    const t = String(item?.text ?? item ?? "");
    return { id: `fix-${idx}-${t.slice(0, 20)}`, text: t };
  });
}

function LessonRow({ lesson, selected, onSelect }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        padding: "4px 0",
        background: selected ? "#eef2ff" : "transparent",
        opacity: isDragging ? 0.5 : 1,
      }}
      onClick={onSelect}
    >
      <div
        {...attributes}
        {...listeners}
        className="drag-handle"
        style={{ marginRight: 8, flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        ☰
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.42, flex: 1 }}>{lesson.text}</div>
    </div>
  );
}

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
  onePointDraft,
  setOnePointDraft,
  onSelectOnePoint,
  applyOnePointToShot,
  saveDraftAsNewLesson,
  deleteSelectedOnePointLibraryItem,
  onePointLessons,
  onDeleteLesson,
  onReorderLessons,
  onePointCategories = [],
  onePointCategoryNo = "",
  onSelectOnePointCategory,
  onOpenCategoryManage,
  onOpenLessonOrderManage,
}) {
  const str = strData || data?.str || {};
  const sysForAutoComment = slotRenderSys ?? sysData;
  const canShowAutoComment = hasRenderableOutputsResult(sysForAutoComment);

  const autoComment = useMemo(
    () =>
      canShowAutoComment
        ? buildAiAutoCommentFromContext({
            slotRenderSys: sysForAutoComment,
            resolvedSlotSysValues,
            resolvedSlotBaseSysValues,
            str,
          })
        : null,
    [
      canShowAutoComment,
      sysForAutoComment,
      resolvedSlotSysValues,
      resolvedSlotBaseSysValues,
      strData,
      str,
    ]
  );

  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [manageMenuOpen, setManageMenuOpen] = useState(false);
  const [proofreadPhase, setProofreadPhase] = useState("idle");
  const [proofreadOriginal, setProofreadOriginal] = useState("");
  const [proofreadCorrected, setProofreadCorrected] = useState("");
  const [proofreadError, setProofreadError] = useState("");
  const proofreadGenerationRef = useRef(0);
  const proofreadAbortRef = useRef(null);
  const onePointDraftRef = useRef(onePointDraft);
  onePointDraftRef.current = onePointDraft;

  const lessons = useMemo(() => ensureLessonItems(onePointLessons), [onePointLessons]);
  const proofreadBusy = proofreadPhase === "loading";

  const clearProofreadPreview = () => {
    setProofreadPhase("idle");
    setProofreadOriginal("");
    setProofreadCorrected("");
    setProofreadError("");
  };

  useEffect(() => {
    return () => {
      proofreadGenerationRef.current += 1;
      proofreadAbortRef.current?.abort();
    };
  }, []);

  const handleProofreadRequest = async () => {
    const requestText = String(onePointDraft || "").trim();
    if (!requestText || proofreadBusy) return;

    proofreadAbortRef.current?.abort();
    const controller = new AbortController();
    proofreadAbortRef.current = controller;
    const generation = proofreadGenerationRef.current + 1;
    proofreadGenerationRef.current = generation;

    setProofreadPhase("loading");
    setProofreadError("");
    setProofreadOriginal(requestText);
    setProofreadCorrected("");

    const result = await fetchProofreading(requestText, {
      signal: controller.signal,
    });

    if (
      !canAcceptProofreadResponse({
        generation,
        currentGeneration: proofreadGenerationRef.current,
        requestText,
        currentDraft: String(onePointDraftRef.current || "").trim(),
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
    setOnePointDraft?.(corrected);
    clearProofreadPreview();
  };

  const handleProofreadCancel = () => {
    if (proofreadBusy) {
      proofreadGenerationRef.current += 1;
      proofreadAbortRef.current?.abort();
    }
    clearProofreadPreview();
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(lessons, oldIndex, newIndex);
    onReorderLessons?.(next);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Delete" && selectedLessonId) {
        onDeleteLesson?.(selectedLessonId);
        setSelectedLessonId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLessonId, onDeleteLesson]);

  const handleGlobalApplySubmit = (e) => {
    e.preventDefault();
    if (applyDisabled) return;
    const newData = {
      ...data,
      text: "",
      onePointLessons: data?.onePointLessons ?? [],
    };
    onSave(newData);
  };

  /** 적용/저장 버튼: Enter 시 클릭 대신 전체 적용(submit) */
  const redirectEnterToGlobalApply = (e) => {
    if (e.key !== "Enter" || e.isComposing) return;
    e.preventDefault();
    e.currentTarget.form?.requestSubmit();
  };

  /** textarea 밖 읽기 전용 영역 등: Enter → 전체 적용 */
  const handleAiFormKeyDown = (e) => {
    if (e.key !== "Enter" || e.isComposing) return;
    if (e.target.tagName === "TEXTAREA") return;
    if (e.target.tagName === "BUTTON") return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
    e.preventDefault();
    e.currentTarget.requestSubmit();
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
        {autoComment ? <AiAutoCommentDisplay model={autoComment} /> : null}
        {lessons.length > 0 ? (
          <>
            <hr className="ai-comment-divider" />
            <div className="ai-one-point-lessons__list">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={lessons.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                {lessons.map((lesson) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    selected={selectedLessonId === lesson.id}
                    onSelect={() => setSelectedLessonId(lesson.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            </div>
          </>
        ) : null}
      </div>

      <div style={{ marginTop: 14, marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <select
            value={onePointCategoryNo === "" || onePointCategoryNo == null
              ? ""
              : String(onePointCategoryNo)}
            onChange={(e) => {
              const v = e.target.value;
              onSelectOnePointCategory?.(v === "" ? "" : Number(v));
            }}
            aria-label="Category 번호"
            style={{
              width: 120,
              flexShrink: 0,
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              backgroundColor: "#fff",
            }}
          >
            <option value="">선택 안함</option>
            {(onePointCategories || []).map((cat) => (
              <option key={cat.no} value={String(cat.no)}>
                {cat.no}
              </option>
            ))}
          </select>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setManageMenuOpen((open) => !open)}
              aria-label="관리 메뉴"
              aria-expanded={manageMenuOpen}
              style={{
                padding: "10px 12px",
                fontSize: "14px",
                border: "1px solid #94a3b8",
                borderRadius: "6px",
                backgroundColor: "#f8fafc",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              관리
            </button>
            {manageMenuOpen ? (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: 4,
                  minWidth: 160,
                  background: "#fff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.12)",
                  zIndex: 20,
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setManageMenuOpen(false);
                    onOpenCategoryManage?.();
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    fontSize: 14,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  Category 관리
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setManageMenuOpen(false);
                    onOpenLessonOrderManage?.();
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    fontSize: 14,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  Lesson 순서 관리
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <select
          value={onePointSelectedId}
          onChange={(e) => {
            const id = e.target.value;
            onSelectOnePoint(id);
          }}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            marginBottom: 8,
            backgroundColor: '#fff',
          }}
        >
          <option value="">문장 입력...</option>
          {(sortedOnePointLibrary || onePointLibrary || []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.text}
            </option>
          ))}
        </select>
        <textarea
          value={onePointDraft}
          onChange={(e) => setOnePointDraft?.(e.target.value)}
          readOnly={proofreadBusy}
          placeholder={
            onePointSelectedId
              ? "레슨 문장을 수정하세요."
              : "새 레슨 문장을 입력하세요."
          }
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            marginBottom: 10,
            fontFamily: 'inherit',
            resize: 'vertical',
            backgroundColor: proofreadBusy ? '#f8fafc' : '#fff',
          }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <button
            type="button"
            onClick={handleProofreadRequest}
            disabled={proofreadBusy || !String(onePointDraft || "").trim()}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#0f766e',
              backgroundColor: '#ccfbf1',
              border: '1px solid #5eead4',
              borderRadius: '6px',
              cursor:
                proofreadBusy || !String(onePointDraft || "").trim()
                  ? 'not-allowed'
                  : 'pointer',
              opacity:
                proofreadBusy || !String(onePointDraft || "").trim() ? 0.6 : 1,
            }}
          >
            {proofreadBusy ? "교정 중…" : "AI 교정"}
          </button>
          <button
            type="button"
            onClick={() => applyOnePointToShot?.()}
            onKeyDown={redirectEnterToGlobalApply}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#334155',
              backgroundColor: '#e2e8f0',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            적용
          </button>
          <button
            type="button"
            onClick={() => saveDraftAsNewLesson?.()}
            onKeyDown={redirectEnterToGlobalApply}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#fff',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            저장
          </button>
          {onePointSelectedId ? (
            <button
              type="button"
              onClick={() => deleteSelectedOnePointLibraryItem?.()}
              onKeyDown={redirectEnterToGlobalApply}
              style={{
                padding: "10px 16px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#fff",
                backgroundColor: "#ef4444",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              삭제
            </button>
          ) : null}
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
                color: "#2563eb",
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
              marginBottom: 12,
              padding: 12,
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              background: "#ffffff",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>
              원문
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
                  padding: "8px 12px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#fff",
                  backgroundColor: "#0f766e",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                교정안 적용
              </button>
              <button
                type="button"
                onClick={handleProofreadCancel}
                style={{
                  padding: "8px 12px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#334155",
                  backgroundColor: "#e2e8f0",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                취소
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* 전체 적용 / 취소 */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button
          type="submit"
          disabled={applyDisabled}
          style={{
            flex: 1,
            padding: '10px 16px',
            backgroundColor: applyDisabled ? '#94a3b8' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: applyDisabled ? 'not-allowed' : 'pointer'
          }}
        >
          전체 적용
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px 16px',
            backgroundColor: '#e2e8f0',
            color: '#334155',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          취소
        </button>
      </div>
    </form>
  );
}

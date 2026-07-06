import { useState, useEffect, useMemo } from "react";
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
  onSaveStrategy,
  onCancel,
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
}) {
  const str = strData || data?.str || {};

  const autoComment = useMemo(
    () =>
      buildAiAutoCommentFromContext({
        slotRenderSys: slotRenderSys ?? sysData,
        resolvedSlotSysValues,
        resolvedSlotBaseSysValues,
        str,
      }),
    [slotRenderSys, sysData, resolvedSlotSysValues, resolvedSlotBaseSysValues, strData, str]
  );

  const [selectedLessonId, setSelectedLessonId] = useState(null);

  const lessons = useMemo(() => ensureLessonItems(onePointLessons), [onePointLessons]);

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
    const newData = {
      ...data,
      text: "",
      onePointLessons: data?.onePointLessons ?? [],
    };
    onSave(newData);
    onSaveStrategy?.(newData);
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
        <AiAutoCommentDisplay model={autoComment} />
        {lessons.length > 0 ? (
          <>
            <hr className="ai-comment-divider" />
            <p className="ai-comment-para ai-comment-para--labeled">
              <span className="ai-comment-section-title">[원 포인트 레슨]</span>
            </p>
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
          <option value="">선택하세요</option>
          {(sortedOnePointLibrary || onePointLibrary || []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.text}
            </option>
          ))}
        </select>
        <textarea
          value={onePointDraft}
          onChange={(e) => setOnePointDraft?.(e.target.value)}
          placeholder="문장 입력 또는 수정"
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
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
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
          <button
            type="button"
            onClick={() => deleteSelectedOnePointLibraryItem?.()}
            disabled={!onePointSelectedId}
            onKeyDown={redirectEnterToGlobalApply}
            style={{
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#fff",
              backgroundColor: onePointSelectedId ? "#ef4444" : "#94a3b8",
              border: "none",
              borderRadius: "6px",
              cursor: onePointSelectedId ? "pointer" : "not-allowed",
            }}
          >
            삭제
          </button>
        </div>
      </div>

      {/* 전체 적용 / 취소 */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button
          type="submit"
          style={{
            flex: 1,
            padding: '10px 16px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer'
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

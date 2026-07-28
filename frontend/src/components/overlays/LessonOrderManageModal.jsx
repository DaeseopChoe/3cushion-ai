/**
 * Lesson 순서 관리 Modal — HTML5 DnD only (no external libs).
 * Reorders current Category lessons; persists via onReorder.
 */
import React, { useEffect, useState } from "react";
import ModalShell from "../common/ModalShell";

export default function LessonOrderManageModal({
  open,
  categoryNo = "",
  lessons = [],
  onClose,
  onReorder,
}) {
  const [items, setItems] = useState([]);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setItems(Array.isArray(lessons) ? [...lessons] : []);
    setDragId(null);
    setOverId(null);
  }, [open, lessons]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const categoryLabel =
    categoryNo === "" || categoryNo == null ? "선택 안함" : String(categoryNo);

  const moveItem = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    setItems((prev) => {
      const fromIndex = prev.findIndex((x) => x.id === fromId);
      const toIndex = prev.findIndex((x) => x.id === toId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      onReorder?.(next.map((x) => x.id));
      return next;
    });
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      draggable
      fixed
      zIndex={110}
      panelClassName="modal-panel--compact"
      panelStyle={{
        width: "min(440px, 92vw)",
        maxWidth: 440,
        maxHeight: "70vh",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        className="modal-panel-header"
        data-modal-drag-handle="1"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div>
          <div className="modal-panel-title" style={{ fontSize: 16, fontWeight: 600 }}>
            Lesson 순서 관리
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            (Category : {categoryLabel})
          </div>
        </div>
        <button
          type="button"
          className="modal-panel-close"
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>
      </div>

      <div
        className="modal-panel-body"
        style={{
          padding: 16,
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
        }}
      >
        {items.length === 0 ? (
          <div style={{ fontSize: 14, color: "#64748b" }}>
            이 Category에 속한 Lesson이 없습니다.
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {items.map((item) => {
              const isDragging = dragId === item.id;
              const isOver = overId === item.id && dragId && dragId !== item.id;
              return (
                <li
                  key={item.id}
                  draggable
                  onDragStart={(e) => {
                    setDragId(item.id);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", item.id);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (overId !== item.id) setOverId(item.id);
                  }}
                  onDragLeave={() => {
                    if (overId === item.id) setOverId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromId =
                      e.dataTransfer.getData("text/plain") || dragId;
                    moveItem(fromId, item.id);
                    setDragId(null);
                    setOverId(null);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 8px",
                    marginBottom: 6,
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    background: isOver ? "#eef2ff" : "#fff",
                    opacity: isDragging ? 0.5 : 1,
                    cursor: "grab",
                    userSelect: "none",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      flexShrink: 0,
                      color: "#64748b",
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >
                    ☰
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 14,
                      lineHeight: 1.42,
                      color: "#0f172a",
                      wordBreak: "break-word",
                    }}
                  >
                    {item.text}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "8px 14px",
            fontSize: 14,
            border: "1px solid #94a3b8",
            borderRadius: 6,
            background: "#f8fafc",
            cursor: "pointer",
          }}
        >
          닫기
        </button>
      </div>
    </ModalShell>
  );
}

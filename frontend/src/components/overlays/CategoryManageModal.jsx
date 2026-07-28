/**
 * Category 관리 Modal — Category Library CRUD only (no Lesson linkage).
 */
import React, { useEffect, useState } from "react";
import ModalShell from "../common/ModalShell";

export default function CategoryManageModal({
  open,
  categories = [],
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const [newName, setNewName] = useState("");
  const [draftNames, setDraftNames] = useState({});

  useEffect(() => {
    if (!open) return;
    setNewName("");
    const next = {};
    for (const cat of categories) {
      next[cat.no] = cat.name;
    }
    setDraftNames(next);
  }, [open, categories]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleCreate = () => {
    const name = String(newName || "").trim();
    if (!name) return;
    onCreate?.(name);
    setNewName("");
  };

  const handleUpdate = (no) => {
    const name = String(draftNames[no] ?? "").trim();
    if (!name) return;
    onUpdate?.(no, name);
  };

  const handleDelete = (no) => {
    if (!confirm(`Category ${no}을(를) 삭제하시겠습니까?`)) return;
    onDelete?.(no);
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
        width: "min(420px, 92vw)",
        maxWidth: 420,
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
        <div className="modal-panel-title" style={{ fontSize: 16, fontWeight: 600 }}>
          Category 관리
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
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder="새 Category 이름"
            aria-label="새 Category 이름"
            style={{
              flex: 1,
              padding: "8px 10px",
              fontSize: 14,
              border: "1px solid #cbd5e1",
              borderRadius: 6,
            }}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!String(newName || "").trim()}
            style={{
              padding: "8px 12px",
              fontSize: 14,
              border: "1px solid #94a3b8",
              borderRadius: 6,
              background: "#f8fafc",
              cursor: String(newName || "").trim() ? "pointer" : "not-allowed",
              whiteSpace: "nowrap",
            }}
          >
            추가
          </button>
        </div>

        {categories.length === 0 ? (
          <div style={{ fontSize: 14, color: "#64748b" }}>
            등록된 Category가 없습니다.
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {categories.map((cat) => {
              const draft = draftNames[cat.no] ?? cat.name;
              const dirty = String(draft).trim() !== cat.name;
              const canSave = dirty && String(draft).trim().length > 0;
              return (
                <li
                  key={cat.no}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      width: 36,
                      flexShrink: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                      color: "#334155",
                    }}
                    title="번호는 수정할 수 없습니다"
                  >
                    {cat.no}
                  </span>
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) =>
                      setDraftNames((prev) => ({
                        ...prev,
                        [cat.no]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (canSave) handleUpdate(cat.no);
                      }
                    }}
                    aria-label={`Category ${cat.no} 이름`}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      fontSize: 14,
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdate(cat.no)}
                    disabled={!canSave}
                    style={{
                      padding: "8px 10px",
                      fontSize: 13,
                      border: "1px solid #94a3b8",
                      borderRadius: 6,
                      background: "#f8fafc",
                      cursor: canSave ? "pointer" : "not-allowed",
                      opacity: canSave ? 1 : 0.5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat.no)}
                    style={{
                      padding: "8px 10px",
                      fontSize: 13,
                      border: "1px solid #fca5a5",
                      borderRadius: 6,
                      background: "#fff1f2",
                      color: "#b91c1c",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    삭제
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ModalShell>
  );
}

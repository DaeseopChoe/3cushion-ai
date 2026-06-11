/**
 * Workspace History Modal - All vs Unexported 탭 구조
 * - All: 전체 목록, Delete 30개
 * - Unexported: 미 export 목록, 체크박스, Export
 */
import React, { useEffect, useState } from "react";
import ModalShell from "./common/ModalShell";

export default function WorkspaceHistoryModal({
  history,
  onClose,
  onLoad,
  onDelete,
  onDeleteOldest30,
  onExport,
}) {
  const [tab, setTab] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);

  const sorted = [...(history ?? [])].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
  const allList = sorted;
  const unexportedList = sorted.filter((h) => !h.exported);
  const currentList = tab === "all" ? allList : unexportedList;

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirm("삭제하시겠습니까?")) {
      onDelete?.(id);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === currentList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentList.map((x) => x.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDeleteOldest30 = () => {
    const count = Math.min(30, allList.length);
    if (count === 0) return;
    if (confirm(`가장 오래된 ${count}개를 삭제하시겠습니까?`)) {
      onDeleteOldest30?.();
      setSelectedIds([]);
    }
  };

  const handleExport = async () => {
    if (selectedIds.length === 0) {
      alert("Export할 스냅샷을 선택하세요.");
      return;
    }
    const ids = [...selectedIds];
    setSelectedIds([]);
    try {
      await onExport?.(ids);
    } catch (e) {
      console.warn("Export failed", e);
    }
  };

  const formatName = (name) => name.replace(/_(\d{4}-\d{2}-\d{2})$/, "");

  return (
    <ModalShell
      open
      onClose={onClose}
      draggable
      fixed
      zIndex={100}
      variant="history"
      panelClassName="modal-panel--history"
      panelStyle={{
        maxHeight: "70vh",
      }}
    >
        {/* Header */}
        <div
          className="modal-panel-header"
          data-modal-drag-handle="1"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            flexShrink: 0,
            marginBottom: 0,
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#1e293b",
            }}
          >
            Workspace History
          </span>
          <button
            type="button"
            className="modal-panel-close"
            onClick={onClose}
            style={{
              fontSize: 24,
              color: "#94a3b8",
              background: "none",
              border: "none",
              cursor: "pointer",
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 20px",
            borderBottom: "1px solid #e2e8f0",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setTab("all")}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              color: tab === "all" ? "#fff" : "#64748b",
              backgroundColor: tab === "all" ? "#3b82f6" : "#f1f5f9",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            All
          </button>
          <button
            onClick={() => setTab("unexported")}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              color: tab === "unexported" ? "#fff" : "#64748b",
              backgroundColor: tab === "unexported" ? "#3b82f6" : "#f1f5f9",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Unexported
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
            minHeight: 0,
          }}
        >
          {tab === "unexported" && unexportedList.length > 0 && (
            <button
              onClick={handleSelectAll}
              style={{
                marginBottom: 12,
                padding: "6px 12px",
                fontSize: 12,
                color: "#3b82f6",
                background: "transparent",
                border: "1px solid #93c5fd",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              전체 선택
            </button>
          )}
          {currentList.length === 0 ? (
            <div
              style={{
                fontSize: 14,
                color: "#64748b",
                padding: 24,
                textAlign: "center",
              }}
            >
              {tab === "all"
                ? "SAVE 클릭 시 스냅샷이 여기에 표시됩니다."
                : "Unexported 스냅샷이 없습니다."}
            </div>
          ) : (
            currentList.map((snap) => (
              <div
                key={snap.id}
                onClick={() => onLoad?.(snap.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  marginBottom: 8,
                  backgroundColor: "#f8fafc",
                  borderRadius: 8,
                  cursor: "pointer",
                  border: "1px solid #e2e8f0",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(snap.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelect(snap.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  disabled={tab !== "unexported"}
                  style={{
                    flexShrink: 0,
                    cursor: tab === "unexported" ? "pointer" : "default",
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: "#334155",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={snap.name}
                >
                  {formatName(snap.name)}
                </div>
                <button
                  onClick={(e) => handleDelete(e, snap.id)}
                  style={{
                    flexShrink: 0,
                    padding: "4px 10px",
                    fontSize: 12,
                    color: "#ef4444",
                    background: "transparent",
                    border: "1px solid #fecaca",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  ❌ 삭제
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 20px",
            borderTop: "1px solid #e2e8f0",
            flexShrink: 0,
          }}
        >
          {tab === "all" && allList.length > 0 && (
            <button
              onClick={handleDeleteOldest30}
              style={{
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 500,
                color: "#fff",
                backgroundColor: "#ef4444",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Delete {Math.min(30, allList.length)}개
            </button>
          )}
          {tab === "unexported" && unexportedList.length > 0 && (
            <button
              onClick={handleExport}
              style={{
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 500,
                color: "#fff",
                backgroundColor: "#10b981",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Export
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto",
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 500,
              color: "#fff",
              backgroundColor: "#64748b",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            닫기
          </button>
        </div>
    </ModalShell>
  );
}

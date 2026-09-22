/**
 * Workspace History Modal
 * - 상단: [ 전체선택 ] [ 로컬데이터 ] [ Unexported ]
 * - 개별 행: 체크박스 (선택/해제, Shift 범위선택) + 행 클릭 시 Workspace Load
 * - 하단 LEFT: Delete / Publish · RIGHT: 닫기
 * Phase D-3: user-facing action = Publish only (independent Manual Export UI removed).
 * `exported` flag = PRODUCTION_VERIFIED Publish success (legacy field name kept).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import ModalShell from "./common/ModalShell";

export default function WorkspaceHistoryModal({
  history,
  onClose,
  onLoad,
  onDelete,
  onPublish,
  /** Phase D-3 — true while Publish pipeline is running (handler-owned). */
  publishInFlight = false,
}) {
  const [tab, setTab] = useState("all"); // "all": 로컬데이터, "unexported": Unexported
  const [selectedIds, setSelectedIds] = useState([]);
  const lastCheckedIndexRef = useRef(null);
  const localPublishBusyRef = useRef(false);
  const [localPublishBusy, setLocalPublishBusy] = useState(false);

  const busy = publishInFlight || localPublishBusy;

  const sorted = useMemo(() => {
    return [...(history ?? [])].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [history]);

  const allList = sorted;
  const unexportedList = useMemo(() => {
    return sorted.filter((h) => !h.exported);
  }, [sorted]);

  const currentList = tab === "all" ? allList : unexportedList;

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (busy) return;
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose, busy]);

  // View/Filter 전환 시 selection 및 shift-range 기준 reset
  const handleSwitchTab = (nextTab) => {
    if (busy) return;
    if (tab === nextTab) return;
    setTab(nextTab);
    setSelectedIds([]);
    lastCheckedIndexRef.current = null;
  };

  const isAllSelected =
    currentList.length > 0 &&
    currentList.every((snap) => selectedIds.includes(snap.id));

  const handleToggleSelectAll = () => {
    if (busy) return;
    if (currentList.length === 0) return;
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentList.map((x) => x.id));
    }
    lastCheckedIndexRef.current = null;
  };

  const handleCheckboxClick = (e, snap, index) => {
    e.stopPropagation();
    if (busy) return;
    const isShift = e.shiftKey;
    const currentId = snap.id;
    const isCurrentlyChecked = selectedIds.includes(currentId);
    const targetChecked = !isCurrentlyChecked;

    if (
      isShift &&
      lastCheckedIndexRef.current !== null &&
      lastCheckedIndexRef.current !== index
    ) {
      const start = Math.min(lastCheckedIndexRef.current, index);
      const end = Math.max(lastCheckedIndexRef.current, index);
      const rangeSnapshots = currentList.slice(start, end + 1);
      const rangeIds = rangeSnapshots.map((x) => x.id);

      setSelectedIds((prev) => {
        if (targetChecked) {
          const nextSet = new Set([...prev, ...rangeIds]);
          return Array.from(nextSet);
        } else {
          const removeSet = new Set(rangeIds);
          return prev.filter((id) => !removeSet.has(id));
        }
      });
    } else {
      setSelectedIds((prev) =>
        isCurrentlyChecked
          ? prev.filter((id) => id !== currentId)
          : [...prev, currentId]
      );
    }

    lastCheckedIndexRef.current = index;
  };

  const handleDeleteSelected = () => {
    if (busy) return;
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (window.confirm(`선택한 Workspace ${count}개를 삭제하시겠습니까?`)) {
      onDelete?.(selectedIds);
      setSelectedIds([]);
      lastCheckedIndexRef.current = null;
    }
  };

  const handlePublish = async () => {
    if (busy || localPublishBusyRef.current) return;
    if (!onPublish) return;
    if (selectedIds.length === 0) {
      alert("Publish할 스냅샷을 선택하세요.");
      return;
    }
    const ids = [...selectedIds];
    // Do NOT clear selection before await — keep for failure retry.
    localPublishBusyRef.current = true;
    setLocalPublishBusy(true);
    try {
      const result = await onPublish(ids);
      if (result?.ok && Array.isArray(result.successfulIds)) {
        const done = new Set(result.successfulIds);
        setSelectedIds((prev) => prev.filter((id) => !done.has(id)));
        lastCheckedIndexRef.current = null;
      }
    } catch (e) {
      console.warn("Publish failed", e);
    } finally {
      localPublishBusyRef.current = false;
      setLocalPublishBusy(false);
    }
  };

  const handleClose = () => {
    if (busy) return;
    onClose?.();
  };

  const formatName = (name) => name.replace(/_(\d{4}-\d{2}-\d{2})$/, "");
  const publishDisabled = busy || selectedIds.length === 0 || !onPublish;
  const deleteDisabled = busy || selectedIds.length === 0;

  return (
    <ModalShell
      open
      onClose={handleClose}
      draggable={!busy}
      fixed
      zIndex={100}
      variant="history"
      panelClassName="modal-panel--history"
      panelStyle={{
        height: "min(820px, 90vh)",
        maxHeight: "min(860px, 92vh)",
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
          padding: "16px 24px",
          borderBottom: "1px solid #e2e8f0",
          flexShrink: 0,
          marginBottom: 0,
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#1e293b",
          }}
        >
          Workspace History
        </span>
        <button
          type="button"
          className="modal-panel-close"
          onClick={handleClose}
          disabled={busy}
          aria-label="닫기"
          style={{
            fontSize: 26,
            color: busy ? "#cbd5e1" : "#94a3b8",
            background: "none",
            border: "none",
            cursor: busy ? "not-allowed" : "pointer",
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Top Controls bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 24px",
          borderBottom: "1px solid #e2e8f0",
          backgroundColor: "#f8fafc",
          flexShrink: 0,
        }}
      >
        {/* Action: 전체선택 */}
        <button
          type="button"
          onClick={handleToggleSelectAll}
          disabled={busy || currentList.length === 0}
          style={{
            padding: "8px 18px",
            fontSize: 15,
            fontWeight: 600,
            color:
              busy || currentList.length === 0
                ? "#94a3b8"
                : isAllSelected
                  ? "#2563eb"
                  : "#475569",
            backgroundColor:
              busy || currentList.length === 0
                ? "#f1f5f9"
                : isAllSelected
                  ? "#eff6ff"
                  : "#ffffff",
            border: isAllSelected ? "1px solid #3b82f6" : "1px solid #cbd5e1",
            borderRadius: 8,
            cursor:
              busy || currentList.length === 0 ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
          }}
        >
          {isAllSelected ? "전체선택 해제" : "전체선택"}
        </button>

        <div style={{ width: 1, height: 24, backgroundColor: "#cbd5e1", margin: "0 4px" }} />

        {/* View: 로컬데이터 */}
        <button
          type="button"
          onClick={() => handleSwitchTab("all")}
          disabled={busy}
          style={{
            padding: "8px 18px",
            fontSize: 15,
            fontWeight: 600,
            color: tab === "all" ? "#ffffff" : "#475569",
            backgroundColor: tab === "all" ? "#3b82f6" : "#ffffff",
            border: tab === "all" ? "1px solid #3b82f6" : "1px solid #cbd5e1",
            borderRadius: 8,
            cursor: busy ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
          }}
        >
          로컬데이터
        </button>

        {/* View: Unexported (= not yet PRODUCTION_VERIFIED Publish) */}
        <button
          type="button"
          onClick={() => handleSwitchTab("unexported")}
          disabled={busy}
          style={{
            padding: "8px 18px",
            fontSize: 15,
            fontWeight: 600,
            color: tab === "unexported" ? "#ffffff" : "#475569",
            backgroundColor: tab === "unexported" ? "#3b82f6" : "#ffffff",
            border: tab === "unexported" ? "1px solid #3b82f6" : "1px solid #cbd5e1",
            borderRadius: 8,
            cursor: busy ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
          }}
        >
          Unexported
        </button>

        {busy ? (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 14,
              fontWeight: 600,
              color: "#2563eb",
            }}
          >
            Publish 진행 중…
          </span>
        ) : null}
      </div>

      {/* Body List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 20px",
          minHeight: 0,
        }}
      >
        {currentList.length === 0 ? (
          <div
            style={{
              fontSize: 15,
              color: "#64748b",
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            {tab === "all"
              ? "SAVE 클릭 시 스냅샷이 여기에 표시됩니다."
              : "Unexported 스냅샷이 없습니다."}
          </div>
        ) : (
          currentList.map((snap, index) => {
            const isChecked = selectedIds.includes(snap.id);
            return (
              <div
                key={snap.id}
                onClick={() => onLoad?.(snap.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "7px 14px",
                  marginBottom: 6,
                  backgroundColor: isChecked ? "#f0fdf4" : "#ffffff",
                  borderRadius: 6,
                  cursor: "pointer",
                  border: isChecked ? "1px solid #86efac" : "1px solid #e2e8f0",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
                  transition: "background-color 0.15s ease, border-color 0.15s ease",
                }}
              >
                {/* Checkbox dedicated hit-area (36px x 36px) */}
                <div
                  onClick={(e) => handleCheckboxClick(e, snap, index)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    margin: "-4px 0 -4px -4px",
                    flexShrink: 0,
                    cursor: "pointer",
                    borderRadius: 6,
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckboxClick(e, snap, index);
                    }}
                    style={{
                      width: 24,
                      height: 24,
                      cursor: "pointer",
                      accentColor: "#2563eb",
                      margin: 0,
                    }}
                  />
                </div>

                <div
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: "#1e293b",
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: 1.4,
                  }}
                  title={snap.name}
                >
                  {formatName(snap.name)}
                </div>
                {snap.exported && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#059669",
                      backgroundColor: "#d1fae5",
                      padding: "2px 8px",
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  >
                    Published
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer: primary LEFT (Delete/Publish) · secondary RIGHT (닫기) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          rowGap: 10,
          padding: "14px 24px",
          borderTop: "1px solid #e2e8f0",
          backgroundColor: "#f8fafc",
          flexShrink: 0,
        }}
      >
        <div
          className="workspace-history-actions-left"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {/* Delete (n) */}
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={deleteDisabled}
            style={{
              padding: "10px 20px",
              fontSize: 15,
              fontWeight: 600,
              color: "#ffffff",
              backgroundColor: deleteDisabled ? "#cbd5e1" : "#ef4444",
              border: "none",
              borderRadius: 8,
              cursor: deleteDisabled ? "not-allowed" : "pointer",
              transition: "background-color 0.15s ease",
            }}
          >
            Delete ({selectedIds.length})
          </button>

          {/* Publish — sole official deployment action (Unexported tab) */}
          {tab === "unexported" && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishDisabled}
              title="로컬 Vite → repo write → git commit → push → Production 검증"
              style={{
                padding: "10px 20px",
                fontSize: 15,
                fontWeight: 600,
                color: "#ffffff",
                backgroundColor: publishDisabled ? "#94a3b8" : "#2563eb",
                border: "none",
                borderRadius: 8,
                cursor: publishDisabled ? "not-allowed" : "pointer",
                transition: "background-color 0.15s ease",
              }}
            >
              {busy ? "Publishing…" : "Publish"}
            </button>
          )}
        </div>

        <div
          className="workspace-history-actions-right"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginLeft: "auto",
          }}
        >
          {/* 닫기 */}
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            style={{
              padding: "10px 20px",
              fontSize: 15,
              fontWeight: 600,
              color: "#ffffff",
              backgroundColor: busy ? "#94a3b8" : "#64748b",
              border: "none",
              borderRadius: 8,
              cursor: busy ? "not-allowed" : "pointer",
              transition: "background-color 0.15s ease",
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

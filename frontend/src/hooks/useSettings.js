import { useState, useMemo, useCallback } from "react";
import {
  loadWorkspaceHistory,
  saveWorkspaceHistory,
  generateUUID,
  getNextVersion,
  buildSnapshotName,
  findSnapshotById,
  deleteSnapshotById,
  deleteOldest30,
  updateSnapshotsExported,
} from "../domain/workspaceHistory";
import { normalizeDatasetFromStorage } from "../domain/positionMergeEngine";
import {
  buildDatasetExport,
  normalizeDatasetExport,
} from "../domain/datasetExport";
import { mergePublishedExport } from "../domain/datasetExportMerge";
import {
  DATASET_EXPORT_FILENAME,
  DATASET_ROOT_DIR,
  buildDatasetExportPathSegments,
} from "../domain/datasetPath";
import { canonicalDebugLog } from "../domain/canonicalPersistAudit";
import { hydrateBallsStateForUi } from "../admin/slotAutoRecommend";

async function getOrCreateDir(parent, name) {
  return parent.getDirectoryHandle(name, { create: true });
}

/** Recall SSOT dataset key — preserved by default cleanup mode */
export const POSITIONS_DATASET_STORAGE_KEY = "positions_dataset";
export const ONE_POINT_LESSON_LIBRARY_STORAGE_KEY =
  "ONE_POINT_LESSON_LIBRARY_V1";

export const WORKSPACE_CLEANUP_PRESERVE_DATASET = "preserve_dataset";
export const WORKSPACE_CLEANUP_CLEAR_ALL = "clear_all";

/** All localStorage keys except `exceptKeys` (for preserve-dataset cleanup). */
export function listLocalStorageKeysExcept(exceptKeys) {
  const preserved = new Set(
    Array.isArray(exceptKeys) ? exceptKeys.filter(Boolean) : [exceptKeys]
  );
  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && !preserved.has(key)) keys.push(key);
  }
  return keys;
}

/**
 * Workspace LocalStorage cleanup.
 * - preserve_dataset: remove every key except protected working keys
 * - clear_all: localStorage.clear()
 * @returns {string[]} keys removed (or all keys before clear)
 */
export function runWorkspaceLocalStorageCleanup(mode) {
  if (mode === WORKSPACE_CLEANUP_CLEAR_ALL) {
    const removedKeys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key) removedKeys.push(key);
    }
    localStorage.clear();
    return removedKeys;
  }

  const removedKeys = listLocalStorageKeysExcept([
    POSITIONS_DATASET_STORAGE_KEY,
    ONE_POINT_LESSON_LIBRARY_STORAGE_KEY,
  ]);
  for (const key of removedKeys) {
    localStorage.removeItem(key);
  }
  return removedKeys;
}

/**
 * Workspace history / snapshot persistence (localStorage + optional folder export).
 * Canonical SAVE orchestration: strategy persistence runs in App; history append uses
 * `commitWorkspaceHistoryWithStrategyDataset(updated)` so snapshots embed `result.updated`, not stale React state.
 */
export function useSettings({
  adminState,
  ballsState,
  shotEditor,
  targetColor,
  actions,
  setAdminState,
  setBallsState,
  setDataset,
  setIsSaved,
  setIsAdminPublishedSearchMatched,
  setIsAdminInputSessionActive,
  setTargetColor,
  setIsTargetSelected,
}) {
  const [workspaceHistoryVersion, setWorkspaceHistoryVersion] = useState(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [exportDirHandle, setExportDirHandle] = useState(null);

  const workspaceHistory = useMemo(
    () => loadWorkspaceHistory(),
    [workspaceHistoryVersion]
  );

  /** User-gesture: no alert before picker (breaks showDirectoryPicker in Chrome). */
  const resolveExportRootDir = useCallback(async () => {
    if (exportDirHandle) return exportDirHandle;
    if (!window.showDirectoryPicker) {
      alert("이 브라우저는 폴더 선택을 지원하지 않습니다.");
      return null;
    }
    try {
      const handle = await window.showDirectoryPicker();
      setExportDirHandle(handle);
      return handle;
    } catch (e) {
      if (e.name !== "AbortError")
        console.warn("Export folder pick cancelled or failed", e);
      return null;
    }
  }, [exportDirHandle]);

  const saveDatasetExportToFile = useCallback(async (snapshot, rootDir) => {
      if (!rootDir) return false;
      try {
        const payload = normalizeDatasetExport(buildDatasetExport(snapshot));
        const segments = buildDatasetExportPathSegments(
          payload.shotType,
          payload.systemId
        );

        const datasetRoot =
          rootDir.name === DATASET_ROOT_DIR
            ? rootDir
            : await getOrCreateDir(rootDir, segments.datasetRoot);
        const shotDir = await getOrCreateDir(
          datasetRoot,
          segments.shotTypeDir
        );
        const systemDir = await getOrCreateDir(
          shotDir,
          segments.systemDir
        );

        const fileName = segments.fileName || DATASET_EXPORT_FILENAME;
        let mergedPayload = payload;

        try {
          const existingHandle = await systemDir.getFileHandle(fileName);
          const existingFile = await existingHandle.getFile();
          if (existingFile.size > 0) {
            const existingText = await existingFile.text();
            const existingPayload = normalizeDatasetExport(
              JSON.parse(existingText)
            );
            mergedPayload = mergePublishedExport(existingPayload, payload);
          }
        } catch (readErr) {
          if (readErr?.name !== "NotFoundError") {
            console.warn(
              "Existing published dataset read skipped; writing incoming only",
              readErr
            );
          }
        }

        const fileHandle = await systemDir.getFileHandle(fileName, {
          create: true,
        });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(mergedPayload, null, 2));
        await writable.close();

        console.log("📤 Dataset Export:", {
          path: `${segments.datasetRoot}/${segments.shotTypeDir}/${segments.systemDir}/${fileName}`,
          incomingRecordCount: payload.records.length,
          mergedRecordCount: mergedPayload.records.length,
          systemId: mergedPayload.systemId,
          shotType: mergedPayload.shotType,
          mergeApplied: mergedPayload !== payload,
        });
        return true;
      } catch (e) {
        console.error("saveDatasetExportToFile failed", e);
        alert(`Export 실패: ${e.message}`);
        return false;
      }
    },
    []
  );

  /**
   * Append workspace_history after successful handleSaveStrategy; `strategyUpdatedDataset` must be result.updated.
   * Caller is responsible for guards (Position LOCK / systemId) and strategy ok.
   */
  const commitWorkspaceHistoryWithStrategyDataset = useCallback(
    (strategyUpdatedDataset) => {
      canonicalDebugLog("[H_SAVE_ENTRY]", { ts: Date.now() });
      const systemId =
        adminState?.sys?.system_id ?? adminState?.sys?.system ?? "5_half_system";
      const pattern = adminState?.sys?.shotType ?? "뒤돌리기";
      const history = loadWorkspaceHistory();
      const version = getNextVersion(history, systemId, pattern);
      const timestamp = new Date().toISOString();
      const name = buildSnapshotName(pattern, systemId, version, timestamp);
      const snapshot = {
        id: generateUUID(),
        name,
        systemId,
        pattern,
        version,
        timestamp,
        exported: false,
        state: {
          adminState: JSON.parse(JSON.stringify(adminState)),
          ballsState: ballsState ? JSON.parse(JSON.stringify(ballsState)) : null,
          dataset: JSON.parse(
            JSON.stringify(Array.isArray(strategyUpdatedDataset) ? strategyUpdatedDataset : [])
          ),
          shotEditor: JSON.parse(JSON.stringify(shotEditor)),
          targetBall: targetColor ?? null,
        },
      };
      const nextHistory = [...history, snapshot];
      saveWorkspaceHistory(nextHistory);
      setWorkspaceHistoryVersion((v) => v + 1);
      setIsSaved(true);
      console.log("💾 Workspace snapshot saved:", name);
      alert(`스냅샷 저장: ${name}`);
    },
    [adminState, ballsState, shotEditor, targetColor, setIsSaved]
  );

  const handleLoadWorkspaceSnapshot = useCallback(
    (id) => {
      const history = loadWorkspaceHistory();
      const snapshot = findSnapshotById(history, id);
      if (!snapshot) {
        alert("스냅샷을 찾을 수 없습니다.");
        return;
      }
      const s = snapshot.state;
      setAdminState(s.adminState);
      setBallsState(hydrateBallsStateForUi(s.ballsState));
      const nextDataset = normalizeDatasetFromStorage(s.dataset ?? []);
      setDataset(nextDataset);
      try {
        localStorage.setItem("positions_dataset", JSON.stringify(nextDataset));
      } catch (e) {
        console.warn("Failed to persist dataset on restore", e);
      }
      actions.restoreShotEditor(s.shotEditor);
      setWorkspaceHistoryVersion((v) => v + 1);
      setIsSaved(false);
      setIsAdminPublishedSearchMatched(false);
      setIsAdminInputSessionActive(false);
      const restoredTarget = s.targetBall ?? null;
      setTargetColor(restoredTarget);
      setIsTargetSelected(!!restoredTarget);
      console.log("📂 Workspace restored:", snapshot.name);
      alert(`복원 완료: ${snapshot.name}`);
    },
    [
      actions,
      setAdminState,
      setBallsState,
      setDataset,
      setIsSaved,
      setIsAdminPublishedSearchMatched,
      setIsAdminInputSessionActive,
      setTargetColor,
      setIsTargetSelected,
    ]
  );

  const handleDeleteWorkspaceSnapshot = useCallback((id) => {
    deleteSnapshotById(id);
    setWorkspaceHistoryVersion((v) => v + 1);
  }, []);

  const handleDeleteOldest30 = useCallback(() => {
    deleteOldest30();
    setWorkspaceHistoryVersion((v) => v + 1);
  }, []);

  const handleExportSnapshots = useCallback(
    async (ids) => {
      if (!ids?.length) return;

      const rootDir = await resolveExportRootDir();
      if (!rootDir) return;

      const history = loadWorkspaceHistory();
      const toExport = ids
        .map((id) => findSnapshotById(history, id))
        .filter(Boolean);
      if (toExport.length === 0) return;

      for (const snap of toExport) {
        const ok = await saveDatasetExportToFile(snap, rootDir);
        if (!ok) return;
      }
      updateSnapshotsExported(ids);
      setWorkspaceHistoryVersion((v) => v + 1);
      alert(
        `${toExport.length}개 Dataset Export 완료\n(dataset/공략명/시스템명/positions.json)`
      );
    },
    [resolveExportRootDir, saveDatasetExportToFile]
  );

  return {
    workspaceHistory,
    showHistoryModal,
    setShowHistoryModal,
    commitWorkspaceHistoryWithStrategyDataset,
    handleLoadWorkspaceSnapshot,
    handleDeleteWorkspaceSnapshot,
    handleDeleteOldest30,
    handleExportSnapshots,
  };
}

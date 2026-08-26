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
import { buildEditSourceContext } from "../domain/cueEditSnap";
import {
  hydrateBallsStateForUi,
  normalizeBallsToBall3,
  canonicalizeBallsStateForHistorySnapshot,
} from "../admin/slotAutoRecommend";
import { normalizeAdminTargetBall } from "../domain/system/adminEditSessionContract";
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
import {
  PRODUCT_EXPORT_ROOT_DIR,
  PRODUCT_EXPORT_REQUEST_FILENAME,
  buildProductExportRequestFromSnapshot,
  mergeProductExportRequests,
} from "../domain/productExportRequest";
import { canonicalDebugLog } from "../domain/canonicalPersistAudit";
import { persistPositionsDatasetWithGeneration } from "../domain/dataset/infra/persistPositionsDatasetWithGeneration";
import { POSITIONS_DATASET_META_KEY } from "../domain/dataset/infra/positionsDatasetMeta";

async function getOrCreateDir(parent, name) {
  return parent.getDirectoryHandle(name, { create: true });
}

/** Recall SSOT dataset key — preserved by default cleanup mode */
export const POSITIONS_DATASET_STORAGE_KEY = "positions_dataset";
/** Re-export SSOT generation authority key for cleanup preserve list. */
export { POSITIONS_DATASET_META_KEY as POSITIONS_DATASET_META_STORAGE_KEY };
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
 * - preserve_dataset: keep production corpus + generation meta + lesson library;
 *   delete family_* shadow, workspace_history, and other keys (Phase 3A-339)
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

  // Phase 3A-339: positions_dataset + positions_dataset_meta = authoritative pair.
  // family_* remains DELETE (normalized shadow; rebuild on next SAVE/Approval/Import).
  const removedKeys = listLocalStorageKeysExcept([
    POSITIONS_DATASET_STORAGE_KEY,
    POSITIONS_DATASET_META_KEY,
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
  /** History Load → SAVE Cue-Only Edit Snap context (session only; not Schema). */
  const [editSourceContext, setEditSourceContext] = useState(null);

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

  const saveProductExportRequestToFile = useCallback(async (snapshots, rootDir) => {
    if (!rootDir || !snapshots?.length) return false;
    try {
      const parts = snapshots.map((snap) =>
        buildProductExportRequestFromSnapshot(snap)
      );
      const payload = mergeProductExportRequests(parts);
      if (!payload.strategies.length) {
        console.warn(
          "Product Export Request skipped: no Authoring strategies in snapshots"
        );
        return false;
      }
      const productRoot = await getOrCreateDir(rootDir, PRODUCT_EXPORT_ROOT_DIR);
      const fileHandle = await productRoot.getFileHandle(
        PRODUCT_EXPORT_REQUEST_FILENAME,
        { create: true }
      );
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(payload, null, 2));
      await writable.close();
      console.log("📤 Product Export Request:", {
        path: `${PRODUCT_EXPORT_ROOT_DIR}/${PRODUCT_EXPORT_REQUEST_FILENAME}`,
        strategyCount: payload.strategies.length,
        sourceSnapshotIds: payload.sourceSnapshotIds,
      });
      // Optional native / IDE bridge: run Product Host (Generator) automatically.
      if (typeof window !== "undefined" && window.__PRODUCT_EXPORT_HOST__?.run) {
        await window.__PRODUCT_EXPORT_HOST__.run(payload);
      }
      return true;
    } catch (e) {
      console.error("saveProductExportRequestToFile failed", e);
      return false;
    }
  }, []);

  /**
   * Append workspace_history after successful handleSaveStrategy; `strategyUpdatedDataset` must be result.updated.
   * Caller is responsible for guards (Position LOCK / systemId) and strategy ok.
   */
  const commitWorkspaceHistoryWithStrategyDataset = useCallback(
    (strategyUpdatedDataset, runtimeOverride) => {
      canonicalDebugLog("[H_SAVE_ENTRY]", { ts: Date.now() });
      const snapshotAdminState = runtimeOverride?.adminState ?? adminState;
      const rawBallsState = runtimeOverride?.ballsState ?? ballsState;
      // Phase 3: History snapshot stores Role Ball3 (target=physical Target).
      const snapshotBallsState = canonicalizeBallsStateForHistorySnapshot(
        rawBallsState
      );
      const snapshotShotEditor = runtimeOverride?.shotEditor ?? shotEditor;
      const snapshotTargetBall =
        runtimeOverride?.targetBall !== undefined
          ? runtimeOverride.targetBall
          : targetColor ?? null;
      const systemId =
        snapshotAdminState?.sys?.system_id ??
        snapshotAdminState?.sys?.system ??
        "5_half_system";
      const pattern = snapshotAdminState?.sys?.shotType ?? "뒤돌리기";
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
          adminState: JSON.parse(JSON.stringify(snapshotAdminState)),
          ballsState: JSON.parse(JSON.stringify(snapshotBallsState)),
          dataset: JSON.parse(
            JSON.stringify(Array.isArray(strategyUpdatedDataset) ? strategyUpdatedDataset : [])
          ),
          shotEditor: JSON.parse(JSON.stringify(snapshotShotEditor)),
          targetBall: snapshotTargetBall,
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

  /** @returns {boolean} true when snapshot hydrated (caller enables Admin table layers for display). */
  const handleLoadWorkspaceSnapshot = useCallback(
    (id) => {
      const history = loadWorkspaceHistory();
      const snapshot = findSnapshotById(history, id);
      if (!snapshot) {
        alert("스냅샷을 찾을 수 없습니다.");
        return false;
      }
      const s = snapshot.state;
      const nextDataset = normalizeDatasetFromStorage(s.dataset ?? []);
      // Phase 3A-335/337: durable persist first (invalidate → positions → gen).
      // Transitional H3: do NOT sync/rollback family_* (History ≠ Member DB).
      // Restore advances corpusGeneration → generation mismatch → freshness false until SAVE/Approval.
      // Full H3 workspace/corpus storage split remains DEFERRED.
      const corpusPersist = persistPositionsDatasetWithGeneration(nextDataset);
      if (!corpusPersist.ok) {
        console.warn(
          "Failed safe corpus persist on History restore",
          corpusPersist.stage,
          corpusPersist.reason
        );
        alert(
          `히스토리 복원 저장 실패 (${corpusPersist.stage}): ${corpusPersist.reason}`
        );
        return false;
      }
      setAdminState(s.adminState);
      // Phase 3: Role Ball3 restore — snapshot.target → UI balls.target (no color→field).
      const hydratedBalls = hydrateBallsStateForUi(s.ballsState);
      setBallsState(hydratedBalls);
      setDataset(nextDataset);
      actions.restoreShotEditor(s.shotEditor);
      setWorkspaceHistoryVersion((v) => v + 1);
      setIsSaved(false);
      setIsAdminPublishedSearchMatched(false);
      // View-only after History load — Reset re-opens editable session (POLICY A).
      setIsAdminInputSessionActive(false);
      // Explicit Target Lock hydrate — no stale previous lock (POLICY A).
      const restoredTarget = normalizeAdminTargetBall(s.targetBall);
      setTargetColor(restoredTarget);
      setIsTargetSelected(restoredTarget != null);

      // Edit Source for Cue-Only Edit Snap (Authoring session state only).
      try {
        if (hydratedBalls?.cue) {
          const ball3 = normalizeBallsToBall3(hydratedBalls);
          setEditSourceContext(
            buildEditSourceContext(snapshot.id, ball3, nextDataset)
          );
        } else {
          setEditSourceContext(null);
        }
      } catch (e) {
        console.warn("Failed to build edit source context", e);
        setEditSourceContext(null);
      }

      console.log("📂 Workspace restored:", snapshot.name);
      alert(`복원 완료: ${snapshot.name}`);
      return true;
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

  const clearEditSourceContext = useCallback(() => {
    setEditSourceContext(null);
  }, []);

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
      // Product Export Pipeline: write Authoring Adapter input for Product Host → Generator.
      await saveProductExportRequestToFile(toExport, rootDir);
      updateSnapshotsExported(ids);
      setWorkspaceHistoryVersion((v) => v + 1);
      alert(
        `${toExport.length}개 Dataset Export 완료\n(dataset/공략명/시스템명/positions.json)\n` +
          `Product Export Request → ${PRODUCT_EXPORT_ROOT_DIR}/${PRODUCT_EXPORT_REQUEST_FILENAME}`
      );
    },
    [resolveExportRootDir, saveDatasetExportToFile, saveProductExportRequestToFile]
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
    editSourceContext,
    clearEditSourceContext,
  };
}

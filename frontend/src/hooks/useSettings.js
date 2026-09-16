import { useState, useMemo, useCallback } from "react";
import {
  loadWorkspaceHistory,
  saveWorkspaceHistory,
  generateUUID,
  getNextVersion,
  buildSnapshotName,
  findSnapshotById,
  deleteSnapshotById,
  deleteSnapshotsByIds,
  deleteOldest30,
  updateSnapshotsExported,
} from "../domain/workspaceHistory";
import { loadWorkingDataset } from "../domain/dataset/infra/datasetStorage";
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
import { buildPublishedFamilyExportCandidate } from "../domain/publishedFamilyPublish";
import { writeVerifiedPublishedFile } from "../domain/publishedWrite";
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
import { POSITIONS_DATASET_META_KEY } from "../domain/dataset/infra/positionsDatasetMeta";
import { refreshPublishedDataset } from "../domain/publishedDatasetStore";

async function getOrCreateDir(parent, name) {
  return parent.getDirectoryHandle(name, { create: true });
}

/** Recall SSOT dataset key — preserved by local cleanup */
export const POSITIONS_DATASET_STORAGE_KEY = "positions_dataset";
/** Re-export SSOT generation authority key for cleanup preserve list. */
export { POSITIONS_DATASET_META_KEY as POSITIONS_DATASET_META_STORAGE_KEY };
export const ONE_POINT_LESSON_LIBRARY_STORAGE_KEY =
  "ONE_POINT_LESSON_LIBRARY_V1";
/** PRO ONE POINT category library — preserved (not Local workspace cleanup). */
export const ONE_POINT_CATEGORY_LIBRARY_STORAGE_KEY =
  "ONE_POINT_CATEGORY_LIBRARY_V1";
/** ADMIN anchors override preference — preserved across local cleanup. */
export const ANCHORS_OVERRIDE_STORAGE_KEY = "ANCHORS_OVERRIDE_V1";

/** Phase 1 [로컬 삭제] — History/workspace cleanup; corpus + AI library kept. */
export const WORKSPACE_CLEANUP_LOCAL_DELETE = "local_delete";
/** @deprecated Alias of local_delete (Phase 3A-339 name retained for callers/tests). */
export const WORKSPACE_CLEANUP_PRESERVE_DATASET = "preserve_dataset";
/**
 * @deprecated Phase 1: no longer wipes corpus/AI library via blanket clear.
 * Maps to the same safe local_delete preserve list.
 */
export const WORKSPACE_CLEANUP_CLEAR_ALL = "clear_all";

/** Keys that Local Delete must never remove. */
export function listWorkspaceCleanupPreservedKeys() {
  return [
    POSITIONS_DATASET_STORAGE_KEY,
    POSITIONS_DATASET_META_KEY,
    ONE_POINT_LESSON_LIBRARY_STORAGE_KEY,
    ONE_POINT_CATEGORY_LIBRARY_STORAGE_KEY,
    ANCHORS_OVERRIDE_STORAGE_KEY,
  ];
}

/** All localStorage keys except `exceptKeys` (for local-delete cleanup). */
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
 * Local workspace cleanup ([로컬 삭제]).
 * KEEP: positions_dataset + meta + AI one-point libraries + anchors override.
 * DELETE: workspace_history, family_* shadow, and other non-preserved keys.
 * Never bulk-clears storage; never touches repo published dataset files.
 * @returns {string[]} keys removed
 */
export function runWorkspaceLocalStorageCleanup(mode) {
  // Phase 1: clear_all / preserve_dataset / local_delete share the same safe path.
  void mode;
  const removedKeys = listLocalStorageKeysExcept(
    listWorkspaceCleanupPreservedKeys()
  );
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
      if (!rootDir) {
        return { ok: false, reason: "missing-root-dir" };
      }
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
        /** @type {import("../domain/datasetExport").DatasetExportPayload | null} */
        let existingPayload = null;
        /** @type {string | null} */
        let originalText = null;

        try {
          const existingHandle = await systemDir.getFileHandle(fileName);
          const existingFile = await existingHandle.getFile();
          if (existingFile.size > 0) {
            originalText = await existingFile.text();
            existingPayload = normalizeDatasetExport(JSON.parse(originalText));
          }
        } catch (readErr) {
          if (readErr?.name !== "NotFoundError") {
            console.warn(
              "Existing published dataset read skipped; treating as new leaf",
              readErr
            );
          }
        }

        // Phase 3-B1: family-aware candidate + pre-write validation gate.
        const publishResult = buildPublishedFamilyExportCandidate(
          existingPayload,
          payload
        );
        if (!publishResult.ok) {
          console.error("Published export candidate validation failed", {
            reason: publishResult.reason,
            issues: publishResult.issues,
          });
          return {
            ok: false,
            reason: publishResult.reason,
            issues: publishResult.issues,
          };
        }
        const mergedPayload = publishResult.payload;

        const fileHandle = await systemDir.getFileHandle(fileName, {
          create: true,
        });

        // Phase 3-B2: verified write (serialize → write/close → read-back → restore on fail).
        const writeResult = await writeVerifiedPublishedFile({
          fileHandle,
          candidate: mergedPayload,
          originalText,
          revalidate: false, // already gated by buildPublishedFamilyExportCandidate
        });
        if (!writeResult.ok) {
          console.error("Verified published write failed", writeResult);
          return {
            ok: false,
            reason: writeResult.reason,
            issues: writeResult.issues,
            restored: writeResult.restored,
            restoreFailed: writeResult.restoreFailed,
          };
        }

        console.log("📤 Dataset Export (verified):", {
          path: `${segments.datasetRoot}/${segments.shotTypeDir}/${segments.systemDir}/${fileName}`,
          incomingRecordCount: payload.records.length,
          mergedRecordCount: mergedPayload.records.length,
          systemId: mergedPayload.systemId,
          shotType: mergedPayload.shotType,
          purgedFamilyIds: publishResult.purgedFamilyIds,
          replaceFamilyIds: publishResult.replaceFamilyIds,
          familyAwarePublish: true,
          verifiedWrite: true,
        });
        return {
          ok: true,
          shotType: mergedPayload.shotType,
          systemId: mergedPayload.systemId,
        };
      } catch (e) {
        console.error("saveDatasetExportToFile failed", e);
        return {
          ok: false,
          reason: e?.message ? String(e.message) : "export-failed",
        };
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
          shotEditor: JSON.parse(JSON.stringify(snapshotShotEditor)),
          targetBall: snapshotTargetBall,
        },
      };
      const nextHistory = [...history, snapshot];
      const saveRes = saveWorkspaceHistory(nextHistory);
      if (!saveRes?.ok) {
        console.warn("❌ Failed to persist workspace snapshot:", saveRes?.reason);
        alert(`스냅샷 저장 실패: ${saveRes?.reason ?? "알 수 없는 오류"}`);
        return { ok: false, reason: saveRes?.reason ?? "history-save-failed" };
      }
      setWorkspaceHistoryVersion((v) => v + 1);
      setIsSaved(true);
      console.log("💾 Workspace snapshot saved:", name);
      // Phase 1: no success alert — Derived Review follows immediately.
      return { ok: true, name };
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
      const snapshotDataset =
        Array.isArray(s.dataset) && s.dataset.length > 0
          ? normalizeDatasetFromStorage(s.dataset)
          : loadWorkingDataset();

      // Phase 1: History Load restores Workspace editing state only (UI/balls/shotEditor/target).
      // Search Corpus (positions_dataset) remains independent and is NOT replaced by history snapshot.
      setAdminState(s.adminState);
      // Phase 3: Role Ball3 restore — snapshot.target → UI balls.target (no color→field).
      const hydratedBalls = hydrateBallsStateForUi(s.ballsState);
      setBallsState(hydratedBalls);
      actions.restoreShotEditor(s.shotEditor);
      setWorkspaceHistoryVersion((v) => v + 1);
      setIsSaved(false);
      setIsAdminPublishedSearchMatched(false);
      // Load → immediately editable (Undo/Recall model; no Reset gate).
      setIsAdminInputSessionActive(true);
      // Explicit Target Lock hydrate — no stale previous lock.
      const restoredTarget = normalizeAdminTargetBall(s.targetBall);
      setTargetColor(restoredTarget);
      setIsTargetSelected(restoredTarget != null);

      // Edit Source for Cue-Only Edit Snap (Authoring session state only).
      try {
        if (hydratedBalls?.cue) {
          const ball3 = normalizeBallsToBall3(hydratedBalls);
          setEditSourceContext(
            buildEditSourceContext(snapshot.id, ball3, snapshotDataset)
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

  const handleDeleteWorkspaceSnapshot = useCallback((idOrIds) => {
    if (!idOrIds) return;
    if (Array.isArray(idOrIds)) {
      deleteSnapshotsByIds(idOrIds);
    } else {
      deleteSnapshotById(idOrIds);
    }
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

      /** @type {string[]} */
      const successfulExportIds = [];
      /** @type {{ id: string, reason: string }[]} */
      const failures = [];

      for (const snap of toExport) {
        // Stop-on-first-failure: later snapshots remain not-attempted / unexported.
        const result = await saveDatasetExportToFile(snap, rootDir);
        if (!result?.ok) {
          const reason = result?.reason ?? "export-failed";
          const issues = Array.isArray(result?.issues)
            ? result.issues.slice(0, 5).join("\n")
            : "";
          failures.push({ id: snap.id, reason });
          console.error("Dataset Export snapshot failed", {
            snapshotId: snap.id,
            reason,
            issues: result?.issues,
            restored: result?.restored,
            restoreFailed: result?.restoreFailed,
          });
          alert(
            `Export 실패: ${reason}${issues ? `\n${issues}` : ""}${
              result?.restored
                ? "\n(원본 파일 복원 시도 완료)"
                : result?.restoreFailed
                  ? "\n(원본 복원 실패 — 파일 상태를 확인하세요)"
                  : ""
            }`
          );
          break;
        }
        successfulExportIds.push(snap.id);
        const shotType = result.shotType ?? snap.pattern ?? "뒤돌리기";
        const systemId = result.systemId ?? snap.systemId ?? "5_half_system";
        // Cache refresh only after verified write success.
        refreshPublishedDataset(shotType, systemId);
      }

      if (successfulExportIds.length > 0) {
        refreshPublishedDataset();
        const successSnaps = toExport.filter((s) =>
          successfulExportIds.includes(s.id)
        );
        // Product side-channel: best-effort for successful snaps only; does not gate Dataset success.
        await saveProductExportRequestToFile(successSnaps, rootDir);
        updateSnapshotsExported(successfulExportIds);
        setWorkspaceHistoryVersion((v) => v + 1);
      }

      if (failures.length === 0 && successfulExportIds.length === toExport.length) {
        alert(
          `${successfulExportIds.length}개 Dataset Export 완료 (verified)\n(dataset/공략명/시스템명/positions.json)\n` +
            `Product Export Request → ${PRODUCT_EXPORT_ROOT_DIR}/${PRODUCT_EXPORT_REQUEST_FILENAME}`
        );
      } else if (successfulExportIds.length > 0) {
        alert(
          `부분 Export 완료 (verified ${successfulExportIds.length}/${toExport.length})\n` +
            `실패: ${failures.map((f) => f.reason).join(", ") || "unknown"}`
        );
      }
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

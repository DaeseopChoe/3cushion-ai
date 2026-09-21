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
import { readPublishOperationFromSnapshot } from "../domain/publishOperation";
import {
  buildPublishFamilyPayload,
  crossValidateOperationAndPayload,
  readPublishFamilyPayloadFromSnapshot,
} from "../domain/publishFamilyPayload";
import { writeVerifiedPublishedFile } from "../domain/publishedWrite";
import { publishDatasetToLocalRepo } from "../domain/repoPublish/publishDatasetToLocalRepo";
import { publishDatasetToLocalRepoWithGit } from "../domain/repoPublish/publishDatasetToLocalRepoGit";
import {
  DATASET_EXPORT_FILENAME,
  DATASET_ROOT_DIR,
  buildDatasetExportPathSegments,
} from "../domain/datasetPath";
import { canonicalDebugLog } from "../domain/canonicalPersistAudit";
import { POSITIONS_DATASET_META_KEY } from "../domain/dataset/infra/positionsDatasetMeta";
import { CANONICAL_NORMALIZED_CORPUS_KEY } from "../domain/dataset/infra/canonicalNormalizedCorpusStore";
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
    CANONICAL_NORMALIZED_CORPUS_KEY,
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
 * KEEP: positions_dataset + meta + normalized_dataset + AI one-point libraries + anchors override.
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
        const builtExport = buildDatasetExport(snapshot);
        if (!builtExport.ok) {
          console.error("Dataset export build failed", builtExport);
          return {
            ok: false,
            reason: builtExport.reason,
            issues: builtExport.issues,
          };
        }
        const payload = normalizeDatasetExport(builtExport.payload);
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

        // Phase 3-B1 + C1: family-aware candidate; History publishOperation when present.
        const publishOperation = readPublishOperationFromSnapshot(snapshot);
        const publishResult = buildPublishedFamilyExportCandidate(
          existingPayload,
          payload,
          publishOperation
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
          exportSource: builtExport.source,
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

  /**
   * Append workspace_history after successful handleSaveStrategy; `strategyUpdatedDataset` must be result.updated.
   * Caller is responsible for guards (Position LOCK / systemId) and strategy ok.
   */
  const commitWorkspaceHistoryWithStrategyDataset = useCallback(
    (strategyUpdatedDataset, runtimeOverride, publishOperation) => {
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

      // Phase 3-C2: SAVE-time destination-family payload (required when operation present).
      let publishFamilyPayload = null;
      if (publishOperation) {
        const built = buildPublishFamilyPayload(
          strategyUpdatedDataset,
          publishOperation.destinationFamilyId
        );
        if (!built.ok) {
          console.error("Publish family payload build failed", built);
          alert(
            `스냅샷 저장 실패: ${built.reason}\n${(built.issues || [])
              .slice(0, 5)
              .join("\n")}`
          );
          return { ok: false, reason: built.reason, issues: built.issues };
        }
        const cross = crossValidateOperationAndPayload(
          publishOperation,
          built.payload
        );
        if (!cross.ok) {
          console.error("Publish operation/payload cross-validation failed", cross);
          alert(`스냅샷 저장 실패: ${cross.reason}`);
          return { ok: false, reason: cross.reason, issues: cross.issues };
        }
        publishFamilyPayload = built.payload;
      }

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
        // Phase 3-C1/C2: immutable publish artifacts (not UI state; not positions.json).
        ...(publishOperation
          ? { publishOperation: JSON.parse(JSON.stringify(publishOperation)) }
          : {}),
        ...(publishFamilyPayload
          ? {
              publishFamilyPayload: JSON.parse(
                JSON.stringify(publishFamilyPayload)
              ),
            }
          : {}),
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
      console.log("💾 Workspace snapshot saved:", name, {
        publishOperation: publishOperation ?? null,
        publishFamilyPayloadRecords: publishFamilyPayload?.records?.length ?? 0,
        datasetEmbedded: false,
      });
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
        updateSnapshotsExported(successfulExportIds);
        setWorkspaceHistoryVersion((v) => v + 1);
      }

      if (failures.length === 0 && successfulExportIds.length === toExport.length) {
        alert(
          `${successfulExportIds.length}개 Dataset Export 완료 (verified)\n(dataset/공략명/시스템명/positions.json)`
        );
      } else if (successfulExportIds.length > 0) {
        alert(
          `부분 Export 완료 (verified ${successfulExportIds.length}/${toExport.length})\n` +
            `실패: ${failures.map((f) => f.reason).join(", ") || "unknown"}`
        );
      }
    },
    [resolveExportRootDir, saveDatasetExportToFile]
  );

  /**
   * Phase 4-B/C: Git-enabled Publish + Production read-back (local Vite host only).
   * C2 snapshots only. Preflight → repo write → commit → push → Production verify.
   * Does not open picker. Does not auto-fallback to Export or repo-only.
   * Phase 4-A repo-only endpoint remains available separately.
   */
  const handlePublishSnapshots = useCallback(async (ids) => {
    if (!ids?.length) return;

    const history = loadWorkspaceHistory();
    const toPublish = ids
      .map((id) => findSnapshotById(history, id))
      .filter(Boolean);
    if (toPublish.length === 0) return;

    /** @type {import("../domain/repoPublish/publishDatasetToLocalRepo").LocalPublishClientItem[]} */
    const items = [];
    /** @type {{ id: string, reason: string }[]} */
    const blocked = [];

    for (const snap of toPublish) {
      const op = readPublishOperationFromSnapshot(snap);
      const payloadRead = readPublishFamilyPayloadFromSnapshot(snap);
      if (!op) {
        blocked.push({
          id: snap.id,
          reason: "legacy-snapshot-repo-publish-blocked",
        });
        continue;
      }
      if (!payloadRead.ok) {
        blocked.push({
          id: snap.id,
          reason: payloadRead.reason ?? "payload-invalid",
        });
        continue;
      }
      if (
        !payloadRead.payload ||
        ("absent" in payloadRead && payloadRead.absent)
      ) {
        blocked.push({
          id: snap.id,
          reason: "c2-payload-required",
        });
        continue;
      }
      items.push({
        snapshotId: snap.id,
        shotType: snap.pattern ?? "뒤돌리기",
        systemId: snap.systemId ?? "5_half_system",
        publishOperation: op,
        publishFamilyPayload: payloadRead.payload,
      });
    }

    if (items.length === 0) {
      alert(
        `Git Publish 불가 (C2 snapshot 필요)\n` +
          blocked.map((b) => `${b.reason}`).join("\n") +
          `\n\nLegacy/C1은 수동 Export(폴더 선택)를 사용하세요.`
      );
      return;
    }

    const result = await publishDatasetToLocalRepoWithGit(items);
    if (!result.hostAvailable) {
      alert(
        `LOCAL_PUBLISH_HOST_UNAVAILABLE\n${
          result.message ?? ""
        }\n\n로컬 Vite 개발 서버에서 Publish하거나, 수동 Export(폴더 선택)를 사용하세요.`
      );
      return;
    }

    const markExported = () => {
      /** @type {string[]} */
      const successfulIds = items.map((it) => it.snapshotId);
      for (const it of items) {
        refreshPublishedDataset(it.shotType, it.systemId);
      }
      refreshPublishedDataset();
      updateSnapshotsExported(successfulIds);
      setWorkspaceHistoryVersion((v) => v + 1);
      return successfulIds;
    };

    if (result.ok) {
      const successfulIds = markExported();
      const sha = result.commit ? `HEAD: ${result.commit.slice(0, 7)}\n` : "";
      if (result.status === "PRODUCTION_VERIFIED") {
        if (result.gitStatus === "VERIFIED_NO_CHANGE") {
          alert(
            `${successfulIds.length}개 Git Publish\n` +
              `No repository changes\n` +
              `Production verified\n` +
              sha
          );
        } else {
          alert(
            `${successfulIds.length}개 Git Publish\n` +
              `Repository updated\n` +
              `Git committed\n` +
              `Push complete\n` +
              `Production verified\n` +
              sha
          );
        }
      } else if (result.status === "VERIFIED_NO_CHANGE") {
        alert(
          `${successfulIds.length}개 Git Publish 완료 (NO_CHANGE)\n` +
            `변경 없음 — commit/push 생략`
        );
      } else {
        alert(
          `${successfulIds.length}개 Git Publish\n` +
            `Push complete\n` +
            sha
        );
      }
      return;
    }

    // Git succeeded; Production observation incomplete (not a Git rollback).
    if (
      result.gitStatus === "PUSHED" ||
      result.gitStatus === "VERIFIED_NO_CHANGE"
    ) {
      const successfulIds = markExported();
      const sha = result.commit ? `HEAD: ${result.commit.slice(0, 7)}\n` : "";
      const prodStatus = result.production?.status ?? result.status ?? "";
      if (result.gitStatus === "VERIFIED_NO_CHANGE") {
        alert(
          `${successfulIds.length}개 Git Publish\n` +
            `No repository changes\n` +
            `Production verification timed out\n` +
            `(${prodStatus})\n` +
            sha +
            `Production did not reach expected dataset within verification window.`
        );
      } else {
        alert(
          `${successfulIds.length}개 Git Publish\n` +
            `Push complete\n` +
            `Production verification timed out\n` +
            `(${prodStatus})\n` +
            sha +
            `Production did not reach expected dataset within verification window.`
        );
      }
      return;
    }

    const failDetail = [
      result.status ? `status: ${result.status}` : "",
      result.reason,
      // Field-level issues (e.g. records[n].strategies.S1.meta:missing); UI truncates display only.
      ...(Array.isArray(result.issues) ? result.issues.slice(0, 12) : []),
      result.localCommit
        ? `LOCAL_COMMITTED (push 실패 — reset 금지, 수동 확인)`
        : "",
      result.repoWritten
        ? `repo write는 되었을 수 있음 — Git commit 없음`
        : "",
      ...blocked.map((b) => b.reason),
    ]
      .filter(Boolean)
      .join("\n");

    alert(`Git Publish 실패\n${failDetail}`);
  }, []);

  /**
   * Phase 4-A repo-only Publish (no Git). Kept for recovery / advanced use.
   * Not wired to primary Publish button.
   */
  const handleRepoOnlyPublishSnapshots = useCallback(async (ids) => {
    if (!ids?.length) return;
    const history = loadWorkspaceHistory();
    const toPublish = ids
      .map((id) => findSnapshotById(history, id))
      .filter(Boolean);
    if (toPublish.length === 0) return;
    const items = [];
    for (const snap of toPublish) {
      const op = readPublishOperationFromSnapshot(snap);
      const payloadRead = readPublishFamilyPayloadFromSnapshot(snap);
      if (!op || !payloadRead.ok || !payloadRead.payload) continue;
      if ("absent" in payloadRead && payloadRead.absent) continue;
      items.push({
        snapshotId: snap.id,
        shotType: snap.pattern ?? "뒤돌리기",
        systemId: snap.systemId ?? "5_half_system",
        publishOperation: op,
        publishFamilyPayload: payloadRead.payload,
      });
    }
    if (items.length === 0) {
      alert("Repo-only Publish: C2 snapshot 필요");
      return;
    }
    const result = await publishDatasetToLocalRepo(items);
    if (!result.hostAvailable) {
      alert(`LOCAL_PUBLISH_HOST_UNAVAILABLE\n${result.message ?? ""}`);
      return;
    }
    const successfulIds = (result.results || [])
      .filter((r) => r.ok)
      .map((r) => r.snapshotId);
    if (successfulIds.length > 0) {
      updateSnapshotsExported(successfulIds);
      setWorkspaceHistoryVersion((v) => v + 1);
      refreshPublishedDataset();
    }
    alert(
      result.ok
        ? `Repo-only Publish 완료 (${successfulIds.length})`
        : `Repo-only Publish 실패: ${result.reason}`
    );
  }, []);

  return {
    workspaceHistory,
    showHistoryModal,
    setShowHistoryModal,
    commitWorkspaceHistoryWithStrategyDataset,
    handleLoadWorkspaceSnapshot,
    handleDeleteWorkspaceSnapshot,
    handleDeleteOldest30,
    handleExportSnapshots,
    handlePublishSnapshots,
    handleRepoOnlyPublishSnapshots,
    editSourceContext,
    clearEditSourceContext,
  };
}

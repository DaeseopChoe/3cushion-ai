import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { getWorkHistoryApi } from "../domain/workHistory/workHistoryClient";
import { toWorkHistoryListRow } from "../domain/workHistory/workHistoryModel";
import { commitSaveToWorkHistory } from "../domain/workHistory/workHistorySaveCommit";
import { loadPublishItemsFromWorkHistory } from "../domain/workHistory/workHistoryPublishInput";
import { loadWorkHistorySnapshotForRecall } from "../domain/workHistory/workHistoryRecall";
import { buildEditSourceContext } from "../domain/cueEditSnap";
import {
  hydrateBallsStateForUi,
  normalizeBallsToBall3,
  canonicalizeBallsStateForHistorySnapshot,
} from "../admin/slotAutoRecommend";
import { normalizeAdminTargetBall } from "../domain/system/adminEditSessionContract";
import { publishDatasetToLocalRepoWithGit } from "../domain/repoPublish/publishDatasetToLocalRepoGit";
import { canonicalDebugLog } from "../domain/canonicalPersistAudit";
import { refreshPublishedDataset } from "../domain/publishedDatasetStore";
import {
  buildPublishSuccessStatusText,
  timePublishCall,
} from "../application/flows/publishStatusReport";

export const ONE_POINT_LESSON_LIBRARY_STORAGE_KEY =
  "ONE_POINT_LESSON_LIBRARY_V1";
/** PRO ONE POINT category library (browser preference, not work data). */
export const ONE_POINT_CATEGORY_LIBRARY_STORAGE_KEY =
  "ONE_POINT_CATEGORY_LIBRARY_V1";
/** ADMIN anchors override preference (browser preference, not work data). */
export const ANCHORS_OVERRIDE_STORAGE_KEY = "ANCHORS_OVERRIDE_V1";

const PUBLISH_BLOCKED_REASON_LABELS = {
  "derived-approval-pending": "파생 승인을 완료하지 않은 작업입니다",
  "legacy-snapshot-repo-publish-blocked": "Publish 정보가 없는 옛 History입니다",
  "c2-payload-required": "배포용 Family 데이터가 없는 History입니다",
  "history-not-found": "History에서 찾을 수 없는 작업입니다",
  "history-unreadable": "History 기록을 읽을 수 없는 작업입니다",
};

function formatPublishBlockedLine(b) {
  return `${b.name ?? b.id}: ${PUBLISH_BLOCKED_REASON_LABELS[b.reason] ?? b.reason}`;
}

/** Phase D-3 — user-facing failure stage label from orchestrator result. */
function formatPublishFailureStage(result) {
  const status = String(result?.production?.status ?? result?.status ?? "");
  const reason = String(result?.reason ?? "");
  const key = status || reason;
  if (
    key.includes("PRODUCTION_VERIFY_TIMEOUT") ||
    status === "PRODUCTION_VERIFY_TIMEOUT"
  ) {
    return "Git Push까지 완료됐지만 배포 확인 시간이 초과되었습니다.";
  }
  if (
    key.includes("PRODUCTION_VERIFY_FAILED") ||
    key.includes("SEMANTIC") ||
    key.includes("mismatch")
  ) {
    return "Published 데이터 검증 단계에서 불일치가 확인되었습니다.";
  }
  if (
    result?.localCommit ||
    key.includes("LOCAL_COMMITTED") ||
    key.includes("GIT_PUSH")
  ) {
    return "Git Push 단계에서 실패했습니다.";
  }
  if (
    key.includes("GIT_COMMIT") ||
    key.includes("GIT_STAGE") ||
    key.includes("GIT_PREFLIGHT")
  ) {
    return "Git 단계에서 실패했습니다.";
  }
  if (
    key.includes("READBACK") ||
    key.includes("FILE_WRITE") ||
    key.includes("REPO_WRITE")
  ) {
    return "저장소 파일 쓰기/확인 단계에서 실패했습니다.";
  }
  if (
    key.includes("TARGET_RESOLVE") ||
    key.includes("VALIDATE") ||
    key.includes("validation")
  ) {
    return "검증 단계에서 실패했습니다.";
  }
  if (key) {
    return `실패 단계: ${key}`;
  }
  return "Publish 파이프라인에서 실패했습니다.";
}

/** Phase D-3 — retry guidance matched to backend state (do not lie). */
function formatPublishRetryHint(result) {
  const status = String(result?.production?.status ?? result?.status ?? "");
  const reason = String(result?.reason ?? "");
  if (
    status === "PRODUCTION_VERIFY_TIMEOUT" ||
    reason.includes("PRODUCTION_VERIFY_TIMEOUT")
  ) {
    return "잠시 후 다시 Publish하여 배포 상태를 확인할 수 있습니다.";
  }
  if (result?.localCommit) {
    return "Git commit 상태를 확인한 뒤, 필요하면 관리자 절차로 Push/검증을 이어가세요. 자동 재시도를 강제하지 않습니다.";
  }
  if (result?.hostAvailable === false) {
    return "관리자 컴퓨터의 개발 서버(localhost)에서 다시 시도하세요.";
  }
  return "문제를 확인한 뒤 다시 Publish할 수 있습니다.";
}

const PUBLISHED_MARK_FAILED_LINE =
  "Publish는 완료됐지만 History에 Published 표시를 하지 못했습니다. 같은 작업을 다시 Publish하면 표시됩니다.";

/**
 * Admin work History (D History via the localhost API) + Publish.
 * SAVE orchestration runs in App; `commitWorkspaceHistoryWithStrategyDataset(updated)`
 * writes one History snapshot from `result.updated`, not stale React state.
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
  workHistoryApi,
}) {
  const api = useMemo(() => workHistoryApi ?? getWorkHistoryApi(), [workHistoryApi]);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyError, setHistoryError] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  /**
   * Phase D-3 — Publish in-flight lock (handler-owned).
   * Prevents double file-write / double commit / double push.
   */
  const publishInFlightRef = useRef(false);
  const [publishInFlight, setPublishInFlight] = useState(false);
  /** History Load → SAVE Cue-Only Edit Snap context (session only; not Schema). */
  const [editSourceContext, setEditSourceContext] = useState(null);

  const workspaceHistory = useMemo(
    () => historyEntries.map(toWorkHistoryListRow),
    [historyEntries]
  );

  /** Re-read the History list (index only). */
  const refreshWorkspaceHistory = useCallback(async () => {
    const listed = await api.list();
    if (listed.ok) {
      setHistoryEntries(listed.entries);
      setHistoryError(null);
    } else {
      setHistoryError(listed.message);
    }
    return listed;
  }, [api]);

  useEffect(() => {
    if (showHistoryModal) void refreshWorkspaceHistory();
  }, [showHistoryModal, refreshWorkspaceHistory]);

  /**
   * One History snapshot per SAVE; `strategyUpdatedDataset` must be result.updated.
   * Caller is responsible for guards (Position LOCK / systemId) and strategy ok.
   */
  const commitWorkspaceHistoryWithStrategyDataset = useCallback(
    async (strategyUpdatedDataset, runtimeOverride, publishOperation, historyOptions) => {
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

      // New Families stay PENDING until Derived Approve; OVERWRITE is APPROVED at once.
      const written = await commitSaveToWorkHistory({
        api,
        updated: strategyUpdatedDataset,
        publishOperation: publishOperation ?? null,
        mode: historyOptions?.mode ?? "IMMEDIATE",
        systemId,
        pattern,
        authoredPathNodes: historyOptions?.authoredPathNodes ?? null,
        state: {
          adminState: snapshotAdminState,
          ballsState: snapshotBallsState,
          shotEditor: snapshotShotEditor,
          targetBall: snapshotTargetBall,
        },
      });
      if (!written.ok) {
        console.warn("❌ History snapshot not saved:", written.code);
        alert(
          `History에 저장하지 못했습니다.\n${written.message}\n이번 저장은 완료되지 않았습니다.`
        );
        return { ok: false, reason: written.code };
      }
      setIsSaved(true);
      void refreshWorkspaceHistory();
      console.log("💾 History snapshot saved:", written.entry.name, {
        status: written.entry.status,
        derivedCount: written.entry.derivedCount,
      });
      return { ok: true, name: written.entry.name, snapshotId: written.entry.snapshotId };
    },
    [api, adminState, ballsState, shotEditor, targetColor, setIsSaved, refreshWorkspaceHistory]
  );

  /** Derived Approve → the PENDING snapshot becomes APPROVED with the graph. */
  const finalizeDerivedApprovalHistory = useCallback(
    async (snapshotId, graph) => {
      if (!snapshotId) {
        return { ok: false, code: "NOT_FOUND", message: "승인할 History 기록이 없습니다." };
      }
      const r = await api.approve({ snapshotId, graph });
      if (r.ok) void refreshWorkspaceHistory();
      return r;
    },
    [api, refreshWorkspaceHistory]
  );

  /**
   * History recall: one snapshot → screen state + in-memory session dataset.
   * @returns {Promise<{ ok: false } | { ok: true, recall: object }>}
   */
  const handleLoadWorkspaceSnapshot = useCallback(
    async (id) => {
      const recall = await loadWorkHistorySnapshotForRecall({ api, snapshotId: id });
      if (!recall.ok) {
        alert(`History 작업을 불러오지 못했습니다.\n${recall.message}`);
        return { ok: false };
      }
      const { snapshot } = recall;
      const s = snapshot.state ?? null;
      setDataset?.(recall.records);

      let hydratedBalls = null;
      let restoredTarget = null;
      if (s) {
        setAdminState(s.adminState);
        // Phase 3: Role Ball3 restore — snapshot.target → UI balls.target (no color→field).
        hydratedBalls = hydrateBallsStateForUi(s.ballsState);
        actions.restoreShotEditor(s.shotEditor);
        restoredTarget = normalizeAdminTargetBall(s.targetBall);
      } else if (recall.authoredRecord) {
        hydratedBalls = hydrateBallsStateForUi(recall.authoredRecord.balls);
        restoredTarget = normalizeAdminTargetBall(recall.authoredRecord.targetBall);
      }
      if (hydratedBalls) setBallsState(hydratedBalls);
      setIsSaved(false);
      setIsAdminPublishedSearchMatched(false);
      // Load → immediately editable (Undo/Recall model; no Reset gate).
      setIsAdminInputSessionActive(true);
      // Explicit Target Lock hydrate — no stale previous lock.
      setTargetColor(restoredTarget);
      setIsTargetSelected(restoredTarget != null);

      // Edit Source for Cue-Only Edit Snap (Authoring session state only).
      try {
        if (hydratedBalls?.cue) {
          const ball3 = normalizeBallsToBall3(hydratedBalls);
          setEditSourceContext(buildEditSourceContext(snapshot.id, ball3, recall.records));
        } else {
          setEditSourceContext(null);
        }
      } catch (e) {
        console.warn("Failed to build edit source context", e);
        setEditSourceContext(null);
      }

      console.log("📂 History restored:", snapshot.name, recall.entry.status);
      if (recall.entry.status !== "PENDING") alert(`복원 완료: ${snapshot.name}`);
      return { ok: true, recall };
    },
    [
      api,
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

  /** Deletes History records only (file + index). Published data is never touched. */
  const handleDeleteWorkspaceSnapshot = useCallback(
    async (idOrIds) => {
      if (!idOrIds) return { ok: false };
      const snapshotIds = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
      const removed = await api.remove({ snapshotIds });
      if (!removed.ok) {
        alert(`History 삭제 실패\n${removed.message}\n아무 기록도 삭제하지 않았습니다.`);
      }
      await refreshWorkspaceHistory();
      return removed;
    },
    [api, refreshWorkspaceHistory]
  );

  /**
   * Phase D-3: History Publish — sole official deployment action.
   * Input = the APPROVED graph stored in each selected D History snapshot
   * (legacy rows: flat PublishFamilyPayload) → normalized repo write → Git
   * commit/push → Production semantic verify.
   * SUCCESS only when status === PRODUCTION_VERIFIED; then the snapshots are
   * marked PUBLISHED in the History and the alert adds the Published 현황.
   * Failure keeps every History snapshot unchanged for retry.
   * Does not open folder picker.
   */
  const handlePublishSnapshots = useCallback(async (ids) => {
    /** @type {{ ok: boolean, successfulIds: string[], reason?: string }} */
    const emptyFail = { ok: false, successfulIds: [] };
    if (!ids?.length) return emptyFail;
    if (publishInFlightRef.current) {
      return { ok: false, successfulIds: [], reason: "publish-in-flight" };
    }

    publishInFlightRef.current = true;
    setPublishInFlight(true);

    try {
      // Publish input = what the History recorded; never rebuilt from the screen.
      const input = await loadPublishItemsFromWorkHistory({ api, ids });
      if (!input.ok) {
        alert(
          `Publish가 완료되지 않았습니다.\n` +
            `History를 읽지 못했습니다.\n${input.message}\n` +
            `Published 완료로 표시하지 않았습니다.`
        );
        return { ok: false, successfulIds: [], reason: input.code };
      }
      const { items, blocked } = input;

      if (items.length === 0) {
        alert(
          `Publish가 완료되지 않았습니다.\n` +
            `검증 단계에서 실패했습니다.\n` +
            blocked.map(formatPublishBlockedLine).join("\n") +
            `\nPublished 완료로 표시하지 않았습니다.`
        );
        return { ok: false, successfulIds: [], reason: "validation-blocked" };
      }
      const blockedLines = blocked.length
        ? ["Publish하지 않은 항목:", ...blocked.map(formatPublishBlockedLine)]
        : [];

      const firstTimed = await timePublishCall(() => publishDatasetToLocalRepoWithGit(items));
      const result = firstTimed.result;

      // Phase F-2E: resolvable same-slot occupancy → user confirmation → Family replacement.
      if (
        !result.ok &&
        result.hostAvailable &&
        (result.reason === "resolvable-publish-overwrite" ||
          result.status === "RESOLVABLE_PUBLISH_OVERWRITE")
      ) {
        const conflict = result.conflict;
        const leafRevision = result.leafRevision;
        const slot = conflict?.authoredSourceSlot || "S1";
        const confirmed = window.confirm(
          `컴퓨터에 저장된 데이터에 동일한 Position의 ${slot} 전략이 이미 있습니다.\n\n` +
            `덮어쓰면 기존 Published Family가 현재 데이터로 교체됩니다.\n\n` +
            `기존 ${slot} 전략을 현재 데이터로 덮어쓰시겠습니까?`
        );
        if (!confirmed) {
          // Cancel: zero write / History snapshot unchanged.
          return {
            ok: false,
            successfulIds: [],
            reason: "publish-overwrite-cancelled",
          };
        }
        if (!conflict?.existingFamilyId || !leafRevision) {
          alert(
            `Publish가 완료되지 않았습니다.\n` +
              `덮어쓰기 확인에 필요한 정보가 부족합니다.\n` +
              `Published 완료로 표시하지 않았습니다.`
          );
          return {
            ok: false,
            successfulIds: [],
            reason: "confirmed-overwrite-incomplete",
          };
        }

        const retryItems = items.map((it) => ({
          ...it,
          confirmedOverwrite: {
            targetFamilyId: conflict.existingFamilyId,
            expectedLeafRevision: leafRevision,
          },
        }));
        const retryTimed = await timePublishCall(() =>
          publishDatasetToLocalRepoWithGit(retryItems)
        );
        const retry = retryTimed.result;
        if (retry.ok && retry.status === "PRODUCTION_VERIFIED") {
          /** @type {string[]} */
          const successfulIds = retryItems.map((it) => it.snapshotId);
          for (const it of retryItems) {
            refreshPublishedDataset(it.shotType, it.systemId);
          }
          refreshPublishedDataset();
          const marked = await api.markPublished({ snapshotIds: successfulIds, commit: retry.commit ?? null });
          await refreshWorkspaceHistory();
          const markedOk = marked.ok;
          const sha = retry.commit ? `HEAD: ${retry.commit.slice(0, 7)}\n` : "";
          const statusText = buildPublishSuccessStatusText({
            leafSummaries: retry.leafSummaries,
            elapsedMs: retryTimed.elapsedMs,
            blockedLines,
          });
          const markLine = markedOk ? "" : `${PUBLISHED_MARK_FAILED_LINE}\n`;
          if (retry.gitStatus === "VERIFIED_NO_CHANGE") {
            alert(
              `Publish 완료\n` +
                `기존 전략을 덮어썼습니다.\n` +
                `저장소에 추가 변경은 없었습니다.\n` +
                `Published 데이터 검증까지 완료되었습니다.\n` +
                markLine +
                sha +
                statusText
            );
          } else {
            alert(
              `Publish 완료\n` +
                `기존 전략을 덮어썼습니다.\n` +
                `Published 데이터 검증까지 완료되었습니다.\n` +
                markLine +
                sha +
                statusText
            );
          }
          return { ok: true, successfulIds };
        }

        const retryStatus =
          retry.production?.status ?? retry.status ?? retry.reason ?? "";
        const retryStage = formatPublishFailureStage(retry);
        const retryHint = formatPublishRetryHint(retry);
        alert(
          [
            "Publish가 완료되지 않았습니다.",
            "덮어쓰기 확인 후 재시도에서 실패했습니다.",
            retryStage,
            retry.reason ? `원인: ${retry.reason}` : "",
            Array.isArray(retry.issues) && retry.issues.length > 0
              ? retry.issues.slice(0, 12).join("\n")
              : "",
            retryStatus && retryStatus !== retry.reason
              ? `상태: ${retryStatus}`
              : "",
            "Published 완료로 표시하지 않았습니다.",
            "History의 작업 기록은 그대로 보존했습니다.",
            retryHint,
          ]
            .filter(Boolean)
            .join("\n")
        );
        return {
          ok: false,
          successfulIds: [],
          reason: String(retry.reason ?? retry.status ?? "publish-failed"),
        };
      }

      if (!result.hostAvailable) {
        alert(
          `Publish가 완료되지 않았습니다.\n` +
            `Publish 환경을 사용할 수 없습니다.\n` +
            `${result.message ?? result.reason ?? ""}\n` +
            `관리자 컴퓨터의 개발 서버(localhost)에서만 Publish할 수 있습니다.\n` +
            `Published 완료로 표시하지 않았습니다.`
        );
        return {
          ok: false,
          successfulIds: [],
          reason: "LOCAL_PUBLISH_HOST_UNAVAILABLE",
        };
      }

      // Strict SUCCESS: PRODUCTION_VERIFIED only.
      if (result.ok && result.status === "PRODUCTION_VERIFIED") {
        /** @type {string[]} */
        const successfulIds = items.map((it) => it.snapshotId);
        for (const it of items) {
          refreshPublishedDataset(it.shotType, it.systemId);
        }
        refreshPublishedDataset();
        const marked = await api.markPublished({ snapshotIds: successfulIds, commit: result.commit ?? null });
        await refreshWorkspaceHistory();
        const markedOk = marked.ok;
        const sha = result.commit ? `HEAD: ${result.commit.slice(0, 7)}\n` : "";
        const statusText = buildPublishSuccessStatusText({
          leafSummaries: result.leafSummaries,
          elapsedMs: firstTimed.elapsedMs,
          blockedLines,
        });
        const markLine = markedOk ? "" : `${PUBLISHED_MARK_FAILED_LINE}\n`;
        if (result.gitStatus === "VERIFIED_NO_CHANGE") {
          alert(
            `Publish 완료\n` +
              `저장소에 추가 변경은 없었습니다.\n` +
              `Published 데이터 검증까지 완료되었습니다.\n` +
              markLine +
              sha +
              statusText
          );
        } else {
          alert(
            `Publish 완료\n` +
              `Published 데이터 검증까지 완료되었습니다.\n` +
              markLine +
              sha +
              statusText
          );
        }
        return { ok: true, successfulIds };
      }

      const prodStatus =
        result.production?.status ?? result.status ?? result.reason ?? "";
      const stageLabel = formatPublishFailureStage(result);
      const retryHint = formatPublishRetryHint(result);

      const failLines = [
        "Publish가 완료되지 않았습니다.",
        stageLabel,
        result.reason ? `원인: ${result.reason}` : "",
        Array.isArray(result.issues) && result.issues.length > 0
          ? result.issues.slice(0, 12).join("\n")
          : "",
        result.localCommit
          ? "Git commit은 있을 수 있지만 Publish는 완료되지 않았습니다. 자동 되돌리기는 하지 않습니다."
          : "",
        result.repoWritten && !result.localCommit
          ? "저장소 파일은 쓰여졌을 수 있지만 Git/배포 확인은 완료되지 않았습니다."
          : "",
        prodStatus && prodStatus !== result.reason
          ? `상태: ${prodStatus}`
          : "",
        "Published 완료로 표시하지 않았습니다.",
        "History의 작업 기록은 그대로 보존했습니다.",
        retryHint,
        ...blockedLines,
      ]
        .filter(Boolean)
        .join("\n");

      alert(failLines);
      return {
        ok: false,
        successfulIds: [],
        reason: String(result.reason ?? result.status ?? "publish-failed"),
      };
    } finally {
      publishInFlightRef.current = false;
      setPublishInFlight(false);
    }
  }, [api, refreshWorkspaceHistory]);

  return {
    workHistoryApi: api,
    workspaceHistory,
    historyError,
    showHistoryModal,
    setShowHistoryModal,
    commitWorkspaceHistoryWithStrategyDataset,
    finalizeDerivedApprovalHistory,
    refreshWorkspaceHistory,
    handleLoadWorkspaceSnapshot,
    handleDeleteWorkspaceSnapshot,
    handlePublishSnapshots,
    publishInFlight,
    editSourceContext,
    clearEditSourceContext,
  };
}

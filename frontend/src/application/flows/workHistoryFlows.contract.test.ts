/**
 * SAVE / Derived Approve / F5 recovery / cancel / recall / Publish input / OVERWRITE
 * against the D History store only — browser storage stays empty.
 *
 * A1  New SAVE → PENDING snapshot (History failure → SAVE not successful)
 * A2  Approve → same snapshot APPROVED (failure → stays PENDING, nothing shown as success)
 * A5  Recall / Publish read one snapshot
 * A9  Cancel removes only the PENDING snapshot
 * A10 F5 → PENDING found → resume rebuilds the review / cancel removes it
 * B11–B14 No LocalDB / workspace_history / recovery key read or write on success paths
 * C21 OVERWRITE after History recall keeps Member ids / coordinates / lineage
 * C22 New SAVE is not publishable before approval
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PendingSaveRecoveryPrompt from "../../components/PendingSaveRecoveryPrompt.jsx";
import { runCanonicalSave, type HistoryFlowContext } from "./historyFlow";
import { commitDerivedApprovalDataset } from "./derivedApprovalFlow";
import { cancelPendingNewFamilySave } from "./pendingSaveCancelFlow";
import {
  inspectPendingWorkHistory,
  rebuildPendingNewFamilyReview,
  startNewFamilyDerivedReview,
} from "./pendingSaveRecoveryFlow";
import {
  approveUnifiedDerivedReview,
  createUnifiedDerivedReview,
} from "../../domain/family/unifiedDerivedReview";
import { buildOverwriteRecallContext } from "../../domain/family/overwriteFamilyRoot";
import { commitSaveToWorkHistory } from "../../domain/workHistory/workHistorySaveCommit";
import { loadPublishItemsFromWorkHistory } from "../../domain/workHistory/workHistoryPublishInput";
import { loadWorkHistorySnapshotForRecall } from "../../domain/workHistory/workHistoryRecall";
import type { WorkHistoryApi } from "../../domain/workHistory/workHistoryClient";
import {
  collinearCueBalls,
  createInProcessWorkHistoryApi,
  createMemoryStorage,
  HIT_TOLERANCE,
  makeTempRepoRoot,
  PATH_C4,
  removeTempRepoRoots,
  type MemoryStorage,
} from "../../domain/workHistory/workHistoryTestFixtures";
import type { PositionRecord } from "../../domain/positionSearchEngine";
import type { PublishOperation } from "../../domain/publishOperation";

const __dirname = dirname(fileURLToPath(import.meta.url));

const LEGACY_KEYS = [
  "normalized_dataset",
  "positions_dataset",
  "positions_dataset_meta",
  "family_masters",
  "family_members",
  "workspace_history",
  "pending_new_family_save_recovery_v1",
];

let storage: MemoryStorage;
let api: WorkHistoryApi;

beforeEach(() => {
  storage = createMemoryStorage();
  vi.stubGlobal("localStorage", storage);
  api = createInProcessWorkHistoryApi(makeTempRepoRoot());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  removeTempRepoRoots();
});

function expectNoLegacyStorage() {
  for (const k of LEGACY_KEYS) expect(storage.touchedKeys.has(k)).toBe(false);
  expect(storage.length).toBe(0);
  expect(storage.clearCalls).toBe(0);
}

const baseBalls = collinearCueBalls(20);

function slotsFor(inputs: Record<string, number>, identity: Record<string, unknown> = {}) {
  const slotSys = { systemId: "5_half_system", track: "B2T_L", inputs, outputs: { result: { ...inputs } } };
  return {
    S1: {
      draft: { sys: slotSys, hpt: { T: "-3/8" }, ...identity },
      applied: { sys: slotSys, hpt: { T: "-3/8" }, str: { speed: 2 }, ai: {}, ...identity },
    },
  };
}

function adminStateFor(inputs: Record<string, number>) {
  return {
    sys: {
      system: "5_half_system",
      systemId: "5_half_system",
      system_id: "5_half_system",
      shotType: "뒤돌리기",
      track: "B2T_L",
      inputs,
      system_values: inputs,
      corrections: { slide: 0, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
    },
    hpt: { T: "-3/8" },
  };
}

const STATE = {
  adminState: { sys: { system_id: "5_half_system", shotType: "뒤돌리기" } },
  ballsState: baseBalls,
  shotEditor: { activeSlot: "S1", slots: {} },
  targetBall: "yellow",
};

function historyCommit(target: WorkHistoryApi) {
  return (
    updated: PositionRecord[],
    _override: unknown,
    op: PublishOperation | null | undefined,
    options?: {
      mode?: "PENDING_DERIVED_APPROVAL" | "OVERWRITE_PRESERVED" | "IMMEDIATE";
      authoredPathNodes?: unknown[];
    }
  ) =>
    commitSaveToWorkHistory({
      api: target,
      updated,
      publishOperation: op ?? null,
      mode: options?.mode ?? "IMMEDIATE",
      state: STATE,
      systemId: "5_half_system",
      pattern: "뒤돌리기",
      authoredPathNodes: (options?.authoredPathNodes as never) ?? PATH_C4,
    }).then((r) => (r.ok ? { ok: true as const, snapshotId: r.entry.snapshotId } : { ok: false as const, reason: r.code }));
}

function buildCtx(overrides: Partial<HistoryFlowContext> = {}): HistoryFlowContext {
  const inputs = { CO_f: 30, C1_f: 10, C3_r: 20 };
  return {
    dataset: [],
    ballsState: baseBalls,
    adminState: adminStateFor(inputs),
    activeSlot: "S1",
    slots: slotsFor(inputs),
    targetColor: "yellow",
    aiOverride: null,
    system: "5_half_system",
    resolvedSlotSysValues: inputs,
    autoSave: false,
    editSource: null,
    saveCommand: "SAVE",
    setDataset: vi.fn(),
    setUserPublishedSearchContext: vi.fn(),
    setAdminState: vi.fn(),
    patchSlotRuntimeMeta: vi.fn(),
    patchSlotFamilyIdentity: vi.fn(),
    saveToFile: vi.fn(),
    resolveFormulaHash: () => "v1",
    resolveEvalProfile: () => ({ formula: { expr: "C3_r = CO_f - C1_f" } }),
    resolveAnchorsData: () => ({ trajectories: { B2T_L: { anchors: [{ id: "a1" }] } }, meta: {} }),
    canUseSystemControls: true,
    commitWorkspaceHistoryWithStrategyDataset: historyCommit(api) as never,
    authoredPathNodes: PATH_C4,
    ...overrides,
  } as HistoryFlowContext;
}

async function saveNew() {
  const saved = await runCanonicalSave(buildCtx());
  expect(saved.ok).toBe(true);
  if (!saved.ok || !saved.updated || !saved.familyId || !saved.historySnapshotId) {
    throw new Error("save failed");
  }
  expect(saved.historyMode).toBe("PENDING_DERIVED_APPROVAL");
  expect(saved.pendingNewFamilySave).toEqual({
    historySnapshotId: saved.historySnapshotId,
    familyId: saved.familyId,
  });
  return { familyId: saved.familyId, snapshotId: saved.historySnapshotId, updated: saved.updated };
}

async function approve(saved: { familyId: string; snapshotId: string; updated: PositionRecord[] }) {
  const review = createUnifiedDerivedReview({
    dataset: saved.updated,
    familyId: saved.familyId,
    authoredPathNodes: PATH_C4,
    hitTolerance: HIT_TOLERANCE,
  });
  if (!review.ok) throw new Error(review.reason);
  const approved = approveUnifiedDerivedReview({ dataset: saved.updated, bag: review.bag });
  if (!approved.ok) throw new Error(approved.reason);
  const setDataset = vi.fn();
  const commit = await commitDerivedApprovalDataset({
    resultDataset: approved.dataset,
    familyId: saved.familyId,
    baselineSnapshot: null,
    setDataset,
    restoreDerivedReviewSnapshot: vi.fn(),
    finalizeHistory: ({ graph }) => api.approve({ snapshotId: saved.snapshotId, graph }),
  });
  return { commit, setDataset, approvedDataset: approved.dataset };
}

describe("A1 / A2 — SAVE and Derived Approve write only the D History", () => {
  it("SAVE creates a PENDING snapshot; LocalDB keys are never touched", async () => {
    const saved = await saveNew();
    const listed = await api.list();
    expect(listed.ok && listed.entries).toHaveLength(1);
    if (!listed.ok) return;
    expect(listed.entries[0]).toMatchObject({
      snapshotId: saved.snapshotId,
      status: "PENDING",
      familyId: saved.familyId,
      publishable: false,
    });
    const read = await api.read(saved.snapshotId);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.snapshot.pendingFamilyGraph?.familyId).toBe(saved.familyId);
    expect(read.snapshot.authoredPathNodes).toEqual(PATH_C4);
    expectNoLegacyStorage();
  });

  it("History write failure → SAVE not successful, in-memory dataset restored", async () => {
    const failing: WorkHistoryApi = {
      ...api,
      createPending: async () => ({ ok: false, code: "WRITE_FAILED", message: "x" }),
    };
    const setDataset = vi.fn();
    const alert = vi.fn();
    vi.stubGlobal("alert", alert);
    const before: PositionRecord[] = [];
    const saved = await runCanonicalSave(
      buildCtx({ dataset: before, setDataset, commitWorkspaceHistoryWithStrategyDataset: historyCommit(failing) as never })
    );
    expect(saved.ok).toBe(false);
    expect(saved.pendingNewFamilySave).toBeUndefined();
    expect(setDataset).toHaveBeenLastCalledWith(before);
    const listed = await api.list();
    expect(listed.ok && listed.entries).toEqual([]);
    for (const k of LEGACY_KEYS) expect(storage.touchedKeys.has(k)).toBe(false);
  });

  it("Approve turns the same snapshot APPROVED; C22 PENDING blocked before that", async () => {
    const saved = await saveNew();
    const before = await loadPublishItemsFromWorkHistory({ api, ids: [saved.snapshotId] });
    expect(before.ok).toBe(true);
    if (!before.ok) return;
    expect(before.items).toEqual([]);
    expect(before.blocked.map((b) => b.reason)).toEqual(["derived-approval-pending"]);

    const { commit, setDataset, approvedDataset } = await approve(saved);
    expect(commit.ok).toBe(true);
    expect(commit.historyOk).toBe(true);
    expect(setDataset).toHaveBeenCalledWith(approvedDataset);

    const listed = await api.list();
    expect(listed.ok && listed.entries).toHaveLength(1);
    if (!listed.ok) return;
    expect(listed.entries[0]).toMatchObject({ snapshotId: saved.snapshotId, status: "APPROVED", publishable: true });
    expect(listed.entries[0].derivedCount).toBeGreaterThan(0);

    const after = await loadPublishItemsFromWorkHistory({ api, ids: [saved.snapshotId] });
    expect(after.ok && after.items).toHaveLength(1);
    if (after.ok) expect(after.items[0].publishFamilyGraph?.familyId).toBe(saved.familyId);
    expectNoLegacyStorage();
  });

  it("Approve failure → snapshot stays PENDING, dataset untouched, not successful", async () => {
    const saved = await saveNew();
    const review = createUnifiedDerivedReview({
      dataset: saved.updated,
      familyId: saved.familyId,
      authoredPathNodes: PATH_C4,
      hitTolerance: HIT_TOLERANCE,
    });
    if (!review.ok) throw new Error(review.reason);
    const approved = approveUnifiedDerivedReview({ dataset: saved.updated, bag: review.bag });
    if (!approved.ok) throw new Error(approved.reason);
    const setDataset = vi.fn();
    const commit = await commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      familyId: saved.familyId,
      baselineSnapshot: null,
      setDataset,
      restoreDerivedReviewSnapshot: vi.fn(),
      finalizeHistory: async () => ({ ok: false, code: "WRITE_FAILED", message: "x" }),
    });
    expect(commit.ok).toBe(false);
    expect(commit.historyOk).toBe(false);
    expect(setDataset).not.toHaveBeenCalled();
    const read = await api.read(saved.snapshotId);
    expect(read.ok && read.entry.status).toBe("PENDING");
    for (const k of LEGACY_KEYS) expect(storage.touchedKeys.has(k)).toBe(false);
  });

  it("Approve without a History snapshot is refused (nowhere to store the graph)", async () => {
    const saved = await saveNew();
    const review = createUnifiedDerivedReview({
      dataset: saved.updated,
      familyId: saved.familyId,
      authoredPathNodes: PATH_C4,
      hitTolerance: HIT_TOLERANCE,
    });
    if (!review.ok) throw new Error(review.reason);
    const approved = approveUnifiedDerivedReview({ dataset: saved.updated, bag: review.bag });
    if (!approved.ok) throw new Error(approved.reason);
    const setDataset = vi.fn();
    const commit = await commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      familyId: saved.familyId,
      baselineSnapshot: null,
      setDataset,
      restoreDerivedReviewSnapshot: vi.fn(),
    });
    expect(commit.ok).toBe(false);
    expect(setDataset).not.toHaveBeenCalled();
  });
});

describe("A9 / A10 — cancel and F5 recovery from the D History", () => {
  it("F5: PENDING snapshot found → resume rebuilds the same review with empty browser storage", async () => {
    const saved = await saveNew();
    const found = await inspectPendingWorkHistory(api);
    expect(found.kind).toBe("RECOVERABLE");
    if (found.kind !== "RECOVERABLE") return;
    expect(found.token).toEqual({ historySnapshotId: saved.snapshotId, familyId: saved.familyId });

    const rebuilt = await rebuildPendingNewFamilyReview({
      api,
      snapshotId: saved.snapshotId,
      hitTolerance: HIT_TOLERANCE,
    });
    expect(rebuilt.ok).toBe(true);
    if (!rebuilt.ok) return;
    expect(rebuilt.bag.familyId).toBe(saved.familyId);
    expect(rebuilt.historySnapshotId).toBe(saved.snapshotId);
    expect(rebuilt.authoredPathNodes).toEqual(PATH_C4);
    expect(rebuilt.rowState).toEqual(STATE);
    const ids = new Set(
      rebuilt.dataset.flatMap((r) => Object.values(r.strategies ?? {})).map((e) => e?.familyId)
    );
    expect(ids.has(saved.familyId)).toBe(true);
    expectNoLegacyStorage();
  });

  it("F5 → [새 SAVE 취소] removes only the PENDING snapshot and blocks Publish", async () => {
    const other = await saveNew();
    await approve(other);
    const saved = await saveNew();
    const found = await inspectPendingWorkHistory(api);
    expect(found.kind === "RECOVERABLE" && found.token.historySnapshotId).toBe(saved.snapshotId);
    if (found.kind !== "RECOVERABLE") return;

    const cancelled = await cancelPendingNewFamilySave(found.token, api);
    expect(cancelled.ok).toBe(true);
    const listed = await api.list();
    expect(listed.ok && listed.entries.map((e) => e.snapshotId)).toEqual([other.snapshotId]);
    const publish = await loadPublishItemsFromWorkHistory({ api, ids: [saved.snapshotId] });
    expect(publish.ok && publish.items).toEqual([]);
    expect((await inspectPendingWorkHistory(api)).kind).toBe("NONE");
    expectNoLegacyStorage();
  });

  it("cancel failure is reported, snapshot kept PENDING", async () => {
    const saved = await saveNew();
    const failing: WorkHistoryApi = {
      ...api,
      cancelPending: async () => ({ ok: false, code: "WRITE_FAILED", message: "x" }),
    };
    const cancelled = await cancelPendingNewFamilySave(
      { historySnapshotId: saved.snapshotId, familyId: saved.familyId },
      failing
    );
    expect(cancelled.ok).toBe(false);
    const read = await api.read(saved.snapshotId);
    expect(read.ok && read.entry.status).toBe("PENDING");
  });

  it("an APPROVED snapshot cannot be cancelled as a new SAVE", async () => {
    const saved = await saveNew();
    await approve(saved);
    const cancelled = await cancelPendingNewFamilySave(
      { historySnapshotId: saved.snapshotId, familyId: saved.familyId },
      api
    );
    expect(cancelled.ok).toBe(false);
    expect((await api.read(saved.snapshotId)).ok).toBe(true);
  });

  it("review start failure right after SAVE removes the PENDING snapshot", async () => {
    const saved = await saveNew();
    const started = await startNewFamilyDerivedReview({
      token: { historySnapshotId: saved.snapshotId, familyId: saved.familyId },
      dataset: [],
      authoredPathNodes: PATH_C4,
      api,
    });
    expect(started.ok).toBe(false);
    if (started.ok) return;
    expect(started.revert.ok).toBe(true);
    const listed = await api.list();
    expect(listed.ok && listed.entries).toEqual([]);
  });
});

describe("A5 / C21 — recall one snapshot, then OVERWRITE keeps Members", () => {
  it("recall restores the approved graph from one snapshot; OVERWRITE preserves Member identity", async () => {
    const saved = await saveNew();
    await approve(saved);
    const recall = await loadWorkHistorySnapshotForRecall({ api, snapshotId: saved.snapshotId });
    expect(recall.ok).toBe(true);
    if (!recall.ok || !recall.authoredRecord || !recall.authoredMember) return;
    expect(recall.familyId).toBe(saved.familyId);
    const original = recall.snapshot.publishFamilyGraph!;
    const recalledMemberIds = new Set(
      recall.records.flatMap((r) => Object.values(r.strategies ?? {})).map((e) => e?.memberId)
    );
    for (const m of original.members) expect(recalledMemberIds.has(m.memberId)).toBe(true);

    const inputs = { CO_f: 36, C1_f: 10, C3_r: 26 };
    const identity = {
      familyId: saved.familyId,
      memberId: recall.authoredMember.memberId,
      memberOrigin: "AUTHORED",
    };
    const result = await runCanonicalSave(
      buildCtx({
        dataset: recall.records,
        ballsState: recall.authoredRecord.balls,
        adminState: adminStateFor(inputs),
        slots: slotsFor(inputs, identity),
        resolvedSlotSysValues: inputs,
        saveCommand: "OVERWRITE",
        editingLocalFamilyId: saved.familyId,
        overwriteRecallContext: buildOverwriteRecallContext({
          source: "LOCAL",
          record: recall.authoredRecord,
          slot: recall.authoredMember.sourceSlot,
        }),
      })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.historyMode).toBe("OVERWRITE_PRESERVED");
    expect(result.historySnapshotId).toBeTruthy();
    const next = await api.read(result.historySnapshotId!);
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.entry.status).toBe("APPROVED");
    const graph = next.snapshot.publishFamilyGraph!;
    const key = (m: (typeof graph.members)[number]) =>
      JSON.stringify([m.memberId, m.balls, m.memberOrigin, m.generatedFromMemberId ?? null, m.sourceSlot]);
    expect(graph.members.map(key).sort()).toEqual(original.members.map(key).sort());
    expect(graph.master).not.toEqual(original.master);
    expect(next.entry.derivedCount).toBe(
      (await api.read(saved.snapshotId)).ok ? recall.snapshot.derivedApproval?.derivedCount : -1
    );
    expectNoLegacyStorage();
  });
});

describe("App wiring — SAVE / cancel / approve / F5 go through the D History", () => {
  const APP = readFileSync(join(__dirname, "../../App.jsx"), "utf8");
  const body = (name: string) => {
    const start = APP.indexOf(`async function ${name}(`);
    expect(start, name).toBeGreaterThan(0);
    return APP.slice(start, APP.indexOf("\n  }\n", start));
  };

  it("only the new-SAVE handler arms the cancel revert; OVERWRITE does not", () => {
    expect(body("handleCanonicalRightPanelSave")).toContain("pendingNewFamilySave");
    expect(body("handleCanonicalOverwrite")).not.toContain("pendingNewFamilySave");
    const cancel = body("handleCancelDerivedReview");
    expect(cancel).toContain("cancelPendingNewFamilySave(pendingSave.token, workHistoryApi)");
    expect(cancel).toContain("describePendingSaveCancelFailure");
    expect(cancel).toMatch(/if \(!reverted \|\| !reverted\.ok\) \{/);
    expect(body("handleApproveDerivedReview")).not.toContain("cancelPendingNewFamilySave");
    expect(body("handleApproveDerivedReview")).toContain("finalizeDerivedApprovalHistory(historySnapshotId, graph)");
  });

  it("review-start failure after a new SAVE reverts it and tells the user", () => {
    expect(body("openUnifiedDerivedPreview")).toContain("startNewFamilyDerivedReview");
    expect(body("openUnifiedDerivedPreview")).toContain("describeNewFamilyReviewStartFailure");
  });

  it("F5 recovery reads the D History and shows [파생 승인 재개] / [새 SAVE 취소]", () => {
    expect(APP).toContain("inspectPendingWorkHistory(workHistoryApi)");
    expect(APP).toContain("<PendingSaveRecoveryPrompt");
    expect(body("handleResumePendingSaveRecovery")).toContain("rebuildPendingNewFamilyReview");
    const html = renderToStaticMarkup(
      createElement(PendingSaveRecoveryPrompt, {
        open: true,
        familyId: "fm_x",
        onResume: () => {},
        onCancelSave: () => {},
      })
    );
    expect(html).toContain("파생 승인 재개");
    expect(html).toContain("새 SAVE 취소");
    expect(html).not.toContain("로컬");
    expect(
      renderToStaticMarkup(
        createElement(PendingSaveRecoveryPrompt, { open: false, onResume: () => {}, onCancelSave: () => {} })
      )
    ).toBe("");
  });
});

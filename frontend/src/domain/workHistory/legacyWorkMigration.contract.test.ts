/**
 * Legacy browser work data (LocalDB + workspace_history + recovery record) →
 * D History migration.
 *
 * D25 IDs / counts / status / graph match after migration
 * D26 write or verify failure → legacy browser data untouched, short notice
 * D27 re-run never duplicates
 * D28 empty legacy data → safe no-op
 * D29 the QuotaExceededError PENDING case (PENDING row without graph + base
 *     Family in LocalDB + recovery record) is preserved and resumable
 * UX  migration runs only after the admin confirms; never at load by itself
 *
 * Memory storage + temp folders only. Real browser data / .workspace-data untouched.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyzeLegacyWorkData,
  detectLegacyWorkData,
  LEGACY_MIGRATION_FAILED_MESSAGE,
  LEGACY_WORK_STORAGE_KEYS,
  runLegacyWorkMigration,
} from "./legacyWorkMigration";
import type { WorkHistoryApi } from "./workHistoryClient";
import {
  buildSampleWork,
  collinearCueBalls,
  createInProcessWorkHistoryApi,
  createMemoryStorage,
  createOperation,
  HIT_TOLERANCE,
  makeTempRepoRoot,
  PATH_C4,
  removeTempRepoRoots,
  SAMPLE_STATE,
  type MemoryStorage,
} from "./workHistoryTestFixtures";
import { persistWorkingCorpusNormalizedAuthority } from "../dataset/infra/persistWorkingCorpusNormalizedAuthority";
import { rebuildPendingNewFamilyReview } from "../../application/flows/pendingSaveRecoveryFlow";
import { approveUnifiedDerivedReview } from "../family/unifiedDerivedReview";
import { buildPublishFamilyGraphFromRecords } from "../publishFamilyGraph";
import type { PositionRecord } from "../positionSearchEngine";
import LegacyWorkMigrationPrompt from "../../components/LegacyWorkMigrationPrompt";

const __dirname = dirname(fileURLToPath(import.meta.url));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  removeTempRepoRoots();
});

const ID_PUBLISHED = "0f5c2d1e-1111-4a2b-9c3d-000000000001";
const ID_APPROVED = "0f5c2d1e-2222-4a2b-9c3d-000000000002";
const ID_PENDING = "0f5c2d1e-3333-4a2b-9c3d-000000000003";
const ID_OLD = "0f5c2d1e-4444-4a2b-9c3d-000000000004";

const approvedWork = buildSampleWork("fm_mig_approved", "mb_mig_approved", collinearCueBalls(20));
const pendingWork = buildSampleWork("fm_mig_pending", "mb_mig_pending", collinearCueBalls(26));
const orphanDerived = buildSampleWork("fm_mig_orphan_d", "mb_mig_orphan_d", collinearCueBalls(32));
const orphanBase = buildSampleWork("fm_mig_orphan_b", "mb_mig_orphan_b", collinearCueBalls(38));

const OTHER_KEYS = {
  ONE_POINT_LESSON_LIBRARY_V1: '[{"text":"keep"}]',
  ANCHORS_OVERRIDE_V1: '{"keep":true}',
};

function row(id: string, extra: Record<string, unknown>) {
  return {
    id,
    name: `뒤돌리기_5_half_system_v00${id.slice(-1)}_2026-09-30`,
    systemId: "5_half_system",
    pattern: "뒤돌리기",
    version: Number(id.slice(-1)),
    timestamp: `2026-09-2${id.slice(-1)}T00:00:00.000Z`,
    exported: false,
    state: SAMPLE_STATE,
    ...extra,
  };
}

function legacyEnvelopeRaw(records: PositionRecord[]): string {
  const tmp = createMemoryStorage();
  vi.stubGlobal("localStorage", tmp);
  const r = persistWorkingCorpusNormalizedAuthority({
    dataset: records,
    shotType: "뒤돌리기",
    systemId: "5_half_system",
  });
  vi.unstubAllGlobals();
  if (!r.ok) throw new Error(`${r.stage}: ${r.reason}`);
  return tmp.getItem("normalized_dataset")!;
}

function recoveryRaw(snapshotId: string, familyId: string, nodes = PATH_C4) {
  return JSON.stringify({
    schemaVersion: 1,
    kind: "PENDING_NEW_FAMILY_SAVE",
    historySnapshotId: snapshotId,
    familyId,
    localDbRawBefore: null,
    localDbAfterSaveDigest: "0:abc",
    authoredPathNodes: nodes,
    createdAt: "2026-09-30T09:00:00.000Z",
  });
}

function fullLegacySeed(): Record<string, string> {
  return {
    normalized_dataset: legacyEnvelopeRaw([
      ...approvedWork.approvedRecords,
      ...pendingWork.baseRecords,
      ...orphanDerived.approvedRecords,
      ...orphanBase.baseRecords,
    ]),
    workspace_history: JSON.stringify([
      row(ID_PUBLISHED, {
        exported: true,
        publishOperation: approvedWork.publishOperation,
        publishFamilyGraph: approvedWork.approvedGraph,
        derivedApproval: { status: "APPROVED", derivedCount: approvedWork.derivedCount, source: "SAVE_APPROVE" },
      }),
      row(ID_APPROVED, {
        publishOperation: approvedWork.publishOperation,
        publishFamilyGraph: approvedWork.approvedGraph,
        derivedApproval: { status: "APPROVED", derivedCount: approvedWork.derivedCount, source: "SAVE_APPROVE" },
      }),
      row(ID_PENDING, {
        publishOperation: pendingWork.publishOperation,
        derivedApproval: { status: "PENDING", derivedCount: 0 },
      }),
      row(ID_OLD, {}),
    ]),
    pending_new_family_save_recovery_v1: recoveryRaw(ID_PENDING, pendingWork.familyId),
    positions_dataset: '[{"positionId":"stale"}]',
    positions_dataset_meta: '{"generation":3}',
    family_masters: '{"masters":{}}',
    family_members: '{"members":{}}',
    ...OTHER_KEYS,
  };
}

function idSet(members: Array<{ memberId: string }> | undefined) {
  return (members ?? []).map((m) => m.memberId).sort();
}

async function entriesById(api: WorkHistoryApi) {
  const listed = await api.list();
  if (!listed.ok) throw new Error(listed.code);
  return new Map(listed.entries.map((e) => [e.snapshotId, e]));
}

describe("D25 — migration keeps ids, counts, status and graphs", () => {
  it("rows + LocalDB-only Families land in the D History; legacy keys removed only after verify", async () => {
    const storage = createMemoryStorage(fullLegacySeed());
    const api = createInProcessWorkHistoryApi(makeTempRepoRoot());
    const result = await runLegacyWorkMigration({ storage, api });
    expect(result).toMatchObject({ ok: true, kind: "MIGRATED" });

    const entries = await entriesById(api);
    expect(entries.size).toBe(6);
    expect(entries.get(ID_PUBLISHED)).toMatchObject({ status: "PUBLISHED", familyId: approvedWork.familyId });
    expect(entries.get(ID_APPROVED)).toMatchObject({
      status: "APPROVED",
      familyId: approvedWork.familyId,
      derivedCount: approvedWork.derivedCount,
      publishable: true,
    });
    expect(entries.get(ID_PENDING)).toMatchObject({ status: "PENDING", familyId: pendingWork.familyId, publishable: false });
    expect(entries.get(ID_OLD)?.publishable).toBe(false);

    const approvedSnap = await api.read(ID_APPROVED);
    expect(approvedSnap.ok).toBe(true);
    if (approvedSnap.ok) {
      expect(approvedSnap.snapshot.publishFamilyGraph?.master.familyId).toBe(approvedWork.familyId);
      expect(idSet(approvedSnap.snapshot.publishFamilyGraph?.members)).toEqual(idSet(approvedWork.approvedGraph.members));
    }

    const pendingSnap = await api.read(ID_PENDING);
    expect(pendingSnap.ok).toBe(true);
    if (pendingSnap.ok) {
      expect(pendingSnap.snapshot.pendingFamilyGraph?.familyId).toBe(pendingWork.familyId);
      expect(idSet(pendingSnap.snapshot.pendingFamilyGraph?.members)).toEqual(idSet(pendingWork.pendingGraph.members));
      expect(pendingSnap.snapshot.authoredPathNodes).toEqual(PATH_C4);
      expect(pendingSnap.snapshot.publishFamilyGraph).toBeUndefined();
    }

    const orphans = [...entries.values()].filter((e) => e.snapshotId.startsWith("legacy-family-"));
    expect(orphans.map((e) => [e.familyId, e.status]).sort()).toEqual(
      [
        [orphanBase.familyId, "PENDING"],
        [orphanDerived.familyId, "APPROVED"],
      ].sort()
    );
    const orphanD = orphans.find((e) => e.familyId === orphanDerived.familyId)!;
    expect(orphanD.derivedCount).toBe(orphanDerived.derivedCount);
    const orphanDSnap = await api.read(orphanD.snapshotId);
    if (orphanDSnap.ok) {
      expect(idSet(orphanDSnap.snapshot.publishFamilyGraph?.members)).toEqual(idSet(orphanDerived.approvedGraph.members));
    }

    for (const k of LEGACY_WORK_STORAGE_KEYS) expect(storage.getItem(k)).toBeNull();
    for (const [k, v] of Object.entries(OTHER_KEYS)) expect(storage.getItem(k)).toBe(v);
    expect(storage.clearCalls).toBe(0);
  });

  it("analysis is read-only", () => {
    const seed = fullLegacySeed();
    const storage = createMemoryStorage(seed);
    const plan = analyzeLegacyWorkData(storage);
    expect(plan.ok).toBe(true);
    expect(storage.dump()).toEqual(seed);
  });
});

describe("D26 — failures keep legacy browser data", () => {
  it("D History write failure → legacy data byte-identical, short notice", async () => {
    const seed = fullLegacySeed();
    const storage = createMemoryStorage(seed);
    const real = createInProcessWorkHistoryApi(makeTempRepoRoot());
    const api: WorkHistoryApi = {
      ...real,
      importSnapshots: async () => ({ ok: false, code: "WRITE_FAILED", message: "x" }),
    };
    const result = await runLegacyWorkMigration({ storage, api });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe(LEGACY_MIGRATION_FAILED_MESSAGE);
    expect(LEGACY_MIGRATION_FAILED_MESSAGE).toBe("작업 데이터 이전에 실패했습니다. 기존 데이터는 보존했습니다.");
    expect(storage.dump()).toEqual(seed);
    expect((await entriesById(real)).size).toBe(0);
  });

  it("verify mismatch → legacy data kept and the imported snapshots are withdrawn", async () => {
    const seed = fullLegacySeed();
    const storage = createMemoryStorage(seed);
    const real = createInProcessWorkHistoryApi(makeTempRepoRoot());
    const api: WorkHistoryApi = {
      ...real,
      read: async (id: string) => {
        const r = await real.read(id);
        if (r.ok && id === ID_APPROVED && r.snapshot.publishFamilyGraph) {
          r.snapshot.publishFamilyGraph.members = r.snapshot.publishFamilyGraph.members.slice(1);
        }
        return r;
      },
    };
    const result = await runLegacyWorkMigration({ storage, api });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe(LEGACY_MIGRATION_FAILED_MESSAGE);
    expect(storage.dump()).toEqual(seed);
    expect((await entriesById(real)).size).toBe(0);
  });

  it("unreadable legacy History → nothing written, legacy kept", async () => {
    const seed = { ...fullLegacySeed(), workspace_history: "{broken" };
    const storage = createMemoryStorage(seed);
    const api = createInProcessWorkHistoryApi(makeTempRepoRoot());
    const result = await runLegacyWorkMigration({ storage, api });
    expect(result.ok).toBe(false);
    expect(storage.dump()).toEqual(seed);
    expect((await entriesById(api)).size).toBe(0);
  });
});

describe("D27 / D28 — idempotent and safe when empty", () => {
  it("interrupted cleanup + re-run → no duplicate snapshots, cleanup completes", async () => {
    const storage = createMemoryStorage(fullLegacySeed());
    const realRemove = storage.removeItem.bind(storage);
    let failOnce = true;
    storage.removeItem = (k: string) => {
      if (k === "workspace_history" && failOnce) {
        failOnce = false;
        throw new Error("blocked");
      }
      realRemove(k);
    };
    const api = createInProcessWorkHistoryApi(makeTempRepoRoot());
    const first = await runLegacyWorkMigration({ storage, api });
    expect(first.ok).toBe(false);
    expect((await entriesById(api)).size).toBe(6);

    const second = await runLegacyWorkMigration({ storage, api });
    expect(second.ok).toBe(true);
    expect((await entriesById(api)).size).toBe(6);
    for (const k of LEGACY_WORK_STORAGE_KEYS) expect(storage.getItem(k)).toBeNull();

    const third = await runLegacyWorkMigration({ storage, api });
    expect(third).toMatchObject({ ok: true, kind: "NOTHING" });
    expect((await entriesById(api)).size).toBe(6);
  });

  it("empty or already-empty legacy keys → no prompt, no writes", async () => {
    for (const seed of [{}, { workspace_history: "[]" }, { workspace_history: "[]", ...OTHER_KEYS }]) {
      const storage = createMemoryStorage(seed);
      expect(detectLegacyWorkData(storage).present).toBe(false);
      const api = createInProcessWorkHistoryApi(makeTempRepoRoot());
      const result = await runLegacyWorkMigration({ storage, api });
      expect(result).toMatchObject({ ok: true, kind: "NOTHING" });
      expect((await entriesById(api)).size).toBe(0);
      expect(storage.dump()).toEqual(seed);
    }
  });
});

describe("D29 — the QuotaExceededError PENDING work is not lost", () => {
  function quotaSeed(records: PositionRecord[], withRecovery = true): Record<string, string> {
    return {
      normalized_dataset: legacyEnvelopeRaw(records),
      workspace_history: JSON.stringify([
        row(ID_APPROVED, {
          publishOperation: approvedWork.publishOperation,
          publishFamilyGraph: approvedWork.approvedGraph,
          derivedApproval: { status: "APPROVED", derivedCount: approvedWork.derivedCount, source: "SAVE_APPROVE" },
        }),
        row(ID_PENDING, {
          publishOperation: createOperation(pendingWork.familyId),
          derivedApproval: { status: "PENDING", derivedCount: 0 },
        }),
      ]),
      ...(withRecovery
        ? { pending_new_family_save_recovery_v1: recoveryRaw(ID_PENDING, pendingWork.familyId) }
        : {}),
    };
  }

  it("PENDING row + base Family + recovery record → resumable PENDING snapshot → approvable", async () => {
    const storage = createMemoryStorage(
      quotaSeed([...approvedWork.approvedRecords, ...pendingWork.baseRecords])
    );
    const api = createInProcessWorkHistoryApi(makeTempRepoRoot());
    expect(detectLegacyWorkData(storage)).toMatchObject({ present: true, pendingCount: 1 });
    const result = await runLegacyWorkMigration({ storage, api });
    expect(result.ok).toBe(true);

    vi.stubGlobal("localStorage", createMemoryStorage());
    const rebuilt = await rebuildPendingNewFamilyReview({ api, snapshotId: ID_PENDING, hitTolerance: HIT_TOLERANCE });
    expect(rebuilt.ok).toBe(true);
    if (!rebuilt.ok) return;
    expect(rebuilt.bag.familyId).toBe(pendingWork.familyId);
    expect(rebuilt.authoredPathNodes).toEqual(PATH_C4);

    const approved = approveUnifiedDerivedReview({ dataset: rebuilt.dataset, bag: rebuilt.bag });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    const graph = buildPublishFamilyGraphFromRecords(approved.dataset, pendingWork.familyId, {
      shotType: "뒤돌리기",
      systemId: "5_half_system",
    });
    expect(graph.ok).toBe(true);
    if (!graph.ok) return;
    const done = await api.approve({ snapshotId: ID_PENDING, graph: graph.graph });
    expect(done.ok && done.entry.status).toBe("APPROVED");
    expect(done.ok && done.entry.derivedCount).toBeGreaterThan(0);
  });

  it("without the recovery record the PENDING work is still migrated (resume without C3+ path)", async () => {
    const storage = createMemoryStorage(
      quotaSeed([...approvedWork.approvedRecords, ...pendingWork.baseRecords], false)
    );
    const api = createInProcessWorkHistoryApi(makeTempRepoRoot());
    expect((await runLegacyWorkMigration({ storage, api })).ok).toBe(true);
    const snap = await api.read(ID_PENDING);
    expect(snap.ok).toBe(true);
    if (!snap.ok) return;
    expect(snap.entry.status).toBe("PENDING");
    expect(idSet(snap.snapshot.pendingFamilyGraph?.members)).toEqual(idSet(pendingWork.pendingGraph.members));
    expect(snap.snapshot.state).toEqual(SAMPLE_STATE);
  });

  it("derived Members left in LocalDB by a failed rollback are kept, not dropped", async () => {
    const storage = createMemoryStorage(
      quotaSeed([...approvedWork.approvedRecords, ...pendingWork.approvedRecords])
    );
    const api = createInProcessWorkHistoryApi(makeTempRepoRoot());
    expect((await runLegacyWorkMigration({ storage, api })).ok).toBe(true);
    const snap = await api.read(ID_PENDING);
    expect(snap.ok && snap.entry.status).toBe("PENDING");
    if (snap.ok) {
      expect(idSet(snap.snapshot.pendingFamilyGraph?.members)).toEqual(idSet(pendingWork.approvedGraph.members));
    }
  });
});

describe("UX — migration only after the admin confirms", () => {
  const APP = readFileSync(join(__dirname, "..", "..", "App.jsx"), "utf8");

  it("App detects legacy data on ADMIN entry but runs the migration only from the confirm handler", () => {
    expect(APP).toContain("detectLegacyWorkData(");
    expect(APP.split("runLegacyWorkMigration(").length - 1).toBe(1);
    const handler = APP.indexOf("async function handleConfirmLegacyWorkMigration");
    expect(handler).toBeGreaterThan(-1);
    expect(APP.indexOf("runLegacyWorkMigration(")).toBeGreaterThan(handler);
    expect(APP).toContain("<LegacyWorkMigrationPrompt");
  });

  it("prompt explains the move in plain words with [옮기기] / [나중에]", () => {
    const html = renderToStaticMarkup(
      React.createElement(LegacyWorkMigrationPrompt, {
        open: true,
        busy: false,
        summary: { present: true, historyRowCount: 4, familyCount: 4, pendingCount: 1 },
        onConfirm: () => {},
        onLater: () => {},
      })
    );
    expect(html).toContain("옮기기");
    expect(html).toContain("나중에");
    expect(html).toContain("History");
    expect(html).not.toMatch(/localStorage|LocalDB|JSON|\.workspace-data|API/);
  });
});

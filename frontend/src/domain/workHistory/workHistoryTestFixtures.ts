/**
 * Test-only fixtures for the D-drive work History store.
 * Temp folders live under os.tmpdir() (never inside the workspace) and the
 * browser storage is an in-memory fake. Never imported by app code.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Ball3, Point, PositionRecord } from "../positionSearchEngine";
import type { PublishOperation } from "../publishOperation";
import { writeFourTrackFamilyMembers } from "../family/familyAwareWriter";
import {
  approveUnifiedDerivedReview,
  createUnifiedDerivedReview,
} from "../family/unifiedDerivedReview";
import {
  buildPublishFamilyGraphFromRecords,
  countPublishFamilyGraphDerivedMembers,
  type PublishFamilyGraph,
} from "../publishFamilyGraph";
import { DEFAULT_SCALE } from "../../utils/physics/ImpactEngine";
import { handleWorkHistoryHttpBody, type WorkHistoryIo } from "./workHistoryFileStore";
import { createWorkHistoryHttpApi, type WorkHistoryApi } from "./workHistoryClient";

export const HIT_TOLERANCE = 1.0;

function pt(x: number, y: number): Point {
  return { x, y };
}

export const PATH_C4: Array<Point | null> = [
  pt(10, 0),
  pt(40, 40),
  pt(80, 20),
  pt(40, 0),
  pt(0, 20),
  null,
  null,
];

export function collinearCueBalls(distanceMm = 20): Ball3 {
  const d = DEFAULT_SCALE.BALL_DIAMETER_RG;
  const cueX = 8;
  return { cue: pt(cueX, 16), target: pt(cueX + distanceMm + d, 16), second: pt(20, 10) };
}

export function fourTrackFamilyRecords(
  familyId: string,
  memberId: string,
  balls: Ball3,
  existing: PositionRecord[] = [],
  inputs: Record<string, number> = { CO_f: 30, C3_r: 20 }
): PositionRecord[] {
  const written = writeFourTrackFamilyMembers(existing, {
    balls,
    targetBall: "red",
    entry: {
      slot: "S1",
      signature: { systemId: "5_half_system", formulaHash: "v1", shotType: "뒤돌리기" },
      sysInputs: inputs,
      hpT: { T: "-3/8", hit_point: { x: 1, y: 1 }, mode: "TIP", tipCount: 1 },
      str: { speed: 2 },
      ai: { text: familyId },
      track: "B2T_L",
      authoringStrategyId: `as_${memberId}`,
      familyId,
      memberId,
      memberOrigin: "AUTHORED",
      meta: { impact: pt(12, 9), final: pt(50, 5), angle_ci: 0.1, angle_fs: 0.2 },
      corrections: { slide: 0, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
      correctionsStored: true,
    },
  } as never);
  if (!written.ok) throw new Error(written.reason);
  return written.dataset;
}

export function createOperation(destinationFamilyId: string): PublishOperation {
  return { schemaVersion: 1, intent: "CREATE", sourceFamilyId: null, destinationFamilyId };
}

export const SAMPLE_STATE = {
  adminState: { sys: { system_id: "5_half_system", shotType: "뒤돌리기" } },
  ballsState: collinearCueBalls(20),
  shotEditor: { activeSlot: "S1", slots: {} },
  targetBall: "yellow",
};

export type SampleWork = {
  familyId: string;
  baseRecords: PositionRecord[];
  pendingGraph: PublishFamilyGraph;
  approvedRecords: PositionRecord[];
  approvedGraph: PublishFamilyGraph;
  derivedCount: number;
  publishOperation: PublishOperation;
};

/** New 4-track Family (SAVE result) + its approved derived graph. */
export function buildSampleWork(
  familyId = "fm_sample",
  memberId = "mb_sample",
  balls: Ball3 = collinearCueBalls(20)
): SampleWork {
  const baseRecords = fourTrackFamilyRecords(familyId, memberId, balls);
  const meta = { shotType: "뒤돌리기", systemId: "5_half_system" };
  const pending = buildPublishFamilyGraphFromRecords(baseRecords, familyId, meta);
  if (!pending.ok) throw new Error(pending.reason);
  const review = createUnifiedDerivedReview({
    dataset: baseRecords,
    familyId,
    authoredPathNodes: PATH_C4,
    hitTolerance: HIT_TOLERANCE,
  });
  if (!review.ok) throw new Error(review.reason);
  const approved = approveUnifiedDerivedReview({ dataset: baseRecords, bag: review.bag });
  if (!approved.ok) throw new Error(approved.reason);
  const approvedGraph = buildPublishFamilyGraphFromRecords(approved.dataset, familyId, meta);
  if (!approvedGraph.ok) throw new Error(approvedGraph.reason);
  return {
    familyId,
    baseRecords,
    pendingGraph: pending.graph,
    approvedRecords: approved.dataset,
    approvedGraph: approvedGraph.graph,
    derivedCount: countPublishFamilyGraphDerivedMembers(approvedGraph.graph),
    publishOperation: createOperation(familyId),
  };
}

export type MemoryStorage = Storage & {
  touchedKeys: Set<string>;
  clearCalls: number;
  dump(): Record<string, string>;
};

export function createMemoryStorage(seed: Record<string, string> = {}): MemoryStorage {
  const map = new Map<string, string>(Object.entries(seed));
  const touchedKeys = new Set<string>();
  const storage = {
    touchedKeys,
    clearCalls: 0,
    getItem: (k: string) => {
      touchedKeys.add(k);
      return map.has(k) ? map.get(k)! : null;
    },
    setItem: (k: string, v: string) => {
      touchedKeys.add(k);
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      touchedKeys.add(k);
      map.delete(k);
    },
    clear: () => {
      storage.clearCalls += 1;
      map.clear();
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
    dump: () => Object.fromEntries(map),
  };
  return storage as MemoryStorage;
}

const tempDirs: string[] = [];

/** Fresh repoRoot outside the workspace (os.tmpdir()). */
export function makeTempRepoRoot(prefix = "work-history-"): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

export function removeTempRepoRoots(): void {
  for (const dir of tempDirs.splice(0)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

/** Browser client ↔ in-process HTTP handler (same JSON boundary as the dev middleware). */
export function createInProcessWorkHistoryApi(
  repoRoot: string,
  io?: Partial<WorkHistoryIo>
): WorkHistoryApi {
  const fetchFn = (async (_url: string, init?: { body?: string }) => {
    const body = init?.body ? JSON.parse(init.body) : {};
    const handled = handleWorkHistoryHttpBody({ repoRoot, body, io });
    return new Response(JSON.stringify(handled.body), {
      status: handled.statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return createWorkHistoryHttpApi(fetchFn);
}

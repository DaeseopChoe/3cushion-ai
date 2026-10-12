/**
 * ADMIN Search — every Published leaf (shotType × system folder), before and after a reload.
 *
 * A: no hint (fresh page) → data only in a non-default leaf is found
 * B: hint → still a full Published search; the hinted leaf result is kept
 * C: hint points at the wrong leaf → the truly closest leaf wins
 * D: several leaves → global closest; tie → hint leaf; no hint → fixed canonical order
 * E: one leaf fails → others still searched; load error only when every leaf fails
 * F: success notice names the selected leaf; ADMIN sys gets that shotType/systemId
 * G: History is never a Search source; tolerance and ball roles unchanged; cache refresh kept
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runAdminSearch, type AdminSearchFlowContext } from "./adminSearchFlow";
import {
  __clearPublishedDatasetStoreForTests,
  refreshPublishedDataset,
} from "../../domain/publishedDatasetStore";
import { buildPublishedLeafUrl } from "../../domain/datasetLoader";
import { resolveCandidatePublishedLeaves } from "../../domain/publishedLeafResolve";
import type { PositionRecord } from "../../domain/positionSearchEngine";
import { createPositionId } from "../../domain/positionId";

type Balls = PositionRecord["balls"];

const BASE: Balls = {
  cue: { x: 19.5, y: 11 },
  target: { x: 20.4, y: 30.6 },
  second: { x: 64.9, y: 22.1 },
};

function shiftCue(balls: Balls, dx: number): Balls {
  return { ...balls, cue: { x: balls.cue.x + dx, y: balls.cue.y } };
}

function recordAt(
  balls: Balls,
  leaf: { shotType: string; systemId: string },
  familyNo: number
): PositionRecord {
  const suffix = String(familyNo).padStart(12, "0");
  return {
    positionId: createPositionId(balls),
    balls,
    strategies: {
      S1: {
        slot: "S1",
        signature: { systemId: leaf.systemId, formulaHash: "v1", shotType: leaf.shotType },
        sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
        corrections: { slide: 0, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
        correctionsStored: true,
        meta: {
          impact: { x: 20.32, y: 28.87 },
          final: { x: 6.53, y: 40 },
          angle_ci: 1.52,
          angle_fs: -0.3,
        },
        ai: { text: "" },
        str: { speed: 2.5 },
        hpT: { T: "8/8", hit_point: { x: 0, y: 0 }, mode: "TIP", tipCount: 0 },
        thickness: "8/8",
        authoringStrategyId: `as_leaf_${familyNo}`,
        familyId: `fm_leafsrch-0000-4000-8000-${suffix}`,
        memberId: `mb_leaf_${familyNo}`,
        memberOrigin: "AUTHORED",
        track: "B2T_L",
      },
    },
  } as PositionRecord;
}

const LEAF_A = { shotType: "뒤돌리기", systemId: "5_half_system" };
const LEAF_B = { shotType: "옆돌리기", systemId: "5_half_system" };
const LEAF_PLUS = { shotType: "옆돌리기", systemId: "plus_system" };

const FAIL = Symbol("http-500");
type LeafBody = PositionRecord[] | typeof FAIL;

function stubPublishedLeaves(
  leaves: Array<[{ shotType: string; systemId: string }, LeafBody]>
) {
  const byUrl = new Map<string, { leaf: { shotType: string; systemId: string }; body: LeafBody }>();
  for (const [leaf, body] of leaves) byUrl.set(buildPublishedLeafUrl(leaf.shotType, leaf.systemId), { leaf, body });
  const fetchMock = vi.fn(async (url: string) => {
    const hit = byUrl.get(url);
    if (!hit) return { status: 404, ok: false, json: async () => ({}) };
    if (hit.body === FAIL) return { status: 500, ok: false, json: async () => ({}) };
    return {
      status: 200,
      ok: true,
      json: async () => ({
        schemaVersion: 2,
        shotType: hit.leaf.shotType,
        systemId: hit.leaf.systemId,
        records: hit.body,
      }),
    };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** App.jsx initial adminState.sys after a page reload (no shotType / systemId). */
const RELOADED_SYS = { system_id: null, track: "B2T_L", CO: null, C3: null };

type Harness = {
  ctx: AdminSearchFlowContext;
  state: Record<string, unknown>;
  applied: PositionRecord[];
};

function harness(opts: {
  balls: Balls;
  sys?: Record<string, unknown>;
  persisted?: { shotType: string | null; systemId: string | null } | null;
  targetBall?: "red" | "yellow" | null;
}): Harness {
  const h: Harness = {
    state: { sys: opts.sys ?? { ...RELOADED_SYS } },
    applied: [],
    ctx: undefined as unknown as AdminSearchFlowContext,
  };
  h.ctx = {
    ballsState: opts.balls as unknown as Record<string, unknown>,
    adminState: h.state,
    activeSlot: "S1",
    slots: {},
    isTargetSelected: opts.targetBall != null,
    targetColor: opts.targetBall ?? null,
    userPublishedSearchContext: opts.persisted ?? { shotType: null, systemId: null },
    setAdminState: (updater) => {
      h.state = updater(h.state);
    },
    setIsAdminPublishedSearchMatched: vi.fn(),
    setEditingPublishedFamilyId: vi.fn(),
    setAdminTableLayersVisible: vi.fn(),
    setShowCoaching: vi.fn(),
    applyPositionRecall: (record) => {
      h.applied.push(record);
    },
    patchSlotRuntimeMeta: vi.fn(),
    hydrateAdminRecallTarget: vi.fn(),
    clearAdminSearchDisplayRuntime: vi.fn(),
    beginAdminInputSession: () => true,
    getAdminRecallQueryTargetBall: () => opts.targetBall ?? null,
    rejectAdminRecallHydrateForMismatch: () => false,
    resolveFormulaHash: () => "v1",
  };
  return h;
}

function appliedFamilyId(h: Harness): string | undefined {
  return h.applied[0]?.strategies?.S1?.familyId;
}

function hintSys(leaf: { shotType: string; systemId: string }) {
  return { shotType: leaf.shotType, systemId: leaf.systemId, system_id: leaf.systemId };
}

let alerts: string[];

beforeEach(() => {
  __clearPublishedDatasetStoreForTests();
  alerts = [];
  vi.stubGlobal("alert", (m: unknown) => {
    alerts.push(String(m));
  });
});

afterEach(() => {
  __clearPublishedDatasetStoreForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("A — after a reload (no hint) every Published leaf is searched", () => {
  it("A1: data only in 옆돌리기/파이브앤하프 is found with empty ADMIN state", async () => {
    stubPublishedLeaves([
      [LEAF_A, [recordAt(shiftCue(BASE, 30), LEAF_A, 1)]],
      [LEAF_B, [recordAt(BASE, LEAF_B, 2)]],
    ]);
    const h = harness({ balls: BASE });

    expect(await runAdminSearch(h.ctx)).toBe(true);
    expect(appliedFamilyId(h)).toBe("fm_leafsrch-0000-4000-8000-000000000002");
    expect(alerts).not.toContain("해당 데이터 없음");
  });

  it("A2: data only in another system folder (옆돌리기/플러스) is found too", async () => {
    stubPublishedLeaves([[LEAF_PLUS, [recordAt(BASE, LEAF_PLUS, 3)]]]);
    const h = harness({ balls: BASE });

    expect(await runAdminSearch(h.ctx)).toBe(true);
    expect(appliedFamilyId(h)).toBe("fm_leafsrch-0000-4000-8000-000000000003");
  });
});

describe("B — a hint never narrows the search", () => {
  it("B1: hint → 옆돌리기 still loads every Published leaf and keeps the 옆돌리기 match", async () => {
    const fetchMock = stubPublishedLeaves([[LEAF_B, [recordAt(BASE, LEAF_B, 2)]]]);
    const h = harness({ balls: BASE, sys: hintSys(LEAF_B) });

    expect(await runAdminSearch(h.ctx)).toBe(true);
    expect(appliedFamilyId(h)).toBe("fm_leafsrch-0000-4000-8000-000000000002");
    const urls = new Set(fetchMock.mock.calls.map((c) => c[0]));
    expect(urls.has(buildPublishedLeafUrl(LEAF_A.shotType, LEAF_A.systemId))).toBe(true);
    expect(urls.has(buildPublishedLeafUrl(LEAF_PLUS.shotType, LEAF_PLUS.systemId))).toBe(true);
    const all = resolveCandidatePublishedLeaves({ mode: "ADMIN", shotType: LEAF_B.shotType, systemId: LEAF_B.systemId });
    expect(urls.size).toBe(all.length);
  });
});

describe("C — wrong hint", () => {
  it("C1: hint 뒤돌리기 but the closer candidate is in 옆돌리기 → 옆돌리기 wins", async () => {
    stubPublishedLeaves([
      [LEAF_A, [recordAt(shiftCue(BASE, 2), LEAF_A, 1)]],
      [LEAF_B, [recordAt(shiftCue(BASE, 1), LEAF_B, 2)]],
    ]);
    const h = harness({ balls: BASE, sys: hintSys(LEAF_A), persisted: { ...LEAF_A } });

    expect(await runAdminSearch(h.ctx)).toBe(true);
    expect(appliedFamilyId(h)).toBe("fm_leafsrch-0000-4000-8000-000000000002");
  });

  it("C2: persisted SAVE context 뒤돌리기 with data only in 옆돌리기 → found", async () => {
    stubPublishedLeaves([[LEAF_B, [recordAt(BASE, LEAF_B, 2)]]]);
    const h = harness({ balls: BASE, persisted: { ...LEAF_A } });

    expect(await runAdminSearch(h.ctx)).toBe(true);
    expect(appliedFamilyId(h)).toBe("fm_leafsrch-0000-4000-8000-000000000002");
  });
});

describe("D — several leaves hold candidates", () => {
  it("D1: different distances → globally closest (the default leaf has no special rank)", async () => {
    stubPublishedLeaves([
      [LEAF_A, [recordAt(shiftCue(BASE, 1.5), LEAF_A, 1)]],
      [LEAF_PLUS, [recordAt(shiftCue(BASE, 0.5), LEAF_PLUS, 3)]],
    ]);
    const h = harness({ balls: BASE });

    expect(await runAdminSearch(h.ctx)).toBe(true);
    expect(appliedFamilyId(h)).toBe("fm_leafsrch-0000-4000-8000-000000000003");
  });

  it("D2: same distance → the hinted leaf wins", async () => {
    stubPublishedLeaves([
      [LEAF_A, [recordAt(shiftCue(BASE, 1), LEAF_A, 1)]],
      [LEAF_B, [recordAt(shiftCue(BASE, 1), LEAF_B, 2)]],
    ]);
    const h = harness({ balls: BASE, sys: hintSys(LEAF_B) });

    expect(await runAdminSearch(h.ctx)).toBe(true);
    expect(appliedFamilyId(h)).toBe("fm_leafsrch-0000-4000-8000-000000000002");
  });

  it("D3: same distance and no hint → fixed canonical order (뒤돌리기/파이브앤하프 first), reproducible", async () => {
    const leaves: Array<[typeof LEAF_A, LeafBody]> = [
      [LEAF_B, [recordAt(BASE, LEAF_B, 2)]],
      [LEAF_PLUS, [recordAt(BASE, LEAF_PLUS, 3)]],
      [LEAF_A, [recordAt(BASE, LEAF_A, 1)]],
    ];
    for (let run = 0; run < 2; run += 1) {
      __clearPublishedDatasetStoreForTests();
      stubPublishedLeaves(leaves);
      const h = harness({ balls: BASE });
      expect(await runAdminSearch(h.ctx)).toBe(true);
      expect(appliedFamilyId(h)).toBe("fm_leafsrch-0000-4000-8000-000000000001");
    }
  });
});

describe("E — leaf load failures", () => {
  it("E1: one leaf fails (HTTP 500) → the other leaf still matches; short diagnostic only", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubPublishedLeaves([
      [LEAF_A, FAIL],
      [LEAF_B, [recordAt(BASE, LEAF_B, 2)]],
    ]);
    const h = harness({ balls: BASE });

    expect(await runAdminSearch(h.ctx)).toBe(true);
    expect(appliedFamilyId(h)).toBe("fm_leafsrch-0000-4000-8000-000000000002");
    expect(alerts.some((a) => a.includes("Search 데이터 로드 오류"))).toBe(false);
    const diag = warn.mock.calls.find((c) => String(c[0]).includes("[ADMIN_PUBLISHED_RECALL]"));
    expect(diag).toBeDefined();
    expect(JSON.stringify(diag)).toContain("HTTP 500");
  });

  it("E2: every leaf fails → existing load-error alert", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ status: 500, ok: false, json: async () => ({}) }))
    );
    const h = harness({ balls: BASE });

    expect(await runAdminSearch(h.ctx)).toBe(false);
    expect(alerts.some((a) => a.startsWith("Search 데이터 로드 오류"))).toBe(true);
    expect(alerts).not.toContain("해당 데이터 없음");
  });

  it("E3: leaves readable but no candidate anywhere → 해당 데이터 없음 (after checking all)", async () => {
    const fetchMock = stubPublishedLeaves([
      [LEAF_A, [recordAt(shiftCue(BASE, 30), LEAF_A, 1)]],
      [LEAF_B, [recordAt(shiftCue(BASE, 30), LEAF_B, 2)]],
    ]);
    const h = harness({ balls: BASE });

    expect(await runAdminSearch(h.ctx)).toBe(false);
    expect(alerts).toEqual(["해당 데이터 없음"]);
    const all = resolveCandidatePublishedLeaves({ mode: "ADMIN", shotType: null, systemId: null });
    expect(new Set(fetchMock.mock.calls.map((c) => c[0])).size).toBe(all.length);
  });
});

describe("F — notice source and ADMIN state", () => {
  it("F1: the success notice names the selected leaf (옆돌리기 · 파이브앤하프)", async () => {
    stubPublishedLeaves([[LEAF_B, [recordAt(shiftCue(BASE, 1), LEAF_B, 2)]]]);
    const h = harness({ balls: BASE });

    expect(await runAdminSearch(h.ctx)).toBe(true);
    const notice = alerts.find((a) => a.includes("유사한 공략을 찾았습니다."));
    expect(notice).toBeDefined();
    expect(notice!.split("\n")[0]).toBe("유사한 공략을 찾았습니다. (옆돌리기 · 파이브앤하프)");
    expect(notice).toContain("내공: 1.0");
  });

  it("F2: selected shotType/systemId land in ADMIN sys (as a hint only)", async () => {
    stubPublishedLeaves([[LEAF_PLUS, [recordAt(BASE, LEAF_PLUS, 3)]]]);
    const h = harness({ balls: BASE, sys: hintSys(LEAF_A) });

    expect(await runAdminSearch(h.ctx)).toBe(true);
    const sys = h.state.sys as Record<string, unknown>;
    expect(sys.shotType).toBe("옆돌리기");
    expect(sys.systemId).toBe("plus_system");
  });

  it("F3: after a reload (cache + state gone) the next Search scans every leaf again and still finds 옆돌리기", async () => {
    stubPublishedLeaves([[LEAF_B, [recordAt(BASE, LEAF_B, 2)]]]);
    const before = harness({ balls: BASE, sys: hintSys(LEAF_B), persisted: { ...LEAF_B } });
    expect(await runAdminSearch(before.ctx)).toBe(true);

    __clearPublishedDatasetStoreForTests();
    const fetchMock = stubPublishedLeaves([[LEAF_B, [recordAt(BASE, LEAF_B, 2)]]]);
    const after = harness({ balls: BASE });
    expect(await runAdminSearch(after.ctx)).toBe(true);
    expect(appliedFamilyId(after)).toBe("fm_leafsrch-0000-4000-8000-000000000002");
    const all = resolveCandidatePublishedLeaves({ mode: "ADMIN", shotType: null, systemId: null });
    expect(new Set(fetchMock.mock.calls.map((c) => c[0])).size).toBe(all.length);
  });

  it("F4: a second Search in the same session reuses the leaf cache (no refetch)", async () => {
    const fetchMock = stubPublishedLeaves([[LEAF_B, [recordAt(BASE, LEAF_B, 2)]]]);
    expect(await runAdminSearch(harness({ balls: BASE }).ctx)).toBe(true);
    const firstCalls = fetchMock.mock.calls.length;
    expect(await runAdminSearch(harness({ balls: BASE }).ctx)).toBe(true);
    expect(fetchMock.mock.calls.length).toBe(firstCalls);
  });
});

describe("G — regressions", () => {
  it("G1: ADMIN Search reads Published leaves only (no History / work-history source)", () => {
    const src = readFileSync(join(__dirname, "adminSearchFlow.ts"), "utf8");
    expect(src).not.toMatch(/workHistory|work-history|loadWorkHistory|WorkspaceSnapshot/);
    expect(src).toContain('from "../../domain/publishedDatasetStore"');
  });

  it("G2: tolerance unchanged — a candidate beyond the adminStrict per-ball gate (6) is not matched", async () => {
    stubPublishedLeaves([[LEAF_B, [recordAt(shiftCue(BASE, 6.5), LEAF_B, 2)]]]);
    const h = harness({ balls: BASE });

    expect(await runAdminSearch(h.ctx)).toBe(false);
    expect(alerts).toEqual(["해당 데이터 없음"]);
  });

  it("G3: ball roles — explicit target with swapped 앞공/뒷공 does not match", async () => {
    stubPublishedLeaves([[LEAF_B, [recordAt(BASE, LEAF_B, 2)]]]);
    const swapped: Balls = { cue: BASE.cue, target: BASE.second, second: BASE.target };
    const h = harness({ balls: swapped, targetBall: "yellow" });

    expect(await runAdminSearch(h.ctx)).toBe(false);
    expect(h.applied).toHaveLength(0);
  });

  it("G4: Publish cache refresh → newly published leaf data is found by the next ADMIN Search", async () => {
    stubPublishedLeaves([]);
    expect(await runAdminSearch(harness({ balls: BASE }).ctx)).toBe(false);

    refreshPublishedDataset();
    stubPublishedLeaves([[LEAF_B, [recordAt(BASE, LEAF_B, 2)]]]);
    const h = harness({ balls: BASE });
    expect(await runAdminSearch(h.ctx)).toBe(true);
    expect(appliedFamilyId(h)).toBe("fm_leafsrch-0000-4000-8000-000000000002");
  });
});

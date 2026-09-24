/**
 * Phase 3-B1 contract — Published Family Export candidate + pre-write gate.
 *
 * Publish trigger = incoming valid fm_* familyId presence (no History saveIntent).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { DatasetExportPayload } from "./datasetExport";
import { mergePublishedExport } from "./datasetExportMerge";
import type { PositionRecord, StrategyEntry } from "./positionSearchEngine";
import {
  buildPublishedFamilyExportCandidate,
  validatePublishedExportCandidate,
} from "./publishedFamilyPublish";
import { countFamilyMembersInRecords } from "./publishedFamilyReplace";

const FID = {
  A: "fm_a",
  B: "fm_b",
  NEW: "fm_new",
} as const;

const ballsP1 = {
  cue: { x: 10, y: 10 },
  target: { x: 50, y: 25 },
  second: { x: 40, y: 20 },
};
const ballsP2 = {
  cue: { x: 12, y: 12 },
  target: { x: 52, y: 27 },
  second: { x: 42, y: 22 },
};

let memberSeq = 0;
function nextMemberId(): string {
  memberSeq += 1;
  return `mb_${memberSeq}`;
}

function entry(
  slot: "S1" | "S2" | "S3",
  opts: {
    familyId?: string;
    memberId?: string;
    memberOrigin?: StrategyEntry["memberOrigin"];
    generatedFromMemberId?: string;
    symmetryOp?: StrategyEntry["symmetryOp"];
    derivedRule?: StrategyEntry["derivedRule"];
    derivedStep?: number;
    track?: string;
    marker?: string;
  } = {}
): StrategyEntry {
  const base: StrategyEntry = {
    slot,
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: 40 },
    corrections: {
      departure: 0,
      spin: 0,
      slide: 0,
      draw: 0,
      curve_ratio: 0,
    },
    meta: {
      impact: { x: 0, y: 0 },
      final: { x: 0, y: 0 },
      angle_ci: 0,
      angle_fs: 0,
    },
  };
  if (opts.familyId != null) {
    base.familyId = opts.familyId;
    base.memberId = opts.memberId ?? nextMemberId();
    base.memberOrigin = opts.memberOrigin ?? "AUTHORED";
  }
  if (opts.generatedFromMemberId)
    base.generatedFromMemberId = opts.generatedFromMemberId;
  if (opts.symmetryOp) base.symmetryOp = opts.symmetryOp;
  if (opts.derivedRule) base.derivedRule = opts.derivedRule;
  if (opts.derivedStep != null) base.derivedStep = opts.derivedStep;
  if (opts.track) base.track = opts.track as StrategyEntry["track"];
  if (opts.marker) base.ai = { text: opts.marker };
  return base;
}

function position(
  positionId: string,
  slots: Partial<Record<"S1" | "S2" | "S3", StrategyEntry>>,
  balls = ballsP1
): PositionRecord {
  return {
    positionId,
    balls,
    strategies: slots,
    schemaVersion: 1,
  };
}

function envelope(records: PositionRecord[]): DatasetExportPayload {
  return {
    schemaVersion: 2,
    shotType: "뒤돌리기",
    systemId: "5_half_system",
    systemLabel: "파이브앤하프",
    exportedAt: "2026-09-16T00:00:00.000Z",
    records,
  };
}

function familyMarkers(records: PositionRecord[], familyId: string): string[] {
  const out: string[] = [];
  for (const rec of records) {
    for (const slot of ["S1", "S2", "S3"] as const) {
      const e = rec.strategies[slot];
      if (!e || (e.familyId ?? "").trim() !== familyId) continue;
      out.push(e.ai?.text ?? `${rec.positionId}:${slot}`);
    }
  }
  return out.sort();
}

describe("publishedFamilyPublish — Phase 3-B1 CREATE", () => {
  it("CASE C1 — new familyId appends; unrelated preserved", () => {
    const existing = envelope([
      position("p-old", {
        S1: entry("S1", { familyId: FID.A, marker: "keep-A" }),
      }),
    ]);
    const incoming = envelope([
      position("p-new", {
        S1: entry("S1", { familyId: FID.NEW, marker: "add-NEW" }),
      }),
    ]);
    const result = buildPublishedFamilyExportCandidate(existing, incoming);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.purgedFamilyIds).toEqual([]);
    expect(countFamilyMembersInRecords(result.payload.records, FID.A)).toBe(1);
    expect(countFamilyMembersInRecords(result.payload.records, FID.NEW)).toBe(
      1
    );
    expect(familyMarkers(result.payload.records, FID.A)).toEqual(["keep-A"]);
  });

  it("CASE C2 — legacy no-familyId preserved on CREATE", () => {
    const legacy = entry("S1", { marker: "legacy" });
    expect(legacy.familyId).toBeUndefined();
    const existing = envelope([position("legacy-pos", { S1: legacy })]);
    const incoming = envelope([
      position("p-new", {
        S1: entry("S1", { familyId: FID.NEW, marker: "create" }),
      }),
    ]);
    const result = buildPublishedFamilyExportCandidate(existing, incoming);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const legacyRec = result.payload.records.find(
      (r) => r.positionId === "legacy-pos"
    );
    expect(legacyRec?.strategies.S1?.familyId).toBeUndefined();
    expect(legacyRec?.strategies.S1?.ai?.text).toBe("legacy");
    expect(countFamilyMembersInRecords(result.payload.records, FID.NEW)).toBe(
      1
    );
  });

  it("CASE C3 — same positionId multi-family CREATE does not delete unrelated", () => {
    const existing = envelope([
      position("shared", {
        S1: entry("S1", { familyId: FID.A, marker: "A-keep" }),
      }),
    ]);
    const incoming = envelope([
      position("shared", {
        S2: entry("S2", { familyId: FID.NEW, marker: "NEW-add" }),
      }),
    ]);
    const result = buildPublishedFamilyExportCandidate(existing, incoming);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.records).toHaveLength(1);
    expect(result.payload.records[0].strategies.S1?.familyId).toBe(FID.A);
    expect(result.payload.records[0].strategies.S2?.familyId).toBe(FID.NEW);
  });
});

describe("publishedFamilyPublish — Phase 3-B1 UPDATE", () => {
  it("CASE U1 — same familyId full replace", () => {
    const existing = envelope([
      position("p1", {
        S1: entry("S1", { familyId: FID.A, marker: "old" }),
      }),
    ]);
    const incoming = envelope([
      position("p1", {
        S1: entry("S1", { familyId: FID.A, marker: "new" }),
      }),
    ]);
    const result = buildPublishedFamilyExportCandidate(existing, incoming);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.purgedFamilyIds).toEqual([FID.A]);
    expect(familyMarkers(result.payload.records, FID.A)).toEqual(["new"]);
  });

  it("CASE U2 — authored+derived across PositionRecords all purged", () => {
    const auth = nextMemberId();
    const existing = envelope([
      position("p1", {
        S1: entry("S1", {
          familyId: FID.A,
          memberId: auth,
          marker: "auth-old",
          track: "B2T_L",
        }),
      }),
      position("p2", {
        S1: entry("S1", {
          familyId: FID.A,
          memberOrigin: "SYMMETRY",
          generatedFromMemberId: auth,
          symmetryOp: "H",
          marker: "h-old",
          track: "B2T_R",
        }),
      }),
      position("p3", {
        S1: entry("S1", {
          familyId: FID.A,
          memberOrigin: "SYMMETRY",
          generatedFromMemberId: auth,
          symmetryOp: "V",
          marker: "v-old",
          track: "T2B_L",
        }),
      }),
    ]);
    const authNew = nextMemberId();
    const incoming = envelope([
      position("p1", {
        S1: entry("S1", {
          familyId: FID.A,
          memberId: authNew,
          marker: "auth-new",
        }),
      }),
      position("p2", {
        S1: entry("S1", {
          familyId: FID.A,
          memberOrigin: "SYMMETRY",
          generatedFromMemberId: authNew,
          symmetryOp: "H",
          marker: "h-new",
        }),
      }),
    ]);
    const result = buildPublishedFamilyExportCandidate(existing, incoming);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(countFamilyMembersInRecords(result.payload.records, FID.A)).toBe(2);
    expect(familyMarkers(result.payload.records, FID.A)).toEqual([
      "auth-new",
      "h-new",
    ]);
    expect(familyMarkers(result.payload.records, FID.A)).not.toContain("v-old");
  });

  it("CASE U3 — multi-family same record: update A preserves B", () => {
    const existing = envelope([
      position("shared", {
        S1: entry("S1", { familyId: FID.A, marker: "A-old" }),
        S2: entry("S2", { familyId: FID.B, marker: "B-keep" }),
      }),
    ]);
    const incoming = envelope([
      position("shared", {
        S1: entry("S1", { familyId: FID.A, marker: "A-new" }),
      }),
    ]);
    const result = buildPublishedFamilyExportCandidate(existing, incoming);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.records[0].strategies.S1?.ai?.text).toBe("A-new");
    expect(result.payload.records[0].strategies.S2?.ai?.text).toBe("B-keep");
    expect(result.payload.records[0].strategies.S2?.familyId).toBe(FID.B);
  });

  it("CASE U4 — different positionId/balls still purges by familyId", () => {
    const existing = envelope([
      position(
        "P1",
        { S1: entry("S1", { familyId: FID.A, marker: "stale-P1" }) },
        ballsP1
      ),
    ]);
    const incoming = envelope([
      position(
        "P2",
        { S1: entry("S1", { familyId: FID.A, marker: "fresh-P2" }) },
        ballsP2
      ),
    ]);
    const result = buildPublishedFamilyExportCandidate(existing, incoming);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.records.some((r) => r.positionId === "P1")).toBe(
      false
    );
    expect(familyMarkers(result.payload.records, FID.A)).toEqual(["fresh-P2"]);
  });

  it("CASE U5 — idempotent double UPDATE", () => {
    const existing = envelope([
      position("p1", {
        S1: entry("S1", { familyId: FID.A, marker: "v1" }),
      }),
    ]);
    const incoming = envelope([
      position("p1", {
        S1: entry("S1", {
          familyId: FID.A,
          memberId: "mb_stable_u5",
          marker: "v2",
        }),
      }),
    ]);
    const once = buildPublishedFamilyExportCandidate(existing, incoming);
    expect(once.ok).toBe(true);
    if (!once.ok) return;
    const twice = buildPublishedFamilyExportCandidate(once.payload, incoming);
    expect(twice.ok).toBe(true);
    if (!twice.ok) return;
    expect(countFamilyMembersInRecords(twice.payload.records, FID.A)).toBe(1);
    expect(JSON.stringify(once.payload.records)).toBe(
      JSON.stringify(twice.payload.records)
    );
  });
});

describe("publishedFamilyPublish — Phase 3-B1 stale derived", () => {
  it("CASE S1 — stale derived removed; unrelated family kept", () => {
    const auth = "mb_auth_s1";
    const existing = envelope([
      position("p1", {
        S1: entry("S1", {
          familyId: FID.A,
          memberId: auth,
          marker: "auth",
        }),
      }),
      position("p2", {
        S1: entry("S1", {
          familyId: FID.A,
          memberOrigin: "SYMMETRY",
          generatedFromMemberId: auth,
          symmetryOp: "H",
          marker: "H",
        }),
      }),
      position("p3", {
        S1: entry("S1", {
          familyId: FID.A,
          memberOrigin: "SYMMETRY",
          generatedFromMemberId: auth,
          symmetryOp: "V",
          marker: "V",
        }),
      }),
      position("p4", {
        S1: entry("S1", {
          familyId: FID.A,
          memberOrigin: "SYMMETRY",
          generatedFromMemberId: auth,
          symmetryOp: "RPI",
          marker: "RPI",
        }),
      }),
      position("p5", {
        S1: entry("S1", {
          familyId: FID.A,
          memberOrigin: "DERIVED_CUE_C3_PRODUCT",
          generatedFromMemberId: auth,
          derivedRule: "CUE_C3_CARTESIAN_PRODUCT_V1",
          derivedStep: 1,
          marker: "product-stale",
        }),
      }),
      position("other", {
        S1: entry("S1", { familyId: FID.B, marker: "B-keep" }),
      }),
    ]);
    const authNew = "mb_auth_s1_new";
    const incoming = envelope([
      position("p1", {
        S1: entry("S1", {
          familyId: FID.A,
          memberId: authNew,
          marker: "auth-new",
        }),
      }),
      position("p2", {
        S1: entry("S1", {
          familyId: FID.A,
          memberOrigin: "SYMMETRY",
          generatedFromMemberId: authNew,
          symmetryOp: "H",
          marker: "H-new",
        }),
      }),
    ]);
    const result = buildPublishedFamilyExportCandidate(existing, incoming);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(familyMarkers(result.payload.records, FID.A)).toEqual([
      "H-new",
      "auth-new",
    ]);
    expect(familyMarkers(result.payload.records, FID.A)).not.toContain(
      "product-stale"
    );
    expect(familyMarkers(result.payload.records, FID.B)).toEqual(["B-keep"]);
  });
});

describe("publishedFamilyPublish — Phase 3-B1 validation failures", () => {
  it("CASE V1 — invalid provenance blocks candidate (no write payload)", () => {
    const existing = envelope([]);
    const incoming = envelope([
      position("p1", {
        S1: entry("S1", {
          familyId: FID.A,
          memberOrigin: "SYMMETRY",
          // missing generatedFromMemberId + symmetryOp → provenance fail
          marker: "bad",
        }),
      }),
    ]);
    const result = buildPublishedFamilyExportCandidate(existing, incoming);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("candidate-validation-failed");
    expect(result.issues.some((i) => i.includes("provenance"))).toBe(true);
  });

  it("CASE V2 — malformed incoming records fail before write", () => {
    const existing = envelope([]);
    const incoming = {
      schemaVersion: 2,
      shotType: "뒤돌리기",
      systemId: "5_half_system",
      systemLabel: "파이브앤하프",
      exportedAt: "2026-09-16T00:00:00.000Z",
      records: "not-an-array",
    } as unknown as DatasetExportPayload;
    const result = buildPublishedFamilyExportCandidate(existing, incoming);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("incoming-malformed-records");
  });

  it("CASE V3 — duplicate member identity fails validation", () => {
    const dup = "mb_dup_v3";
    const candidate = envelope([
      position("p1", {
        S1: entry("S1", {
          familyId: FID.A,
          memberId: dup,
          marker: "one",
        }),
      }),
      position("p2", {
        S1: entry("S1", {
          familyId: FID.A,
          memberId: dup,
          marker: "two",
        }),
      }),
    ]);
    const validated = validatePublishedExportCandidate(candidate);
    expect(validated.ok).toBe(false);
    if (validated.ok) return;
    expect(
      validated.issues.some((i) => i.includes("duplicate-member-identity"))
    ).toBe(true);

    const existing = envelope([]);
    const result = buildPublishedFamilyExportCandidate(existing, candidate);
    expect(result.ok).toBe(false);
  });
});

describe("publishedFamilyPublish — integration vs old merge path", () => {
  it("family-aware path removes stale members that mergePublishedExport would keep", () => {
    const existing = envelope([
      position("p1", {
        S1: entry("S1", { familyId: FID.A, marker: "old-auth" }),
      }),
      position("p-stale", {
        S1: entry("S1", { familyId: FID.A, marker: "stale-derived" }),
      }),
    ]);
    const incoming = envelope([
      position("p1", {
        S1: entry("S1", { familyId: FID.A, marker: "new-auth" }),
      }),
    ]);

    const oldMerge = mergePublishedExport(existing, incoming);
    expect(
      familyMarkers(oldMerge.records, FID.A)
    ).toContain("stale-derived");

    const familyAware = buildPublishedFamilyExportCandidate(existing, incoming);
    expect(familyAware.ok).toBe(true);
    if (!familyAware.ok) return;
    expect(familyMarkers(familyAware.payload.records, FID.A)).toEqual([
      "new-auth",
    ]);
    expect(familyMarkers(familyAware.payload.records, FID.A)).not.toContain(
      "stale-derived"
    );
  });

  it("useSettings Publish owner uses Git Publish path (not flat Manual Export merge)", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "../hooks/useSettings.js"), "utf8");
    expect(src).toContain("handlePublishSnapshots");
    expect(src).toContain("publishDatasetToLocalRepoWithGit");
    expect(src).toContain("readPublishFamilyPayloadFromSnapshot");
    expect(src).not.toContain("buildPublishedFamilyExportCandidate");
    expect(src).not.toContain("handleExportSnapshots");
    // Published write path must not call mergePublishedExport directly.
    expect(src).not.toMatch(
      /mergedPayload\s*=\s*mergePublishedExport/
    );
    expect(src).not.toContain(
      'from "../domain/datasetExportMerge"'
    );
  });

  it("null existing still validates CREATE candidate", () => {
    const incoming = envelope([
      position("p1", {
        S1: entry("S1", { familyId: FID.NEW, marker: "only" }),
      }),
    ]);
    const result = buildPublishedFamilyExportCandidate(null, incoming);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.records).toHaveLength(1);
    expect(result.purgedFamilyIds).toEqual([]);
  });
});

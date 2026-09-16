/**
 * Phase 3-A contract — Published Family Replacement Core.
 * Identity = familyId only; no positionId / coordinate / sys inference.
 * Test ids follow mintFamilyId / mintMemberId contracts (fm_*, mb_*).
 */

import { describe, expect, it } from "vitest";
import type { PositionRecord, StrategyEntry } from "./positionSearchEngine";
import {
  collectFamilyIdsFromRecords,
  countFamilyMembersInRecords,
  purgeFamilyIdsFromPublishedRecords,
  replaceFamiliesInPublishedRecords,
} from "./publishedFamilyReplace";

const FID = {
  F100: "fm_100",
  F200: "fm_200",
  F123: "fm_123",
  F456: "fm_456",
  F789: "fm_789",
  F999: "fm_999",
  FA: "fm_a",
  FB: "fm_b",
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
    systemId?: string;
    track?: string;
    marker?: string;
  } = {}
): StrategyEntry {
  const base: StrategyEntry = {
    slot,
    signature: {
      systemId: opts.systemId ?? "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: 40 },
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
    base.memberOrigin = "AUTHORED";
  }
  if (opts.track) base.track = opts.track as StrategyEntry["track"];
  if (opts.marker) {
    base.ai = { text: opts.marker };
  }
  return base;
}

function position(
  positionId: string,
  slots: Partial<Record<"S1" | "S2" | "S3", StrategyEntry>>,
  balls = ballsP1
): PositionRecord {
  return { positionId, balls, strategies: slots };
}

function familyMarkers(
  records: PositionRecord[],
  familyId: string
): string[] {
  const out: string[] = [];
  for (const rec of records) {
    for (const slot of ["S1", "S2", "S3"] as const) {
      const e = rec.strategies[slot];
      if (!e) continue;
      if ((e.familyId ?? "").trim() !== familyId) continue;
      out.push(e.ai?.text ?? `${rec.positionId}:${slot}`);
    }
  }
  return out.sort();
}

function allFamilyIds(records: PositionRecord[]): string[] {
  return collectFamilyIdsFromRecords(records).sort();
}

describe("publishedFamilyReplace — Phase 3-A contracts", () => {
  it("CASE A — CREATE append: F100 kept, F200 added", () => {
    const existing = [
      position("p-f100", {
        S1: entry("S1", { familyId: FID.F100, marker: "old-F100" }),
      }),
    ];
    const incoming = [
      position("p-f200", {
        S1: entry("S1", { familyId: FID.F200, marker: "new-F200" }),
      }),
    ];
    const { records, purgedFamilyIds } = replaceFamiliesInPublishedRecords(
      existing,
      incoming
    );
    expect(purgedFamilyIds).toEqual([]);
    expect(countFamilyMembersInRecords(records, FID.F100)).toBe(1);
    expect(countFamilyMembersInRecords(records, FID.F200)).toBe(1);
    expect(familyMarkers(records, FID.F100)).toEqual(["old-F100"]);
    expect(familyMarkers(records, FID.F200)).toEqual(["new-F200"]);
    expect(allFamilyIds(records)).toEqual([FID.F100, FID.F200].sort());
  });

  it("CASE B — UPDATE full replacement: old F123 gone, new F123 only", () => {
    const existing = [
      position("p1", {
        S1: entry("S1", {
          familyId: FID.F123,
          track: "B2T_L",
          marker: "old-can",
        }),
      }),
      position("p2", {
        S1: entry("S1", {
          familyId: FID.F123,
          track: "B2T_R",
          marker: "old-derA",
        }),
      }),
      position("p3", {
        S1: entry("S1", {
          familyId: FID.F123,
          track: "T2B_L",
          marker: "old-derB",
        }),
      }),
    ];
    const incoming = [
      position("p1", {
        S1: entry("S1", {
          familyId: FID.F123,
          track: "B2T_L",
          marker: "new-can",
        }),
      }),
      position("p2", {
        S1: entry("S1", {
          familyId: FID.F123,
          track: "B2T_R",
          marker: "new-derA",
        }),
      }),
      position("p3", {
        S1: entry("S1", {
          familyId: FID.F123,
          track: "T2B_L",
          marker: "new-derB",
        }),
      }),
    ];
    const { records } = replaceFamiliesInPublishedRecords(existing, incoming);
    expect(countFamilyMembersInRecords(records, FID.F123)).toBe(3);
    expect(familyMarkers(records, FID.F123)).toEqual([
      "new-can",
      "new-derA",
      "new-derB",
    ]);
    expect(familyMarkers(records, FID.F123).some((m) => m.startsWith("old-"))).toBe(
      false
    );
  });

  it("CASE C — stale derived removed when missing from incoming", () => {
    const existing = [
      position("p1", {
        S1: entry("S1", { familyId: FID.F123, marker: "can" }),
      }),
      position("p2", {
        S1: entry("S1", { familyId: FID.F123, marker: "derA" }),
      }),
      position("p3", {
        S1: entry("S1", { familyId: FID.F123, marker: "derB" }),
      }),
      position("p4", {
        S1: entry("S1", { familyId: FID.F123, marker: "derC-stale" }),
      }),
    ];
    const incoming = [
      position("p1", {
        S1: entry("S1", { familyId: FID.F123, marker: "can-new" }),
      }),
      position("p2", {
        S1: entry("S1", { familyId: FID.F123, marker: "derA-new" }),
      }),
      position("p3", {
        S1: entry("S1", { familyId: FID.F123, marker: "derB-new" }),
      }),
    ];
    const { records } = replaceFamiliesInPublishedRecords(existing, incoming);
    expect(countFamilyMembersInRecords(records, FID.F123)).toBe(3);
    expect(familyMarkers(records, FID.F123)).toEqual([
      "can-new",
      "derA-new",
      "derB-new",
    ]);
    expect(familyMarkers(records, FID.F123)).not.toContain("derC-stale");
    expect(records.some((r) => r.positionId === "p4")).toBe(false);
  });

  it("CASE D — unrelated families F456/F789 semantically unchanged", () => {
    const existing = [
      position("p-a", {
        S1: entry("S1", { familyId: FID.F123, marker: "f123-old" }),
      }),
      position("p-b", {
        S1: entry("S1", { familyId: FID.F456, marker: "f456-keep" }),
      }),
      position("p-c", {
        S1: entry("S1", { familyId: FID.F789, marker: "f789-keep" }),
      }),
    ];
    const incoming = [
      position("p-a", {
        S1: entry("S1", { familyId: FID.F123, marker: "f123-new" }),
      }),
    ];
    const { records } = replaceFamiliesInPublishedRecords(existing, incoming);
    expect(countFamilyMembersInRecords(records, FID.F123)).toBe(1);
    expect(familyMarkers(records, FID.F123)).toEqual(["f123-new"]);
    expect(familyMarkers(records, FID.F456)).toEqual(["f456-keep"]);
    expect(familyMarkers(records, FID.F789)).toEqual(["f789-keep"]);
    expect(countFamilyMembersInRecords(records, FID.F456)).toBe(1);
    expect(countFamilyMembersInRecords(records, FID.F789)).toBe(1);
  });

  it("CASE E — same PositionRecord multi-family: S1 F123 replaced, S2 F456 kept", () => {
    const existing = [
      position("shared", {
        S1: entry("S1", { familyId: FID.F123, marker: "s1-old" }),
        S2: entry("S2", { familyId: FID.F456, marker: "s2-keep" }),
      }),
    ];
    const incoming = [
      position("shared", {
        S1: entry("S1", { familyId: FID.F123, marker: "s1-new" }),
      }),
    ];
    const { records } = replaceFamiliesInPublishedRecords(existing, incoming);
    expect(records).toHaveLength(1);
    expect(records[0].positionId).toBe("shared");
    expect(records[0].strategies.S1?.familyId).toBe(FID.F123);
    expect(records[0].strategies.S1?.ai?.text).toBe("s1-new");
    expect(records[0].strategies.S2?.familyId).toBe(FID.F456);
    expect(records[0].strategies.S2?.ai?.text).toBe("s2-keep");
  });

  it("CASE F — empty record cleanup after sole-family purge", () => {
    const existing = [
      position("only-f123", {
        S1: entry("S1", { familyId: FID.F123, marker: "alone" }),
      }),
      position("keep-other", {
        S1: entry("S1", { familyId: FID.F456, marker: "other" }),
      }),
    ];
    const purgedOnly = purgeFamilyIdsFromPublishedRecords(existing, [FID.F123]);
    expect(purgedOnly.some((r) => r.positionId === "only-f123")).toBe(false);
    expect(purgedOnly).toHaveLength(1);
    expect(purgedOnly[0].strategies.S1?.familyId).toBe(FID.F456);

    const incoming = [
      position("new-home", {
        S1: entry("S1", { familyId: FID.F123, marker: "rebuilt" }),
      }),
    ];
    const { records } = replaceFamiliesInPublishedRecords(existing, incoming);
    expect(records.some((r) => r.positionId === "only-f123")).toBe(false);
    expect(countFamilyMembersInRecords(records, FID.F123)).toBe(1);
    expect(countFamilyMembersInRecords(records, FID.F456)).toBe(1);
  });

  it("CASE G — idempotency: double UPDATE leaves one F123 set, no duplicates", () => {
    const existing = [
      position("p1", {
        S1: entry("S1", { familyId: FID.F123, marker: "v1-a" }),
      }),
      position("p2", {
        S1: entry("S1", { familyId: FID.F123, marker: "v1-b" }),
      }),
    ];
    const incoming = [
      position("p1", {
        S1: entry("S1", { familyId: FID.F123, marker: "v2-a" }),
      }),
      position("p2", {
        S1: entry("S1", { familyId: FID.F123, marker: "v2-b" }),
      }),
    ];
    const once = replaceFamiliesInPublishedRecords(existing, incoming).records;
    const twice = replaceFamiliesInPublishedRecords(once, incoming).records;
    expect(countFamilyMembersInRecords(once, FID.F123)).toBe(2);
    expect(countFamilyMembersInRecords(twice, FID.F123)).toBe(2);
    expect(familyMarkers(once, FID.F123)).toEqual(["v2-a", "v2-b"]);
    expect(familyMarkers(twice, FID.F123)).toEqual(["v2-a", "v2-b"]);
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice));
  });

  it("CASE H — legacy no-familyId preserved (no family inference)", () => {
    const legacy = entry("S1", { marker: "legacy-no-fid" });
    expect(legacy.familyId).toBeUndefined();
    const existing = [
      position("legacy-pos", { S1: legacy }),
      position("f-other", {
        S2: entry("S2", { familyId: FID.F999, marker: "other" }),
      }),
    ];
    const incoming = [
      position("f123-pos", {
        S1: entry("S1", { familyId: FID.F123, marker: "new" }),
      }),
    ];
    const { records } = replaceFamiliesInPublishedRecords(existing, incoming);
    const legacyRec = records.find((r) => r.positionId === "legacy-pos");
    expect(legacyRec).toBeDefined();
    expect(legacyRec!.strategies.S1?.familyId).toBeUndefined();
    expect(legacyRec!.strategies.S1?.ai?.text).toBe("legacy-no-fid");
    expect(countFamilyMembersInRecords(records, FID.F123)).toBe(1);
    expect(countFamilyMembersInRecords(records, FID.F999)).toBe(1);
  });

  it("CASE I — different positionId stale member still purged by familyId", () => {
    const existing = [
      position(
        "P1",
        {
          S1: entry("S1", { familyId: FID.F123, marker: "stale-on-P1" }),
        },
        ballsP1
      ),
    ];
    const incoming = [
      position(
        "P2",
        {
          S1: entry("S1", { familyId: FID.F123, marker: "fresh-on-P2" }),
        },
        ballsP2
      ),
    ];
    const { records } = replaceFamiliesInPublishedRecords(existing, incoming);
    expect(countFamilyMembersInRecords(records, FID.F123)).toBe(1);
    expect(familyMarkers(records, FID.F123)).toEqual(["fresh-on-P2"]);
    expect(records.some((r) => r.positionId === "P1")).toBe(false);
    expect(records.some((r) => r.positionId === "P2")).toBe(true);
  });

  it("CASE J — unrelated slots preserved (legacy + other family)", () => {
    const existing = [
      position("multi", {
        S1: entry("S1", { familyId: FID.F123, marker: "s1-old" }),
        S2: entry("S2", { marker: "s2-legacy" }),
        S3: entry("S3", { familyId: FID.F456, marker: "s3-keep" }),
      }),
    ];
    expect(existing[0].strategies.S2?.familyId).toBeUndefined();
    const incoming = [
      position("multi", {
        S1: entry("S1", { familyId: FID.F123, marker: "s1-new" }),
      }),
    ];
    const { records } = replaceFamiliesInPublishedRecords(existing, incoming);
    expect(records).toHaveLength(1);
    expect(records[0].strategies.S1?.ai?.text).toBe("s1-new");
    expect(records[0].strategies.S1?.familyId).toBe(FID.F123);
    expect(records[0].strategies.S2?.familyId).toBeUndefined();
    expect(records[0].strategies.S2?.ai?.text).toBe("s2-legacy");
    expect(records[0].strategies.S3?.familyId).toBe(FID.F456);
    expect(records[0].strategies.S3?.ai?.text).toBe("s3-keep");
  });

  it("does not use positionId as family identity (purge ignores positionId alone)", () => {
    const existing = [
      position("same-pos", {
        S1: entry("S1", { familyId: FID.FA, marker: "a" }),
        S2: entry("S2", { familyId: FID.FB, marker: "b" }),
      }),
    ];
    const afterPurge = purgeFamilyIdsFromPublishedRecords(existing, [FID.FA]);
    expect(afterPurge).toHaveLength(1);
    expect(afterPurge[0].positionId).toBe("same-pos");
    expect(afterPurge[0].strategies.S1).toBeUndefined();
    expect(afterPurge[0].strategies.S2?.familyId).toBe(FID.FB);
  });
});

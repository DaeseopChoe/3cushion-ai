/**
 * M1–M20 — Legacy Product Meta Migration dry-run contracts.
 * Never writes real repo dataset positions.json files.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { bindDomainContractSupply } from "../runtimeContractSupply";
import type { DatasetExportPayload } from "../datasetExport";
import type { StrategyEntry } from "../positionSearchEngine";
import { CUE_C3_PRODUCT_MEMBER_ORIGIN } from "./buildCueC3ProductMembers";
import {
  collectChangedJsonPaths,
  dryRunRepairLeafPayload,
  formatDryRunReport,
  runLegacyProductMetaMigrationDryRun,
  type MigrationFs,
  type SourceState,
} from "./legacyProductMetaMigration";
import { rebuildCanonicalMemberMeta } from "./rebuildCanonicalMemberMeta";

beforeAll(() => {
  bindDomainContractSupply({
    getFormulaExpr: () => "C1_f = CO_f - C3_r",
    getFormulaHash: () => "h1",
    getAnchorsData: () => undefined,
  });
});

const CORRECTIONS = {
  departure: 0,
  spin: 0,
  slide: 0,
  draw: 0,
  curve_ratio: 0,
};

function productEntry(
  overrides: Partial<StrategyEntry> & { omitMeta?: boolean } = {}
): StrategyEntry {
  const { omitMeta, ...rest } = overrides;
  const base: StrategyEntry = {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "옆돌리기",
    },
    sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
    corrections: { ...CORRECTIONS },
    familyId: "fm_prod",
    memberId: "mb_prod_1",
    memberOrigin: CUE_C3_PRODUCT_MEMBER_ORIGIN,
    generatedFromMemberId: "mb_base",
    derivedRule: "CUE_C3_CARTESIAN_PRODUCT_V1",
    derivedStep: "cue_c3:cue_impact:t:0.100000|c3plus:seg:0:t:0.000000",
    track: "B2T_L",
    hpT: { T: "8/8" },
    meta: {
      impact: { x: 1, y: 2 },
      final: { x: 3, y: 4 },
      angle_ci: 0.1,
      angle_fs: 0.2,
    },
    ...rest,
  };
  if (omitMeta) {
    const { meta: _m, ...noMeta } = base;
    return noMeta as StrategyEntry;
  }
  return base;
}

function authoredEntry(omitMeta = false): StrategyEntry {
  const e: StrategyEntry = {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "옆돌리기",
    },
    sysInputs: { CO_f: 40 },
    corrections: { ...CORRECTIONS },
    familyId: "fm_auth",
    memberId: "mb_auth",
    memberOrigin: "AUTHORED",
    track: "B2T_L",
    meta: {
      impact: { x: 10, y: 10 },
      final: { x: 20, y: 20 },
      angle_ci: 0.5,
      angle_fs: 0.6,
    },
  };
  if (omitMeta) {
    const { meta: _m, ...rest } = e;
    return rest as StrategyEntry;
  }
  return e;
}

function leafPayload(
  records: DatasetExportPayload["records"]
): DatasetExportPayload {
  return {
    schemaVersion: 2,
    shotType: "옆돌리기",
    systemId: "5_half_system",
    systemLabel: "파이브앤하프",
    exportedAt: "2026-08-27T00:00:00.000Z",
    records,
  };
}

function balls() {
  return {
    cue: { x: 15, y: 16 },
    target: { x: 40, y: 16 },
    second: { x: 25, y: 8 },
  };
}

describe("legacyProductMetaMigration dry-run", () => {
  const temps: string[] = [];
  afterEach(() => {
    for (const t of temps) {
      try {
        fs.rmSync(t, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
    temps.length = 0;
  });

  it("M1/M15/M16 — missing Product meta → deterministic rebuild + valid", () => {
    const payload = leafPayload([
      {
        positionId: "p1",
        balls: balls(),
        strategies: { S1: productEntry({ omitMeta: true }) },
        schemaVersion: 1,
      },
    ]);
    const a = dryRunRepairLeafPayload({
      relativePosix: "dataset/옆돌리기/파이브앤하프/positions.json",
      absolutePath: "/tmp/a.json",
      sourceState: "HEAD_MATCH",
      payload,
    });
    const b = dryRunRepairLeafPayload({
      relativePosix: "dataset/옆돌리기/파이브앤하프/positions.json",
      absolutePath: "/tmp/a.json",
      sourceState: "HEAD_MATCH",
      payload,
    });
    expect(a.repairable).toBe(1);
    expect(a.unrepairable).toBe(0);
    expect(a.beforeValid).toBe(false);
    expect(a.afterValid).toBe(true);
    expect(a.result).toBe("SAFE_TO_APPLY");
    expect(a.repairedPayload?.records[0]?.strategies.S1?.meta).toBeTruthy();
    const expected = rebuildCanonicalMemberMeta({
      balls: balls(),
      signature: productEntry().signature,
      sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
      slot: "S1",
      track: "B2T_L",
      hpT: { T: "8/8" },
    });
    expect(a.repairedPayload!.records[0]!.strategies.S1!.meta).toEqual(expected);
    expect(JSON.stringify(a.repairedPayload)).toEqual(
      JSON.stringify(b.repairedPayload)
    );
    expect(a.deterministicCheck).toBe(true);
  });

  it("M2/M20 — existing valid meta untouched", () => {
    const existing = productEntry();
    const payload = leafPayload([
      {
        positionId: "p1",
        balls: balls(),
        strategies: { S1: existing },
        schemaVersion: 1,
      },
    ]);
    const r = dryRunRepairLeafPayload({
      relativePosix: "dataset/x/positions.json",
      absolutePath: "/tmp/x.json",
      sourceState: "HEAD_MATCH",
      payload,
    });
    expect(r.repairable).toBe(0);
    expect(r.metaMissingProduct).toBe(0);
    expect(r.existingMetaPreserved).toBe(true);
    expect(r.entries[0]?.status).toBe("SKIP_HAS_META");
    expect(r.repairedPayload).toBeNull();
  });

  it("M3 — non-Product missing meta → skip (not repair)", () => {
    const payload = leafPayload([
      {
        positionId: "p1",
        balls: balls(),
        strategies: { S1: authoredEntry(true) },
        schemaVersion: 1,
      },
    ]);
    const r = dryRunRepairLeafPayload({
      relativePosix: "dataset/x/positions.json",
      absolutePath: "/tmp/x.json",
      sourceState: "HEAD_MATCH",
      payload,
    });
    expect(r.repairable).toBe(0);
    expect(r.metaMissingProduct).toBe(0);
    expect(r.entries[0]?.status).toBe("SKIP_NON_PRODUCT_MISSING_META");
  });

  it("M4 — missing required Product input → UNREPAIRABLE", () => {
    const entry = productEntry({ omitMeta: true });
    delete (entry as { track?: string }).track;
    const payload = leafPayload([
      {
        positionId: "p1",
        balls: balls(),
        strategies: { S1: entry },
        schemaVersion: 1,
      },
    ]);
    const r = dryRunRepairLeafPayload({
      relativePosix: "dataset/x/positions.json",
      absolutePath: "/tmp/x.json",
      sourceState: "HEAD_MATCH",
      payload,
    });
    expect(r.unrepairable).toBe(1);
    expect(r.repairable).toBe(0);
    expect(r.result).toBe("BLOCKED");
    expect(r.entries[0]?.missingInputs).toContain("track");
  });

  it("M5–M14 — identity/sys/balls/order/meta-only guards", () => {
    const payload = leafPayload([
      {
        positionId: "p_keep",
        balls: balls(),
        strategies: {
          S1: productEntry({
            omitMeta: true,
            familyId: "fm_keep",
            memberId: "mb_keep",
          }),
        },
        schemaVersion: 1,
      },
      {
        positionId: "p_with_meta",
        balls: {
          cue: { x: 12, y: 12 },
          target: { x: 50, y: 20 },
          second: { x: 30, y: 10 },
        },
        strategies: {
          S1: productEntry({
            memberId: "mb_has_meta",
            meta: {
              impact: { x: 9, y: 9 },
              final: { x: 8, y: 8 },
              angle_ci: 1,
              angle_fs: 2,
            },
          }),
        },
        schemaVersion: 1,
      },
    ]);
    const r = dryRunRepairLeafPayload({
      relativePosix: "dataset/x/positions.json",
      absolutePath: "/tmp/x.json",
      sourceState: "HEAD_MATCH",
      payload,
    });
    expect(r.repairable).toBe(1);
    expect(r.identityChanges).toBe(false);
    expect(r.sysInputChanges).toBe(false);
    expect(r.correctionChanges).toBe(false);
    expect(r.ballChanges).toBe(false);
    expect(r.recordOrderPreserved).toBe(true);
    expect(r.onlyMetaPathsChanged).toBe(true);
    expect(r.nonMetaChanges).toBe(false);
    expect(r.existingMetaPreserved).toBe(true);
    expect(r.repairedPayload!.records[0]!.positionId).toBe("p_keep");
    expect(r.repairedPayload!.records[0]!.strategies.S1!.familyId).toBe("fm_keep");
    expect(r.repairedPayload!.records[0]!.strategies.S1!.memberId).toBe("mb_keep");
    expect(r.repairedPayload!.records[0]!.strategies.S1!.memberOrigin).toBe(
      CUE_C3_PRODUCT_MEMBER_ORIGIN
    );
    expect(r.repairedPayload!.records[1]!.strategies.S1!.meta).toEqual({
      impact: { x: 9, y: 9 },
      final: { x: 8, y: 8 },
      angle_ci: 1,
      angle_fs: 2,
    });
    const changed = collectChangedJsonPaths(payload, r.repairedPayload!);
    expect(changed.every((p) => p.includes(".meta"))).toBe(true);
  });

  it("M17/M18/M19 — dry-run writes no files; dirty detected; multi-leaf scan", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mig-meta-"));
    temps.push(root);
    const leafA = path.join(root, "옆돌리기", "파이브앤하프");
    const leafB = path.join(root, "뒤돌리기", "파이브앤하프");
    fs.mkdirSync(leafA, { recursive: true });
    fs.mkdirSync(leafB, { recursive: true });
    const payloadA = leafPayload([
      {
        positionId: "p1",
        balls: balls(),
        strategies: { S1: productEntry({ omitMeta: true }) },
        schemaVersion: 1,
      },
    ]);
    const payloadB = leafPayload([
      {
        positionId: "p2",
        balls: balls(),
        strategies: { S1: productEntry({ omitMeta: true, memberId: "mb_b" }) },
        schemaVersion: 1,
      },
    ]);
    const pathA = path.join(leafA, "positions.json");
    const pathB = path.join(leafB, "positions.json");
    fs.writeFileSync(pathA, JSON.stringify(payloadA), "utf8");
    fs.writeFileSync(pathB, JSON.stringify(payloadB), "utf8");
    const beforeA = fs.readFileSync(pathA, "utf8");
    const beforeB = fs.readFileSync(pathB, "utf8");

    const states: Record<string, SourceState> = {
      "dataset/옆돌리기/파이브앤하프/positions.json": "HEAD_MATCH",
      "dataset/뒤돌리기/파이브앤하프/positions.json": "DIRTY_WORKTREE",
    };
    const migFs: MigrationFs = {
      readFile: (abs) => fs.readFileSync(abs, "utf8"),
      listLeafAbsolutePaths: (datasetRoot) => {
        const out: string[] = [];
        const walk = (d: string) => {
          for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
            const abs = path.join(d, ent.name);
            if (ent.isDirectory()) walk(abs);
            else if (ent.name === "positions.json") out.push(abs);
          }
        };
        walk(datasetRoot);
        return out;
      },
      toRelativePosix: (datasetRoot, abs) =>
        `dataset/${path.relative(datasetRoot, abs).split(path.sep).join("/")}`,
      resolveSourceState: (rel) => states[rel] ?? "UNKNOWN",
    };

    const report = runLegacyProductMetaMigrationDryRun({
      datasetRoot: root,
      fs: migFs,
    });
    expect(report.dryRun).toBe(true);
    expect(report.totalLeaves).toBe(2);
    expect(report.affectedLeaves).toBe(2);
    expect(report.totalRepairable).toBe(2);

    const side = report.leaves.find((l) => l.relativePosix.includes("옆돌리기"))!;
    const back = report.leaves.find((l) => l.relativePosix.includes("뒤돌리기"))!;
    expect(side.sourceState).toBe("HEAD_MATCH");
    expect(side.result).toBe("SAFE_TO_APPLY");
    expect(back.sourceState).toBe("DIRTY_WORKTREE");
    expect(back.result).toBe("BLOCKED");
    expect(back.blockers).toContain("SOURCE_STATE:DIRTY_WORKTREE");

    expect(fs.readFileSync(pathA, "utf8")).toBe(beforeA);
    expect(fs.readFileSync(pathB, "utf8")).toBe(beforeB);

    const text = formatDryRunReport(report);
    expect(text).toContain("DRY RUN: YES");
    expect(text).toContain("SOURCE STATE: DIRTY_WORKTREE");
  });
});

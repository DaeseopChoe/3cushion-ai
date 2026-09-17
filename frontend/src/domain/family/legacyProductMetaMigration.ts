/**
 * Legacy Product Meta Migration — DRY-RUN ONLY.
 *
 * Repairs StrategyEntry.meta for DERIVED_CUE_C3_PRODUCT entries that omit meta,
 * via rebuildCanonicalMemberMeta (evaluateStrategy → buildStrategyMeta).
 *
 * Never writes dataset files. Apply is deferred to a later stage.
 */

import type { DatasetExportPayload } from "../datasetExport";
import { validatePublishedExportCandidate } from "../publishedFamilyPublish";
import type {
  Ball3,
  Point,
  PositionRecord,
  StrategyEntry,
  StrategyMeta,
} from "../positionSearchEngine";
import { CUE_C3_PRODUCT_MEMBER_ORIGIN } from "./buildCueC3ProductMembers";
import { rebuildCanonicalMemberMeta } from "./rebuildCanonicalMemberMeta";

const SLOTS = ["S1", "S2", "S3"] as const;

export type SourceState =
  | "HEAD_MATCH"
  | "DIRTY_WORKTREE"
  | "UNTRACKED"
  | "UNKNOWN";

export type EntryMigrationStatus =
  | "REPAIRABLE"
  | "UNREPAIRABLE"
  | "SKIP_HAS_META"
  | "SKIP_NOT_PRODUCT"
  | "SKIP_NON_PRODUCT_MISSING_META";

export type EntryMigrationDiagnosis = {
  recordIndex: number;
  slot: (typeof SLOTS)[number];
  positionId: string;
  familyId: string;
  memberId: string;
  memberOrigin: string;
  status: EntryMigrationStatus;
  missingInputs?: string[];
  reason?: string;
};

export type LeafMigrationDryRunResult = {
  relativePosix: string;
  absolutePath: string;
  sourceState: SourceState;
  records: number;
  strategyEntries: number;
  productEntries: number;
  metaMissingProduct: number;
  repairable: number;
  unrepairable: number;
  beforeValid: boolean;
  beforeIssues: string[];
  afterValid: boolean | null;
  afterIssues: string[];
  afterMetaMissingRemaining: number;
  afterOtherIssues: string[];
  metaChanges: number;
  nonMetaChanges: boolean;
  onlyMetaPathsChanged: boolean;
  identityChanges: boolean;
  sysInputChanges: boolean;
  correctionChanges: boolean;
  ballChanges: boolean;
  existingMetaPreserved: boolean;
  recordOrderPreserved: boolean;
  deterministicCheck: boolean;
  result: "SAFE_TO_APPLY" | "BLOCKED" | "UNAFFECTED";
  blockers: string[];
  entries: EntryMigrationDiagnosis[];
  /** In-memory repaired payload (null when nothing repairable / blocked early). */
  repairedPayload: DatasetExportPayload | null;
};

export type RepoMigrationDryRunReport = {
  dryRun: true;
  datasetRoot: string;
  totalLeaves: number;
  affectedLeaves: number;
  totalProductEntries: number;
  totalMetaMissingProduct: number;
  totalRepairable: number;
  totalUnrepairable: number;
  leaves: LeafMigrationDryRunResult[];
};

export type MigrationFs = {
  readFile: (absolutePath: string) => string;
  listLeafAbsolutePaths: (datasetRoot: string) => string[];
  toRelativePosix: (datasetRoot: string, absolutePath: string) => string;
  resolveSourceState: (relativePosix: string) => SourceState;
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function isFinitePoint(p: unknown): p is Point {
  return (
    isPlainObject(p) &&
    typeof p.x === "number" &&
    typeof p.y === "number" &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y)
  );
}

function isFiniteBall3(balls: unknown): balls is Ball3 {
  if (!isPlainObject(balls)) return false;
  return (
    isFinitePoint(balls.cue) &&
    isFinitePoint(balls.target) &&
    isFinitePoint(balls.second)
  );
}

function hasMeta(entry: StrategyEntry): boolean {
  return entry.meta != null && isPlainObject(entry.meta);
}

function metaSemanticEqual(a: StrategyMeta, b: StrategyMeta): boolean {
  return (
    a.impact.x === b.impact.x &&
    a.impact.y === b.impact.y &&
    a.final.x === b.final.x &&
    a.final.y === b.final.y &&
    a.angle_ci === b.angle_ci &&
    a.angle_fs === b.angle_fs
  );
}

/**
 * Collect JSON paths that differ between a and b.
 * Arrays compared by index; objects by keys (union).
 */
export function collectChangedJsonPaths(
  a: unknown,
  b: unknown,
  base = ""
): string[] {
  if (Object.is(a, b)) return [];
  if (a === null || b === null || typeof a !== typeof b) {
    return [base || "$"];
  }
  if (typeof a !== "object") {
    return a === b ? [] : [base || "$"];
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return [base || "$"];
    }
    const out: string[] = [];
    for (let i = 0; i < a.length; i++) {
      out.push(
        ...collectChangedJsonPaths(a[i], b[i], `${base}[${i}]`)
      );
    }
    return out;
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
  const out: string[] = [];
  for (const k of [...keys].sort()) {
    const path = base ? `${base}.${k}` : k;
    if (!(k in ao) || !(k in bo)) {
      out.push(path);
      continue;
    }
    out.push(...collectChangedJsonPaths(ao[k], bo[k], path));
  }
  return out;
}

function isAllowedMetaChangePath(path: string): boolean {
  return /^records\[\d+\]\.strategies\.S[123]\.meta(?:\.|$)/.test(path);
}

function stripMetaFromRecords(records: PositionRecord[]): PositionRecord[] {
  return records.map((rec) => {
    const strategies = { ...rec.strategies };
    for (const slot of SLOTS) {
      const e = strategies[slot];
      if (!e) continue;
      const { meta: _m, ...rest } = e;
      strategies[slot] = rest as StrategyEntry;
    }
    return { ...rec, strategies };
  });
}

function assessRequiredInputs(
  balls: Ball3 | undefined,
  entry: StrategyEntry,
  slot: string
): string[] {
  const missing: string[] = [];
  if (!balls || !isFiniteBall3(balls)) missing.push("balls");
  if (!entry.signature || !isPlainObject(entry.signature)) {
    missing.push("signature");
  } else {
    if (typeof entry.signature.systemId !== "string" || !entry.signature.systemId.trim()) {
      missing.push("signature.systemId");
    }
    if (typeof entry.signature.formulaHash !== "string") {
      missing.push("signature.formulaHash");
    }
    if (typeof entry.signature.shotType !== "string" || !entry.signature.shotType.trim()) {
      missing.push("signature.shotType");
    }
  }
  if (entry.sysInputs == null || !isPlainObject(entry.sysInputs)) {
    missing.push("sysInputs");
  }
  if (entry.corrections == null || !isPlainObject(entry.corrections)) {
    missing.push("corrections");
  }
  if (typeof entry.track !== "string" || !entry.track.trim()) {
    missing.push("track");
  }
  if (typeof entry.slot !== "string" || entry.slot !== slot) {
    // slot key is authoritative; entry.slot should match when present
    if (entry.slot != null && entry.slot !== slot) missing.push("slot");
  }
  return missing;
}

function tryRebuildMeta(
  balls: Ball3,
  entry: StrategyEntry,
  slot: (typeof SLOTS)[number]
): { ok: true; meta: StrategyMeta } | { ok: false; reason: string } {
  try {
    const hpT =
      entry.hpT != null && isPlainObject(entry.hpT) && typeof (entry.hpT as { T?: unknown }).T === "string"
        ? { T: (entry.hpT as { T: string }).T }
        : undefined;
    const meta = rebuildCanonicalMemberMeta({
      balls,
      signature: entry.signature,
      sysInputs: { ...(entry.sysInputs ?? {}) },
      slot,
      track: entry.track,
      hpT,
    });
    if (!isFinitePoint(meta.impact) || !isFinitePoint(meta.final)) {
      return { ok: false, reason: "rebuild-non-finite-meta" };
    }
    if (
      typeof meta.angle_ci !== "number" ||
      typeof meta.angle_fs !== "number" ||
      !Number.isFinite(meta.angle_ci) ||
      !Number.isFinite(meta.angle_fs)
    ) {
      return { ok: false, reason: "rebuild-non-finite-angles" };
    }
    return { ok: true, meta };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}

function countMetaMissingInRecords(
  records: PositionRecord[]
): { any: number; product: number } {
  let any = 0;
  let product = 0;
  for (const rec of records) {
    for (const slot of SLOTS) {
      const entry = rec.strategies?.[slot];
      if (!entry) continue;
      if (hasMeta(entry)) continue;
      any += 1;
      if (entry.memberOrigin === CUE_C3_PRODUCT_MEMBER_ORIGIN) product += 1;
    }
  }
  return { any, product };
}

function validatePayload(
  payload: DatasetExportPayload
): { ok: boolean; issues: string[] } {
  const v = validatePublishedExportCandidate(payload);
  if (v.ok) return { ok: true, issues: [] };
  return { ok: false, issues: v.issues };
}

/**
 * Dry-run repair for a single Published leaf payload (in memory).
 */
export function dryRunRepairLeafPayload(args: {
  relativePosix: string;
  absolutePath: string;
  sourceState: SourceState;
  payload: DatasetExportPayload;
}): LeafMigrationDryRunResult {
  const original = cloneJson(args.payload);
  const entries: EntryMigrationDiagnosis[] = [];
  let strategyEntries = 0;
  let productEntries = 0;
  let metaMissingProduct = 0;
  let repairable = 0;
  let unrepairable = 0;

  const repaired = cloneJson(original);
  const records = repaired.records ?? [];

  for (let ri = 0; ri < records.length; ri++) {
    const rec = records[ri]!;
    for (const slot of SLOTS) {
      const entry = rec.strategies?.[slot];
      if (!entry) continue;
      strategyEntries += 1;
      const isProduct = entry.memberOrigin === CUE_C3_PRODUCT_MEMBER_ORIGIN;
      if (isProduct) productEntries += 1;

      const baseDiag = {
        recordIndex: ri,
        slot,
        positionId: String(rec.positionId ?? ""),
        familyId: String(entry.familyId ?? ""),
        memberId: String(entry.memberId ?? ""),
        memberOrigin: String(entry.memberOrigin ?? ""),
      };

      if (hasMeta(entry)) {
        entries.push({ ...baseDiag, status: "SKIP_HAS_META" });
        continue;
      }

      if (!isProduct) {
        entries.push({
          ...baseDiag,
          status: "SKIP_NON_PRODUCT_MISSING_META",
          reason: "meta-missing-but-not-DERIVED_CUE_C3_PRODUCT",
        });
        continue;
      }

      metaMissingProduct += 1;
      const missingInputs = assessRequiredInputs(rec.balls, entry, slot);
      if (missingInputs.length > 0) {
        unrepairable += 1;
        entries.push({
          ...baseDiag,
          status: "UNREPAIRABLE",
          missingInputs,
          reason: "missing-required-inputs",
        });
        continue;
      }

      const rebuilt = tryRebuildMeta(rec.balls, entry, slot);
      if (!rebuilt.ok) {
        unrepairable += 1;
        entries.push({
          ...baseDiag,
          status: "UNREPAIRABLE",
          reason: rebuilt.reason,
        });
        continue;
      }

      // Insert meta only on clone
      const nextEntry: StrategyEntry = {
        ...entry,
        meta: cloneJson(rebuilt.meta),
      };
      // Semantic: inserted meta === rebuild output
      if (!metaSemanticEqual(nextEntry.meta!, rebuilt.meta)) {
        unrepairable += 1;
        entries.push({
          ...baseDiag,
          status: "UNREPAIRABLE",
          reason: "meta-semantic-mismatch",
        });
        continue;
      }

      rec.strategies[slot] = nextEntry;
      repairable += 1;
      entries.push({ ...baseDiag, status: "REPAIRABLE" });
    }
  }

  const before = validatePayload(original);
  const after =
    repairable > 0 ? validatePayload(repaired) : { ok: before.ok, issues: before.issues };
  const missingAfter = countMetaMissingInRecords(repaired.records ?? []);
  const afterMetaMissingRemaining = missingAfter.product;
  const afterOtherIssues = after.issues.filter((i) => !i.includes("meta:missing"));

  // Diff guards
  const changed = collectChangedJsonPaths(original, repaired);
  const nonMeta = changed.filter((p) => !isAllowedMetaChangePath(p));
  const onlyMetaPathsChanged = nonMeta.length === 0;

  const identityBaseOrig = stripMetaFromRecords(original.records ?? []).map((r) => ({
    positionId: r.positionId,
    strategies: Object.fromEntries(
      SLOTS.map((s) => {
        const e = r.strategies?.[s];
        if (!e) return [s, null];
        return [
          s,
          {
            familyId: e.familyId,
            memberId: e.memberId,
            memberOrigin: e.memberOrigin,
          },
        ];
      })
    ),
  }));
  const identityBaseRep = stripMetaFromRecords(repaired.records ?? []).map((r) => ({
    positionId: r.positionId,
    strategies: Object.fromEntries(
      SLOTS.map((s) => {
        const e = r.strategies?.[s];
        if (!e) return [s, null];
        return [
          s,
          {
            familyId: e.familyId,
            memberId: e.memberId,
            memberOrigin: e.memberOrigin,
          },
        ];
      })
    ),
  }));
  const identityChanges =
    JSON.stringify(identityBaseOrig) !== JSON.stringify(identityBaseRep);

  const calcOrig = (original.records ?? []).map((r) => ({
    balls: r.balls,
    strategies: Object.fromEntries(
      SLOTS.map((s) => {
        const e = r.strategies?.[s];
        if (!e) return [s, null];
        return [
          s,
          {
            signature: e.signature,
            sysInputs: e.sysInputs,
            corrections: e.corrections,
            hpT: e.hpT,
            track: e.track,
            ai: e.ai,
            str: e.str,
          },
        ];
      })
    ),
  }));
  const calcRep = (repaired.records ?? []).map((r) => ({
    balls: r.balls,
    strategies: Object.fromEntries(
      SLOTS.map((s) => {
        const e = r.strategies?.[s];
        if (!e) return [s, null];
        return [
          s,
          {
            signature: e.signature,
            sysInputs: e.sysInputs,
            corrections: e.corrections,
            hpT: e.hpT,
            track: e.track,
            ai: e.ai,
            str: e.str,
          },
        ];
      })
    ),
  }));
  const calcChanged = JSON.stringify(calcOrig) !== JSON.stringify(calcRep);
  const ballChanges =
    JSON.stringify((original.records ?? []).map((r) => r.balls)) !==
    JSON.stringify((repaired.records ?? []).map((r) => r.balls));
  const sysInputChanges = calcChanged; // includes sys/corrections/signature/hpT/track/ai/str
  const correctionChanges = calcChanged;

  // Existing meta preserved: entries that had meta must be byte-equal
  let existingMetaPreserved = true;
  for (let ri = 0; ri < (original.records ?? []).length; ri++) {
    for (const slot of SLOTS) {
      const o = original.records![ri]?.strategies?.[slot];
      const n = repaired.records![ri]?.strategies?.[slot];
      if (!o || !hasMeta(o)) continue;
      if (JSON.stringify(o.meta) !== JSON.stringify(n?.meta)) {
        existingMetaPreserved = false;
      }
    }
  }

  const recordOrderPreserved =
    (original.records ?? []).length === (repaired.records ?? []).length &&
    (original.records ?? []).every(
      (r, i) => r.positionId === repaired.records![i]?.positionId
    );

  // Determinism: second rebuild of same original → identical repaired
  const second = dryRunRepairLeafPayloadOnce(original);
  const deterministicCheck =
    JSON.stringify(repaired) === JSON.stringify(second.repaired);

  const blockers: string[] = [];
  if (args.sourceState === "DIRTY_WORKTREE") {
    blockers.push("SOURCE_STATE:DIRTY_WORKTREE");
  }
  if (unrepairable > 0) blockers.push(`UNREPAIRABLE:${unrepairable}`);
  if (!onlyMetaPathsChanged) blockers.push("MIGRATION_SCOPE_VIOLATION");
  if (identityChanges) blockers.push("IDENTITY_CHANGES");
  if (calcChanged) blockers.push("CALC_INPUT_CHANGES");
  if (ballChanges) blockers.push("BALL_CHANGES");
  if (!existingMetaPreserved) blockers.push("EXISTING_META_MUTATED");
  if (!recordOrderPreserved) blockers.push("RECORD_ORDER_CHANGED");
  if (repairable > 0 && afterMetaMissingRemaining > 0) {
    blockers.push("META_MISSING_REMAINING");
  }
  if (repairable > 0 && !after.ok) blockers.push("AFTER_VALIDATION_FAILED");
  if (!deterministicCheck) blockers.push("NON_DETERMINISTIC");

  let result: LeafMigrationDryRunResult["result"];
  if (metaMissingProduct === 0 && repairable === 0 && unrepairable === 0) {
    result = "UNAFFECTED";
  } else if (
    repairable > 0 &&
    unrepairable === 0 &&
    afterMetaMissingRemaining === 0 &&
    after.ok &&
    blockers.length === 0 &&
    args.sourceState === "HEAD_MATCH"
  ) {
    result = "SAFE_TO_APPLY";
  } else {
    result = "BLOCKED";
  }

  return {
    relativePosix: args.relativePosix,
    absolutePath: args.absolutePath,
    sourceState: args.sourceState,
    records: (original.records ?? []).length,
    strategyEntries,
    productEntries,
    metaMissingProduct,
    repairable,
    unrepairable,
    beforeValid: before.ok,
    beforeIssues: before.issues,
    afterValid: repairable > 0 ? after.ok : null,
    afterIssues: repairable > 0 ? after.issues : [],
    afterMetaMissingRemaining: repairable > 0 ? afterMetaMissingRemaining : 0,
    afterOtherIssues: repairable > 0 ? afterOtherIssues : [],
    metaChanges: repairable,
    nonMetaChanges: nonMeta.length > 0,
    onlyMetaPathsChanged,
    identityChanges,
    sysInputChanges,
    correctionChanges,
    ballChanges,
    existingMetaPreserved,
    recordOrderPreserved,
    deterministicCheck,
    result,
    blockers,
    entries,
    repairedPayload: repairable > 0 ? repaired : null,
  };
}

/** Internal second pass without sourceState side effects (determinism). */
function dryRunRepairLeafPayloadOnce(payload: DatasetExportPayload): {
  repaired: DatasetExportPayload;
} {
  const repaired = cloneJson(payload);
  for (let ri = 0; ri < (repaired.records ?? []).length; ri++) {
    const rec = repaired.records![ri]!;
    for (const slot of SLOTS) {
      const entry = rec.strategies?.[slot];
      if (!entry) continue;
      if (hasMeta(entry)) continue;
      if (entry.memberOrigin !== CUE_C3_PRODUCT_MEMBER_ORIGIN) continue;
      if (assessRequiredInputs(rec.balls, entry, slot).length > 0) continue;
      const rebuilt = tryRebuildMeta(rec.balls, entry, slot);
      if (!rebuilt.ok) continue;
      rec.strategies[slot] = { ...entry, meta: cloneJson(rebuilt.meta) };
    }
  }
  return { repaired };
}

function parseLeafPayload(rawText: string): DatasetExportPayload {
  const raw = JSON.parse(rawText) as DatasetExportPayload;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("leaf-not-object");
  }
  return raw;
}

/**
 * Repo-wide dry-run scan. Read-only — never writes.
 */
export function runLegacyProductMetaMigrationDryRun(args: {
  datasetRoot: string;
  fs: MigrationFs;
}): RepoMigrationDryRunReport {
  const leavesAbs = args.fs.listLeafAbsolutePaths(args.datasetRoot).sort();
  const leaves: LeafMigrationDryRunResult[] = [];

  for (const abs of leavesAbs) {
    const relativePosix = args.fs.toRelativePosix(args.datasetRoot, abs);
    const sourceState = args.fs.resolveSourceState(
      relativePosix.startsWith("dataset/")
        ? relativePosix
        : `dataset/${relativePosix}`
    );
    let payload: DatasetExportPayload;
    try {
      payload = parseLeafPayload(args.fs.readFile(abs));
    } catch (e) {
      leaves.push({
        relativePosix,
        absolutePath: abs,
        sourceState,
        records: 0,
        strategyEntries: 0,
        productEntries: 0,
        metaMissingProduct: 0,
        repairable: 0,
        unrepairable: 0,
        beforeValid: false,
        beforeIssues: [e instanceof Error ? e.message : String(e)],
        afterValid: null,
        afterIssues: [],
        afterMetaMissingRemaining: 0,
        afterOtherIssues: [],
        metaChanges: 0,
        nonMetaChanges: false,
        onlyMetaPathsChanged: true,
        identityChanges: false,
        sysInputChanges: false,
        correctionChanges: false,
        ballChanges: false,
        existingMetaPreserved: true,
        recordOrderPreserved: true,
        deterministicCheck: true,
        result: "BLOCKED",
        blockers: ["LEAF_PARSE_FAILED"],
        entries: [],
        repairedPayload: null,
      });
      continue;
    }

    leaves.push(
      dryRunRepairLeafPayload({
        relativePosix,
        absolutePath: abs,
        sourceState,
        payload,
      })
    );
  }

  const affected = leaves.filter(
    (l) => l.metaMissingProduct > 0 || l.repairable > 0 || l.unrepairable > 0
  );

  return {
    dryRun: true,
    datasetRoot: args.datasetRoot,
    totalLeaves: leaves.length,
    affectedLeaves: affected.length,
    totalProductEntries: leaves.reduce((s, l) => s + l.productEntries, 0),
    totalMetaMissingProduct: leaves.reduce(
      (s, l) => s + l.metaMissingProduct,
      0
    ),
    totalRepairable: leaves.reduce((s, l) => s + l.repairable, 0),
    totalUnrepairable: leaves.reduce((s, l) => s + l.unrepairable, 0),
    leaves,
  };
}

export function formatDryRunReport(report: RepoMigrationDryRunReport): string {
  const lines: string[] = [];
  lines.push("DRY RUN: YES");
  lines.push(`DATASET ROOT: ${report.datasetRoot}`);
  lines.push(`TOTAL LEAVES: ${report.totalLeaves}`);
  lines.push(`AFFECTED LEAVES: ${report.affectedLeaves}`);
  lines.push(`TOTAL PRODUCT ENTRIES: ${report.totalProductEntries}`);
  lines.push(`TOTAL META-MISSING PRODUCT: ${report.totalMetaMissingProduct}`);
  lines.push(`TOTAL REPAIRABLE: ${report.totalRepairable}`);
  lines.push(`TOTAL UNREPAIRABLE: ${report.totalUnrepairable}`);
  lines.push("");

  for (const leaf of report.leaves) {
    if (
      leaf.metaMissingProduct === 0 &&
      leaf.repairable === 0 &&
      leaf.unrepairable === 0 &&
      leaf.result === "UNAFFECTED"
    ) {
      continue;
    }
    lines.push("========== LEAF ==========");
    lines.push(`LEAF: ${leaf.relativePosix}`);
    lines.push(`SOURCE STATE: ${leaf.sourceState}`);
    lines.push(`RECORDS: ${leaf.records}`);
    lines.push(`STRATEGY ENTRIES: ${leaf.strategyEntries}`);
    lines.push(`PRODUCT ENTRIES: ${leaf.productEntries}`);
    lines.push(`META MISSING: ${leaf.metaMissingProduct}`);
    lines.push(`REPAIRABLE: ${leaf.repairable}`);
    lines.push(`UNREPAIRABLE: ${leaf.unrepairable}`);
    lines.push(`BEFORE VALID: ${leaf.beforeValid ? "PASS" : "FAIL"}`);
    lines.push(
      `AFTER REPAIR VALID: ${
        leaf.afterValid == null ? "N/A" : leaf.afterValid ? "PASS" : "FAIL"
      }`
    );
    lines.push(
      `AFTER META-MISSING REMAINING: ${leaf.afterMetaMissingRemaining}`
    );
    if (leaf.afterOtherIssues.length) {
      lines.push(
        `AFTER OTHER ISSUES: ${leaf.afterOtherIssues.length} (meta repair may still be OK)`
      );
      for (const i of leaf.afterOtherIssues.slice(0, 8)) {
        lines.push(`  - ${i}`);
      }
    }
    lines.push(`META CHANGES: ${leaf.metaChanges}`);
    lines.push(`NON-META CHANGES: ${leaf.nonMetaChanges ? "YES" : "NO"}`);
    lines.push(`IDENTITY CHANGES: ${leaf.identityChanges ? "YES" : "NO"}`);
    lines.push(`SYSINPUT CHANGES: ${leaf.sysInputChanges ? "YES" : "NO"}`);
    lines.push(`CORRECTION CHANGES: ${leaf.correctionChanges ? "YES" : "NO"}`);
    lines.push(`BALL CHANGES: ${leaf.ballChanges ? "YES" : "NO"}`);
    lines.push(`RESULT: ${leaf.result}`);
    if (leaf.blockers.length) {
      lines.push(`BLOCKERS: ${leaf.blockers.join(", ")}`);
    }
    if (!leaf.beforeValid && leaf.beforeIssues.length) {
      lines.push("BEFORE ISSUES (sample):");
      for (const i of leaf.beforeIssues.slice(0, 8)) lines.push(`  - ${i}`);
    }
    const unrepaired = leaf.entries.filter((e) => e.status === "UNREPAIRABLE");
    if (unrepaired.length) {
      lines.push("UNREPAIRABLE ENTRIES:");
      for (const e of unrepaired.slice(0, 20)) {
        lines.push(
          `  - records[${e.recordIndex}].strategies.${e.slot} familyId=${e.familyId} memberId=${e.memberId} missing=${(e.missingInputs ?? []).join("|") || e.reason || ""}`
        );
      }
    }
    lines.push("");
  }

  lines.push("APPLY: NOT EXECUTED (dry-run only)");
  return lines.join("\n");
}

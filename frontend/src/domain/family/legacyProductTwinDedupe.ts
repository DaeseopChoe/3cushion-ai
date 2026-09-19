/**
 * Legacy Product Twin Dedupe — dry-run analysis + guarded single-leaf apply.
 *
 * Removes non-canonical Product twin PositionRecords that share
 * familyId::memberId with a canonical Product occurrence.
 *
 * Canonical keep owner = current Product SSOT reconstruction match:
 *   target Exact == base.balls.target
 *   cue on base Cue→Impact sample (Exact sampleCueImpactPoint or on-segment)
 *   second = Product scoring P (pair-shared Exact)
 *
 * Never regenerates IDs. Never rewrites balls/sys/meta.
 * Apply writes ONLY the clean 옆돌리기 leaf when all guards PASS.
 * Meta migration is intentionally out of scope.
 */

import fs from "node:fs";
import path from "node:path";

import { calcImpactBall } from "../../data/system/calculator";
import type { DatasetExportPayload } from "../datasetExport";
import { createPositionId } from "../positionId";
import { validatePublishedExportCandidate } from "../publishedFamilyPublish";
import type { Ball3, Point, PositionRecord, StrategyEntry } from "../positionSearchEngine";
import {
  CUE_C3_PRODUCT_DERIVED_RULE,
  CUE_C3_PRODUCT_MEMBER_ORIGIN,
} from "./buildCueC3ProductMembers";
import {
  isValidFamilyId,
  isValidMemberId,
  parseCueC3ProductDerivedStep,
} from "./familyIdentity";
import { sampleCueImpactPoint } from "./generateCueImpactDerivedMembers";

const SLOTS = ["S1", "S2", "S3"] as const;
const POINT_EPS = 1e-9;
const SEGMENT_EPS = 1e-6;

/** Known baseline for clean 옆돌리기 leaf (guard). */
export const EXPECTED_TWIN_GROUP_COUNT = 252;

/** Expected metrics for the clean 옆돌리기 apply (fail-closed). */
export const EXPECTED_APPLY = {
  recordsBefore: 508,
  recordsAfter: 256,
  productBefore: 504,
  productAfter: 252,
  duplicateGroups: 252,
  duplicateErrors: 252,
  canonicalKeep: 252,
  nonCanonicalRemove: 252,
  uniqueIdentities: 256,
  remainingMetaMissing: 252,
} as const;

/** Sole dataset leaf allowed for twin-dedupe apply. */
export const PRODUCT_TWIN_DEDUPE_APPLY_TARGET =
  "dataset/옆돌리기/파이브앤하프/positions.json";

export type SourceState =
  | "HEAD_MATCH"
  | "DIRTY_WORKTREE"
  | "UNTRACKED"
  | "UNKNOWN";

export type TwinOccurrence = {
  recordIndex: number;
  slot: (typeof SLOTS)[number];
  positionId: string;
  entry: StrategyEntry;
  balls: Ball3;
  hasTargetBallField: boolean;
  matchesCanonical: boolean;
};

export type TwinGroupStatus =
  | "REPAIRABLE"
  | "AMBIGUOUS_TWIN_GROUP"
  | "NO_CANONICAL_TWIN_MATCH"
  | "MULTIPLE_CANONICAL_TWIN_MATCH"
  | "UNSUPPORTED_DUPLICATE_CARDINALITY"
  | "NOT_PRODUCT_TWIN";

export type TwinGroupDiagnosis = {
  key: string;
  familyId: string;
  memberId: string;
  status: TwinGroupStatus;
  reason?: string;
  occurrences: TwinOccurrence[];
  keepRecordIndex?: number;
  removeRecordIndex?: number;
};

export type TwinDedupeDryRunResult = {
  dryRun: true;
  relativePosix: string;
  sourceState: SourceState;
  result: "SAFE_TO_APPLY" | "BLOCKED" | "UNAFFECTED";
  blockers: string[];
  recordsBefore: number;
  recordsAfter: number | null;
  productEntriesBefore: number;
  productEntriesAfter: number | null;
  duplicateGroupsBefore: number;
  duplicateErrorsBefore: number;
  duplicateErrorsAfter: number | null;
  canonicalKeep: number;
  nonCanonicalRemove: number;
  ambiguousGroups: number;
  uniqueIdentitiesBefore: number;
  uniqueIdentitiesAfter: number | null;
  identitySetPreserved: boolean | null;
  idRegeneration: false;
  ballRewrite: false;
  metaRebuildExecuted: false;
  remainingProductMetaMissing: number | null;
  nonTargetEntriesChanged: number | null;
  otherSlotDataLost: boolean | null;
  recordOrderPreserved: boolean | null;
  sourceMutated: boolean;
  deterministicCheck: boolean;
  idempotentCheck: boolean | null;
  scopeGuard: "PASS" | "FAIL" | "N/A";
  afterDuplicateValid: boolean | null;
  afterFullCanonicalValid: boolean | null;
  beforeIssues: string[];
  afterIssues: string[];
  afterDuplicateIssues: string[];
  afterOtherIssues: string[];
  groups: TwinGroupDiagnosis[];
  repairedPayload: DatasetExportPayload | null;
  removedPositionIds: string[];
  keptPositionIds: string[];
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function trimId(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function isFinitePoint(p: unknown): p is Point {
  return (
    !!p &&
    typeof p === "object" &&
    typeof (p as Point).x === "number" &&
    typeof (p as Point).y === "number" &&
    Number.isFinite((p as Point).x) &&
    Number.isFinite((p as Point).y)
  );
}

function pointsExactEqual(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) <= POINT_EPS && Math.abs(a.y - b.y) <= POINT_EPS;
}

function ballsExactEqual(a: Ball3, b: Ball3): boolean {
  return (
    pointsExactEqual(a.cue, b.cue) &&
    pointsExactEqual(a.target, b.target) &&
    pointsExactEqual(a.second, b.second)
  );
}

function resolveThickness(entry: StrategyEntry): string {
  const raw = entry.hpT;
  if (raw && typeof raw === "object" && typeof (raw as { T?: unknown }).T === "string") {
    const T = (raw as { T: string }).T.trim();
    if (T) return T;
  }
  return "8/8";
}

function parseCueImpactT(cueStep: string): number | null {
  const m = /^cue_impact:t:([0-9]+(?:\.[0-9]+)?)$/.exec(cueStep.trim());
  if (!m) return null;
  const t = Number(m[1]);
  return Number.isFinite(t) ? t : null;
}

/** Cue lies on base C→I segment (inclusive), within SEGMENT_EPS. */
export function isCueOnImpactSegment(
  cue: Point,
  baseCue: Point,
  impact: Point
): boolean {
  const dx = impact.x - baseCue.x;
  const dy = impact.y - baseCue.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < SEGMENT_EPS * SEGMENT_EPS) {
    return pointsExactEqual(cue, baseCue);
  }
  const t = ((cue.x - baseCue.x) * dx + (cue.y - baseCue.y) * dy) / len2;
  if (t < -SEGMENT_EPS || t > 1 + SEGMENT_EPS) return false;
  const proj = { x: baseCue.x + t * dx, y: baseCue.y + t * dy };
  return Math.hypot(cue.x - proj.x, cue.y - proj.y) <= SEGMENT_EPS;
}

/**
 * Current Product SSOT geometry match for a twin occurrence.
 * Does NOT use targetBall / record index as selectors.
 */
export function matchesCanonicalProductGeometry(args: {
  balls: Ball3;
  entry: StrategyEntry;
  baseBalls: Ball3;
}): boolean {
  const { balls, entry, baseBalls } = args;
  if (!isFinitePoint(balls.cue) || !isFinitePoint(balls.target) || !isFinitePoint(balls.second)) {
    return false;
  }
  if (!pointsExactEqual(balls.target, baseBalls.target)) {
    return false;
  }
  const T = resolveThickness(entry);
  const impact = calcImpactBall(baseBalls.cue, baseBalls.target, T);
  if (!impact) return false;

  const parsed = parseCueC3ProductDerivedStep(entry.derivedStep);
  if (parsed) {
    const t = parseCueImpactT(parsed.cueStep);
    if (t != null) {
      const expectedCue = sampleCueImpactPoint(baseBalls.cue, impact, t);
      if (pointsExactEqual(balls.cue, expectedCue)) {
        return true;
      }
    }
  }
  return isCueOnImpactSegment(balls.cue, baseBalls.cue, impact);
}

function identityKey(familyId: string, memberId: string): string {
  return `${familyId}::${memberId}`;
}

type MemberLoc = {
  recordIndex: number;
  slot: (typeof SLOTS)[number];
  positionId: string;
  entry: StrategyEntry;
  balls: Ball3;
  key: string | null;
};

function collectMemberLocations(records: PositionRecord[]): MemberLoc[] {
  const out: MemberLoc[] = [];
  records.forEach((rec, ri) => {
    for (const slot of SLOTS) {
      const entry = rec.strategies?.[slot];
      if (!entry) continue;
      const fid = trimId(entry.familyId);
      const mid = trimId(entry.memberId);
      const key =
        isValidFamilyId(fid) && isValidMemberId(mid)
          ? identityKey(fid, mid)
          : null;
      out.push({
        recordIndex: ri,
        slot,
        positionId: String(rec.positionId ?? ""),
        entry,
        balls: rec.balls,
        key,
      });
    }
  });
  return out;
}

function countDuplicateErrors(records: PositionRecord[]): {
  errors: number;
  groups: Map<string, MemberLoc[]>;
  uniqueIdentities: number;
} {
  const locations = collectMemberLocations(records);
  const byKey = new Map<string, MemberLoc[]>();
  for (const loc of locations) {
    if (!loc.key) continue;
    const list = byKey.get(loc.key) ?? [];
    list.push(loc);
    byKey.set(loc.key, list);
  }
  let errors = 0;
  const dupGroups = new Map<string, MemberLoc[]>();
  for (const [key, list] of byKey) {
    if (list.length >= 2) {
      errors += list.length - 1;
      dupGroups.set(key, list);
    }
  }
  return {
    errors,
    groups: dupGroups,
    uniqueIdentities: byKey.size,
  };
}

function countProductMetaMissing(records: PositionRecord[]): number {
  let n = 0;
  for (const rec of records) {
    for (const slot of SLOTS) {
      const e = rec.strategies?.[slot];
      if (!e) continue;
      if (e.memberOrigin !== CUE_C3_PRODUCT_MEMBER_ORIGIN) continue;
      if (e.meta == null || typeof e.meta !== "object") n += 1;
    }
  }
  return n;
}

function countProductEntries(records: PositionRecord[]): number {
  let n = 0;
  for (const rec of records) {
    for (const slot of SLOTS) {
      const e = rec.strategies?.[slot];
      if (e?.memberOrigin === CUE_C3_PRODUCT_MEMBER_ORIGIN) n += 1;
    }
  }
  return n;
}

function findBaseByMemberId(
  records: PositionRecord[],
  memberId: string
): { balls: Ball3; entry: StrategyEntry } | null {
  const want = trimId(memberId);
  for (const rec of records) {
    for (const slot of SLOTS) {
      const e = rec.strategies?.[slot];
      if (!e) continue;
      if (trimId(e.memberId) === want) {
        return { balls: rec.balls, entry: e };
      }
    }
  }
  return null;
}

function sameLineagePair(
  a: StrategyEntry,
  b: StrategyEntry
): { ok: true } | { ok: false; reason: string } {
  if (a.memberOrigin !== CUE_C3_PRODUCT_MEMBER_ORIGIN) {
    return { ok: false, reason: "not-product-origin" };
  }
  if (b.memberOrigin !== CUE_C3_PRODUCT_MEMBER_ORIGIN) {
    return { ok: false, reason: "not-product-origin" };
  }
  if (a.derivedRule !== CUE_C3_PRODUCT_DERIVED_RULE) {
    return { ok: false, reason: "derivedRule-mismatch" };
  }
  if (b.derivedRule !== CUE_C3_PRODUCT_DERIVED_RULE) {
    return { ok: false, reason: "derivedRule-mismatch" };
  }
  if (trimId(a.generatedFromMemberId) !== trimId(b.generatedFromMemberId)) {
    return { ok: false, reason: "generatedFrom-mismatch" };
  }
  if (String(a.derivedStep ?? "") !== String(b.derivedStep ?? "")) {
    return { ok: false, reason: "derivedStep-mismatch" };
  }
  if (JSON.stringify(a.sysInputs ?? null) !== JSON.stringify(b.sysInputs ?? null)) {
    return { ok: false, reason: "sysInputs-mismatch" };
  }
  if (JSON.stringify(a.corrections ?? null) !== JSON.stringify(b.corrections ?? null)) {
    return { ok: false, reason: "corrections-mismatch" };
  }
  return { ok: true };
}

function validatePayload(payload: DatasetExportPayload): {
  ok: boolean;
  issues: string[];
} {
  const v = validatePublishedExportCandidate(payload);
  if (v.ok) return { ok: true, issues: [] };
  return { ok: false, issues: v.issues };
}

function occupiedSlots(rec: PositionRecord): string[] {
  return SLOTS.filter((s) => !!rec.strategies?.[s]);
}

function occurrenceCanonical(
  loc: MemberLoc,
  records: PositionRecord[],
  baseBalls: Ball3
): boolean {
  const matches = matchesCanonicalProductGeometry({
    balls: loc.balls,
    entry: loc.entry,
    baseBalls,
  });
  if (!matches) return false;
  const expected: Ball3 = {
    cue: loc.balls.cue,
    target: baseBalls.target,
    second: loc.balls.second,
  };
  return createPositionId(expected) === loc.positionId;
}

function analyzeTwinSelections(payload: DatasetExportPayload): {
  canonicalKeep: number;
  nonCanonicalRemove: number;
  ambiguousGroups: number;
  removedPositionIds: string[];
  keptPositionIds: string[];
  removeRecordIndexes: number[];
  groups: TwinGroupDiagnosis[];
} {
  const records = payload.records ?? [];
  const beforeDup = countDuplicateErrors(records);
  let canonicalKeep = 0;
  let nonCanonicalRemove = 0;
  let ambiguousGroups = 0;
  const removedPositionIds: string[] = [];
  const keptPositionIds: string[] = [];
  const removeRecordIndexes: number[] = [];
  const groups: TwinGroupDiagnosis[] = [];

  for (const [key, locs] of beforeDup.groups) {
    const [familyId, memberId] = key.split("::");
    const base = findBaseByMemberId(
      records,
      String(locs[0]?.entry.generatedFromMemberId ?? "")
    );

    const occs: TwinOccurrence[] = locs.map((loc) => ({
      recordIndex: loc.recordIndex,
      slot: loc.slot,
      positionId: loc.positionId,
      entry: loc.entry,
      balls: loc.balls,
      hasTargetBallField:
        (records[loc.recordIndex] as { targetBall?: unknown })?.targetBall ===
          "yellow" ||
        (records[loc.recordIndex] as { targetBall?: unknown })?.targetBall ===
          "red",
      matchesCanonical: base
        ? occurrenceCanonical(loc, records, base.balls)
        : false,
    }));

    if (locs.length !== 2) {
      ambiguousGroups += 1;
      groups.push({
        key,
        familyId: familyId ?? "",
        memberId: memberId ?? "",
        status: "UNSUPPORTED_DUPLICATE_CARDINALITY",
        reason: `occurrences=${locs.length}`,
        occurrences: occs,
      });
      continue;
    }

    const [a, b] = locs;
    const lineage = sameLineagePair(a!.entry, b!.entry);
    if (!lineage.ok) {
      ambiguousGroups += 1;
      groups.push({
        key,
        familyId: familyId ?? "",
        memberId: memberId ?? "",
        status: "AMBIGUOUS_TWIN_GROUP",
        reason: lineage.reason,
        occurrences: occs,
      });
      continue;
    }

    if (a!.recordIndex === b!.recordIndex) {
      ambiguousGroups += 1;
      groups.push({
        key,
        familyId: familyId ?? "",
        memberId: memberId ?? "",
        status: "AMBIGUOUS_TWIN_GROUP",
        reason: "within-record-duplicate",
        occurrences: occs,
      });
      continue;
    }

    if (a!.slot !== "S1" || b!.slot !== "S1") {
      ambiguousGroups += 1;
      groups.push({
        key,
        familyId: familyId ?? "",
        memberId: memberId ?? "",
        status: "AMBIGUOUS_TWIN_GROUP",
        reason: "non-S1-slot",
        occurrences: occs,
      });
      continue;
    }

    if (!pointsExactEqual(a!.balls.second, b!.balls.second)) {
      ambiguousGroups += 1;
      groups.push({
        key,
        familyId: familyId ?? "",
        memberId: memberId ?? "",
        status: "AMBIGUOUS_TWIN_GROUP",
        reason: "second-not-identical",
        occurrences: occs,
      });
      continue;
    }

    if (!base) {
      ambiguousGroups += 1;
      groups.push({
        key,
        familyId: familyId ?? "",
        memberId: memberId ?? "",
        status: "NO_CANONICAL_TWIN_MATCH",
        reason: "base-missing",
        occurrences: occs,
      });
      continue;
    }

    const matchCount = occs.filter((o) => o.matchesCanonical).length;
    if (matchCount === 0) {
      ambiguousGroups += 1;
      groups.push({
        key,
        familyId: familyId ?? "",
        memberId: memberId ?? "",
        status: "NO_CANONICAL_TWIN_MATCH",
        occurrences: occs,
      });
      continue;
    }
    if (matchCount >= 2) {
      ambiguousGroups += 1;
      groups.push({
        key,
        familyId: familyId ?? "",
        memberId: memberId ?? "",
        status: "MULTIPLE_CANONICAL_TWIN_MATCH",
        occurrences: occs,
      });
      continue;
    }

    const keep = occs.find((o) => o.matchesCanonical)!;
    const remove = occs.find((o) => !o.matchesCanonical)!;
    const removeRec = records[remove.recordIndex]!;
    const slots = occupiedSlots(removeRec);
    if (slots.length !== 1 || slots[0] !== "S1") {
      ambiguousGroups += 1;
      groups.push({
        key,
        familyId: familyId ?? "",
        memberId: memberId ?? "",
        status: "AMBIGUOUS_TWIN_GROUP",
        reason: `remove-record-has-other-slots:${slots.join(",")}`,
        occurrences: occs,
        keepRecordIndex: keep.recordIndex,
        removeRecordIndex: remove.recordIndex,
      });
      continue;
    }

    groups.push({
      key,
      familyId: familyId ?? "",
      memberId: memberId ?? "",
      status: "REPAIRABLE",
      occurrences: occs,
      keepRecordIndex: keep.recordIndex,
      removeRecordIndex: remove.recordIndex,
    });
    canonicalKeep += 1;
    nonCanonicalRemove += 1;
    removeRecordIndexes.push(remove.recordIndex);
    keptPositionIds.push(keep.positionId);
    removedPositionIds.push(remove.positionId);
  }

  return {
    canonicalKeep,
    nonCanonicalRemove,
    ambiguousGroups,
    removedPositionIds,
    keptPositionIds,
    removeRecordIndexes,
    groups,
  };
}

/**
 * In-memory twin dedupe dry-run for one Published leaf payload.
 */
export function dryRunProductTwinDedupe(args: {
  relativePosix: string;
  sourceState: SourceState;
  payload: DatasetExportPayload;
  /** When true (CLI primary leaf), require exactly EXPECTED_TWIN_GROUP_COUNT groups. */
  enforceExpectedBaseline?: boolean;
}): TwinDedupeDryRunResult {
  const sourceFingerprint = JSON.stringify(args.payload);
  const original = cloneJson(args.payload);
  const records = original.records ?? [];
  const beforeDup = countDuplicateErrors(records);
  const beforeIssues = validatePayload(original).issues;
  const productBefore = countProductEntries(records);

  const selection = analyzeTwinSelections(original);
  const {
    groups,
    canonicalKeep,
    nonCanonicalRemove,
    ambiguousGroups,
    removedPositionIds,
    keptPositionIds,
    removeRecordIndexes,
  } = selection;

  const blockers: string[] = [];
  if (args.enforceExpectedBaseline) {
    if (args.sourceState !== "HEAD_MATCH") {
      blockers.push(`SOURCE_STATE_CHANGED:${args.sourceState}`);
    }
    if (beforeDup.groups.size !== EXPECTED_TWIN_GROUP_COUNT) {
      blockers.push(
        `UNEXPECTED_DUPLICATE_BASELINE:groups=${beforeDup.groups.size}`
      );
    }
    if (beforeDup.errors !== EXPECTED_TWIN_GROUP_COUNT) {
      blockers.push(
        `UNEXPECTED_DUPLICATE_BASELINE:errors=${beforeDup.errors}`
      );
    }
  } else if (args.sourceState === "DIRTY_WORKTREE") {
    blockers.push("SOURCE_STATE:DIRTY_WORKTREE");
  }

  if (ambiguousGroups > 0) {
    blockers.push(`AMBIGUOUS:${ambiguousGroups}`);
  }
  if (groups.some((g) => g.status === "UNSUPPORTED_DUPLICATE_CARDINALITY")) {
    blockers.push("UNSUPPORTED_DUPLICATE_CARDINALITY");
  }
  if (groups.some((g) => g.status === "NO_CANONICAL_TWIN_MATCH")) {
    blockers.push("NO_CANONICAL_TWIN_MATCH");
  }
  if (groups.some((g) => g.status === "MULTIPLE_CANONICAL_TWIN_MATCH")) {
    blockers.push("MULTIPLE_CANONICAL_TWIN_MATCH");
  }

  const removeSet = new Set(removeRecordIndexes);
  const repairable = groups.filter((g) => g.status === "REPAIRABLE").length;

  let repairedPayload: DatasetExportPayload | null = null;
  let recordsAfter: number | null = null;
  let productAfter: number | null = null;
  let dupAfter: number | null = null;
  let uniqueAfter: number | null = null;
  let identitySetPreserved: boolean | null = null;
  let remainingMeta: number | null = null;
  let nonTargetChanged: number | null = null;
  let otherSlotLost: boolean | null = null;
  let recordOrderPreserved: boolean | null = null;
  let scopeGuard: TwinDedupeDryRunResult["scopeGuard"] = "N/A";
  let afterDuplicateValid: boolean | null = null;
  let afterFullValid: boolean | null = null;
  let afterIssues: string[] = [];
  let afterDupIssues: string[] = [];
  let afterOtherIssues: string[] = [];
  let idempotentCheck: boolean | null = null;

  const canRepair =
    blockers.length === 0 &&
    repairable > 0 &&
    repairable === beforeDup.groups.size &&
    ambiguousGroups === 0;

  if (canRepair) {
    const working = cloneJson(original);
    const nextRecords: PositionRecord[] = [];
    for (let i = 0; i < (working.records ?? []).length; i++) {
      if (removeSet.has(i)) continue;
      nextRecords.push(working.records![i]!);
    }
    working.records = nextRecords;
    repairedPayload = working;

    const beforeIds = new Set(
      collectMemberLocations(records)
        .filter((l) => l.key)
        .map((l) => l.key!)
    );
    const afterIds = new Set(
      collectMemberLocations(nextRecords)
        .filter((l) => l.key)
        .map((l) => l.key!)
    );
    identitySetPreserved =
      beforeIds.size === afterIds.size &&
      [...beforeIds].every((k) => afterIds.has(k));

    let keptOk = true;
    for (const g of groups) {
      if (g.status !== "REPAIRABLE") continue;
      const keepOcc = g.occurrences.find((o) => o.matchesCanonical)!;
      const afterLoc = collectMemberLocations(nextRecords).find(
        (l) => l.key === g.key
      );
      if (!afterLoc) {
        keptOk = false;
        break;
      }
      if (!ballsExactEqual(afterLoc.balls, keepOcc.balls)) keptOk = false;
      if (JSON.stringify(afterLoc.entry) !== JSON.stringify(keepOcc.entry)) {
        keptOk = false;
      }
    }

    const beforeNonProduct = collectMemberLocations(records).filter(
      (l) => l.entry.memberOrigin !== CUE_C3_PRODUCT_MEMBER_ORIGIN
    );
    const afterNonProduct = collectMemberLocations(nextRecords).filter(
      (l) => l.entry.memberOrigin !== CUE_C3_PRODUCT_MEMBER_ORIGIN
    );
    nonTargetChanged =
      JSON.stringify(
        beforeNonProduct.map((l) => ({
          positionId: l.positionId,
          slot: l.slot,
          entry: l.entry,
          balls: l.balls,
        }))
      ) ===
      JSON.stringify(
        afterNonProduct.map((l) => ({
          positionId: l.positionId,
          slot: l.slot,
          entry: l.entry,
          balls: l.balls,
        }))
      )
        ? 0
        : 1;

    otherSlotLost = false;
    for (const idx of removeSet) {
      if (occupiedSlots(records[idx]!).length > 1) otherSlotLost = true;
    }

    const keptBeforeOrder = records
      .map((r, i) => ({ i, id: r.positionId }))
      .filter((r) => !removeSet.has(r.i))
      .map((r) => r.id);
    recordOrderPreserved =
      keptBeforeOrder.length === nextRecords.length &&
      nextRecords.every((r, i) => r.positionId === keptBeforeOrder[i]);

    scopeGuard =
      keptOk &&
      identitySetPreserved === true &&
      nonTargetChanged === 0 &&
      otherSlotLost === false &&
      recordOrderPreserved === true
        ? "PASS"
        : "FAIL";
    if (scopeGuard === "FAIL") blockers.push("DEDUPE_SCOPE_VIOLATION");

    const afterDup = countDuplicateErrors(nextRecords);
    dupAfter = afterDup.errors;
    recordsAfter = nextRecords.length;
    productAfter = countProductEntries(nextRecords);
    uniqueAfter = afterDup.uniqueIdentities;
    remainingMeta = countProductMetaMissing(nextRecords);

    afterDupIssues =
      afterDup.errors > 0
        ? [`duplicate-member-identity-remaining:${afterDup.errors}`]
        : [];
    afterDuplicateValid = afterDup.errors === 0;

    const full = validatePayload(working);
    afterFullValid = full.ok;
    afterIssues = full.issues;
    afterOtherIssues = full.issues.filter(
      (i) => !i.includes("duplicate-member-identity")
    );

    if (!afterDuplicateValid) {
      blockers.push("AFTER_DUPLICATE_VALIDATION_FAILED");
    }

    const second = analyzeTwinSelections(working);
    idempotentCheck =
      second.canonicalKeep === 0 &&
      second.nonCanonicalRemove === 0 &&
      countDuplicateErrors(nextRecords).groups.size === 0;
  }

  const sourceMutated = JSON.stringify(args.payload) !== sourceFingerprint;

  const again = analyzeTwinSelections(original);
  const deterministicCheck =
    again.canonicalKeep === canonicalKeep &&
    again.nonCanonicalRemove === nonCanonicalRemove &&
    again.ambiguousGroups === ambiguousGroups &&
    JSON.stringify(again.removedPositionIds) ===
      JSON.stringify(removedPositionIds) &&
    JSON.stringify(again.keptPositionIds) === JSON.stringify(keptPositionIds);

  let result: TwinDedupeDryRunResult["result"] = "UNAFFECTED";
  if (blockers.length > 0) {
    result = "BLOCKED";
  } else if (beforeDup.groups.size === 0) {
    result = "UNAFFECTED";
  } else if (
    repairable > 0 &&
    repairable === beforeDup.groups.size &&
    ambiguousGroups === 0 &&
    scopeGuard === "PASS" &&
    afterDuplicateValid === true &&
    args.sourceState === "HEAD_MATCH"
  ) {
    result = "SAFE_TO_APPLY";
  } else {
    result = "BLOCKED";
  }

  return {
    dryRun: true,
    relativePosix: args.relativePosix,
    sourceState: args.sourceState,
    result,
    blockers: [...new Set(blockers)],
    recordsBefore: records.length,
    recordsAfter,
    productEntriesBefore: productBefore,
    productEntriesAfter: productAfter,
    duplicateGroupsBefore: beforeDup.groups.size,
    duplicateErrorsBefore: beforeDup.errors,
    duplicateErrorsAfter: dupAfter,
    canonicalKeep,
    nonCanonicalRemove,
    ambiguousGroups,
    uniqueIdentitiesBefore: beforeDup.uniqueIdentities,
    uniqueIdentitiesAfter: uniqueAfter,
    identitySetPreserved,
    idRegeneration: false,
    ballRewrite: false,
    metaRebuildExecuted: false,
    remainingProductMetaMissing: remainingMeta,
    nonTargetEntriesChanged: nonTargetChanged,
    otherSlotDataLost: otherSlotLost,
    recordOrderPreserved,
    sourceMutated,
    deterministicCheck,
    idempotentCheck,
    scopeGuard,
    afterDuplicateValid,
    afterFullCanonicalValid: afterFullValid,
    beforeIssues,
    afterIssues,
    afterDuplicateIssues: afterDupIssues,
    afterOtherIssues,
    groups,
    repairedPayload:
      canRepair && afterDuplicateValid && scopeGuard === "PASS"
        ? repairedPayload
        : null,
    removedPositionIds,
    keptPositionIds,
  };
}

export function formatTwinDedupeReport(r: TwinDedupeDryRunResult): string {
  const lines: string[] = [];
  lines.push("DRY RUN: YES");
  lines.push(`LEAF: ${r.relativePosix}`);
  lines.push(`SOURCE STATE: ${r.sourceState}`);
  lines.push(`RESULT: ${r.result}`);
  if (r.blockers.length) lines.push(`BLOCKERS: ${r.blockers.join(", ")}`);
  lines.push(`DUPLICATE GROUPS BEFORE: ${r.duplicateGroupsBefore}`);
  lines.push(`DUPLICATE-MEMBER-IDENTITY BEFORE: ${r.duplicateErrorsBefore}`);
  lines.push(
    `DUPLICATE-MEMBER-IDENTITY AFTER: ${r.duplicateErrorsAfter ?? "N/A"}`
  );
  lines.push(`CANONICAL KEEP: ${r.canonicalKeep}`);
  lines.push(`NON-CANONICAL REMOVE: ${r.nonCanonicalRemove}`);
  lines.push(`AMBIGUOUS: ${r.ambiguousGroups}`);
  lines.push(`RECORDS BEFORE: ${r.recordsBefore}`);
  lines.push(`RECORDS AFTER: ${r.recordsAfter ?? "N/A"}`);
  lines.push(`PRODUCT ENTRIES BEFORE: ${r.productEntriesBefore}`);
  lines.push(`PRODUCT ENTRIES AFTER: ${r.productEntriesAfter ?? "N/A"}`);
  lines.push(`UNIQUE MEMBER IDENTITIES BEFORE: ${r.uniqueIdentitiesBefore}`);
  lines.push(
    `UNIQUE MEMBER IDENTITIES AFTER: ${r.uniqueIdentitiesAfter ?? "N/A"}`
  );
  lines.push(`IDENTITY SET PRESERVED: ${r.identitySetPreserved}`);
  lines.push(`ID REGENERATION: NO`);
  lines.push(`BALL REWRITE: NO`);
  lines.push(`META REBUILD EXECUTED: NO`);
  lines.push(
    `REMAINING PRODUCT META MISSING: ${r.remainingProductMetaMissing ?? "N/A"}`
  );
  lines.push(`SCOPE GUARD: ${r.scopeGuard}`);
  lines.push(`AFTER DUPLICATE VALID: ${r.afterDuplicateValid}`);
  lines.push(`AFTER FULL CANONICAL VALID: ${r.afterFullCanonicalValid}`);
  if (r.afterOtherIssues.length) {
    lines.push(`REMAINING OTHER ISSUES (sample):`);
    for (const i of r.afterOtherIssues.slice(0, 8)) lines.push(`  - ${i}`);
  }
  lines.push(`DETERMINISTIC: ${r.deterministicCheck}`);
  lines.push(`IDEMPOTENT: ${r.idempotentCheck}`);
  lines.push(`SOURCE MUTATED: ${r.sourceMutated}`);
  lines.push(`DATASET WRITTEN: NO`);
  lines.push(`APPLY: NOT EXECUTED (dry-run only)`);
  return lines.join("\n");
}

/**
 * Fail-closed gate: dry-run must match the known clean-leaf apply contract.
 * Reuses dry-run selection; does not invent a second keep algorithm.
 */
export function isSafeTwinDedupeApplyCandidate(
  r: TwinDedupeDryRunResult
): boolean {
  return (
    r.result === "SAFE_TO_APPLY" &&
    r.sourceState === "HEAD_MATCH" &&
    r.blockers.length === 0 &&
    r.ambiguousGroups === 0 &&
    r.scopeGuard === "PASS" &&
    r.afterDuplicateValid === true &&
    r.identitySetPreserved === true &&
    r.nonTargetEntriesChanged === 0 &&
    r.otherSlotDataLost === false &&
    r.recordOrderPreserved === true &&
    r.idRegeneration === false &&
    r.ballRewrite === false &&
    r.metaRebuildExecuted === false &&
    r.sourceMutated === false &&
    r.repairedPayload != null &&
    r.canonicalKeep === EXPECTED_APPLY.canonicalKeep &&
    r.nonCanonicalRemove === EXPECTED_APPLY.nonCanonicalRemove &&
    r.duplicateGroupsBefore === EXPECTED_APPLY.duplicateGroups &&
    r.duplicateErrorsBefore === EXPECTED_APPLY.duplicateErrors &&
    r.duplicateErrorsAfter === 0 &&
    r.recordsBefore === EXPECTED_APPLY.recordsBefore &&
    r.recordsAfter === EXPECTED_APPLY.recordsAfter &&
    r.productEntriesBefore === EXPECTED_APPLY.productBefore &&
    r.productEntriesAfter === EXPECTED_APPLY.productAfter &&
    r.uniqueIdentitiesBefore === EXPECTED_APPLY.uniqueIdentities &&
    r.uniqueIdentitiesAfter === EXPECTED_APPLY.uniqueIdentities &&
    r.remainingProductMetaMissing === EXPECTED_APPLY.remainingMetaMissing &&
    r.removedPositionIds.length === EXPECTED_APPLY.nonCanonicalRemove &&
    r.keptPositionIds.length === EXPECTED_APPLY.canonicalKeep
  );
}

export type TwinDedupeApplyPrepareResult =
  | {
      ok: true;
      dryRun: TwinDedupeDryRunResult;
      candidate: DatasetExportPayload;
    }
  | {
      ok: false;
      reason: string;
      blockers: string[];
      dryRun: TwinDedupeDryRunResult;
    };

/**
 * Build apply candidate from the same dry-run owner. No new selection logic.
 */
export function prepareProductTwinDedupeApply(args: {
  relativePosix: string;
  sourceState: SourceState;
  payload: DatasetExportPayload;
}): TwinDedupeApplyPrepareResult {
  const dryRun = dryRunProductTwinDedupe({
    relativePosix: args.relativePosix,
    sourceState: args.sourceState,
    payload: args.payload,
    enforceExpectedBaseline: true,
  });

  if (args.relativePosix !== PRODUCT_TWIN_DEDUPE_APPLY_TARGET) {
    return {
      ok: false,
      reason: "APPLY_TARGET_NOT_ALLOWED",
      blockers: [`forbidden-target:${args.relativePosix}`],
      dryRun,
    };
  }

  if (args.sourceState !== "HEAD_MATCH") {
    return {
      ok: false,
      reason: "SOURCE_STATE_CHANGED",
      blockers: [`SOURCE_STATE_CHANGED:${args.sourceState}`],
      dryRun,
    };
  }

  if (!isSafeTwinDedupeApplyCandidate(dryRun) || !dryRun.repairedPayload) {
    return {
      ok: false,
      reason: dryRun.blockers[0] ?? "APPLY_GATE_FAILED",
      blockers: dryRun.blockers.length
        ? dryRun.blockers
        : ["APPLY_GATE_FAILED"],
      dryRun,
    };
  }

  return {
    ok: true,
    dryRun,
    candidate: dryRun.repairedPayload,
  };
}

export type TwinDedupePostWriteVerification = {
  ok: boolean;
  records: number;
  productEntries: number;
  duplicateErrors: number;
  uniqueIdentities: number;
  remainingMetaMissing: number;
  unexpectedIssues: string[];
  afterOtherIssues: string[];
  idempotent: boolean;
  removedStillPresent: number;
  identitySetPreserved: boolean;
};

/**
 * Read-back verification after write (duplicate PASS; meta:missing expected).
 */
export function verifyProductTwinDedupeReadBack(args: {
  payload: DatasetExportPayload;
  removedPositionIds: string[];
  keptIdentityKeys: Set<string>;
}): TwinDedupePostWriteVerification {
  const records = args.payload.records ?? [];
  const dup = countDuplicateErrors(records);
  const productEntries = countProductEntries(records);
  const remainingMetaMissing = countProductMetaMissing(records);
  const full = validatePayload(args.payload);
  const afterOtherIssues = full.issues.filter(
    (i) => !i.includes("duplicate-member-identity")
  );
  const unexpectedIssues = afterOtherIssues.filter(
    (i) => !i.includes("meta:missing")
  );

  const removedStillPresent = (args.payload.records ?? []).filter((r) =>
    args.removedPositionIds.includes(r.positionId)
  ).length;

  const afterKeys = new Set(
    collectMemberLocations(records)
      .filter((l) => l.key)
      .map((l) => l.key!)
  );
  const identitySetPreserved =
    afterKeys.size === args.keptIdentityKeys.size &&
    [...args.keptIdentityKeys].every((k) => afterKeys.has(k));

  const second = analyzeTwinSelections(args.payload);
  const idempotent =
    second.canonicalKeep === 0 &&
    second.nonCanonicalRemove === 0 &&
    dup.groups.size === 0;

  const ok =
    records.length === EXPECTED_APPLY.recordsAfter &&
    productEntries === EXPECTED_APPLY.productAfter &&
    dup.errors === 0 &&
    dup.uniqueIdentities === EXPECTED_APPLY.uniqueIdentities &&
    remainingMetaMissing === EXPECTED_APPLY.remainingMetaMissing &&
    unexpectedIssues.length === 0 &&
    removedStillPresent === 0 &&
    identitySetPreserved &&
    idempotent;

  return {
    ok,
    records: records.length,
    productEntries,
    duplicateErrors: dup.errors,
    uniqueIdentities: dup.uniqueIdentities,
    remainingMetaMissing,
    unexpectedIssues,
    afterOtherIssues,
    idempotent,
    removedStillPresent,
    identitySetPreserved,
  };
}

export type TwinDedupeWriteResult =
  | {
      ok: true;
      absolutePath: string;
      dryRun: TwinDedupeDryRunResult;
      readBack: TwinDedupePostWriteVerification;
      written: true;
    }
  | {
      ok: false;
      reason: string;
      blockers: string[];
      dryRun?: TwinDedupeDryRunResult;
      written: false;
      restored?: boolean;
    };

function semanticPayloadEqual(
  a: DatasetExportPayload,
  b: DatasetExportPayload
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Guarded FS write for the sole allowed twin-dedupe leaf.
 * Skips full canonical validator (meta:missing expected); uses semantic + twin guards.
 */
export function writeProductTwinDedupeLeafFs(args: {
  absoluteTargetPath: string;
  relativePosix: string;
  sourceState: SourceState;
  originalText: string;
  payload: DatasetExportPayload;
}): TwinDedupeWriteResult {
  if (args.relativePosix !== PRODUCT_TWIN_DEDUPE_APPLY_TARGET) {
    return {
      ok: false,
      reason: "APPLY_TARGET_NOT_ALLOWED",
      blockers: [`forbidden-target:${args.relativePosix}`],
      written: false,
    };
  }

  const prepared = prepareProductTwinDedupeApply({
    relativePosix: args.relativePosix,
    sourceState: args.sourceState,
    payload: args.payload,
  });
  if (!prepared.ok) {
    return {
      ok: false,
      reason: prepared.reason,
      blockers: prepared.blockers,
      dryRun: prepared.dryRun,
      written: false,
    };
  }

  const { dryRun, candidate } = prepared;
  const beforeKeys = new Set(
    collectMemberLocations(args.payload.records ?? [])
      .filter((l) => l.key)
      .map((l) => l.key!)
  );

  const text = JSON.stringify(candidate, null, 2);
  const dir = path.dirname(args.absoluteTargetPath);
  const tempPath = path.join(
    dir,
    `.${path.basename(args.absoluteTargetPath)}.twin-dedupe.${process.pid}.${Date.now()}.tmp`
  );

  const restore = (): boolean => {
    try {
      fs.writeFileSync(args.absoluteTargetPath, args.originalText, "utf8");
      return true;
    } catch {
      return false;
    }
  };

  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tempPath, text, "utf8");
    const tempParsed = JSON.parse(fs.readFileSync(tempPath, "utf8"));
    if (!semanticPayloadEqual(candidate, tempParsed)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        /* ignore */
      }
      return {
        ok: false,
        reason: "TEMP_SEMANTIC_MISMATCH",
        blockers: ["temp-read-back-mismatch"],
        dryRun,
        written: false,
      };
    }

    if (fs.existsSync(args.absoluteTargetPath)) {
      fs.unlinkSync(args.absoluteTargetPath);
    }
    fs.renameSync(tempPath, args.absoluteTargetPath);
  } catch (e) {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {
      /* ignore */
    }
    const restored = restore();
    return {
      ok: false,
      reason: "WRITE_FAILED",
      blockers: [e instanceof Error ? e.message : String(e)],
      dryRun,
      written: false,
      restored,
    };
  }

  let readBackPayload: DatasetExportPayload;
  try {
    readBackPayload = JSON.parse(
      fs.readFileSync(args.absoluteTargetPath, "utf8")
    ) as DatasetExportPayload;
  } catch (e) {
    const restored = restore();
    return {
      ok: false,
      reason: "READ_BACK_IO_FAILED",
      blockers: [e instanceof Error ? e.message : String(e)],
      dryRun,
      written: false,
      restored,
    };
  }

  if (!semanticPayloadEqual(candidate, readBackPayload)) {
    const restored = restore();
    return {
      ok: false,
      reason: "READ_BACK_SEMANTIC_MISMATCH",
      blockers: ["candidate-read-back-not-equivalent"],
      dryRun,
      written: false,
      restored,
    };
  }

  const readBack = verifyProductTwinDedupeReadBack({
    payload: readBackPayload,
    removedPositionIds: dryRun.removedPositionIds,
    keptIdentityKeys: beforeKeys,
  });

  if (!readBack.ok) {
    const restored = restore();
    return {
      ok: false,
      reason: "POST_WRITE_VERIFICATION_FAILED",
      blockers: [
        ...readBack.unexpectedIssues,
        `records=${readBack.records}`,
        `dups=${readBack.duplicateErrors}`,
        `removedStillPresent=${readBack.removedStillPresent}`,
      ],
      dryRun,
      written: false,
      restored,
    };
  }

  return {
    ok: true,
    absolutePath: args.absoluteTargetPath,
    dryRun,
    readBack,
    written: true,
  };
}

export function formatTwinDedupeApplyReport(args: {
  write: TwinDedupeWriteResult;
}): string {
  const lines: string[] = [];
  lines.push("APPLY: EXECUTED");
  if (!args.write.ok) {
    lines.push(`RESULT: FAIL`);
    lines.push(`REASON: ${args.write.reason}`);
    lines.push(`BLOCKERS: ${args.write.blockers.join(", ")}`);
    lines.push(`DATASET WRITTEN: ${args.write.written ? "YES" : "NO"}`);
    return lines.join("\n");
  }
  const r = args.write.dryRun;
  const rb = args.write.readBack;
  lines.push(`LEAF: ${r.relativePosix}`);
  lines.push(`SOURCE STATE: ${r.sourceState}`);
  lines.push(`RESULT: OK`);
  lines.push(`CANONICAL KEEP: ${r.canonicalKeep}`);
  lines.push(`NON-CANONICAL REMOVE: ${r.nonCanonicalRemove}`);
  lines.push(`RECORDS: ${r.recordsBefore} → ${rb.records}`);
  lines.push(
    `PRODUCT ENTRIES: ${r.productEntriesBefore} → ${rb.productEntries}`
  );
  lines.push(
    `DUPLICATE-MEMBER-IDENTITY: ${r.duplicateErrorsBefore} → ${rb.duplicateErrors}`
  );
  lines.push(
    `UNIQUE MEMBER IDENTITIES: ${r.uniqueIdentitiesBefore} → ${rb.uniqueIdentities}`
  );
  lines.push(`IDENTITY SET PRESERVED: ${rb.identitySetPreserved}`);
  lines.push(`REMAINING PRODUCT META MISSING: ${rb.remainingMetaMissing}`);
  lines.push(`UNEXPECTED ISSUES: ${rb.unexpectedIssues.length}`);
  lines.push(`POST-APPLY IDEMPOTENT: ${rb.idempotent}`);
  lines.push(`META MIGRATION EXECUTED: NO`);
  lines.push(`DATASET WRITTEN: YES`);
  return lines.join("\n");
}

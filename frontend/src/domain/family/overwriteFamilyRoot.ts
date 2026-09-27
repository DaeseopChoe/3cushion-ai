/**
 * Phase F-3C — trusted Family root for OVERWRITE.
 *
 * OVERWRITE modifies the existing trusted Family. The AUTHORED root geometry
 * (memberId, balls, targetBall, track, Family slot) comes from the stored Family,
 * never from the current screen balls:
 *   - LOCAL: resolved from the Local normalized dataset.
 *   - PUBLISHED: captured at Recall from the Published normalized Family.
 *
 * Three separate concepts:
 *   - Recall entry Member  → difference notice + edit frame (track / handedness).
 *   - Trusted Family root  → OVERWRITE geometry.
 *   - Current screen balls → SAVE (CREATE) only.
 */
import type { Ball3, PositionRecord, StrategyEntry } from "../positionSearchEngine";
import {
  normalizeReflectionOverride,
  type ReflectionOverride,
} from "../trajectory/c2ReflectionOverride";
import { ballsExactEqual } from "../cueEditSnap";
import { listFamilyMemberLocations, type FamilyMemberLocation } from "./familyAwareWriter";
import { parseMemberOrigin, parseSymmetryOp } from "./familyIdentity";
import {
  FAMILY_MASTER_COMMON_FIELD_KEYS,
  type FamilyMaster,
  type FamilyMember,
} from "./familyNormalizedSchema";
import { capturePublishedFamilySnapshot, type PublishedFamilySnapshot } from "./publishedFamilySeed";
import {
  canonicalizeFamilyMemberRuntimeHpt,
  findAuthoredFamilyEntry,
} from "./familyRuntimeProjection";
import {
  cloneBall3,
  mapFamilyTrack,
  parseFamilyTrack,
  symmetryOpBetweenTracks,
  transformReflectionOverride,
  transformTrajectoryExtensions,
} from "./trackSymmetry";

type Slot = "S1" | "S2" | "S3";
type Extensions = StrategyEntry["trajectoryExtensions"];

export type FamilyAuthoredRoot = {
  familyId: string;
  memberId: string;
  balls: Ball3;
  targetBall?: "red" | "yellow";
  track: string;
  slot: Slot;
  trajectoryExtensions?: Extensions;
  /** Canonical Family C2 (AUTHORED frame). */
  reflectionOverride?: ReflectionOverride;
};

/** The Member that won Recall (AUTHORED, SYMMETRY or DERIVED) — the edit frame. */
export type FamilyRecallMemberFrame = {
  familyId: string;
  memberId: string;
  memberOrigin?: StrategyEntry["memberOrigin"];
  symmetryOp?: StrategyEntry["symmetryOp"];
  generatedFromMemberId?: string;
  track: string;
  balls: Ball3;
  slot: Slot;
  trajectoryExtensions?: Extensions;
  /** C2 as stored on the recalled Member (its own track frame). */
  reflectionOverride?: ReflectionOverride;
};

export type OverwriteRecallContext = {
  source: "LOCAL" | "PUBLISHED";
  familyId: string;
  recallMember: FamilyRecallMemberFrame | null;
  /** PUBLISHED only — AUTHORED root captured from the Published normalized Family. */
  authoredRoot: FamilyAuthoredRoot | null;
  /**
   * PUBLISHED only — the recalled Family's normalized parts (Master + every Member),
   * session-only identity seed for a first Local OVERWRITE (Phase F-3D).
   */
  publishedFamily?: PublishedFamilySnapshot | null;
};

export type OverwriteRootResolution =
  | { ok: true; root: FamilyAuthoredRoot }
  | { ok: false; code: "OVERWRITE_FAMILY_ROOT_MISSING" | "OVERWRITE_FAMILY_ROOT_MISMATCH"; reason: string };

function cloneJson<T>(value: T): T {
  return value == null ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function isSlot(raw: unknown): raw is Slot {
  return raw === "S1" || raw === "S2" || raw === "S3";
}

function targetBallOf(raw: unknown): "red" | "yellow" | undefined {
  return raw === "red" || raw === "yellow" ? raw : undefined;
}

function reflectionOverridePatch(raw: unknown): { reflectionOverride?: ReflectionOverride } {
  const c2 = normalizeReflectionOverride(raw);
  return c2 ? { reflectionOverride: c2 } : {};
}

export function findLocalFamilyAuthoredRoot(
  dataset: PositionRecord[] | null | undefined,
  familyId: string
): FamilyAuthoredRoot | null {
  if (!Array.isArray(dataset) || !familyId) return null;
  let found: ReturnType<typeof findAuthoredFamilyEntry> = null;
  try {
    found = findAuthoredFamilyEntry(dataset, familyId);
  } catch {
    return null;
  }
  if (!found || !found.entry.memberId || !found.entry.track || !isSlot(found.slot)) return null;
  const targetBall = targetBallOf(found.record.targetBall);
  return {
    familyId,
    memberId: found.entry.memberId,
    balls: cloneBall3(found.record.balls),
    ...(targetBall ? { targetBall } : {}),
    track: found.entry.track,
    slot: found.slot,
    ...(found.entry.trajectoryExtensions
      ? { trajectoryExtensions: cloneJson(found.entry.trajectoryExtensions) }
      : {}),
    ...reflectionOverridePatch(found.entry.reflectionOverride),
  };
}

export function findPublishedFamilyAuthoredRoot(
  members: ReadonlyArray<FamilyMember> | null | undefined,
  familyId: string
): FamilyAuthoredRoot | null {
  if (!Array.isArray(members) || !familyId) return null;
  const authored = members.filter(
    (m) => m.familyId === familyId && m.memberOrigin === "AUTHORED"
  );
  if (authored.length !== 1) return null;
  const m = authored[0];
  if (!m.memberId || !m.track || !isSlot(m.sourceSlot)) return null;
  const targetBall = targetBallOf(m.targetBall);
  return {
    familyId,
    memberId: m.memberId,
    balls: cloneBall3(m.balls),
    ...(targetBall ? { targetBall } : {}),
    track: m.track,
    slot: m.sourceSlot,
    ...(m.trajectoryExtensions ? { trajectoryExtensions: cloneJson(m.trajectoryExtensions) } : {}),
    ...reflectionOverridePatch(m.reflectionOverride),
  };
}

/** Frame of the recalled Member from the rematerialized Recall record. */
export function recallMemberFrameFromRecord(
  record: PositionRecord | null | undefined,
  slot: string
): FamilyRecallMemberFrame | null {
  if (!record || !isSlot(slot)) return null;
  const entry = record.strategies?.[slot];
  if (!entry?.familyId || !entry.memberId || !entry.track) return null;
  return {
    familyId: entry.familyId,
    memberId: entry.memberId,
    ...(entry.memberOrigin ? { memberOrigin: entry.memberOrigin } : {}),
    ...(entry.symmetryOp ? { symmetryOp: entry.symmetryOp } : {}),
    ...(entry.generatedFromMemberId ? { generatedFromMemberId: entry.generatedFromMemberId } : {}),
    track: entry.track,
    balls: cloneBall3(record.balls),
    slot,
    ...(entry.trajectoryExtensions ? { trajectoryExtensions: cloneJson(entry.trajectoryExtensions) } : {}),
    ...reflectionOverridePatch(entry.reflectionOverride),
  };
}

export function buildOverwriteRecallContext(args: {
  source: "LOCAL" | "PUBLISHED";
  record: PositionRecord | null | undefined;
  slot: string;
  publishedFamilyMembers?: ReadonlyArray<FamilyMember> | null;
  publishedMasterByFamilyId?: ReadonlyMap<string, FamilyMaster> | null;
}): OverwriteRecallContext | null {
  const recallMember = recallMemberFrameFromRecord(args.record, args.slot);
  if (!recallMember) return null;
  const published = args.source === "PUBLISHED";
  return {
    source: args.source,
    familyId: recallMember.familyId,
    recallMember,
    authoredRoot: published
      ? findPublishedFamilyAuthoredRoot(args.publishedFamilyMembers, recallMember.familyId)
      : null,
    publishedFamily: published
      ? capturePublishedFamilySnapshot({
          familyId: recallMember.familyId,
          members: args.publishedFamilyMembers,
          masterByFamilyId: args.publishedMasterByFamilyId,
        })
      : null,
  };
}

export type OverwritePreservationResult =
  | { ok: true }
  | { ok: false; code: "OVERWRITE_FAMILY_GEOMETRY_MISMATCH"; reason: string; memberId: string };

/**
 * OVERWRITE updates Family-common content only. Every Member present before the write
 * must still exist with the same identity, lineage and authoritative geometry
 * (exact balls — Position is derived from them — track, slot). An authoringStrategyId
 * is compared only when the Member already had one. Fail closed — never relocate,
 * re-id or auto-correct.
 */
export function checkOverwriteFamilyPreserved(args: {
  before: ReadonlyArray<FamilyMemberLocation>;
  after: ReadonlyArray<FamilyMemberLocation>;
}): OverwritePreservationResult {
  const afterById = new Map(args.after.map((loc) => [loc.entry.memberId, loc]));
  for (const prev of args.before) {
    const memberId = prev.entry.memberId ?? "";
    const next = afterById.get(prev.entry.memberId);
    const a = prev.entry;
    const b = next?.entry;
    const same =
      !!next &&
      !!b &&
      ballsExactEqual(prev.balls, next.balls) &&
      prev.slot === next.slot &&
      a.track === b.track &&
      a.memberOrigin === b.memberOrigin &&
      (a.symmetryOp ?? null) === (b.symmetryOp ?? null) &&
      (a.generatedFromMemberId ?? null) === (b.generatedFromMemberId ?? null) &&
      (a.derivedRule ?? null) === (b.derivedRule ?? null) &&
      (a.derivedStep ?? null) === (b.derivedStep ?? null) &&
      (!a.authoringStrategyId || a.authoringStrategyId === b.authoringStrategyId);
    if (!same) {
      return {
        ok: false,
        code: "OVERWRITE_FAMILY_GEOMETRY_MISMATCH",
        memberId,
        reason: `기존 Family Member(${memberId})의 위치 또는 식별 정보가 덮어쓰기 결과와 달라집니다. 자동 보정하지 않고 덮어쓰기를 중단했습니다. [OVERWRITE_FAMILY_GEOMETRY_MISMATCH]`,
      };
    }
  }
  return { ok: true };
}

function sameRootGeometry(a: FamilyAuthoredRoot, b: FamilyAuthoredRoot): boolean {
  return (
    a.track === b.track &&
    a.slot === b.slot &&
    JSON.stringify(a.balls) === JSON.stringify(b.balls)
  );
}

function contextFor(
  ctx: OverwriteRecallContext | null | undefined,
  familyId: string
): OverwriteRecallContext | null {
  return ctx && ctx.familyId === familyId ? ctx : null;
}

/**
 * LOCAL → Local AUTHORED root (fallback: captured root).
 * PUBLISHED → captured Published root; a Local copy of the Family must agree.
 */
export function resolveOverwriteFamilyRoot(args: {
  dataset: PositionRecord[] | null | undefined;
  familyId: string;
  sourceKind: "LOCAL" | "PUBLISHED" | "NONE";
  recallContext?: OverwriteRecallContext | null;
}): OverwriteRootResolution {
  const captured = contextFor(args.recallContext, args.familyId)?.authoredRoot ?? null;
  const local = findLocalFamilyAuthoredRoot(args.dataset, args.familyId);

  if (args.sourceKind === "PUBLISHED" && captured && local && !sameRootGeometry(local, captured)) {
    return {
      ok: false,
      code: "OVERWRITE_FAMILY_ROOT_MISMATCH",
      reason:
        "불러온 Published 공략의 원본 위치와 Local 사본의 원본 위치가 다릅니다. 덮어쓰기를 중단했습니다. [OVERWRITE_FAMILY_ROOT_MISMATCH]",
    };
  }
  const root = local ?? captured;
  if (!root) {
    return {
      ok: false,
      code: "OVERWRITE_FAMILY_ROOT_MISSING",
      reason:
        "덮어쓸 공략의 원본(AUTHORED) 위치를 찾을 수 없습니다. 새 공략은 SAVE로 저장하십시오. [OVERWRITE_FAMILY_ROOT_MISSING]",
    };
  }
  return { ok: true, root };
}

/**
 * Edit frame of the recalled Member. Recall context first; else the Local Member
 * named by the slot identity; else inferred from the slot identity + root.
 */
export function resolveOverwriteRecallMemberFrame(args: {
  dataset: PositionRecord[] | null | undefined;
  root: FamilyAuthoredRoot;
  slotIdentity: {
    memberId?: string;
    memberOrigin?: StrategyEntry["memberOrigin"];
    symmetryOp?: StrategyEntry["symmetryOp"];
    generatedFromMemberId?: string;
  } | null;
  recallContext?: OverwriteRecallContext | null;
}): FamilyRecallMemberFrame {
  const { root } = args;
  const memberId = args.slotIdentity?.memberId;
  const ctxMember = contextFor(args.recallContext, root.familyId)?.recallMember ?? null;
  if (ctxMember && (!memberId || ctxMember.memberId === memberId)) return ctxMember;

  if (memberId && Array.isArray(args.dataset)) {
    try {
      const loc = listFamilyMemberLocations(args.dataset, root.familyId).find(
        (l) => l.entry.memberId === memberId
      );
      if (loc?.entry.track && isSlot(loc.slot)) {
        return {
          familyId: root.familyId,
          memberId,
          ...(loc.entry.memberOrigin ? { memberOrigin: loc.entry.memberOrigin } : {}),
          ...(loc.entry.symmetryOp ? { symmetryOp: loc.entry.symmetryOp } : {}),
          ...(loc.entry.generatedFromMemberId
            ? { generatedFromMemberId: loc.entry.generatedFromMemberId }
            : {}),
          track: loc.entry.track,
          balls: cloneBall3(loc.balls),
          slot: loc.slot,
          ...(loc.entry.trajectoryExtensions
            ? { trajectoryExtensions: cloneJson(loc.entry.trajectoryExtensions) }
            : {}),
          ...reflectionOverridePatch(loc.entry.reflectionOverride),
        };
      }
    } catch {
      // fall through to identity inference
    }
  }

  const op = parseSymmetryOp(args.slotIdentity?.symmetryOp);
  const rootTrack = parseFamilyTrack(root.track);
  return {
    familyId: root.familyId,
    memberId: memberId ?? root.memberId,
    ...(args.slotIdentity?.memberOrigin ? { memberOrigin: args.slotIdentity.memberOrigin } : {}),
    ...(op ? { symmetryOp: op } : {}),
    track: op && rootTrack ? mapFamilyTrack(rootTrack, op) : root.track,
    balls: cloneBall3(root.balls),
    slot: root.slot,
  };
}

/** Runtime HPT edited on the recalled Member → AUTHORED canonical HPT (T is Family-common). */
export function canonicalizeRecallHptForRoot(
  frame: FamilyRecallMemberFrame,
  runtimeHpt: unknown
): unknown {
  return canonicalizeFamilyMemberRuntimeHpt(
    {
      familyId: frame.familyId,
      track: frame.track,
      memberOrigin: frame.memberOrigin,
      symmetryOp: frame.symmetryOp,
    },
    runtimeHpt
  );
}

function extensionShape(payload: Extensions | null | undefined): string | null {
  if (!payload) return null;
  return JSON.stringify({
    v: payload.extensionSchemaVersion,
    o: [payload.origin?.kind ?? null, payload.origin?.source ?? null],
    i: (payload.items ?? []).map((it) => [it.id, it.index ?? null, it.endpoint?.x, it.endpoint?.y]),
  });
}

function frameToRootOp(frame: FamilyRecallMemberFrame, root: FamilyAuthoredRoot) {
  const from = parseFamilyTrack(frame.track);
  const to = parseFamilyTrack(root.track);
  return from && to ? symmetryOpBetweenTracks(from, to) : null;
}

/**
 * Extension edits are Family-canonical. Unchanged vs the recalled Member (including a
 * Member that carries none by its generation rule) → keep the root's stored payload
 * exactly; cleared → null; edited → transform from the recalled frame to the root frame
 * (H/V/RPI are exact involutions on table coordinates).
 */
export function resolveOverwriteRootExtensions(args: {
  edited: Extensions | null | undefined;
  frame: FamilyRecallMemberFrame;
  root: FamilyAuthoredRoot;
}): Extensions | null {
  const { edited, frame, root } = args;
  if (extensionShape(edited) === extensionShape(frame.trajectoryExtensions)) {
    return cloneJson(root.trajectoryExtensions ?? edited ?? null);
  }
  if (!edited) return null;
  const op = frameToRootOp(frame, root);
  return op ? transformTrajectoryExtensions(op, edited) : cloneJson(edited);
}

function sameReflectionOverride(
  a: ReflectionOverride | null,
  b: ReflectionOverride | null
): boolean {
  if (!a || !b) return a === b;
  return a.rail === b.rail && a.t === b.t;
}

/**
 * C2 edits are Family-canonical (AUTHORED frame). Unchanged vs the recalled Member
 * (including a Member that carries none by its generation rule) → keep the root's C2
 * exactly (no projection round trip); cleared → null; edited → transform from the
 * recalled Member's track to the root track.
 */
export function resolveOverwriteRootReflectionOverride(args: {
  edited: unknown;
  frame: FamilyRecallMemberFrame;
  root: FamilyAuthoredRoot;
}): ReflectionOverride | null {
  const { frame, root } = args;
  const edited = normalizeReflectionOverride(args.edited);
  if (sameReflectionOverride(edited, normalizeReflectionOverride(frame.reflectionOverride))) {
    return cloneJson(root.reflectionOverride ?? edited ?? null);
  }
  if (!edited) return null;
  const op = frameToRootOp(frame, root);
  return op ? transformReflectionOverride(op, edited) : edited;
}

function isFourTrackOrigin(entry: StrategyEntry): boolean {
  const origin = parseMemberOrigin(entry.memberOrigin);
  return origin === "AUTHORED" || origin === "SYMMETRY" || origin == null;
}

/** C3+ / Product Derived copy their base's C2 + Extension; Cue→Impact carries neither. */
function derivedCarriesBaseProjection(entry: StrategyEntry): boolean {
  return parseMemberOrigin(entry.memberOrigin) !== "DERIVED_CUE_IMPACT";
}

function copyBaseField(
  next: StrategyEntry,
  base: StrategyEntry,
  key: "trajectoryExtensions" | "reflectionOverride"
): void {
  if (base[key]) (next as Record<string, unknown>)[key] = cloneJson(base[key]);
  else delete next[key];
}

/**
 * After a 4-Track UPDATE, bring same-family Derived Members' Family-common payload
 * (FamilyMaster common keys) in line with the AUTHORED Member. Derived balls,
 * Position, track, slot, identity/lineage and meta are untouched. With
 * `syncDerivedExtensions` / `syncDerivedReflectionOverride`, a C3+ / Product Derived
 * Member's Extension / C2 follows its same-track base Member (the Derived generation
 * rule); Cue→Impact never receives either.
 */
export function syncFamilyCommonPayloadToDerivedMembers(
  dataset: PositionRecord[],
  familyId: string,
  options: { syncDerivedExtensions?: boolean; syncDerivedReflectionOverride?: boolean } = {}
): PositionRecord[] {
  const authored = findAuthoredFamilyEntry(dataset, familyId);
  if (!authored) return dataset;
  const locations = listFamilyMemberLocations(dataset, familyId);
  let out: PositionRecord[] | null = null;

  for (const loc of locations) {
    if (isFourTrackOrigin(loc.entry)) continue;
    const next: StrategyEntry = { ...loc.entry };
    const source = authored.entry as Record<string, unknown>;
    const target = next as Record<string, unknown>;
    for (const key of FAMILY_MASTER_COMMON_FIELD_KEYS) {
      if (source[key] === undefined) delete target[key];
      else target[key] = cloneJson(source[key]);
    }
    const base = derivedCarriesBaseProjection(loc.entry)
      ? locations.find((l) => l.entry.memberId === loc.entry.generatedFromMemberId)
      : undefined;
    if (base) {
      if (options.syncDerivedExtensions) copyBaseField(next, base.entry, "trajectoryExtensions");
      if (options.syncDerivedReflectionOverride) copyBaseField(next, base.entry, "reflectionOverride");
    }
    if (JSON.stringify(next) === JSON.stringify(loc.entry)) continue;
    out ??= [...dataset];
    const record = out[loc.recordIndex];
    out[loc.recordIndex] = {
      ...record,
      strategies: { ...record.strategies, [loc.slot]: next },
    };
  }
  return out ?? dataset;
}

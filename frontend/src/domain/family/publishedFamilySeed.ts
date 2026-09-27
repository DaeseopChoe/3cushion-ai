/**
 * Phase F-3D — Published-only first Local OVERWRITE keeps the whole Family identity graph.
 *
 * At Published Recall the recalled Family's normalized parts (FamilyMaster + every
 * FamilyMember of that familyId) are captured into the session-only OVERWRITE
 * Recall context. When OVERWRITE runs and Local holds no Member of that familyId,
 * the snapshot is rematerialized into the in-memory working dataset; the regular
 * Local OVERWRITE path then runs on it and persists once.
 *
 * Never a durable authority: the snapshot lives only between Recall and OVERWRITE.
 * Local already holding the familyId (any Member) → no seed; Local is the authority.
 */
import { ballsExactEqual } from "../cueEditSnap";
import { createPositionId } from "../positionId";
import type { PositionRecord, StrategyEntry } from "../positionSearchEngine";
import { listFamilyMemberLocations } from "./familyAwareWriter";
import type { FamilyMaster, FamilyMember } from "./familyNormalizedSchema";
import type { OverwriteRecallContext } from "./overwriteFamilyRoot";
import { rematerializeFamilyPartsToPositionRecords } from "./rematerializeFamilyPartsToPositionRecords";

const SLOTS: StrategyEntry["slot"][] = ["S1", "S2", "S3"];

/** Normalized parts of one Published Family, as read at Recall. */
export type PublishedFamilySnapshot = {
  familyId: string;
  master: FamilyMaster;
  members: FamilyMember[];
};

export type PublishedFamilySeedFailureCode =
  | "OVERWRITE_PUBLISHED_SEED_INVALID"
  | "OVERWRITE_PUBLISHED_SEED_CONFLICT"
  | "POSITION_STRATEGY_SLOT_CONFLICT";

export type PublishedFamilySeedResult =
  | { ok: true; dataset: PositionRecord[]; seeded: boolean }
  | { ok: false; code: PublishedFamilySeedFailureCode; reason: string };

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function capturePublishedFamilySnapshot(args: {
  familyId: string;
  members: ReadonlyArray<FamilyMember> | null | undefined;
  masterByFamilyId: ReadonlyMap<string, FamilyMaster> | null | undefined;
}): PublishedFamilySnapshot | null {
  const { familyId } = args;
  if (!familyId || !Array.isArray(args.members)) return null;
  const master = args.masterByFamilyId?.get(familyId);
  if (!master || master.familyId !== familyId) return null;
  const members = args.members.filter((m) => m.familyId === familyId);
  if (members.length === 0) return null;
  return { familyId, master: cloneJson(master), members: cloneJson(members) };
}

function invalid(reason: string): PublishedFamilySeedResult {
  return {
    ok: false,
    code: "OVERWRITE_PUBLISHED_SEED_INVALID",
    reason: `불러온 Published 공략의 Family 정보가 올바르지 않아 덮어쓰기를 중단했습니다. (${reason}) [OVERWRITE_PUBLISHED_SEED_INVALID]`,
  };
}

function validateSnapshot(
  snapshot: PublishedFamilySnapshot,
  familyId: string,
  ctx: OverwriteRecallContext
): string | null {
  if (snapshot.familyId !== familyId || snapshot.master?.familyId !== familyId) {
    return "familyId mismatch";
  }
  if (!Array.isArray(snapshot.members) || snapshot.members.length === 0) return "no members";
  const ids = new Set<string>();
  for (const m of snapshot.members) {
    if (m.familyId !== familyId) return `member ${m.memberId} belongs to ${m.familyId}`;
    if (!m.memberId || ids.has(m.memberId)) return `duplicate or missing memberId ${m.memberId}`;
    ids.add(m.memberId);
  }
  for (const m of snapshot.members) {
    if (m.generatedFromMemberId && !ids.has(m.generatedFromMemberId)) {
      return `member ${m.memberId} lineage ${m.generatedFromMemberId} missing`;
    }
  }
  const authored = snapshot.members.filter((m) => m.memberOrigin === "AUTHORED");
  if (authored.length !== 1) return `expected one AUTHORED member, found ${authored.length}`;
  const root = ctx.authoredRoot;
  if (root) {
    const a = authored[0];
    if (
      a.memberId !== root.memberId ||
      a.track !== root.track ||
      a.sourceSlot !== root.slot ||
      !ballsExactEqual(a.balls, root.balls)
    ) {
      return "AUTHORED member differs from the captured root";
    }
  }
  return null;
}

/**
 * OVERWRITE (UPDATE) only. Returns the working dataset to run the regular OVERWRITE on:
 *   - not PUBLISHED, Local already holds the familyId, or no Recall context → unchanged
 *   - otherwise the Published Family graph merged into a copy of the dataset
 * Any C-0 / slot / snapshot problem fails closed; nothing is written here.
 */
export function seedPublishedFamilyForOverwrite(args: {
  dataset: PositionRecord[] | null | undefined;
  familyId: string;
  sourceKind: "LOCAL" | "PUBLISHED" | "NONE";
  recallContext?: OverwriteRecallContext | null;
}): PublishedFamilySeedResult {
  const base = Array.isArray(args.dataset) ? args.dataset : [];
  const unchanged: PublishedFamilySeedResult = { ok: true, dataset: base, seeded: false };
  if (args.sourceKind !== "PUBLISHED" || !args.familyId) return unchanged;
  if (listFamilyMemberLocations(base, args.familyId).length > 0) return unchanged;

  const ctx =
    args.recallContext && args.recallContext.familyId === args.familyId ? args.recallContext : null;
  if (!ctx) return unchanged;
  const snapshot = ctx.publishedFamily ?? null;
  if (!snapshot) {
    return ctx.authoredRoot ? invalid("Published Family snapshot missing") : unchanged;
  }

  const problem = validateSnapshot(snapshot, args.familyId, ctx);
  if (problem) return invalid(problem);

  const remat = rematerializeFamilyPartsToPositionRecords({
    masters: [snapshot.master],
    members: snapshot.members,
  });
  if (!remat.ok) return invalid(remat.issues[0]?.reason ?? "rematerialize failed");

  // Phase C-0: (positionId, sourceSlot) → at most one familyId. Local holds none of this
  // Family, so any occupant is another Family (or legacy) → fail closed, no slot move.
  const occupied = new Set<string>();
  for (const record of base) {
    const positionId = createPositionId(record.balls);
    for (const slot of SLOTS) {
      if (record.strategies?.[slot]) occupied.add(`${positionId}|${slot}`);
    }
  }

  const next = base.map((record) => ({ ...record, strategies: { ...record.strategies } }));
  for (const seeded of remat.dataset) {
    const positionId = createPositionId(seeded.balls);
    for (const slot of SLOTS) {
      if (!seeded.strategies[slot]) continue;
      if (occupied.has(`${positionId}|${slot}`)) {
        return {
          ok: false,
          code: "POSITION_STRATEGY_SLOT_CONFLICT",
          reason: `불러온 Published 공략의 Member 위치(${positionId}, ${slot})를 Local의 다른 공략이 사용 중입니다. 덮어쓰기를 중단했습니다. [POSITION_STRATEGY_SLOT_CONFLICT]`,
        };
      }
    }
    const index = next.findIndex((record) => ballsExactEqual(record.balls, seeded.balls));
    if (index < 0) {
      next.push(seeded);
      continue;
    }
    const dest = next[index];
    if (dest.targetBall && seeded.targetBall && dest.targetBall !== seeded.targetBall) {
      return {
        ok: false,
        code: "OVERWRITE_PUBLISHED_SEED_CONFLICT",
        reason: `불러온 Published 공략의 Member 위치(${positionId})에 목적구가 다른 Local 공략이 있습니다. 덮어쓰기를 중단했습니다. [OVERWRITE_PUBLISHED_SEED_CONFLICT]`,
      };
    }
    next[index] = {
      ...dest,
      ...(dest.targetBall || !seeded.targetBall ? {} : { targetBall: seeded.targetBall }),
      strategies: { ...dest.strategies, ...seeded.strategies },
    };
  }
  return { ok: true, dataset: next, seeded: true };
}

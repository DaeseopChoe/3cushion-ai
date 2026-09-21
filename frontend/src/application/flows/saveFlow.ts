// application/flows/saveFlow.ts
// SRCH-005 + DS-002 — Strategy Save Flow
// Batch 3 STEP 3-7A
//
// AD-B3-02: Hybrid Object Context (READ / WRITE / ACTION / HELPER 분리).
// React import 금지. Hook 사용 금지. Named Export Only.
//
// Batch 6 STEP 6-4: profile / anchors via App-injected HELPER (D-006 / D-007 Closed).
//
// 핵심 불변 조건:
//   Durable corpus write uses persistWorkingCorpusNormalizedAuthority
//   (canonical NormalizedDatasetEnvelope commit first; flat = compatibility).
//   React mirror via setDataset + saveWorkingDataset DI after canonical ok.
//   localStorage 직접 접근 금지 in this flow.

import { normalizeBallsToBall3 } from "../../admin/slotAutoRecommend";
import { createStrategyEntry } from "../../domain/adminSaveEngine";
import {
  applyCueEditSnap,
  ballsExactEqual,
  type EditSourceContext,
} from "../../domain/cueEditSnap";
import { resolveAuthoringStrategyIdForSave } from "../../domain/authoringStrategyId";
import {
  familySymmetryIdentity,
  resolveFamilyIdentityForSave,
  type FamilySaveIntent,
} from "../../domain/family/familyIdentity";
import {
  resolveFamilySaveIntent,
  shouldWriteFourTrackFamilyOnSave,
} from "../../domain/family/familySavePolicy";
import {
  resolveEditSourceKind,
  resolveOverwriteSaveIntent,
  type EditSourceKind,
} from "../../domain/family/publishedEditSession";
import {
  buildPublishOperationFromSave,
  type PublishOperation,
} from "../../domain/publishOperation";
import { writeFourTrackFamilyMembers } from "../../domain/family/familyAwareWriter";
import {
  type NormalizedDualWriteResult,
} from "../../domain/family/syncPositionDatasetToNormalizedFamilyStore";
import {
  persistWorkingCorpusNormalizedAuthority,
} from "../../domain/dataset/infra/persistWorkingCorpusNormalizedAuthority";
import type { PersistPositionsWithGenerationResult } from "../../domain/dataset/infra/persistPositionsDatasetWithGeneration";
import { createPositionId } from "../../domain/positionId";
import { upsertPositionRecord } from "../../domain/positionMergeEngine";

import {
  applySchemaVersionToDatasetRecord,
  attachCanonicalFieldsToStrategyEntry,
  getPersistableBaseSysInputs,
  normalizeCanonicalSaveDraft,
  toCanonicalStrategyEntry,
} from "../../domain/canonicalStrategy";
import { logCanonicalPersistAudit } from "../../domain/canonicalPersistAudit";
import { evaluateStrategy } from "../../domain/evaluateStrategy";
import { makeSignature } from "../../domain/strategySignature";
import { extractSlotRuntimeMeta } from "../../domain/slotRuntimeHydrate";
import {
  type Ball3,
  type PositionRecord,
  type StrategyEntry,
} from "../../domain/positionSearchEngine";
import { normalizePublishedShotTypeHint } from "./recallHydrateFlow";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** User button intent — SAVE always CREATE; OVERWRITE = Source Family UPDATE. */
export type SaveCommand = "SAVE" | "OVERWRITE";

type AdminState = Record<string, unknown>;

function explicitFamilyIdentityFromSlot(
  slot: Record<string, unknown> | null | undefined
): {
  familyId?: string;
  memberId?: string;
  memberOrigin?: StrategyEntry["memberOrigin"];
  generatedFromMemberId?: string;
  symmetryOp?: StrategyEntry["symmetryOp"];
} | null {
  const applied = slot?.applied as Record<string, unknown> | null | undefined;
  const draft = slot?.draft as Record<string, unknown> | null | undefined;
  if (!applied && !draft) return null;

  const familyId =
    (applied?.familyId as string | undefined) ??
    (draft?.familyId as string | undefined);
  const memberId =
    (applied?.memberId as string | undefined) ??
    (draft?.memberId as string | undefined);
  const memberOrigin =
    (applied?.memberOrigin as StrategyEntry["memberOrigin"] | undefined) ??
    (draft?.memberOrigin as StrategyEntry["memberOrigin"] | undefined);
  const generatedFromMemberId =
    (applied?.generatedFromMemberId as string | undefined) ??
    (draft?.generatedFromMemberId as string | undefined);
  const symmetryOp =
    (applied?.symmetryOp as StrategyEntry["symmetryOp"] | undefined) ??
    (draft?.symmetryOp as StrategyEntry["symmetryOp"] | undefined);

  if (!familyId && !memberId && !memberOrigin && !generatedFromMemberId && !symmetryOp) {
    return null;
  }

  return {
    familyId,
    memberId,
    memberOrigin,
    generatedFromMemberId,
    symmetryOp,
  };
}

export type SaveFlowResult = {
  ok: boolean;
  updated?: PositionRecord[];
  reason?: string;
  /** Present when this SAVE wrote a 4-track Family. Derived is not persisted here. */
  familyId?: string;
  fourTrackWritten?: boolean;
  /** Phase 3-C1 — resolved SAVE intent used for History PublishOperation. */
  saveIntent?: "LEGACY" | FamilySaveIntent;
  /** Phase 3-C1 — destination familyId (CREATE mint or UPDATE preserve). */
  destinationFamilyId?: string;
  /** Phase 3-C1 — immutable publish command for History (null = LEGACY / omit). */
  publishOperation?: PublishOperation | null;
  /** Trusted edit source at OVERWRITE time (NONE on SAVE). */
  overwriteSourceKind?: EditSourceKind;
  /**
   * Phase B-1: family_* compatibility shadow (best-effort after canonical).
   * Does not gate SAVE success.
   */
  normalizedDualWrite?: NormalizedDualWriteResult;
  /** Phase B-1: flat positions_dataset compatibility projection result. */
  flatProjection?: PersistPositionsWithGenerationResult;
  /** Canonical normalized commit stage when authority write failed. */
  corpusPersistStage?: "migrate" | "compose" | "canonical" | "invalidate" | "positions" | "generation";
};

export type SaveFlowContext = {
  // READ
  dataset: PositionRecord[] | null | undefined;
  ballsState: Record<string, unknown> | null | undefined;
  adminState: AdminState | null | undefined;
  activeSlot: string;
  slots: Record<string, unknown>;
  targetColor: string | null;
  aiOverride: unknown;
  system: unknown;
  resolvedSlotSysValues: Record<string, unknown> | null | undefined;
  autoSave: boolean;
  /** Runtime Extension draft → Dataset payload (endpoints only; Reveal not stored). */
  trajectoryExtensionPayload?: StrategyEntry["trajectoryExtensions"] | null;
  /** ADMIN C2 Reflection Override { rail, t }. */
  reflectionOverridePayload?: StrategyEntry["reflectionOverride"] | null;

  /**
   * History Load Edit Source (session). Null → no Cue Snap / no proximity replace.
   */
  editSource?: EditSourceContext | null;
  /**
   * @deprecated Prefer saveCommand. Ignored when saveCommand is SAVE (forced CREATE).
   * Only honored when saveCommand is OVERWRITE and overwrite session resolves.
   */
  saveIntent?: FamilySaveIntent | null;
  /**
   * User storage command. Default SAVE = always CREATE NEW Family.
   * OVERWRITE = UPDATE trusted source Family (LOCAL or PUBLISHED).
   */
  saveCommand?: SaveCommand;
  /**
   * Published Search session ownership (Source Family).
   * Enables PUBLISHED OVERWRITE — never auto-switches SAVE to UPDATE.
   * Mutually exclusive with editingLocalFamilyId.
   */
  editingPublishedFamilyId?: string | null;
  /**
   * Local DB recall session ownership (Source Family).
   * Enables LOCAL OVERWRITE — never auto-switches SAVE to UPDATE.
   * Mutually exclusive with editingPublishedFamilyId.
   */
  editingLocalFamilyId?: string | null;

  // READ (Infrastructure)
  saveWorkingDataset: (updated: PositionRecord[]) => void;

  // WRITE
  setDataset: (updated: PositionRecord[]) => void;
  setUserPublishedSearchContext: (ctx: {
    shotType: string;
    systemId: string;
  }) => void;
  setAdminState: (updater: (prev: AdminState) => AdminState) => void;

  // ACTION
  patchSlotRuntimeMeta: (
    slotId: string,
    meta: { targetBall: string | null }
  ) => void;
  patchSlotFamilyIdentity: (
    slotId: string,
    identity: {
      familyId?: string;
      memberId?: string;
      memberOrigin?: StrategyEntry["memberOrigin"];
      generatedFromMemberId?: string;
      symmetryOp?: StrategyEntry["symmetryOp"];
    } | null
  ) => void;
  saveToFile: (data: {
    version: string;
    saved_at: string;
    dataset: PositionRecord[];
  }) => void;

  // HELPER — App injection hub (Registry → Contract)
  resolveFormulaHash: (systemId: string) => string;
  resolveEvalProfile: (systemId: string) => {
    formula?: { expr?: string };
  };
  resolveAnchorsData: (
    systemId: string
  ) =>
    | {
        trajectories?: Record<string, { anchors: { id: string }[] }>;
        meta?: Record<string, unknown>;
      }
    | undefined;
};

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

/**
 * Strategy Save Flow (SRCH-005 + DS-002).
 * StrategyEntry 생성 → dataset upsert → Working Dataset 저장 → State 갱신.
 * App.jsx의 evalForSave + handleSaveStrategy 로직을 추출.
 */
export function runSaveStrategy(ctx: SaveFlowContext): SaveFlowResult {
  console.log("[SAVE] START");

  const slotId = ctx.activeSlot;
  const slotRaw = (ctx.slots as Record<string, unknown>)[slotId] as
    | Record<string, unknown>
    | null
    | undefined;
  const applied = (slotRaw?.applied ?? null) as
    | Record<string, unknown>
    | null;
  const draft = (slotRaw?.draft ?? null) as
    | Record<string, unknown>
    | null;

  const appliedForSave: Record<string, unknown> = {
    ...(draft ?? {}),
    ...(applied ?? {}),
    sys: (applied as Record<string, unknown> | null)?.sys ??
      (draft as Record<string, unknown> | null)?.sys,
    hpt: (applied as Record<string, unknown> | null)?.hpt ??
      (draft as Record<string, unknown> | null)?.hpt,
    str: (applied as Record<string, unknown> | null)?.str ??
      (draft as Record<string, unknown> | null)?.str,
    ai: (applied as Record<string, unknown> | null)?.ai ??
      (draft as Record<string, unknown> | null)?.ai,
  };

  const persistBaseSysInputs = getPersistableBaseSysInputs(
    ctx.adminState?.sys as Record<string, unknown> | null | undefined,
    (appliedForSave?.sys as Record<string, unknown> | undefined) ?? undefined
  );

  const sys = appliedForSave.sys as Record<string, unknown> | null | undefined;

  console.log("[SAVE] slotId:", slotId);
  console.log("[SAVE] adminState:", ctx.adminState);
  console.log("[SAVE] slot:", slotRaw);
  console.log("[SAVE] sys:", sys);
  console.log("[SAVE] persistBaseSysInputs:", persistBaseSysInputs);
  console.log("[SAVE] dataset length:", ctx.dataset?.length);

  if (!(ctx.ballsState as Record<string, unknown> | null | undefined)?.cue) {
    console.log("[SAVE] EARLY RETURN: missing-balls-state-cue");
    return { ok: false, reason: "missing-balls-state-cue" };
  }

  if (Object.keys(persistBaseSysInputs).length === 0) {
    console.log("[SAVE] EARLY RETURN: missing-persistable-base-sys-inputs");
    return { ok: false, reason: "missing-persistable-base-sys-inputs" };
  }

  const systemId: string =
    (sys?.systemId as string | undefined) ??
    (sys?.system_id as string | undefined) ??
    (ctx.adminState?.sys as Record<string, unknown> | undefined)?.systemId as string | undefined ??
    (ctx.adminState?.sys as Record<string, unknown> | undefined)?.system_id as string | undefined ??
    (ctx.adminState?.sys as Record<string, unknown> | undefined)?.system as string | undefined ??
    "5_half_system";

  const formulaHash = ctx.resolveFormulaHash(systemId);

  const shotType =
    normalizePublishedShotTypeHint(
      (ctx.adminState?.sys as Record<string, unknown> | undefined)?.shotType
    ) ??
    normalizePublishedShotTypeHint(
      extractSlotRuntimeMeta(
        ctx.slots[slotId] as Parameters<typeof extractSlotRuntimeMeta>[0]
      ).shotType
    ) ??
    "default";

  const signature = makeSignature({ systemId, formulaHash, shotType });
  console.log("[SAVE] signature:", signature);

  const safe = (obj: unknown): unknown => {
    if (obj === undefined || obj === null) return obj;
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      console.warn("[SAVE] safe clone failed:", e);
      return undefined;
    }
  };

  // Phase 3: Role-preserving Ball3 (target=physical Target, second=physical Second).
  // No color-slot remapping — targetColor is metadata only (datasetTargetBall below).
  const ball3Raw = normalizeBallsToBall3(
    ctx.ballsState as Record<string, unknown>
  ) as Ball3;

  // Cue-Only Edit Snap (Authoring) — before Exact upsert; never proximity merge.
  const snapOutcome = applyCueEditSnap(ball3Raw, ctx.editSource ?? null);
  const ball3ForDataset = snapOutcome.balls;
  console.log("[SAVE] cueEditSnap:", {
    reason: snapOutcome.reason,
    didSnap: snapOutcome.didSnap,
    distance: snapOutcome.distance,
    hasEditSource: !!ctx.editSource,
  });

  const cleanBall3 = (safe(ball3ForDataset) ?? ball3ForDataset) as Record<
    string,
    unknown
  >;
  console.log("[SAVE] ball3ForDataset (after cue snap):", ball3ForDataset);

  // Phase 5 Mission 01 — authoringStrategyId mint / inherit (Edit Source Exact T+S).
  const editSourceSlotEntry =
    ctx.editSource && Array.isArray(ctx.dataset)
      ? (ctx.dataset.find((r) => r.positionId === ctx.editSource?.positionId)
          ?.strategies?.[slotId as "S1" | "S2" | "S3"] ?? null)
      : null;
  const authoringStrategyId = resolveAuthoringStrategyIdForSave({
    editSource: ctx.editSource ?? null,
    balls: ball3ForDataset,
    slotId: slotId as "S1" | "S2" | "S3",
    editSourceSlotEntry,
  });
  console.log("[SAVE] authoringStrategyId:", authoringStrategyId);

  const positionIdForIdentity = createPositionId(ball3ForDataset);
  const existingExactRecord = Array.isArray(ctx.dataset)
    ? ctx.dataset.find((r) => ballsExactEqual(r.balls, ball3ForDataset))
    : undefined;
  const existingExactSlotEntry =
    existingExactRecord?.strategies?.[slotId as "S1" | "S2" | "S3"] ?? null;
  const explicitSlotFamilyIdentity = explicitFamilyIdentityFromSlot(slotRaw);
  const saveCommand: SaveCommand =
    ctx.saveCommand === "OVERWRITE" ? "OVERWRITE" : "SAVE";
  const overwriteSourceKind: EditSourceKind = resolveEditSourceKind({
    editingPublishedFamilyId: ctx.editingPublishedFamilyId,
    editingLocalFamilyId: ctx.editingLocalFamilyId,
  });

  let requestedIntent: FamilySaveIntent | null = null;
  if (saveCommand === "OVERWRITE") {
    const overwriteIntent = resolveOverwriteSaveIntent({
      editingPublishedFamilyId: ctx.editingPublishedFamilyId,
      editingLocalFamilyId: ctx.editingLocalFamilyId,
      slotIdentity: explicitSlotFamilyIdentity,
      authoringStrategyId,
      positionId: positionIdForIdentity,
    });
    if (!overwriteIntent || overwriteSourceKind === "NONE") {
      console.warn("[SAVE] OVERWRITE blocked: missing trusted source family");
      return { ok: false, reason: "overwrite-missing-source-family" };
    }
    requestedIntent = "UPDATE";
  } else {
    // SAVE button: always CREATE. Recall source must not switch to UPDATE.
    requestedIntent = "CREATE";
  }

  const saveIntent = resolveFamilySaveIntent({
    explicitIdentity: explicitSlotFamilyIdentity,
    existingSlotEntry: existingExactSlotEntry,
    authoringStrategyId,
    positionId: positionIdForIdentity,
    requestedIntent,
  });
  console.log("[SAVE] saveIntent:", saveIntent, {
    saveCommand,
    overwriteSourceKind,
    editingPublishedFamilyId: ctx.editingPublishedFamilyId ?? null,
    editingLocalFamilyId: ctx.editingLocalFamilyId ?? null,
  });
  const familyIdentity = resolveFamilyIdentityForSave({
    saveIntent: saveIntent === "LEGACY" ? "CREATE" : saveIntent,
    explicitIdentity: explicitSlotFamilyIdentity,
    authoringStrategyId,
    positionId: positionIdForIdentity,
  });
  if (saveIntent === "UPDATE" && !familyIdentity) {
    console.warn("[SAVE] missing explicit Family identity for UPDATE");
    return { ok: false, reason: "family-save:update-missing-identity" };
  }
  console.log("[SAVE] familyIdentity:", familyIdentity);

  const datasetTargetBall =
    ctx.targetColor === "red" || ctx.targetColor === "yellow"
      ? ctx.targetColor
      : undefined;

  const canonicalDraft = normalizeCanonicalSaveDraft(
    toCanonicalStrategyEntry({
      slotId,
      signature,
      authoringStrategyId,
      familyId: familyIdentity?.familyId,
      memberId: familyIdentity?.memberId,
      memberOrigin: familyIdentity?.memberOrigin,
      applied: appliedForSave,
      adminSys: ctx.adminState?.sys,
    })
  );
  console.log("[CANONICAL_SAVE]", canonicalDraft);

  const cleanHpt = safe(canonicalDraft.hpT);
  const cleanStr = safe(canonicalDraft.str);
  const cleanAi = safe(ctx.aiOverride ?? canonicalDraft.ai);

  // evalForSave 인라인 — AD-B3-03 예외: 순수 계산이지만 컨텍스트 의존으로 flow 내부 클로저로 유지
  const evalForSave = (args: Record<string, unknown>) =>
    evaluateStrategy({
      balls: args.balls,
      sysInputs: args.sysInputs,
      signature: args.signature,
      systemId: (args.signature as Record<string, unknown>).systemId,
      profile: ctx.resolveEvalProfile(
        (args.signature as Record<string, unknown>).systemId as string
      ),
      anchorsData: ctx.resolveAnchorsData(
        (args.signature as Record<string, unknown>).systemId as string
      ),      hpT: {
        T:
          (ctx.adminState?.hpt as Record<string, unknown> | undefined)?.T ??
          "8/8",
      },
      trackId: (args.track as string | undefined) ?? "B2T_L",
    });

  console.log("[SAVE] Creating StrategyEntry");
  let strategy;
  try {
    const baseEntry = createStrategyEntry({
      slot: slotId,
      signature: canonicalDraft.signature,
      sysInputs: canonicalDraft.sysInputs,
      hpT: cleanHpt,
      str: cleanStr,
      ai: cleanAi,
      balls: cleanBall3,
      track: canonicalDraft.track,
      authoringStrategyId: canonicalDraft.authoringStrategyId,
      familyId: canonicalDraft.familyId,
      memberId: canonicalDraft.memberId,
      memberOrigin: canonicalDraft.memberOrigin,
      evaluateStrategy: evalForSave,
      trajectoryExtensions: ctx.trajectoryExtensionPayload ?? null,
      reflectionOverride: ctx.reflectionOverridePayload ?? null,
    });
    strategy = attachCanonicalFieldsToStrategyEntry(baseEntry, canonicalDraft);
    console.log("[SAVE] strategy JSON check:", JSON.stringify(strategy));
  } catch (e) {
    console.error("[SAVE] createStrategyEntry 에러:", e);
    throw e;
  }

  const useFourTrackFamily = shouldWriteFourTrackFamilyOnSave({
    saveIntent,
    familyIdentity: {
      familyId: strategy.familyId,
      memberId: strategy.memberId,
      memberOrigin: strategy.memberOrigin,
    },
    track: strategy.track,
  });

  let updated: PositionRecord[];
  let savedSlotId = slotId as "S1" | "S2" | "S3";

  if (useFourTrackFamily) {
    console.log("[SAVE] Running family-aware four-track write (no Exact upsert)");
    const familyWrite = writeFourTrackFamilyMembers(
      Array.isArray(ctx.dataset) ? ctx.dataset : [],
      {
        balls: ball3ForDataset,
        ...(datasetTargetBall ? { targetBall: datasetTargetBall } : {}),
        entry: strategy,
      },
      { preferredAuthoredSlot: savedSlotId }
    );
    if (!familyWrite.ok) {
      console.warn("[SAVE] four-track family write failed:", familyWrite.code, familyWrite.reason);
      return {
        ok: false,
        reason: `family-four-track:${familyWrite.code}`,
      };
    }
    updated = familyWrite.dataset;
    const authoredMember = familyWrite.set.members.find(
      (m) => familySymmetryIdentity(m.entry) === "IDENTITY"
    );
    const authoredPlan = authoredMember
      ? familyWrite.plans.find(
          (p) => p.memberId === authoredMember.entry.memberId
        )
      : undefined;
    if (authoredPlan?.slot) savedSlotId = authoredPlan.slot;
    for (const member of familyWrite.set.members) {
      updated = applySchemaVersionToDatasetRecord(updated, member.balls);
    }
  } else {
    console.log("[SAVE] Running Exact upsertPositionRecord");
    updated = upsertPositionRecord(
      ctx.dataset,
      ball3ForDataset,
      strategy,
      undefined,
      datasetTargetBall
    );
    updated = applySchemaVersionToDatasetRecord(updated, cleanBall3);
  }
  console.log("[SAVE] updated length:", updated?.length);

  const savedRecord = updated.find((r) => ballsExactEqual(r.balls, ball3ForDataset));
  const savedStrategy = savedRecord?.strategies?.[savedSlotId] ?? strategy;

  logCanonicalPersistAudit({
    slotId,
    strategy: savedStrategy,
    dataset: updated,
    boundary: {
      adminInputs: (ctx.adminState?.sys as Record<string, unknown> | undefined)
        ?.inputs,
      appliedInputs: (appliedForSave?.sys as Record<string, unknown> | undefined)
        ?.inputs,
      canonicalSysInputs: canonicalDraft.sysInputs,
      adminCorrections: (
        ctx.adminState?.sys as Record<string, unknown> | undefined
      )?.corrections,
      systemValues: (ctx.adminState?.sys as Record<string, unknown> | undefined)
        ?.system_values,
    },
    effectiveRenderKeys: Object.keys(ctx.resolvedSlotSysValues || {}),
  });

  // Phase B-1: canonical NormalizedDatasetEnvelope commit FIRST.
  // Flat positions_dataset is compatibility projection only (after canonical ok).
  const corpusPersist = persistWorkingCorpusNormalizedAuthority({
    dataset: updated,
    shotType: normalizePublishedShotTypeHint(shotType) ?? shotType,
    systemId,
  });
  if (!corpusPersist.ok) {
    console.warn(
      "[SAVE] canonical normalized corpus persist failed",
      corpusPersist.stage,
      corpusPersist.reason
    );
    return {
      ok: false,
      reason: `corpus persist failed (${corpusPersist.stage}): ${corpusPersist.reason}`,
      corpusPersistStage: corpusPersist.stage,
      normalizedDualWrite: {
        ok: false,
        stage: "generation",
        reason: corpusPersist.reason,
      },
    };
  }

  // DS-002: React mirror + DI callback after durable canonical commit succeeds.
  ctx.setDataset(updated);
  ctx.saveWorkingDataset(updated);

  const normalizedDualWrite: NormalizedDualWriteResult =
    corpusPersist.shadowSync.ok === true
      ? corpusPersist.shadowSync
      : {
          ok: false,
          stage: "exception",
          reason:
            "reason" in corpusPersist.shadowSync
              ? String(corpusPersist.shadowSync.reason)
              : "family_* shadow not written",
        };
  ctx.patchSlotRuntimeMeta(slotId, {
    targetBall:
      ctx.targetColor === "red" || ctx.targetColor === "yellow"
        ? ctx.targetColor
        : null,
  });
  ctx.patchSlotFamilyIdentity(
    slotId,
    useFourTrackFamily
      ? {
          familyId: savedStrategy.familyId ?? strategy.familyId,
          memberId: savedStrategy.memberId ?? strategy.memberId,
          memberOrigin: savedStrategy.memberOrigin ?? strategy.memberOrigin,
          generatedFromMemberId: savedStrategy.generatedFromMemberId,
          symmetryOp: savedStrategy.symmetryOp,
        }
      : null
  );

  if (import.meta.env.DEV) {
    console.log(
      "[SAVE] persist strategy sample:",
      JSON.stringify(savedStrategy, null, 2)
    );
  }

  const persistedShotType = normalizePublishedShotTypeHint(shotType);
  if (persistedShotType) {
    ctx.setUserPublishedSearchContext({
      shotType: persistedShotType,
      systemId,
    });
    ctx.setAdminState((prev) => ({
      ...prev,
      sys: {
        ...(prev as Record<string, unknown>).sys,
        shotType: persistedShotType,
        systemId,
        system_id: systemId,
        // Identity must stay a systemId string — never UI display object (ctx.system).
        system: systemId,
      },
    }));
    console.log("[SAVE] published leaf context persisted", {
      shotType: persistedShotType,
      systemId,
    });
  }

  if (ctx.autoSave) {
    ctx.saveToFile({
      version: "1.0",
      saved_at: new Date().toISOString(),
      dataset: updated,
    });
  }

  const destinationFamilyId =
    (typeof savedStrategy.familyId === "string" &&
    savedStrategy.familyId.trim()
      ? savedStrategy.familyId.trim()
      : familyIdentity?.familyId) ??
    (useFourTrackFamily && typeof strategy.familyId === "string"
      ? strategy.familyId.trim()
      : undefined);

  // LOCAL UPDATE ≠ PUBLISHED UPDATE:
  // Local overwrite preserves family identity in positions_dataset, but History
  // PublishOperation must not claim Published UPDATE (no published source ownership).
  const publishSaveIntent =
    saveCommand === "OVERWRITE" && overwriteSourceKind === "LOCAL"
      ? "CREATE"
      : saveIntent;
  const publishEditingPublishedFamilyId =
    overwriteSourceKind === "PUBLISHED" ? ctx.editingPublishedFamilyId : null;

  return {
    ok: true,
    updated,
    normalizedDualWrite,
    flatProjection: corpusPersist.flatProjection,
    saveIntent,
    destinationFamilyId,
    overwriteSourceKind:
      saveCommand === "OVERWRITE" ? overwriteSourceKind : "NONE",
    publishOperation: buildPublishOperationFromSave({
      saveIntent: publishSaveIntent,
      editingPublishedFamilyId: publishEditingPublishedFamilyId,
      destinationFamilyId: destinationFamilyId ?? null,
    }),
    ...(useFourTrackFamily && destinationFamilyId
      ? { familyId: destinationFamilyId, fourTrackWritten: true }
      : {}),
  };
}

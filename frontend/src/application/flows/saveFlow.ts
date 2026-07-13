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
//   saveWorkingDataset() 만 WORKING_DATASET_KEY 를 사용한다.
//   localStorage 직접 접근 금지.
//   saveWorkingDataset() → setDataset() 은 반드시 함께 호출.

import { normalizeBallsToBall3 } from "../../admin/slotAutoRecommend";
import { createStrategyEntry } from "../../domain/adminSaveEngine";
import {
  MERGE_EPSILON,
  upsertPositionRecord,
} from "../../domain/positionMergeEngine";
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
import { type PositionRecord } from "../../domain/positionSearchEngine";
import { normalizePublishedShotTypeHint } from "./recallHydrateFlow";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdminState = Record<string, unknown>;

export type SaveFlowResult = {
  ok: boolean;
  updated?: PositionRecord[];
  reason?: string;
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

  const ball3ForDataset = normalizeBallsToBall3(
    ctx.ballsState as Record<string, unknown>
  );
  const cleanBall3 = (safe(ball3ForDataset) ?? ball3ForDataset) as Record<
    string,
    unknown
  >;
  console.log("[SAVE] ball3ForDataset (ballsState SSOT):", ball3ForDataset);

  const datasetTargetBall =
    ctx.targetColor === "red" || ctx.targetColor === "yellow"
      ? ctx.targetColor
      : undefined;

  const canonicalDraft = normalizeCanonicalSaveDraft(
    toCanonicalStrategyEntry({
      slotId,
      signature,
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
      evaluateStrategy: evalForSave,
    });
    strategy = attachCanonicalFieldsToStrategyEntry(baseEntry, canonicalDraft);
    console.log("[SAVE] strategy JSON check:", JSON.stringify(strategy));
  } catch (e) {
    console.error("[SAVE] createStrategyEntry 에러:", e);
    throw e;
  }

  console.log("[SAVE] Running upsertPositionRecord");
  let updated = upsertPositionRecord(
    ctx.dataset,
    ball3ForDataset,
    strategy,
    MERGE_EPSILON,
    datasetTargetBall
  );
  updated = applySchemaVersionToDatasetRecord(updated, cleanBall3);
  console.log("[SAVE] updated length:", updated?.length);

  const savedRecord = updated.find((r) => {
    const s = r.strategies?.[slotId];
    return s != null;
  });
  const savedStrategy = savedRecord?.strategies?.[slotId] ?? strategy;

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

  // DS-002: Working Dataset 저장 → React State 갱신 (순서 유지)
  ctx.saveWorkingDataset(updated);
  ctx.setDataset(updated);

  ctx.patchSlotRuntimeMeta(slotId, {
    targetBall:
      ctx.targetColor === "red" || ctx.targetColor === "yellow"
        ? ctx.targetColor
        : null,
  });

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
        system: ctx.system,
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

  return { ok: true, updated };
}

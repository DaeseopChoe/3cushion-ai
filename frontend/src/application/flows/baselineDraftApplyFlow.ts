/**
 * baselineDraftApplyFlow.ts
 * APP-009-C (Batch 5 STEP 5-7B) — Baseline Draft Apply sequence.
 *
 * AD-B5-04 / AD-B5-07 — Application Flow: sequencing only (INV-B5-04).
 * Domain geometry/builder calls via Context; no inline calculation in Flow.
 */

import { buildBaselineDraftApplyDelta } from "../../domain/buildBaselineDraftApplyDelta";
import { canonicalSystemIdForConfig } from "../../domain/system/systemIdentity";
import {
  baselineSysValueFromHandleRg,
  type BaselineLabelSlotSnapshot,
} from "../../domain/trajectory/baselineHandleGeometry";
import type { BaselineDraftMark } from "../../overlay/state/baselineDraftState";

function ingestBaselineP043Debug(
  location: string,
  message: string,
  data: unknown,
  hypothesisId: string
): void {
  console.log(message, data);
}

/**
 * P0-4c: buildBaselineDraftApplyDelta 결과를 슬롯 SSOT와 병합해 commitDraftSys용 delta 완성.
 * (5½: C3_r = CO_f - C1_f — buildSlotDraftWithUpdatedSys·식 C1_f = CO_f - C3_r 와 동일 관계)
 */
function mergeBaselineDraftInputDeltaForCommit(
  applyDelta: { targetMark?: string; inputDelta?: Record<string, number> } | null,
  draftState: { coSysValue?: number | null; c1SysValue?: number | null },
  slotMerged: Record<string, unknown>,
  systemId: string
): Record<string, number> {
  const mergeInputPayload = {
    targetMark: applyDelta?.targetMark,
    slotValues: {
      CO_f: slotMerged?.CO_f,
      C1_f: slotMerged?.C1_f,
      C3_r: slotMerged?.C3_r,
    },
    draftValues: {
      coSysValue: draftState?.coSysValue,
      c1SysValue: draftState?.c1SysValue,
    },
    inputDelta: applyDelta?.inputDelta,
    systemId,
  };
  console.log("[BASELINE DEBUG MERGE INPUT]", mergeInputPayload);
  ingestBaselineP043Debug(
    "App.jsx:mergeBaselineDraftInputDeltaForCommit:in",
    "[BASELINE DEBUG MERGE INPUT]",
    mergeInputPayload,
    "H-C"
  );

  const base = { ...(applyDelta?.inputDelta ?? {}) };
  const sid = systemId === "5_HALF" ? "5_half_system" : systemId;
  if (sid !== "5_half_system") {
    ingestBaselineP043Debug(
      "App.jsx:mergeBaselineDraftInputDeltaForCommit:non5half",
      "[BASELINE DEBUG MERGED]",
      { branch: "non_5_half", merged: base },
      "H-B"
    );
    console.log("[BASELINE DEBUG MERGED]", { branch: "non_5_half", ...base });
    return base;
  }

  const coSlot = Number(slotMerged.CO_f);
  const c1Slot = Number(slotMerged.C1_f);
  if (applyDelta?.targetMark === "CO") {
    const co = base.CO_f;
    const c1FromDraft = draftState.c1SysValue;
    const c1UsesDraft =
      typeof c1FromDraft === "number" && Number.isFinite(c1FromDraft);
    const c1 = c1UsesDraft ? c1FromDraft : c1Slot;
    const c1Source = c1UsesDraft ? "draft.c1SysValue" : "slotMerged.C1_f";
    if (!Number.isFinite(co) || !Number.isFinite(c1)) {
      const early = {
        branch: "CO_early_return_incomplete",
        merged: base,
        co,
        c1,
        c1Source,
      };
      console.log("[BASELINE DEBUG MERGED]", early);
      ingestBaselineP043Debug(
        "App.jsx:mergeBaselineDraftInputDeltaForCommit:CO_early",
        "[BASELINE DEBUG MERGED]",
        early,
        "H-B"
      );
      return base;
    }
    const merged = { ...base, CO_f: co, C1_f: c1, C3_r: co - c1, baseOneC: co };
    const out = {
      branch: "CO_full",
      co_f: merged.CO_f,
      c1_f: merged.C1_f,
      c3_r: merged.C3_r,
      baseOneC: merged.baseOneC,
      c1Source,
      c1FromDraft,
      c1Slot,
      c3Formula: `${co} - ${c1} = ${co - c1}`,
    };
    console.log("[BASELINE DEBUG MERGED]", out);
    ingestBaselineP043Debug(
      "App.jsx:mergeBaselineDraftInputDeltaForCommit:CO_out",
      "[BASELINE DEBUG MERGED]",
      out,
      c1UsesDraft && c1FromDraft === 0 ? "H-A" : "H-A"
    );
    return merged;
  }
  const c1 = base.C1_f;
  const coFromDraft = draftState.coSysValue;
  const coUsesDraft =
    typeof coFromDraft === "number" && Number.isFinite(coFromDraft);
  const co = coUsesDraft ? coFromDraft : coSlot;
  const coSource = coUsesDraft ? "draft.coSysValue" : "slotMerged.CO_f";
  if (!Number.isFinite(co) || !Number.isFinite(c1)) {
    const early = {
      branch: "C1_early_return_incomplete",
      merged: base,
      co,
      c1,
      coSource,
    };
    console.log("[BASELINE DEBUG MERGED]", early);
    ingestBaselineP043Debug(
      "App.jsx:mergeBaselineDraftInputDeltaForCommit:C1_early",
      "[BASELINE DEBUG MERGED]",
      early,
      "H-B"
    );
    return base;
  }
  const merged = { ...base, CO_f: co, C1_f: c1, C3_r: co - c1, baseOneC: co };
  const out = {
    branch: "C1_full",
    co_f: merged.CO_f,
    c1_f: merged.C1_f,
    c3_r: merged.C3_r,
    baseOneC: merged.baseOneC,
    coSource,
    coFromDraft,
    coSlot,
    c3Formula: `${co} - ${c1} = ${co - c1}`,
  };
  console.log("[BASELINE DEBUG MERGED]", out);
  ingestBaselineP043Debug(
    "App.jsx:mergeBaselineDraftInputDeltaForCommit:C1_out",
    "[BASELINE DEBUG MERGED]",
    out,
    coUsesDraft && coFromDraft === 0 ? "H-A" : "H-D"
  );
  return merged;
}

export type BaselineDraftApplyTrajectoryApi = {
  state: { adjusted?: unknown };
  setAdjusting: (data: {
    sys: { oneC: number; threeC: number };
  }) => void;
  applySysResult: (result: unknown) => void;
};

export type BaselineDraftApplyFlowContext = {
  mark: BaselineDraftMark;
  appMode: string;
  showBaseLine: boolean;
  overlayState: { open: boolean; type?: string | null };
  baselineDraftState: {
    activeMark?: BaselineDraftMark | null;
    coSysValue?: number | null;
    c1SysValue?: number | null;
    coRg?: { x: number; y: number } | null;
    c1Rg?: { x: number; y: number } | null;
  };
  trackForAnchors: string | null | undefined;
  systemIdForGrid: string | null | undefined;
  baselineLabelSlotSnapshot: BaselineLabelSlotSnapshot | null | undefined;
  baselineLabelSsot: Record<string, unknown> | null | undefined;
  activeSlot: string;
  slots: Record<string, { draft?: { sys?: Record<string, unknown> }; applied?: { sys?: Record<string, unknown> } } | undefined>;
  resolvedSlotSys: Record<string, unknown> | null | undefined;
  targetColor: string | null;
  trajectory: BaselineDraftApplyTrajectoryApi;
  commitDraftSys: (
    activeSlot: string,
    systemId: string,
    inputDelta: Record<string, number>,
    options: { track: string }
  ) => {
    ok: boolean;
    reason?: string;
    appliedSys?: {
      inputs?: Record<string, unknown>;
      outputs?: { result?: Record<string, unknown> };
    };
  };
  patchSlotRuntimeMeta: (
    slotId: string,
    meta: {
      system_values: Record<string, unknown>;
      targetBall: "red" | "yellow" | null;
    }
  ) => void;
  clearAppliedBaselineDraftMark: (mark: BaselineDraftMark) => void;
};

/** P0-4a/4c: baseline draft Apply SSOT (✓ 버튼에서 호출) */
export function runBaselineDraftApply(ctx: BaselineDraftApplyFlowContext): void {
  const { mark, baselineDraftState } = ctx;

  console.log("[BASELINE DBLCLICK]", { mark, baselineDraftState });
  if (ctx.appMode !== "ADMIN" || !ctx.showBaseLine) {
    console.log("[BASELINE DBLCLICK] abort", {
      reason: "not ADMIN or showBaseLine off",
      appMode: ctx.appMode,
      showBaseLine: ctx.showBaseLine,
    });
    return;
  }
  if (ctx.overlayState.open) {
    console.log("[BASELINE DBLCLICK] abort", {
      reason: "overlay open",
      overlayType: ctx.overlayState.type,
    });
    return;
  }

  console.log("[BASELINE ACTIVE]", {
    activeMark: baselineDraftState.activeMark,
    mark,
    coSysValue: baselineDraftState.coSysValue,
    c1SysValue: baselineDraftState.c1SysValue,
  });

  const active = baselineDraftState.activeMark;
  if (!active || mark !== active) {
    console.log("[BASELINE ABORT]", "activeMark mismatch");
    return;
  }
  if (mark !== "CO" && mark !== "C1") {
    return;
  }

  const handleRg =
    mark === "CO" ? baselineDraftState.coRg : baselineDraftState.c1Rg;
  if (
    !handleRg ||
    !Number.isFinite(handleRg.x) ||
    !Number.isFinite(handleRg.y) ||
    !ctx.trackForAnchors ||
    !ctx.systemIdForGrid
  ) {
    console.log("[BASELINE ABORT]", "missing handleRg or track for inverse");
    return;
  }

  const computedSys = baselineSysValueFromHandleRg(
    mark,
    handleRg,
    ctx.trackForAnchors,
    ctx.systemIdForGrid,
    ctx.baselineLabelSlotSnapshot,
    ctx.baselineLabelSsot
  );
  if (!Number.isFinite(computedSys)) {
    console.log("[BASELINE ABORT]", "inverse failed", { mark, handleRg });
    return;
  }

  const draftForApply = {
    ...baselineDraftState,
    ...(mark === "CO"
      ? { coSysValue: computedSys }
      : { c1SysValue: computedSys }),
  };

  const applyDelta = buildBaselineDraftApplyDelta({
    baselineDraftState: draftForApply,
    systemId: ctx.systemIdForGrid,
  });
  const applyDeltaLog = applyDelta
    ? { targetMark: applyDelta.targetMark, inputDelta: applyDelta.inputDelta }
    : null;
  console.log("[BASELINE DEBUG APPLY DELTA]", applyDeltaLog);
  ingestBaselineP043Debug(
    "App.jsx:handleBaselineDraftDoubleClick:applyDelta",
    "[BASELINE DEBUG APPLY DELTA]",
    applyDeltaLog,
    "H-C"
  );
  console.log("[BASELINE DELTA]", applyDelta);

  if (!applyDelta) {
    console.log("[BASELINE ABORT]", "applyDelta null");
    return;
  }

  const activeSlot = ctx.activeSlot;
  const slot = ctx.slots[activeSlot];
  const slotSys =
    slot?.draft?.sys ?? slot?.applied?.sys ?? ctx.resolvedSlotSys;
  const slotMerged = slotSys
    ? {
        ...((slotSys as { inputs?: Record<string, unknown> }).inputs ?? {}),
        ...((slotSys as { outputs?: { result?: Record<string, unknown> } })
          .outputs?.result ?? {}),
      }
    : {};
  const slotBefore = {
    co_f: slotMerged.CO_f,
    c1_f: slotMerged.C1_f,
    c3_r: slotMerged.C3_r,
    slotSysSource: slot?.draft?.sys
      ? "draft.sys"
      : slot?.applied?.sys
        ? "applied.sys"
        : "resolvedSlotSys",
    draftCoSysValue: baselineDraftState.coSysValue,
    draftC1SysValue: baselineDraftState.c1SysValue,
  };
  console.log("[BASELINE DEBUG SLOT BEFORE]", slotBefore);
  ingestBaselineP043Debug(
    "App.jsx:handleBaselineDraftDoubleClick:slotBefore",
    "[BASELINE DEBUG SLOT BEFORE]",
    slotBefore,
    "H-D"
  );

  const systemId = canonicalSystemIdForConfig(ctx.systemIdForGrid);
  const trackVal = ctx.trackForAnchors ?? (slotSys as { track?: string })?.track ?? "B2T_L";
  const inputDelta = mergeBaselineDraftInputDeltaForCommit(
    applyDelta,
    draftForApply,
    slotMerged,
    systemId
  );
  console.log("[BASELINE MERGED]", inputDelta);

  const commitInputLog = { inputDelta, activeSlot, systemId, trackVal };
  console.log("[BASELINE DEBUG COMMIT INPUT]", commitInputLog);
  ingestBaselineP043Debug(
    "App.jsx:handleBaselineDraftDoubleClick:commitInput",
    "[BASELINE DEBUG COMMIT INPUT]",
    commitInputLog,
    "H-B"
  );

  console.log("[BASELINE COMMIT INPUT]", {
    activeSlot,
    systemId,
    trackVal,
    inputDelta,
    slotMergedC3_r: slotMerged.C3_r,
    slotMergedCO_f: slotMerged.CO_f,
    slotMergedC1_f: slotMerged.C1_f,
  });

  const commitResult = ctx.commitDraftSys(activeSlot, systemId, inputDelta, {
    track: trackVal,
  });
  console.log("[BASELINE COMMIT RESULT]", commitResult);

  if (!commitResult.ok) {
    ingestBaselineP043Debug(
      "App.jsx:handleBaselineDraftDoubleClick:commitFail",
      "[BASELINE DEBUG COMMIT OUTPUT]",
      { ok: false, reason: commitResult.reason },
      "H-B"
    );
    return;
  }

  const appliedSys = commitResult.appliedSys;
  const appliedResult = appliedSys?.outputs?.result;
  const commitOutputLog = {
    co_f: appliedResult?.CO_f,
    c1_f: appliedResult?.C1_f,
    c3_r: appliedResult?.C3_r,
    c4_f: appliedResult?.C4_f,
    sn: appliedResult?.Sn,
    inputs_CO_f: appliedSys?.inputs?.CO_f,
    inputs_C1_f: appliedSys?.inputs?.C1_f,
    inputs_C3_r: appliedSys?.inputs?.C3_r,
  };
  console.log("[BASELINE DEBUG COMMIT OUTPUT]", commitOutputLog);
  ingestBaselineP043Debug(
    "App.jsx:handleBaselineDraftDoubleClick:commitOutput",
    "[BASELINE DEBUG COMMIT OUTPUT]",
    commitOutputLog,
    "H-E"
  );
  console.log("[BASELINE COMMIT OUTPUTS]", {
    co_f: appliedResult?.CO_f,
    c1_f: appliedResult?.C1_f,
    c3_r: appliedResult?.C3_r,
    c4_f: appliedResult?.C4_f,
    sn: appliedResult?.Sn,
  });
  console.log("[SYS APPLY OUTPUT]", {
    CO_f: appliedResult?.CO_f,
    C1_f: appliedResult?.C1_f,
    C3_r: appliedResult?.C3_r,
    C4_f: appliedResult?.C4_f,
    Sn: appliedResult?.Sn,
  });

  const system_values = appliedSys
    ? {
        ...(appliedSys.inputs ?? {}),
        ...(appliedResult ?? {}),
      }
    : inputDelta;

  console.log("[BASELINE PATCH META]", { activeSlot, system_values });
  ctx.patchSlotRuntimeMeta(activeSlot, {
    system_values,
    targetBall:
      ctx.targetColor === "red" || ctx.targetColor === "yellow"
        ? ctx.targetColor
        : null,
  });

  if (appliedResult && !ctx.trajectory.state.adjusted) {
    ctx.trajectory.setAdjusting({
      sys: {
        oneC: (appliedResult.oneC as number) || 0,
        threeC: (appliedResult.threeC as number) || 0,
      },
    });
  }
  if (appliedResult) {
    ctx.trajectory.applySysResult(appliedResult);
    console.log("[BASELINE APPLY RESULT]", { applied: true });
  }

  ctx.clearAppliedBaselineDraftMark(mark);
}

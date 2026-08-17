/**
 * DEV-only diagnostics for SYS Apply → corrected trajectory C1-cut investigation.
 * Side-effect: console.log only. Does not mutate product state or timing.
 */
import { PATH_NODE_MARKS } from "../domain/trajectoryPathDisplayPolicy";
import { detectRail } from "../domain/reflectionEngine";

export type SysApplyCutDiagPhase =
  | "BEFORE"
  | "AFTER_COMMIT"
  | "AFTER_META_PATCH"
  | "FIRST_RENDER"
  | "NEXT_RENDER"
  | "STATE_1_APPLY_CORRECTED"
  | "STATE_2_BASELINE"
  | "STATE_3_CORRECTED_AGAIN";

type PointLike = { x?: number; y?: number } | null | undefined;

export type SysApplyCutDiagSession = {
  applyId: number;
  /** await_first → await_next → await_baseline → await_corrected_again → done */
  step:
    | "await_first"
    | "await_next"
    | "await_baseline"
    | "await_corrected_again"
    | "done";
  logged: Record<string, boolean>;
};

export function createSysApplyCutDiagSession(applyId: number): SysApplyCutDiagSession {
  return { applyId, step: "await_first", logged: {} };
}

function finitePoint(p: PointLike): { x: number; y: number } | null {
  if (!p || typeof p !== "object") return null;
  const x = Number(p.x);
  const y = Number(p.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

export function summarizePathNode(p: PointLike, index: number) {
  const pt = finitePoint(p);
  if (!pt) {
    return {
      index,
      mark: PATH_NODE_MARKS[index] ?? `i${index}`,
      present: false,
      x: null,
      y: null,
      rail: null,
    };
  }
  return {
    index,
    mark: PATH_NODE_MARKS[index] ?? `i${index}`,
    present: true,
    x: pt.x,
    y: pt.y,
    rail: detectRail(pt) ?? null,
  };
}

export function summarizePathNodes(pathNodes: unknown[] | null | undefined) {
  const arr = Array.isArray(pathNodes) ? pathNodes : [];
  return {
    length: arr.length,
    nodes: arr.map((n, i) => summarizePathNode(n as PointLike, i)),
    presentAfterC1: arr.slice(2).map((n, i) => ({
      index: i + 2,
      present: finitePoint(n as PointLike) != null,
    })),
  };
}

export function logSysApplyOrdering(
  phase: SysApplyCutDiagPhase,
  payload: Record<string, unknown>
) {
  if (!import.meta.env.DEV) return;
  console.log(`[SYS_APPLY_CUT_DIAG][${phase}]`, {
    ts: Date.now(),
    ...payload,
  });
}

export type CorrectedCutSnapshotInput = {
  applyId: number;
  stateTag: string;
  showBaseLine: boolean;
  pathNodes: unknown[] | null | undefined;
  cushionPath: unknown[] | null | undefined;
  cushionPathForRender: unknown[] | null | undefined;
  capCorrected: { endIndex?: number; reason?: string; stoppedSegment?: string } | null | undefined;
  visibleKeysForLabels: string[] | null | undefined;
  skipSameRail: boolean;
  c2ReflectionOverride: { rail?: string; t?: number } | null | undefined;
  c2Resolved: PointLike;
  anchorsC2Present: boolean;
  reflectedDiagnostics: unknown;
  slotDraft: Record<string, unknown> | null | undefined;
  slotApplied: Record<string, unknown> | null | undefined;
  slotRenderSys: Record<string, unknown> | null | undefined;
  resolvedSlotSysValues: Record<string, unknown> | null | undefined;
  useCurveDeform: boolean;
};

export function buildCorrectedCutSnapshot(input: CorrectedCutSnapshotInput) {
  const pathSum = summarizePathNodes(input.pathNodes);
  const cushion = summarizePathNodes(input.cushionPath as unknown[]);
  const cushionRender = summarizePathNodes(input.cushionPathForRender as unknown[]);
  const draft = input.slotDraft ?? null;
  const applied = input.slotApplied ?? null;
  const renderSys = input.slotRenderSys ?? null;
  const eff = input.resolvedSlotSysValues ?? {};
  const corr =
    (draft?.corrections as Record<string, unknown> | undefined) ??
    (applied?.corrections as Record<string, unknown> | undefined) ??
    (renderSys?.corrections as Record<string, unknown> | undefined) ??
    null;
  const cap = input.capCorrected ?? null;
  const endIndex = cap?.endIndex ?? -1;
  const reason = cap?.reason ?? null;

  return {
    applyId: input.applyId,
    stateTag: input.stateTag,
    showBaseLine: input.showBaseLine,
    path: {
      pathNodesLength: pathSum.length,
      pathNodes: pathSum.nodes,
      pathNodes2: pathSum.nodes[2] ?? null,
      presentAfterC1: pathSum.presentAfterC1,
      cushionPathLength: cushion.length,
      cushionPath: cushion.nodes,
      cushionPathForRenderLength: cushionRender.length,
      cushionPathForRender: cushionRender.nodes,
      renderPointCount: cushionRender.length,
    },
    cap: {
      capCorrected: cap,
      endIndex,
      reason,
      missing_node: reason === "missing_node",
      same_rail: reason === "same_rail",
      visibleKeysForLabels: input.visibleKeysForLabels ?? [],
    },
    c2: {
      resolved: summarizePathNode(input.c2Resolved, 2),
      anchorsC2Present: input.anchorsC2Present,
      c2ReflectionOverride: input.c2ReflectionOverride ?? null,
      rail: input.c2ReflectionOverride?.rail ?? null,
      t: input.c2ReflectionOverride?.t ?? null,
      reflectedDiagnostics: input.reflectedDiagnostics ?? null,
      skipSameRail: input.skipSameRail,
    },
    meta: {
      shotType:
        draft?.shotType ?? applied?.shotType ?? renderSys?.shotType ?? null,
      track:
        (draft?.sys as { track?: string } | undefined)?.track ??
        (applied?.sys as { track?: string } | undefined)?.track ??
        (renderSys as { track?: string } | undefined)?.track ??
        null,
      corrections: corr,
      correctionsSlide: corr ? Number(corr.slide) || 0 : null,
      correctionsDraw: corr ? Number(corr.draw) || 0 : null,
      system_values:
        draft?.system_values ?? applied?.system_values ?? null,
      effective: {
        CO_f: eff.CO_f ?? null,
        C1_f: eff.C1_f ?? null,
        C3_r: eff.C3_r ?? null,
        C4_f: eff.C4_f ?? null,
        C5_f: eff.C5_f ?? null,
        C6_f: eff.C6_f ?? null,
        Sn: eff.Sn ?? null,
      },
    },
    render: {
      useCurveDeform: input.useCurveDeform,
    },
  };
}

export function logCorrectedCutSnapshot(snapshot: ReturnType<typeof buildCorrectedCutSnapshot>) {
  if (!import.meta.env.DEV) return;
  console.log(`[SYS_APPLY_CUT_DIAG][${snapshot.stateTag}]`, snapshot);
  console.table({
    applyId: snapshot.applyId,
    stateTag: snapshot.stateTag,
    showBaseLine: snapshot.showBaseLine,
    cushionPathLength: snapshot.path.cushionPathLength,
    pathNodes2Present: snapshot.path.pathNodes2?.present ?? false,
    capEndIndex: snapshot.cap.endIndex,
    capReason: snapshot.cap.reason,
    missing_node: snapshot.cap.missing_node,
    same_rail: snapshot.cap.same_rail,
    skipSameRail: snapshot.c2.skipSameRail,
    overrideRail: snapshot.c2.rail,
    overrideT: snapshot.c2.t,
    slide: snapshot.meta.correctionsSlide,
    shotType: snapshot.meta.shotType,
    effCO: snapshot.meta.effective.CO_f,
    effC3: snapshot.meta.effective.C3_r,
    effC4: snapshot.meta.effective.C4_f,
    useCurveDeform: snapshot.render.useCurveDeform,
    renderPointCount: snapshot.path.renderPointCount,
  });
}

/**
 * Drive STATE1/2/3 + FIRST/NEXT render logging without changing React timing.
 * Call once per App render after trajectoryBuild (DEV only).
 */
export function maybeLogSysApplyCutRender(
  session: SysApplyCutDiagSession | null,
  args: {
    showBaseLine: boolean;
    adminTableLayersVisible: boolean;
    appMode: string;
    snapshotInput: Omit<CorrectedCutSnapshotInput, "applyId" | "stateTag">;
  }
): SysApplyCutDiagSession | null {
  if (!import.meta.env.DEV || !session || session.step === "done") return session;
  if (args.appMode !== "ADMIN" || !args.adminTableLayersVisible) return session;

  const run = (stateTag: string, nextStep: SysApplyCutDiagSession["step"]) => {
    if (session.logged[stateTag]) return;
    const snap = buildCorrectedCutSnapshot({
      ...args.snapshotInput,
      applyId: session.applyId,
      stateTag,
    });
    logCorrectedCutSnapshot(snap);
    session.logged[stateTag] = true;
    session.step = nextStep;
  };

  if (session.step === "await_first" && !args.showBaseLine) {
    run("FIRST_RENDER", "await_next");
    run("STATE_1_APPLY_CORRECTED", "await_next");
    return session;
  }
  if (session.step === "await_next" && !args.showBaseLine) {
    run("NEXT_RENDER", "await_baseline");
    return session;
  }
  if (session.step === "await_baseline" && args.showBaseLine) {
    run("STATE_2_BASELINE", "await_corrected_again");
    return session;
  }
  if (session.step === "await_corrected_again" && !args.showBaseLine) {
    run("STATE_3_CORRECTED_AGAIN", "done");
    return session;
  }
  return session;
}

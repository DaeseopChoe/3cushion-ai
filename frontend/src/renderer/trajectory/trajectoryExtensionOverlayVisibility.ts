/**
 * Trajectory Extension Overlay Attach / Visibility (Presentation).
 * DISPLAY_BOUNDARY_POLICY_SSOT §9 · Phase 2A.
 *
 * Runtime Geometry / draft는 변경하지 않는다. mount 여부만 결정한다.
 * USER baseline 무조건 숨김이 아니라, attach 허용 입력으로 CASE A를 확장한다.
 */

import { PATH_INDEX_C4 } from "../../domain/trajectoryPathDisplayPolicy";

export type ExtensionOverlayActiveBranch = "baseline" | "corrected";

export type ExtensionOverlayDisplayCap = {
  endIndex: number;
  reason?: string;
};

export type ResolveTrajectoryExtensionOverlayVisibilityInput = {
  appMode: string;
  /** USER 표시 branch. ADMIN에서는 무시. */
  activeBranch: ExtensionOverlayActiveBranch;
  extensionDraftCount: number;
  /** ADMIN 편집 시 Handle 표시. */
  canEdit?: boolean;
  /**
   * Future CASE A: baseline Continuation(또는 동등 정책)이 Overlay attach를 허용할 때 true.
   * Phase 2A: 미전달/false → USER baseline에서는 attach=false (CASE B).
   */
  baselineContinuationAllowed?: boolean;
  /** Optional: reason / CASE B 진단용 (판정 필수는 아님). */
  baselineCap?: ExtensionOverlayDisplayCap | null;
};

export type TrajectoryExtensionOverlayVisibility = {
  attach: boolean;
  showReveal: boolean;
  showExtensionSegments: boolean;
  showHandles: boolean;
  reason: string;
};

const HIDDEN: TrajectoryExtensionOverlayVisibility = {
  attach: false,
  showReveal: false,
  showExtensionSegments: false,
  showHandles: false,
  reason: "no_draft",
};

function visible(
  reason: string,
  canEdit: boolean
): TrajectoryExtensionOverlayVisibility {
  return {
    attach: true,
    showReveal: true,
    showExtensionSegments: true,
    showHandles: !!canEdit,
    reason,
  };
}

/**
 * Branch별 Extension Overlay Attach/Visibility.
 * draft null 처리 없음 — 호출부가 mount만 제어한다.
 */
export function resolveTrajectoryExtensionOverlayVisibility(
  input: ResolveTrajectoryExtensionOverlayVisibilityInput
): TrajectoryExtensionOverlayVisibility {
  const {
    appMode,
    activeBranch,
    extensionDraftCount,
    canEdit = false,
    baselineContinuationAllowed = false,
    baselineCap = null,
  } = input;

  if (!Number.isFinite(extensionDraftCount) || extensionDraftCount <= 0) {
    return { ...HIDDEN, reason: "no_draft" };
  }

  if (appMode === "ADMIN") {
    return visible("admin", canEdit);
  }

  if (appMode !== "USER") {
    return visible("non_user_default", canEdit);
  }

  if (activeBranch === "corrected") {
    return visible("user_corrected", false);
  }

  // USER baseline
  if (baselineContinuationAllowed === true) {
    return visible("user_baseline_continuation_allowed", false);
  }

  // CASE B (Phase 2A): baseline에 corrected Overlay 미부착. Runtime 유지.
  const endsAtC4 =
    baselineCap != null &&
    Number.isFinite(baselineCap.endIndex) &&
    baselineCap.endIndex === PATH_INDEX_C4;

  return {
    ...HIDDEN,
    reason: endsAtC4
      ? "user_baseline_case_b_c4_end"
      : "user_baseline_attach_deferred",
  };
}

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { flushSync } from "react-dom";
import { useShotSlots, resolveSlotSysForRender } from "./hooks/useShotSlots";
import { resolveSlotSys } from "./domain/system/slotSysViewModel";
import { useTrajectoryState } from "./hooks/useTrajectoryState";
import {
  createEmptyAdminSysSnapshot,
} from "./domain/adminSysFromSlot";
import {
  buildSlotRuntimePayload,
  extractSlotRuntimeMeta,
  extractSlotTargetBall,
} from "./domain/slotRuntimeHydrate";
import {
  buildStrategyButtonsFromRuntime,
  strategyCountMapFromButtons,
} from "./domain/strategyButtonModel";
import { buildUserInfoPanel } from "./domain/userInfoPanelModel";
import { buildUserHptViewModel } from "./domain/userHptViewModel";
import {
  canonicalSystemIdForConfig,
  getSysUseSn,
  isFiveHalfSystemId,
} from "./domain/system/systemIdentity";
import {
  buildEffectiveRenderSysValues,
  computeSysOverlayValues,
  evaluateSysOverlayHasAllInputs,
} from "./domain/calculator/systemValueCalculator";
import { parseSysFormulaExpr } from "./domain/calculator/formulaExpr";
import {
  loadOnePoints,
  saveOnePoints,
} from "./domain/lesson/onePointLibrary";
import {
  loadOnePointCategories,
  createOnePointCategory,
  updateOnePointCategory,
  deleteOnePointCategory,
} from "./domain/lesson/onePointCategoryLibrary";
import CategoryManageModal from "./components/overlays/CategoryManageModal";
import LessonOrderManageModal from "./components/overlays/LessonOrderManageModal";
import { SysOverlay } from "./components/overlays/SysOverlay";
import {
  getSystemContract,
  extractTrajectoryContractView,
} from "./runtime";
import { supplyReflectionSafety } from "./domain/trajectory/reflectionPolicy";
import { bindDomainContractSupply } from "./domain/runtimeContractSupply";
import { convertThetaToClock } from "./utils/tipClockConverter";
import {
  hitPointToTipDisplay,
  hitPointToRotationText,
  hitPointToVerticalText,
  formatThickness,
  getSystemNameKo,
} from "./utils/aiPlayStrategyBuilder";
import { useHptController, clampHpToRadius } from "./admin/hpt/useHptController";
import { calcImpactBall } from "./data/system/calculator";
import {
  clamp,
  toPx,
  pointerToRg,
} from "./utils/geometry/coords";
import { cushionMarkToDisplayLabel } from "./utils/cushionDisplayLabel";
import { AnchorEditOverlay } from "./components/overlays/AnchorEditOverlay";
import { HptOverlay, StrOverlay } from "./components/overlays/HptOverlay";
import { AiOverlay, ensureLessonItems } from "./components/overlays/AiOverlay";
import { useAdminOverlayRouter } from "./overlay/router/adminOverlayRouter";
import { useAdminOverlayLifecycle } from "./overlay/state/overlayStateMachine";
import { useUserOverlayRouter } from "./overlay/router/userOverlayRouter";
import { useSysLabelScale } from "./renderer/labels/labelScalePolicy";
import {
  JOYSTICK_BASE_R_PX,
  JOYSTICK_KNOB_R_PX,
  FINE_CTRL_ZONE_INNER_PX,
  FINE_CTRL_ZONE_OUTER_PX,
  computeJoystickCenterRg,
  computeFineControllerCenterRg,
  isPointerOnJoystick,
} from "./interaction/joystickInteractionPolicy";
import { buildTrajectoryRenderModel } from "./renderer/trajectory/trajectoryRenderModel";
import { buildBaselineHandleModel } from "./renderer/trajectory/baselineHandleModel";
import { buildC2HandleModel } from "./renderer/trajectory/c2HandleModel";
import { buildTrajectoryPathAttrModel } from "./renderer/trajectory/trajectoryPathAttrModel";
import { buildSystemAxisLabelModel } from "./renderer/labels/systemAxisLabelModel";
import { buildRgAnchors } from "./renderer/trajectory/anchorConversionModel";
import {
  c1ArrivalRailForTrack,
  coDepartureRailForTrack,
  projectPointToRail,
} from "./utils/geometry/rail";
import {
  computeThicknessFromImpact,
  snapImpactToOrbit,
} from "./utils/physics/ImpactEngine";
import SystemValueLabels from "./components/table/SystemValueLabels";
import WorkspaceHistoryModal from "./components/WorkspaceHistoryModal";
import ModalShell from "./components/common/ModalShell";
import UserOverlayShell from "./components/common/UserOverlayShell.jsx";
import UserAiPanel from "./components/user/UserAiPanel.jsx";
import UserHptPanel from "./components/user/UserHptPanel.jsx";
import UserCalculationPanel from "./components/user/UserCalculationPanel.jsx";
import UserCalcToolbar from "./components/user/UserCalcToolbar.jsx";
import RealInterpolationPanel from "./components/user/RealInterpolationPanel.jsx";
import { resolveUserOverlayLayout } from "./overlay/layout/overlayLayoutTokens";
import { buildSysCalcDisplayModel } from "./overlay/utils/sysCalcDisplayModel";
import {
  normalizeSlideDrawCorrections,
  resolveCoC1C3Keys,
  unifiedSlideFromCorrections,
} from "./overlay/utils/sysOverlayUtils";
import UserToast from "./components/common/UserToast.jsx";
import ImpactLines from "./components/table/ImpactLines";
import TrajectoryExtensionLayer from "./components/table/TrajectoryExtensionLayer";
import SystemGrid from "./components/table/SystemGrid";
import CoachingOverlay from "./components/table/CoachingOverlay";
import { useCoachingController } from "./hooks/useCoachingController";
import { useSystemController } from "./hooks/useSystemController";
import { useDisplayController } from "./hooks/useDisplayController";
import { TABLE_CONFIG } from "./config/tableConfig";
import { buildRailGroupedStrategy } from "./domain/railEngine";
import {
  getUserDisplayFlags,
  isUserDisplayModeActive,
} from "./domain/userDisplayFlags";
import { useUserToast } from "./hooks/useUserToast";
import { normalizeTargetBallForKey } from "./domain/positionMergeEngine";
import { sysValuesToAnchors } from "./domain/systemEngine";
import {
  getAnchorsForRendering,
  getLabelNumericSuffix,
} from "./domain/anchorCoordinateEngine";
import { buildTrajectory } from "./domain/trajectory/trajectoryBuilder";
import {
  appendExtension1Draft,
  appendExtension2Draft,
  buildRevealPathNodes,
  canAddAnotherExtension,
  canCreateExtensionFromOrigin,
  collectDisplayProjectionSegments,
  draftItemCount,
  draftToPayload,
  payloadToDraft,
  projectBallOntoNearestSegment,
  resolveDraftSegments,
  resolveOrigin,
} from "./domain/trajectoryExtension";
import {
  colorForSlotId,
  getSecondBall,
  isConfirmedTargetBall,
  isSecondRoleSlot,
  resolveImpactTargetBall,
} from "./domain/ballRole";
import { buildTrajectoryExtensionRenderModel } from "./renderer/trajectory/trajectoryExtensionRenderModel";
import { resolveTrajectoryExtensionOverlayVisibility } from "./renderer/trajectory/trajectoryExtensionOverlayVisibility";
import { useBaselineDraft } from "./overlay/state/baselineDraftState";
import { useTrajectoryExtensionHandleDrag } from "./overlay/state/trajectoryExtensionHandleDrag";
import { useC2RailHandleDrag } from "./overlay/state/c2RailHandleDrag";
import {
  normalizeReflectionOverride,
  reflectionOverrideToPoint,
} from "./domain/trajectory/c2ReflectionOverride";
import {
  loadWorkingDataset,
  saveWorkingDataset,
  importDatasetFromFile,
} from "./domain/dataset/infra/datasetStorage";
import { useAutoCapture } from "./domain/dataset/autoCapture";
import {
  adminSysFromRecallEntry,
  normalizePublishedShotTypeHint,
  resolvePublishedLeafHints,
} from "./application/flows/recallHydrateFlow";
import { runUserSearchReset } from "./application/flows/resetFlow";
import { runAdminLocalDbRecall } from "./application/flows/adminLocalDbFlow";
import { runAdminSearch } from "./application/flows/adminSearchFlow";
import { runUserSearch } from "./application/flows/userSearchFlow";
import { runRealInterpolationSearchFlow } from "./application/flows/realInterpolationSearchFlow";
import {
  getOrLoadPublishedEnvelopeDataset,
  publishedEnvelopeDatasetForSearch,
} from "./domain/realInterpolation/envelopeDatasetLoader";
import {
  positionIdFromStrategyRef,
  projectRealInterpolationResultToStrategyEntry,
} from "./domain/realInterpolation/strategySlotHydrate";
import { buildRealInterpolationTrajectoryBuildInput } from "./domain/realInterpolation/trajectoryBuildInput";
import {
  buildRealInterpolationUiSurface,
  formatRiConfidenceLabel,
  formatRiMatchTypeLabel,
} from "./domain/realInterpolation/uiSurface";
import { runSaveStrategy } from "./application/flows/saveFlow";
import { runCanonicalSave } from "./application/flows/historyFlow";
import { runBallDrag } from "./application/flows/ballDragFlow";
import { runTrajectoryHydrate } from "./application/flows/trajectoryHydrateFlow";
import { runBaselineDraftApply } from "./application/flows/baselineDraftApplyFlow";
import {
  hydrateBallsStateForUi,
  normalizeBallsToBall3,
} from "./admin/slotAutoRecommend";
import { PositionKDIndex } from "./domain/search/positionKDIndex";
import {
  buildRecallTracePayload,
  summarizeDatasetRecords,
} from "./domain/positionRecallTrace";
import { makeSignatureKey } from "./domain/search/signatureKey";
import { listStrategiesInRecord } from "./domain/positionSearchEngine";
import { initFileHandle, saveToFile } from "./domain/fileService";
import {
  useSettings,
  WORKSPACE_CLEANUP_CLEAR_ALL,
  WORKSPACE_CLEANUP_PRESERVE_DATASET,
  runWorkspaceLocalStorageCleanup,
} from "./hooks/useSettings";

/** Batch 6 STEP 6-4 — App Runtime Injection Hub (Registry → Contract slices). */
function resolveFormulaHash(systemId) {
  const contract = getSystemContract(systemId);
  if (!contract) return "v1";
  return (
    contract.profile.formulaExpr ??
    contract.version.packageVersion ??
    "v1"
  ).slice(0, 32);
}

function resolveEvalProfile(systemId) {
  const expr = getSystemContract(systemId)?.profile?.formulaExpr;
  return expr ? { formula: { expr } } : {};
}

function resolveAnchorsData(systemId) {
  const anchors = getSystemContract(systemId)?.anchors;
  if (!anchors?.trajectories) return undefined;
  return {
    trajectories: anchors.trajectories,
    ...(anchors.meta ? { meta: anchors.meta } : {}),
  };
}

/** Domain Contract supply — Registry → slices (STEP 6-5). Domain never imports Runtime. */
bindDomainContractSupply({
  getFormulaExpr: (systemId) =>
    getSystemContract(systemId)?.profile?.formulaExpr ?? null,
  getFormulaHash: resolveFormulaHash,
  getAnchorsData: resolveAnchorsData,
});

// IMPORTANT:
// Main app currently renders the LOCAL SysOverlay defined in this file.
// admin/sys/SysOverlay.tsx is NOT used by main.jsx.
// When modifying the SYS modal UI, edit the SysOverlay component inside App.jsx.
// There are currently two SysOverlay implementations in the project.
// Overlay modularization/refactor is planned after system stabilization.

const { SCALE, TABLE_W_UNITS, TABLE_H_UNITS, TABLE_W, TABLE_H, PADDING } = TABLE_CONFIG;

const ADMIN_BUTTONS = ["SYS", "HPT", "STR", "AI"];

function postRecallTraceLog(_location, _message, _hypothesisId, _data) {}

function traceSlotPresence(slots) {
  return ["S1", "S2", "S3"].map((slotId) => {
    const slot = slots?.[slotId];
    return {
      slotId,
      hasDraft: !!slot?.draft,
      hasApplied: !!slot?.applied,
      draftSys: !!slot?.draft?.sys,
      appliedSys: !!slot?.applied?.sys,
      draftTargetBall: slot?.draft?.targetBall ?? null,
      draftShotType: slot?.draft?.shotType ?? null,
      draftRecommendedFrom: slot?.draft?.meta?.recommendedFrom?.positionId ?? null,
    };
  });
}

function buildAdminRecallTraceSnapshot(args) {
  const t = args.trajectory?.state;
  const resolved = args.resolvedSlotSys;
  const record = args.userLastSearchRecord;
  return {
    trajectoryState: t ?? null,
    trajectoryAdjustedSys: t?.adjusted?.sys ?? null,
    userTableDisplaySlotId: args.userTableDisplaySlotId ?? null,
    resolvedSlotSys: resolved
      ? {
          systemId: resolved.systemId ?? null,
          shotType: resolved.shotType ?? null,
          hasOutputsResult: !!resolved.outputs?.result,
          outputKeyCount: Object.keys(resolved.outputs?.result ?? {}).length,
        }
      : null,
    userLastSearchRecord: record
      ? {
          positionId: record.positionId ?? null,
          strategyKeys: Object.keys(record.strategies ?? {}),
        }
      : null,
    searchRecord: record
      ? {
          positionId: record.positionId ?? null,
          strategyKeys: Object.keys(record.strategies ?? {}),
        }
      : null,
    strategyButtonsLength: args.strategyButtonsLength ?? 0,
    adminTableLayersVisible: args.adminTableLayersVisible ?? null,
    showCoaching: args.showCoaching ?? null,
    appMode: args.appMode ?? null,
    activeSlot: args.activeSlot ?? null,
    isAdminInputSessionActive: args.isAdminInputSessionActive ?? null,
    isTargetSelected: args.isTargetSelected ?? null,
    targetColor: args.targetColor ?? null,
    datasetLength: args.datasetLength ?? 0,
    queryBalls: args.queryBalls ?? null,
    recallProfile: args.recallProfile ?? null,
    spatialKind: args.spatialKind ?? null,
    recallReason: args.recallReason ?? null,
    slotPresence: args.slotPresence ?? null,
    systemLabelsGatedOff:
      args.appMode === "ADMIN" && !args.adminTableLayersVisible,
    impactLinesFromResolvedSlot: !!resolved?.outputs?.result,
  };
}

/** 최초 진입·canonical 샷 기본 공 배치 (Rg 그리드) */
const INITIAL_BALLS_RG = {
  cue: { x: 20, y: 16 },
  target_center: { x: 20, y: 20 },
  second: { x: 60, y: 20 },
};

const USER_STRATEGY_SLOT_IDS = ["S1", "S2", "S3"];

/** USER Search / pick: display slot from matched record (activeSlot, else S1→S2→S3). */
function resolveUserSearchDisplaySlotId(record, activeSlot) {
  const strategies = record?.strategies;
  if (!strategies || typeof strategies !== "object") return null;
  if (
    USER_STRATEGY_SLOT_IDS.includes(activeSlot) &&
    strategies[activeSlot]
  ) {
    return activeSlot;
  }
  for (const slotId of USER_STRATEGY_SLOT_IDS) {
    if (strategies[slotId]) return slotId;
  }
  return null;
}

const SHOTS = [
  { id: "H001_05", label: "H001 – B2T_R / C4", file: "canonical.json" },
  { id: "H001_05_SB1", label: "H001 – B2T_R / C4 - SB1", file: "B2T_R/H001_05_SB1.json" },
  { id: "H001_05_SB2", label: "H001 – B2T_R / C4 - SB2", file: "B2T_R/H001_05_SB2.json" },
  { id: "H001_05_SB3", label: "H001 – B2T_R / C4 - SB3", file: "B2T_R/H001_05_SB3.json" },
  { id: "H001_05_SB4", label: "H001 – B2T_R / C4 - SB4", file: "B2T_R/H001_05_SB4.json" },
  { id: "H001_05_SB5", label: "H001 – B2T_R / C4 - SB5", file: "B2T_R/H001_05_SB5.json" },
 ];

const BALL_DIAMETER_MM = 61.5;
const RG_UNIT_MM = 35.55;
const BALL_DIAMETER_RG = BALL_DIAMETER_MM / RG_UNIT_MM;
const BALL_RADIUS_RG = BALL_DIAMETER_RG / 2;

/** Ball touch / hit radius (Interaction SSOT). Render uses BALL_RADIUS_RG only. */
const BALL_PICK_RADIUS_RG = BALL_RADIUS_RG * 5.0;

const PHYSICS_SCALE = {
  BALL_DIAMETER_RG,
  BALL_RADIUS_RG,
};

// Anti-aliasing compensation (렌더링 전용)
const AA_EPSILON = 0.08; // rg 단위
const RENDER_RADIUS_RG = BALL_RADIUS_RG - AA_EPSILON;
/** slide/draw 통합값이 이 임계값 이하이면 곡선 변형 비활성(baseline cushionPath 사용) */
const CURVE_EPS = 1e-6;

// 송설님 치수
const CUSHION_MM = 45;
const FRAME_MM = 80;
const POINT_OFFSET_MM = 80;

const CUSHION_RG = CUSHION_MM / RG_UNIT_MM;
const FRAME_RG = FRAME_MM / RG_UNIT_MM;
const POINT_OFFSET_RG = POINT_OFFSET_MM / RG_UNIT_MM;

// ==================================================
// 🔵 Physics Engine Block (Phase 2 분리 대상)
// - 좌표 변환, 물리 계산, ImpactBall 등
// - 외부 상태 의존 금지, 순수 함수 유지
// ==================================================

/*
-------------------------------------------------------
Overlay: STR (Striking parameter adjust)
@useTrajectoryState.ts 참고하여 시스템 C1 보정값과 C3 입력값 표시 및 입력 제어 구현
-------------------------------------------------------
*/

function STRContent({ trajectoryState }) {
  const { state, updateAdjusted } = trajectoryState;
  const threeC = state?.adjusted?.sys?.threeC ?? '';
  const oneC = state?.adjusted?.sys?.oneC ?? '';

  // C3 입력창 핸들러 (input type=number)
  const handleThreeCChange = e => {
    const value = e.target.value;
    // 숫자로 변환. 빈 값이면 바로 처리
    const num = value === '' ? '' : Number(value);
    updateAdjusted({ threeC: num });
  };

  // 비어있을 때도 허용, 아니면 고정소수점
  const displayOneC = oneC === '' ? '' : Number(oneC).toFixed(2);
  const displayThreeC = threeC === '' ? '' : Number(threeC);

  return (
    <div style={{ padding: 20, fontSize: 16 }}>
      <div style={{ marginBottom: 10 }}>
        <strong>C3 입력값:</strong>
        <input
          type="number"
          value={threeC}
          onChange={handleThreeCChange}
          min={0}
          step="0.01"
          style={{ marginLeft: 10, width: 80 }}
        />
      </div>
      <div>
        <strong>C1 보정값 (실시간 0.75× 보정):</strong>
        <span style={{ marginLeft: 10, fontWeight: 'bold' }}>{displayOneC}</span>
      </div>
    </div>
  );
}

/** Ball Role / Slot helpers — domain/ballRole.ts (v1.3 Role SSOT) */

function Ball({ x, y, color, opacity = 1, emphasis: _emphasis, ...eventProps }) {
  const p = toPx({ x, y }, SCALE, TABLE_H);
  const r = BALL_RADIUS_RG * SCALE;
  return (
    <circle
      cx={p.x + PADDING}
      cy={p.y + PADDING}
      r={r}
      fill={color}
      opacity={opacity}
      stroke="none"
      strokeWidth={0}
      shapeRendering="geometricPrecision"
      pointerEvents="all"
      {...eventProps}
    />
  );
}

// ============================================
// 관리자 모드 오버레이 컴포넌트들
// ============================================

/**
 * SYS 오버레이 onSave 페이로드를 슬롯 `updateDraftSys` / `commitDraftSys`용 숫자 맵으로 통합.
 * (`inputs` vs `adjustedInputs` vs admin 계열 `system_values` / `output` 불일치 방지)
 */
function mergeSysOverlayPayloadToNumericInputs(newData) {
  const normalize = (obj) => {
    if (!obj || typeof obj !== "object") return {};
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === "" || v === null || v === undefined) continue;
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n)) continue;
      out[k] = n;
    }
    return out;
  };
  const fromInputs = normalize(newData?.inputs);
  const fromSystemValues = normalize(newData?.system_values);
  const fromCalc = normalize(newData?.calculated ?? newData?.output);
  const fromAdjusted = normalize(newData?.adjustedInputs);
  // system_values(base 숫자 맵)가 최종 승자 — adjustedInputs보다 우선
  return { ...fromInputs, ...fromCalc, ...fromAdjusted, ...fromSystemValues };
}

// CAL-004: buildSlotSysSnapshotFromEntry / shotTypeForSysOverlay /
// normalizePublishedShotTypeHint / resolvePublishedLeafHints
// → application/flows/recallHydrateFlow.ts (STEP 3-3)

function userSearchNoMatchAlertMessage(reason, leafKey) {
  const leafLabel = `${leafKey.shotType}/${leafKey.systemId}`;
  if (reason === "empty-dataset") {
    return `검색 데이터가 없습니다.\n공략: ${leafLabel}\nExport·dataset 경로를 확인하세요.`;
  }
  if (reason === "over-max-distance") {
    return `유사한 포지션을 찾지 못했습니다 (거리 초과).\n공략: ${leafLabel}`;
  }
  return `일치하는 포지션이 없습니다.\n공략: ${leafLabel}\n공 위치를 확인하거나 관리자에서 저장·Export 후 다시 Search하세요.`;
}

// CAL-004: adminSysFromRecallEntry → application/flows/recallHydrateFlow.ts (STEP 3-3)

/** 디버그 전용: 정렬된 키 배열 간 added/removed */
function diffSortedKeyArrays(prevSorted, nextSorted) {
  const ps = new Set(prevSorted || []);
  const ns = new Set(nextSorted || []);
  return {
    added: (nextSorted || []).filter((k) => !ps.has(k)),
    removed: (prevSorted || []).filter((k) => !ns.has(k)),
  };
}

// SysOverlay shared helpers → overlay/utils/sysOverlayUtils.jsx (Batch 2 STEP 2-6)
// SysOverlay component → components/overlays/SysOverlay.jsx (Batch 2 STEP 2-6)

// CAL-002: buildEffectiveRenderSysValues → domain/calculator/systemValueCalculator.ts (Batch 4 STEP 4-1)

// formatFormulaDisplay, SYS_FORMULA_TOKEN_RE, renderMixedFormulaLine, renderSysFormulaContent
// → overlay/utils/sysOverlayUtils.jsx (Batch 2 STEP 2-6)

// AnchorEditOverlay → components/overlays/AnchorEditOverlay.jsx (Batch 2 STEP 2-1)

// HptOverlay, StrOverlay → components/overlays/HptOverlay.jsx (Batch 2 STEP 2-2)

// ensureLessonItems, LessonRow, AiOverlay → components/overlays/AiOverlay.jsx (Batch 2 STEP 2-3)

function TableGrid() {
  const lines = [];
  for (let i = 0; i <= TABLE_W_UNITS; i++) {
    lines.push(<line key={`v-${i}`} x1={i * SCALE + PADDING} y1={PADDING} x2={i * SCALE + PADDING} y2={TABLE_H + PADDING} stroke="#ffffff20" strokeWidth={0.4} />);
  }
  for (let i = 0; i <= TABLE_H_UNITS; i++) {
    lines.push(<line key={`h-${i}`} x1={PADDING} y1={i * SCALE + PADDING} x2={TABLE_W + PADDING} y2={i * SCALE + PADDING} stroke="#ffffff20" strokeWidth={0.4} />);
  }
  return <g>{lines}</g>;
}

function RailFrame() {
  const cushionW = CUSHION_RG * SCALE;
  const frameW = FRAME_RG * SCALE;
  const pointOffset = POINT_OFFSET_RG * SCALE;
  const outerRadius = 10; // 외곽 라운딩

  return (
    <g>
      {/* 프레임 전체 (단일 사각형, 외곽 라운딩) */}
      <rect
        x={PADDING - cushionW - frameW}
        y={PADDING - cushionW - frameW}
        width={TABLE_W + 2 * (cushionW + frameW)}
        height={TABLE_H + 2 * (cushionW + frameW)}
        fill="#6B3410"
        rx={outerRadius}
        ry={outerRadius}
      />

      {/* 쿠션 (진한 파란색) - 프레임 안쪽 전체 */}
      <rect
        x={PADDING - cushionW}
        y={PADDING - cushionW}
        width={TABLE_W + 2 * cushionW}
        height={TABLE_H + 2 * cushionW}
        fill="#1e40af"
      />

      {/* 당구대 (파란색) */}
      <rect
        x={PADDING}
        y={PADDING}
        width={TABLE_W}
        height={TABLE_H}
        fill="#2563eb"
      />

      {/* 포인트 (흰색) */}
      {[0, 10, 20, 30, 40, 50, 60, 70, 80].map((x) => (
        <React.Fragment key={`px-${x}`}>
          <circle cx={x * SCALE + PADDING} cy={TABLE_H + PADDING + pointOffset} r={3} fill="#111" />
          <circle cx={x * SCALE + PADDING} cy={PADDING - pointOffset} r={3} fill="#111" />
        </React.Fragment>
      ))}
      {[0, 10, 20, 30, 40].map((y) => (
        <React.Fragment key={`py-${y}`}>
          <circle cx={PADDING - pointOffset} cy={(TABLE_H_UNITS - y) * SCALE + PADDING} r={3} fill="#111" />
          <circle cx={TABLE_W + PADDING + pointOffset} cy={(TABLE_H_UNITS - y) * SCALE + PADDING} r={3} fill="#111" />
        </React.Fragment>
      ))}
    </g>
  );
}

// ============================================
// Phase B-1 Step 1: MobileWrapper (완전 투명)
// ============================================

export default function App({
  currentButtonId,
  userTableDisplayMode = "default",
  trajectoryCardSource = "baseline",
  trajectoryShowAxisValues = false,
  trajectoryCardOffset = { x: 0, y: 0 },
  calcOverlayVisible = true,
  onCalcOverlayVisibleChange,
  onTrajectoryCardOffsetChange,
  onTrajectoryCardSourceChange,
  onTrajectoryShowAxisValuesChange,
  onActiveSlotChange,
  onFuncOverlayClose,
  onDirtySlotsChange,
  onAppModeChange,
  onStrategyCountMapChange,
  onStrategyButtonsChange,
  onUserInfoPanelChange,
  onSystemControlsAvailabilityChange,
  onUserSearchStrategiesRegister,
  onUserSearchResetRegister,
  onUserSearchHasResultsChange,
  onUserStrategySlotPickRegister,
  onAdminSearchRegister,
  onUserFuncButtonSelect,
  userRailActions,
}) {
  const [currentId, setCurrentId] = useState(SHOTS[0].id);
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overlayContent, setOverlayContent] = useState(null);
  const userToast = useUserToast(3000);

  
  // ============================================
  // ShotSlots & TrajectoryState 훅 연결 (ballsState 이후에 연결)
  // ============================================
  
  // ============================================
  // 관리자 모드 상태 (v0)
  // ============================================
  const [appMode, setAppMode] = useState("USER"); // "USER" | "ADMIN"
  const [workspaceCleanupMode, setWorkspaceCleanupMode] = useState(
    WORKSPACE_CLEANUP_PRESERVE_DATASET
  );
  const [workspaceCleanupOpen, setWorkspaceCleanupOpen] = useState(false);

  const ANCHORS_OVERRIDE_KEY = "ANCHORS_OVERRIDE_V1";
  const [adminState, setAdminState] = useState(() => {
    try {
      return {
    sys: {
      system_id: null,
      track: "B2T_L",
      CO: null,
      C3: null,
      corrections: {
        slide: 0,
        curve_ratio: 0,
        draw: 0,
        departure: 0,
        spin: 0
      }
    },
    hpt: {
      T: "8/8",  // ⚠️ SSOT - 두께·방향의 유일한 기준
      hit_point: { x: 0, y: 0 },  // ⚠️ Rg 좌표계 (타점)
      mode: "TIP"
    },
    str: {
      curve: "constant",
      type: null,
      acceleration: "smooth_const",
      speed: 2.5,
      depth: 2,
      impact: "medium"
    },
    ai: {
      text: "",
      onePointLessons: []
    },
    // 앱 시작 시 항상 빈 상태 (이전 세션 영향 제거)
    anchorsOverride: {},
    balls: { ...INITIAL_BALLS_RG },
  };
    } catch {
      return {
    sys: {
      system_id: null,
      track: "B2T_L",
      CO: null,
      C3: null,
      corrections: {
        slide: 0,
        curve_ratio: 0,
        draw: 0,
        departure: 0,
        spin: 0
      }
    },
    hpt: {
      T: "8/8",
      hit_point: { x: 0, y: 0 },
      mode: "TIP"
    },
    str: {
      curve: "constant",
      type: null,
      acceleration: "smooth_const",
      speed: 2.5,
      depth: 2,
      impact: "medium"
    },
    ai: {
      text: "",
      onePointLessons: []
    },
    anchorsOverride: {},
    balls: { ...INITIAL_BALLS_RG },
  };
    }
  });

  const [ballsState, setBallsState] = useState(() => ({ ...INITIAL_BALLS_RG }));
  const { shotEditor, actions } = useShotSlots({
    setBallsState,
    setAdminState,
  });
  const shotEditorRef = useRef(shotEditor);
  shotEditorRef.current = shotEditor;
  const trajectory = useTrajectoryState();
  const debugSlotSysSnapshotPrevRef = useRef(null);
  /** Last S1/S2/S3 button id — Position reset only on cross-slot navigation, not overlay→slot restore */
  const lastSlotNavButtonRef = useRef(null);
  /** USER: Search 또는 공략 pick 후 table/Extension hydrate 대상 슬롯 */
  const [userTableDisplaySlotId, setUserTableDisplaySlotId] = useState(null);
  /** USER: 마지막 Search 성공 record — rail label SSOT */
  const [userLastSearchRecord, setUserLastSearchRecord] = useState(null);
  /** Phase 5 Mission 01 — parallel Real Interpolation path (feature-flagged). */
  const REAL_INTERPOLATION_SEARCH_ENABLED =
    import.meta?.env?.VITE_REAL_INTERPOLATION_SEARCH === "1";
  const [realInterpolationResults, setRealInterpolationResults] = useState([]);
  const realInterpolationResultsRef = useRef(realInterpolationResults);
  realInterpolationResultsRef.current = realInterpolationResults;
  /** Selected Top-3 index for RI UI focus (display only). */
  const [riUiSelectedIndex, setRiUiSelectedIndex] = useState(null);
  /** App trajectory context snapshot for RI → existing buildTrajectory DI. */
  const riTrajectoryContextRef = useRef(null);
  /** USER Search / ADMIN→USER: published leaf key hint (survives clearUserSearchDisplayRuntime). */
  const [userPublishedSearchContext, setUserPublishedSearchContext] = useState(
    () => ({ shotType: null, systemId: null })
  );
  const [adminTableLayersVisible, setAdminTableLayersVisible] = useState(false);
  const adminRecallTraceCtxRef = useRef(() => ({}));
  const lastHydrateTriggerRef = useRef("slot");
  const userSearchInFlightRef = useRef(false);
  const prevAppModeForUserSessionRef = useRef(appMode);

  /**
   * PHASE 2 STEP 2: slot click = full runtime replace from slot container (no runAutoRecommend merge).
   */
  function applySlotRuntimeTargetBall(targetBall) {
    if (targetBall === "red" || targetBall === "yellow") {
      setTargetColor(targetBall);
      setIsTargetSelected(true);
    } else {
      setTargetColor(null);
      setIsTargetSelected(false);
    }
  }

  /** Slot switch: targetBall hydrate + trajectory/admin hydrate flow */
  function hydrateSlotRuntime(slotId) {
    const slots = shotEditorRef.current.slots;
    const slot = slots[slotId];
    const payload = buildSlotRuntimePayload(slot);
    const slotExtracted = extractSlotTargetBall(slot);
    const adminTarget = getAdminSearchTargetBall(slotId);
    const effectiveTargetBall =
      appMode === "ADMIN"
        ? adminTarget ?? payload.targetBall ?? slotExtracted
        : payload.targetBall ?? slotExtracted;
    applySlotRuntimeTargetBall(effectiveTargetBall);
    runTrajectoryHydrate({
      slotId,
      slots,
      setAdminState,
      trajectory,
    });
  }

  /**
   * Shared USER Runtime Slot Activation (Search + 공략 pick).
   * switchSlot → display slot → hydrateSlotRuntime only (no overlay/UI).
   */
  function activateStrategySlot(slotId) {
    if (!USER_STRATEGY_SLOT_IDS.includes(slotId)) return;
    actions.switchSlot(slotId);
    setUserTableDisplaySlotId(slotId);
    lastHydrateTriggerRef.current = "strategy_pick";
    hydrateSlotRuntime(slotId);
  }

  /**
   * RI candidate → existing slot contract (no second hydrate architecture).
   * Consumes engine result.sysInputs as-is; fail-closed on bad identity/shape.
   */
  function activateRealInterpolationCandidate(result, slotHint) {
    const projection = projectRealInterpolationResultToStrategyEntry(
      result,
      slotHint
    );
    if (!projection.ok) {
      if (import.meta.env.DEV) {
        console.warn(
          "[RealInterpolation] activate fail-closed:",
          projection.reason
        );
      }
      return false;
    }
    const positionId =
      positionIdFromStrategyRef(projection.strategyRef) ??
      projection.strategyRef;
    flushSync(() => {
      actions.loadDraftFromStrategyEntry(projection.slotId, projection.entry, {
        positionId,
        score: typeof result?.confidence === "number" ? result.confidence : 0,
      });
    });
    activateStrategySlot(projection.slotId);
    return true;
  }

  /** 궤적/앵커 렌더 SSOT: 활성 슬롯의 sys만 사용 (adminState.sys / view.ui.system 혼합 금지) */
  const resolvedSlotSys = useMemo(
    () =>
      resolveSlotSys({
        appMode,
        userTableDisplaySlotId,
        adminTableLayersVisible,
        slots: shotEditor.slots,
        activeSlot: shotEditor.activeSlot,
      }),
    [
      appMode,
      userTableDisplaySlotId,
      adminTableLayersVisible,
      shotEditor.slots,
      shotEditor.activeSlot,
    ]
  );

  /** Render SSOT: active slot container (sync on paint; not adminState.sys mirror). */
  const slotRenderSys = useMemo(() => {
    const slotId =
      appMode === "USER" && userTableDisplaySlotId
        ? userTableDisplaySlotId
        : shotEditor.activeSlot;
    const slot = shotEditor.slots[slotId];
    return buildSlotRuntimePayload(slot).adminSys;
  }, [appMode, userTableDisplaySlotId, shotEditor.slots, shotEditor.activeSlot]);

  const resolvedSlotSysValues = useMemo(() => {
    if (!resolvedSlotSys) return {};
    const merged = {
      ...(resolvedSlotSys.inputs ?? {}),
      ...(resolvedSlotSys.outputs?.result ?? {}),
    };
    const effectiveNums = buildEffectiveRenderSysValues(
      merged,
      resolvedSlotSys,
      slotRenderSys
    );
    const out =
      effectiveNums && Object.keys(effectiveNums).length > 0
        ? { ...merged, ...effectiveNums }
        : merged;
    const sid = resolvedSlotSys?.systemId;
    const needsC3r = sid === "5_half_system" || sid === "5_HALF";
    if (import.meta.env.DEV && needsC3r && out.C3_r == null) {
      console.warn(
        "[resolvedSlotSysValues] C3_r missing (5_half)",
        shotEditor.activeSlot,
        out
      );
    }
    return out;
  }, [resolvedSlotSys, shotEditor.activeSlot, slotRenderSys]);


  const slotRenderSysNoCorrections = useMemo(() => {
    if (!slotRenderSys) return undefined;
    return {
      ...slotRenderSys,
      corrections: {
        ...(slotRenderSys.corrections ?? {}),
        slide: 0,
        draw: 0,
        spin: 0,
        curve_ratio: 0,
      },
    };
  }, [slotRenderSys]);

  const resolvedSlotBaseSysValues = useMemo(() => {
    if (!resolvedSlotSys) {
      return null;
    }
    const merged = {
      ...(resolvedSlotSys.inputs ?? {}),
      ...(resolvedSlotSys.outputs?.result ?? {}),
    };
    const built = buildEffectiveRenderSysValues(
      merged,
      resolvedSlotSys,
      slotRenderSysNoCorrections
    );
    const out =
      built && typeof built === "object" && Object.keys(built).length > 0
        ? { ...merged, ...built }
        : merged;
    return out;
  }, [resolvedSlotSys, shotEditor.activeSlot, slotRenderSysNoCorrections]);

  /** C3 오염 추적: 슬롯별 C3_r/CO_f/Sn/C4_f 비교 */
  useEffect(() => {
    const mergeSlotSysValues = (id) => {
      const slot = shotEditor.slots[id];
      const sys = slot?.draft?.sys ?? slot?.applied?.sys;
      if (!sys) return null;
      const m = { ...(sys.inputs ?? {}), ...(sys.outputs?.result ?? {}) };
      return {
        ...m,
        _trace: {
          C3_r: m.C3_r,
          CO_f: m.CO_f,
          Sn: m.Sn,
          C4_f: m.C4_f,
        },
      };
    };
    if (import.meta.env.DEV) {
      console.log("[SYS_VALUES]", shotEditor.activeSlot, {
        S1: mergeSlotSysValues("S1"),
        S2: mergeSlotSysValues("S2"),
        S3: mergeSlotSysValues("S3"),
        activeResolved: resolvedSlotSysValues,
        activeTrace: {
          C3_r: resolvedSlotSysValues.C3_r,
          CO_f: resolvedSlotSysValues.CO_f,
          Sn: resolvedSlotSysValues.Sn,
          C4_f: resolvedSlotSysValues.C4_f,
        },
      });
    }
  }, [shotEditor.slots, shotEditor.activeSlot, resolvedSlotSysValues]);

  const [overlayState, setOverlayState] = useState({
    open: false,
    type: null, // "SYS" | "HPT" | "STR" | "AI" | "ANCHOR_EDIT" | null
    anchorKey: null,
  });

  const [showSystemGrid, setShowSystemGrid] = useState(false);
  const [showBaseLine, setShowBaseLine] = useState(false);
  /** P2: Trajectory Extension Proposal draft (runtime only — not Dataset). */
  const [trajectoryExtensionDraft, setTrajectoryExtensionDraft] = useState(null);
  /** P2-4: active Extension endpoint handle (1 | 2 | null). Selection only. */
  const [extensionActiveHandle, setExtensionActiveHandle] = useState(null);
  /** ADMIN C2 Reflection Override { rail, t } — runtime + SAVE. */
  const [c2ReflectionOverride, setC2ReflectionOverride] = useState(null);
  const c2ReflectionOverrideRef = useRef(null);
  c2ReflectionOverrideRef.current = c2ReflectionOverride;

  useEffect(() => {
    setTrajectoryExtensionDraft(null);
    setExtensionActiveHandle(null);
  }, [shotEditor.activeSlot]);

  /** Hydrate C2 override from slot StrategyEntry (ADMIN only; slot switch / recall). */
  useEffect(() => {
    if (appMode !== "ADMIN") {
      setC2ReflectionOverride(null);
      return;
    }
    const slot = shotEditor.slots[shotEditor.activeSlot];
    const raw =
      slot?.draft?.reflectionOverride ??
      slot?.applied?.reflectionOverride ??
      null;
    setC2ReflectionOverride(normalizeReflectionOverride(raw));
    // slots identity changes often; key off activeSlot + override payload only
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid wiping live drag
  }, [
    appMode,
    shotEditor.activeSlot,
    shotEditor.slots[shotEditor.activeSlot]?.draft?.reflectionOverride,
    shotEditor.slots[shotEditor.activeSlot]?.applied?.reflectionOverride,
  ]);

  /** Hydrate Extension draft from slot StrategyEntry payload (Reveal regenerated at render). */
  useEffect(() => {
    if (appMode === "USER") {
      if (!userTableDisplaySlotId) {
        setTrajectoryExtensionDraft(null);
        setExtensionActiveHandle(null);
        return;
      }
      const slot = shotEditor.slots[userTableDisplaySlotId];
      const payload =
        slot?.draft?.trajectoryExtensions ??
        slot?.applied?.trajectoryExtensions ??
        null;
      setTrajectoryExtensionDraft(payload ? payloadToDraft(payload) : null);
      setExtensionActiveHandle(null);
      return;
    }

    // ADMIN: restore from recall hydrate when payload present; do not clear local edits
    const slot = shotEditor.slots[shotEditor.activeSlot];
    const payload =
      slot?.draft?.trajectoryExtensions ??
      slot?.applied?.trajectoryExtensions ??
      null;
    if (payload) {
      setTrajectoryExtensionDraft(payloadToDraft(payload));
    }
  }, [
    appMode,
    userTableDisplaySlotId,
    shotEditor.activeSlot,
    shotEditor.slots,
  ]);

  const baselineCoHandleRgRef = useRef(null);
  const baselineC1HandleRgRef = useRef(null);
  const c2HandleRgRef = useRef(null);
  /** P0-4f: 드래그 시작 시점 슬롯 SYS — Apply 후 stale draft vs committed slot 구분 */
  const baselineLabelSsotRef = useRef(null);
  const autoSave = true;

  /** ADMIN Search/Recall 후 Editing Session (Reset 전까지 유지) */
  const [isAdminInputSessionActive, setIsAdminInputSessionActive] = useState(false);
  const [isTargetSelected, setIsTargetSelected] = useState(false);
  const [isAdminPublishedSearchMatched, setIsAdminPublishedSearchMatched] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [targetColor, setTargetColor] = useState(null);

  /** ADMIN Search/Recall 타겟 SSOT: UI state 우선, slot draft/applied fallback */
  function getAdminSearchTargetBall(slotId = shotEditor.activeSlot) {
    if (
      isTargetSelected &&
      (targetColor === "red" || targetColor === "yellow")
    ) {
      return targetColor;
    }
    return extractSlotTargetBall(shotEditor.slots[slotId]);
  }

  /** ADMIN Search/로컬DB recall query — explicit UI target only (no slot fallback). */
  function getAdminRecallQueryTargetBall() {
    if (
      isTargetSelected &&
      (targetColor === "red" || targetColor === "yellow")
    ) {
      return targetColor;
    }
    return null;
  }

  function isAdminRecallTargetBallMismatch(record, queryTargetBall) {
    if (queryTargetBall !== "red" && queryTargetBall !== "yellow") {
      return false;
    }
    return (
      normalizeTargetBallForKey(record?.targetBall) !==
      normalizeTargetBallForKey(queryTargetBall)
    );
  }

  /** mismatch 시 hydrate 차단 + 표시 runtime 초기화 (applyPositionRecall 호출 전). */
  function rejectAdminRecallHydrateForMismatch(record, queryTargetBall) {
    if (!isAdminRecallTargetBallMismatch(record, queryTargetBall)) {
      return false;
    }
    trajectory.resetTrajectory();
    setAdminTableLayersVisible(false);
    setShowCoaching(false);
    setIsAdminPublishedSearchMatched(false);
    alert("해당 데이터 없음");
    return true;
  }

  function isAdminTargetReady(slotId = shotEditor.activeSlot) {
    const t = getAdminSearchTargetBall(slotId);
    return t === "red" || t === "yellow";
  }

  /** USER Reset: clear table target selection (no Search carry-over). */
  function resetUserSearchTargetSelection() {
    setTargetColor(null);
    setIsTargetSelected(false);
  }

  function logAdminSearchTargetState(phase, extra = {}) {
    const slot = shotEditor.slots[shotEditor.activeSlot];
    const payload = {
      phase,
      targetColor,
      isTargetSelected,
      slotRuntimeTargetBall: extractSlotTargetBall(slot),
      searchQueryTargetBall: getAdminSearchTargetBall(),
      ...extra,
    };
    console.log("[ADMIN_SEARCH_TARGET]", payload);
  }

  const canUseSystemControls =
    appMode === "ADMIN" && isAdminInputSessionActive && isAdminTargetReady();

  useEffect(() => {
    onSystemControlsAvailabilityChange?.(canUseSystemControls);
  }, [canUseSystemControls, onSystemControlsAvailabilityChange]);

  // dataset: PositionRecord[] (localStorage — domain/dataset/infra/datasetStorage 위임)
  const [dataset, setDataset] = useState(loadWorkingDataset);

  const {
    workspaceHistory,
    showHistoryModal,
    setShowHistoryModal,
    commitWorkspaceHistoryWithStrategyDataset,
    handleLoadWorkspaceSnapshot,
    handleDeleteWorkspaceSnapshot,
    handleDeleteOldest30,
    handleExportSnapshots,
    editSourceContext,
    clearEditSourceContext,
  } = useSettings({
    adminState,
    ballsState,
    shotEditor,
    targetColor,
    actions,
    setAdminState,
    setBallsState,
    setDataset,
    setIsSaved,
    setIsAdminPublishedSearchMatched,
    setIsAdminInputSessionActive,
    setTargetColor,
    setIsTargetSelected,
  });

  /** SYS에서 계산된 HP_n 결과 임시 저장 (HP/T 열릴 때만 반영, UI 동기화용) */
  const [sysHpNResult, setSysHpNResult] = useState(null);

  /** C2 reflection fallback용 수동 힌트 (추후 draggable C2 UI 연결용) */
  const [c2ManualHint, setC2ManualHint] = useState(null);

  // 원 포인트 레슨 라이브러리 (로컬스토리지 — domain/lesson/onePointLibrary.ts 위임)
  const [onePointLibrary, setOnePointLibrary] = useState(loadOnePoints);
  const [onePointSelectedId, setOnePointSelectedId] = useState("");
  const [onePointDraft, setOnePointDraft] = useState("");
  /** Lesson Library 전용 Category 선택 — "" = 선택 안함 (Dataset 미전달) */
  const [onePointCategories, setOnePointCategories] = useState(loadOnePointCategories);
  const [onePointCategoryNo, setOnePointCategoryNo] = useState("");
  const [showCategoryManageModal, setShowCategoryManageModal] = useState(false);
  const [showLessonOrderManageModal, setShowLessonOrderManageModal] = useState(false);
  const handleCreateOnePointCategory = (name) => {
    setOnePointCategories(createOnePointCategory(name));
  };
  const handleUpdateOnePointCategory = (no, name) => {
    setOnePointCategories(updateOnePointCategory(no, name));
  };
  const handleDeleteOnePointCategory = (no) => {
    const next = deleteOnePointCategory(no);
    setOnePointCategories(next);
    if (Number(onePointCategoryNo) === Number(no)) {
      setOnePointCategoryNo("");
    }
  };
  const saveOnePointLibrary = (next) => {
    setOnePointLibrary(next);
    saveOnePoints(next);
  };
  /** Category Combo 기준 Lesson Combo 필터 (선택 안함 = categoryNo 없는 항목) */
  const matchesOnePointCategoryFilter = (item, categoryNo) => {
    if (categoryNo === "" || categoryNo == null) {
      return item.categoryNo == null || !Number.isFinite(Number(item.categoryNo));
    }
    return Number(item.categoryNo) === Number(categoryNo);
  };
  /** 현재 Category Lesson — Library 배열 순서 유지 (순서 관리 DnD 반영) */
  const filteredSortedOnePointLibrary = useMemo(() => {
    return onePointLibrary.filter((item) =>
      matchesOnePointCategoryFilter(item, onePointCategoryNo)
    );
  }, [onePointLibrary, onePointCategoryNo]);
  const onSelectOnePointCategory = (no) => {
    setOnePointCategoryNo(no);
    if (!onePointSelectedId) return;
    const item = onePointLibrary.find((x) => x.id === onePointSelectedId);
    if (!item || !matchesOnePointCategoryFilter(item, no)) {
      setOnePointSelectedId("");
      setOnePointDraft("");
    }
  };
  /** 현재 Category 슬롯만 orderedIds 순서로 치환 — 객체 필드/타 Category 위치 유지 */
  const reorderOnePointLibraryByCategory = (orderedIds) => {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;
    const idToItem = new Map(onePointLibrary.map((item) => [item.id, item]));
    const reordered = orderedIds
      .map((id) => idToItem.get(id))
      .filter((item) => item && matchesOnePointCategoryFilter(item, onePointCategoryNo));
    if (reordered.length === 0) return;

    let i = 0;
    const next = onePointLibrary.map((item) => {
      if (!matchesOnePointCategoryFilter(item, onePointCategoryNo)) return item;
      return reordered[i++] ?? item;
    });
    saveOnePointLibrary(next);
  };
  const normalizeLesson = (s) => (s || "").trim();
  /** 선택 안함이면 categoryNo 키 자체를 남기지 않는다 (기존 데이터와 동일 형태) */
  const withSelectedCategoryNo = (item) => {
    const { categoryNo: _prev, ...rest } = item;
    const no = Number(onePointCategoryNo);
    return onePointCategoryNo === "" || !Number.isFinite(no)
      ? rest
      : { ...rest, categoryNo: no };
  };
  const onSelectOnePoint = (id) => {
    // "" = "문장 입력..." 신규 작성 모드 — Category는 유지
    if (!id) {
      setOnePointSelectedId("");
      setOnePointDraft("");
      return;
    }
    const item = onePointLibrary.find(x => x.id === id);
    if (!item) return;
    setOnePointSelectedId(id);
    setOnePointDraft(item.text);
    setOnePointCategoryNo(
      Number.isFinite(Number(item.categoryNo)) && item.categoryNo != null
        ? Number(item.categoryNo)
        : ""
    );
  };
  const applyOnePointToShot = () => {
    const text = normalizeLesson(onePointDraft);
    if (!text) return;
    const newItem = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text };
    setAdminState(prev => ({
      ...prev,
      ai: {
        ...prev.ai,
        onePointLessons: [...ensureLessonItems(prev.ai?.onePointLessons || []), newItem]
      }
    }));
    const existing = onePointLibrary.find(x => normalizeLesson(x.text) === text);
    if (existing) {
      const now = Date.now();
      const nextLib = onePointLibrary.map(x =>
        x.id === existing.id ? { ...x, count: (x.count || 0) + 1, updatedAt: now } : x
      );
      saveOnePointLibrary(nextLib);
    }
  };
  const deleteLesson = (id) => {
    setAdminState(prev => {
      const items = ensureLessonItems(prev.ai?.onePointLessons || []);
      return {
        ...prev,
        ai: { ...prev.ai, onePointLessons: items.filter((l) => l.id !== id) }
      };
    });
  };
  const reorderLessons = (newItems) => {
    setAdminState(prev => ({
      ...prev,
      ai: { ...prev.ai, onePointLessons: newItems }
    }));
  };
  const saveDraftAsNewLesson = () => {
    const text = normalizeLesson(onePointDraft);
    if (!text) return;
    const now = Date.now();
    if (onePointSelectedId) {
      const selectedItem = onePointLibrary.find((x) => x.id === onePointSelectedId);
      if (selectedItem) {
        const nextLib = onePointLibrary.map((x) =>
          x.id === onePointSelectedId
            ? withSelectedCategoryNo({ ...x, text, updatedAt: now })
            : x
        );
        saveOnePointLibrary(nextLib);
        return;
      }
    }
    const existing = onePointLibrary.find(x => normalizeLesson(x.text) === text);
    if (existing) {
      const nextLib = onePointLibrary.map(x =>
        x.id === existing.id
          ? withSelectedCategoryNo({ ...x, text, updatedAt: now })
          : x
      );
      saveOnePointLibrary(nextLib);
      setOnePointSelectedId(existing.id);
      setOnePointDraft(text);
      return;
    }
    const newItem = withSelectedCategoryNo({
      id: `${now}-${Math.random().toString(16).slice(2)}`,
      text,
      count: 0,
      createdAt: now,
      updatedAt: now,
    });
    const nextLib = [newItem, ...onePointLibrary];
    saveOnePointLibrary(nextLib);
    setOnePointSelectedId(newItem.id);
    setOnePointDraft(text);
  };
  const deleteSelectedOnePointLibraryItem = () => {
    if (!onePointSelectedId) return;
    const nextLib = onePointLibrary.filter((x) => x.id !== onePointSelectedId);
    saveOnePointLibrary(nextLib);
    setOnePointSelectedId("");
    setOnePointDraft("");
    setOnePointCategoryNo("");
  };
  // ============================================
  // ImpactBall 모드 상태
  // ============================================
  const [impactMode, setImpactMode] = useState("CONTACT");
  // "CONTACT": 타겟볼 접선 고정 (기본)
  // "FREE": 자유 이동 (더블클릭 후)
  
  // ============================================
  // USER MODE 코칭 표시 상태
  // ============================================
  const [showCoaching, setShowCoaching] = useState(false);
  // false: 배치만 표시 (임펙트볼/가이드 비표시)
  // true: 코칭 결과 표시 (임펙트볼/가이드 표시)
  
  // Ball drag state (ballsState는 adminState 직후에 선언됨)
  const [dragState, setDragState] = useState({
  // dragging: pointer capture 동안만 true (Freeze 적용 구간)
  dragging: false,
  ballId: null,
  grabOffsetRg: { x: 0, y: 0 },
  previousPosRg: null,

  // joystickVisible: 선택 상태(미세조정 모드) 유지
  joystickVisible: false,

  // Freeze slots (드래그 중 파생 객체 고정)
  frozenImpact: null,
  frozenCushionPathAttr: null,
  frozenCushionPathRg: null,
});

  /** 볼 더블클릭 — setTargetColor / patchSlotRuntimeMeta SSOT (Role Lock 전용) */
  function applyTargetFromBallId(ballId) {
    // Target Lock: once selected for this input session, never reassign via DoubleClick
    if (isTargetSelected) return;

    const slotId = shotEditor.activeSlot;
    const ballColor = colorForSlotId(ballId);
    if (!ballColor) return;
    stopJoystick();
    setTargetColor(ballColor);
    setIsTargetSelected(true);
    actions.patchSlotRuntimeMeta(slotId, { targetBall: ballColor });
    setDragState((s) => ({
      ...s,
      ballId,
      joystickVisible: false,
      dragging: false,
    }));
    beginAdminInputSession();
  }

  const svgRef = useRef(null);
  const baselineDraftDragContextRef = useRef({
    canEndpointDraftDrag: () => false,
    captureLabelSlotSnapshot: () => ({ CO_f: null, C1_f: null }),
    snapCoPointerRg: () => null,
    snapC1PointerRg: () => null,
  });
  const {
    baselineDraftState,
    baselineLabelSlotSnapshotRef,
    clearAppliedBaselineDraftMark,
    tryStartBaselineEndpointDraftDrag,
    endCoBaselineDraftDrag,
    endC1BaselineDraftDrag,
    handleBaselineDraftPointerMove,
  } = useBaselineDraft({
    appMode,
    showBaseLine,
    svgRef,
    dragContextRef: baselineDraftDragContextRef,
  });
  const derivedRef = useRef({ impact: null, cushionPathAttr: null, cushionPathRg: null });

  // Joystick (mobile fine control)
  const joyIntervalRef = useRef(null);
  const joyDragRef = useRef({ active: false, pointerId: null, lastX: 0, lastY: 0, ballId: null });
  /** 테이블 SVG 볼 드래그 시 직전 포인터 Rg — delta 기반 이동(Ctrl/Shift 스케일)용 */
  const ballDragLastPointerRgRef = useRef(null);
  const JOYSTICK_STEP = 0.1; // Rg
  const JOYSTICK_REPEAT_MS = 60;

  const FINE_TAP_STEP = 0.1;
  const FINE_HOLD_STEP = 0.2;
  const FINE_CTRL_LONG_PRESS_MS = 1000;
  const FINE_CTRL_REPEAT_MS = 150;
  const fineCtrlTimerRef = useRef(null);
  const fineCtrlIntervalRef = useRef(null);

  function fineNudgeBall(ballId, dx, dy) {
    if (!ballId) return;
    setBallsState((prev) => {
      const cur = prev?.[ballId];
      if (!cur) return prev;
      let minX = 0.5, maxX = 79.5, minY = 0.5, maxY = 39.5;
      if (ballId === "impact" && impactMode === "FREE") {
        minX = -CUSHION_RG; maxX = 80 + CUSHION_RG;
        minY = -CUSHION_RG; maxY = 40 + CUSHION_RG;
      }
      const next = {
        x: clamp(dx !== 0 ? Math.round((cur.x + dx) * 10) / 10 : cur.x, minX, maxX),
        y: clamp(dy !== 0 ? Math.round((cur.y + dy) * 10) / 10 : cur.y, minY, maxY),
      };
      return { ...prev, [ballId]: next };
    });
    invalidateSavedAndRecalledForBallId(ballId);
  }

  function hideBallPositionController() {
    stopJoystick();
    stopFineCtrl();
    setDragState((s) => ({ ...s, joystickVisible: false }));
  }

  function stopFineCtrl() {
    if (fineCtrlTimerRef.current != null) {
      window.clearTimeout(fineCtrlTimerRef.current);
      fineCtrlTimerRef.current = null;
    }
    if (fineCtrlIntervalRef.current != null) {
      window.clearInterval(fineCtrlIntervalRef.current);
      fineCtrlIntervalRef.current = null;
    }
  }

  function handleFineArrowDown(e, dirX, dirY) {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget?.setPointerCapture && e.pointerId != null) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    }
    const id = dragState.ballId;
    if (!id) return;
    stopFineCtrl();
    fineNudgeBall(id, dirX * FINE_TAP_STEP, dirY * FINE_TAP_STEP);
    fineCtrlTimerRef.current = window.setTimeout(() => {
      fineCtrlTimerRef.current = null;
      fineCtrlIntervalRef.current = window.setInterval(() => {
        fineNudgeBall(id, dirX * FINE_HOLD_STEP, dirY * FINE_HOLD_STEP);
      }, FINE_CTRL_REPEAT_MS);
    }, FINE_CTRL_LONG_PRESS_MS);
  }

  function handleFineArrowUp(e) {
    e.preventDefault();
    e.stopPropagation();
    stopFineCtrl();
  }

  function handleFineCenterPointer(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // KD-Tree 인덱스 (dataset 변경 시 rebuild; USER strategyCountMap 등)
  const kdIndexRef = useRef(null);
  const fileInputRef = useRef(null);
  useEffect(() => {
    kdIndexRef.current = new PositionKDIndex(dataset ?? []);
  }, [dataset]);

  // ============================================
  // 관리자 모드 헬퍼 함수
  // ============================================
  
  // 권한 체크
  const canEdit = appMode === "ADMIN";

  const extensionDraftRef = useRef(null);
  extensionDraftRef.current = trajectoryExtensionDraft;
  const canEditRef = useRef(false);
  canEditRef.current = canEdit;
  const extensionHandleRgRef = useRef({ 1: null, 2: null });
  const extensionSegmentsRef = useRef([]);
  const extensionPathNodesRef = useRef([]);
  /** Calculated + Reveal + Extension display segments for nearest Projection. */
  const projectionSegmentsRef = useRef([]);
  const isTargetSelectedRef = useRef(isTargetSelected);
  isTargetSelectedRef.current = isTargetSelected;
  const targetColorRef = useRef(targetColor);
  targetColorRef.current = targetColor;
  const ballsStateRef = useRef(ballsState);
  ballsStateRef.current = ballsState;

  function clearBallPointerInteractionState() {
    stopJoystick();
    joyDragRef.current = {
      active: false,
      pointerId: null,
      lastX: 0,
      lastY: 0,
      ballId: null,
    };
    ballDragLastPointerRgRef.current = null;
    setDragState((s) => ({
      ...s,
      dragging: false,
      ballId: null,
      grabOffsetRg: { x: 0, y: 0 },
      previousPosRg: null,
      joystickVisible: false,
      frozenImpact: null,
      frozenCushionPathAttr: null,
      frozenCushionPathRg: null,
    }));
  }

  const {
    extensionDraggingMark,
    tryStartExtensionHandleDrag,
    handleExtensionHandlePointerMove,
    endExtensionHandleDrag,
  } = useTrajectoryExtensionHandleDrag({
    svgRef,
    canDrag: () =>
      canEditRef.current && draftItemCount(extensionDraftRef.current) > 0,
    getDraft: () => extensionDraftRef.current,
    setDraft: (updater) => {
      setTrajectoryExtensionDraft((prev) => {
        const next =
          typeof updater === "function" ? updater(prev) : updater;
        extensionDraftRef.current = next;
        return next;
      });
    },
    setActiveHandle: setExtensionActiveHandle,
    onHandleDragStart: clearBallPointerInteractionState,
  });

  const {
    c2HandleDragging,
    tryStartC2HandleDrag,
    handleC2PointerMove,
    endC2HandleDrag,
  } = useC2RailHandleDrag({
    svgRef,
    canDrag: () => canEditRef.current,
    getOverride: () => c2ReflectionOverrideRef.current,
    setOverride: (next) => {
      c2ReflectionOverrideRef.current = next;
      setC2ReflectionOverride(next);
    },
    onHandleDragStart: clearBallPointerInteractionState,
  });

  function handleBallDoubleClickForTarget(ballId, e) {
    if (appMode !== "ADMIN") return;
    if (overlayState.open || overlayContent) return;
    e.preventDefault();
    e.stopPropagation();

    const lock = {
      targetColor: targetColorRef.current,
      isTargetSelected: isTargetSelectedRef.current,
    };

    // Target Lock: any further DoubleClick must not change Target Role
    if (lock.isTargetSelected) {
      // Only Second Role Ball → 1× nearest display-segment Projection
      if (!isSecondRoleSlot(ballId, lock)) return;

      const second = getSecondBall(ballsStateRef.current, lock);
      if (!second) return;

      const proj = projectBallOntoNearestSegment({
        ball: second.point,
        segments: projectionSegmentsRef.current,
      });
      if (!proj) return;

      const slotKey = second.slotId === "target" ? "target_center" : second.slotId;
      setBallsState((prev) => ({
        ...prev,
        [slotKey]: prev[slotKey]
          ? { ...prev[slotKey], x: proj.point.x, y: proj.point.y }
          : { x: proj.point.x, y: proj.point.y },
      }));
      setIsSaved(false);
      setIsAdminPublishedSearchMatched(false);
      return;
    }

    // Target unlocked: first object-ball DoubleClick assigns Target Role
    applyTargetFromBallId(ballId);
  }
  function handleWorkspaceLocalStorageCleanup() {
    if (workspaceCleanupMode === WORKSPACE_CLEANUP_CLEAR_ALL) {
      const ok = window.confirm(
        "Export하지 않은 작업 데이터는 복구할 수 없습니다.\n정말 localStorage 전체를 삭제하시겠습니까?"
      );
      if (!ok) return;
    }
    const removedKeys = runWorkspaceLocalStorageCleanup(workspaceCleanupMode);
    if (import.meta.env.DEV) {
      console.log("[WorkspaceCleanup]", removedKeys);
    }
    clearEditSourceContext();
    setWorkspaceCleanupOpen(false);
    window.location.reload();
  }

  function handleImportDataset() {
    fileInputRef.current?.click();
  }

  async function handleFileImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    try {
      const normalized = await importDatasetFromFile(file);
      setDataset(normalized);
      saveWorkingDataset(normalized);
    } catch (err) {
      alert(err?.message ?? "Failed to import dataset.json");
    }
  }

  // OVL-001: useAdminOverlayRouter (Batch 2 STEP 2-4)
  const { openOverlay, openAnchorEdit } = useAdminOverlayRouter({
    dragState,
    handlePointerUp,
    setDragState,
    setOverlayState,
  });

  /** P0-4c-2: ✓ 버튼 → baseline draft Apply flow */
  function onBaselineDraftApplyClick(mark) {
    console.log("[BASELINE APPLY BUTTON]", mark);
    runBaselineDraftApply({
      mark,
      appMode,
      showBaseLine,
      overlayState,
      baselineDraftState,
      trackForAnchors,
      systemIdForGrid,
      baselineLabelSlotSnapshot: baselineLabelSlotSnapshotRef.current,
      baselineLabelSsot: baselineLabelSsotRef.current,
      activeSlot: shotEditor.activeSlot,
      slots: shotEditor.slots,
      resolvedSlotSys,
      targetColor,
      trajectory,
      commitDraftSys: actions.commitDraftSys,
      patchSlotRuntimeMeta: actions.patchSlotRuntimeMeta,
      clearAppliedBaselineDraftMark,
    });
  }

  /** SYS/HPT/STR/AI 닫을 때 Stage가 슬롯 버튼으로 currentButtonId를 되돌림 */
  function notifyFuncOverlayClosedByAdminUi() {
    onFuncOverlayClose?.();
  }

  // 오버레이 닫기
  function closeOverlay() {
    const wasType = overlayState.type;
    setOverlayState({ open: false, type: null, anchorKey: null });
    // SYS/HP/T/STR/AI 오버레이 닫힐 때 부모에 알려 선택 초기화 → 같은 버튼 재클릭 시 즉시 열림
    if (wasType && ["SYS", "HPT", "STR", "AI"].includes(wasType)) {
      notifyFuncOverlayClosedByAdminUi();
    }
  }

  // OVL-002: useAdminOverlayLifecycle (Batch 2 STEP 2-4)
  useAdminOverlayLifecycle({
    appMode,
    isAdminInputSessionActive,
    isTargetSelected,
    targetColor,
    overlayOpen: overlayState.open,
    overlayType: overlayState.type,
    onFuncOverlayClose,
    setOverlayState,
    isAdminTargetReady,
  });

  /** Strategy Save — SRCH-005 + DS-002 → saveFlow.runSaveStrategy */
  function handleSaveStrategy(aiOverride = null) {
    return runSaveStrategy({
      dataset,
      ballsState,
      adminState,
      activeSlot: shotEditor.activeSlot,
      slots: shotEditor.slots,
      targetColor,
      aiOverride,
      system,
      resolvedSlotSysValues,
      autoSave,
      trajectoryExtensionPayload: trajectoryExtensionDraft
        ? draftToPayload(trajectoryExtensionDraft)
        : null,
      reflectionOverridePayload: c2ReflectionOverride ?? null,
      editSource: editSourceContext,
      saveWorkingDataset,
      setDataset,
      setUserPublishedSearchContext,
      setAdminState,
      patchSlotRuntimeMeta: actions.patchSlotRuntimeMeta,
      saveToFile,
      resolveFormulaHash,
      resolveEvalProfile,
      resolveAnchorsData,
    });
  }

  /** 우측 SAVE: DS-003 → historyFlow.runCanonicalSave */
  function handleCanonicalRightPanelSave() {
    runCanonicalSave({
      dataset,
      ballsState,
      adminState,
      activeSlot: shotEditor.activeSlot,
      slots: shotEditor.slots,
      targetColor,
      aiOverride: null,
      system,
      resolvedSlotSysValues,
      autoSave,
      trajectoryExtensionPayload: trajectoryExtensionDraft
        ? draftToPayload(trajectoryExtensionDraft)
        : null,
      reflectionOverridePayload: c2ReflectionOverride ?? null,
      editSource: editSourceContext,
      saveWorkingDataset,
      setDataset,
      setUserPublishedSearchContext,
      setAdminState,
      patchSlotRuntimeMeta: actions.patchSlotRuntimeMeta,
      saveToFile,
      canUseSystemControls,
      commitWorkspaceHistoryWithStrategyDataset,
      resolveFormulaHash,
      resolveEvalProfile,
      resolveAnchorsData,
    });
  }

  // SRCH-001: runAdminPositionRecall → application/flows/adminLocalDbFlow.ts (STEP 3-5)

  /** 우측 ADMIN Search (published) — SRCH-002 → adminSearchFlow.runAdminSearch */
  async function handlePositionRecall() {
    if (appMode !== "ADMIN") return;
    hideBallPositionController();
    await runAdminSearch({
      ballsState,
      adminState,
      activeSlot: shotEditor.activeSlot,
      slots: shotEditor.slots,
      isTargetSelected,
      targetColor,
      userPublishedSearchContext,
      setAdminState,
      setIsAdminPublishedSearchMatched,
      setAdminTableLayersVisible,
      setShowCoaching,
      applyPositionRecall: actions.applyPositionRecall,
      patchSlotRuntimeMeta: actions.patchSlotRuntimeMeta,
      clearAdminSearchDisplayRuntime,
      beginAdminInputSession,
      getAdminRecallQueryTargetBall,
      rejectAdminRecallHydrateForMismatch,
      resolveFormulaHash,
    });
  }

  /** Search/Recall 후 Editing Session 시작 (볼 이동 허용, SYS는 Apply 전까지 참고용) */
  const beginAdminInputSession = useCallback(() => {
    console.log("[BEGIN_ADMIN_SESSION]", adminState?.sys);
    const snap = ballsState;
    if (!snap || !snap.cue) {
      alert("공 배치를 확인할 수 없습니다.");
      return false;
    }
    setIsAdminInputSessionActive(true);
    actions.syncBallsToAllSlots(snap);
    const ball3 = normalizeBallsToBall3(snap);
    setAdminState((prev) => ({
      ...prev,
      balls: JSON.parse(JSON.stringify(ball3)),
    }));
    return true;
  }, [ballsState, actions]);

  /** ADMIN Search/로컬DB 직전 — 이전 recall draft/표시 제거 (ballsState·targetColor 유지). */
  const clearAdminSearchDisplayRuntime = useCallback(() => {
    actions.clearAdminSearchDisplaySlotDrafts();
    trajectory.resetTrajectory();
    setAdminState((prev) => ({
      ...prev,
      sys: createEmptyAdminSysSnapshot(),
    }));
    setAdminTableLayersVisible(false);
    setIsAdminPublishedSearchMatched(false);
    setShowCoaching(false);
  }, [actions, trajectory]);

  const handleAdminSearch = useCallback(async () => {
    if (appMode !== "ADMIN") return;
    logAdminSearchTargetState("ADMIN_SEARCH_TARGET_STATE");
    const matched = await runAdminLocalDbRecall({
      dataset,
      ballsState,
      adminState,
      activeSlot: shotEditor.activeSlot,
      slots: shotEditor.slots,
      isTargetSelected,
      targetColor,
      setAdminState,
      setIsAdminPublishedSearchMatched,
      setAdminTableLayersVisible,
      setShowCoaching,
      applyPositionRecall: actions.applyPositionRecall,
      patchSlotRuntimeMeta: actions.patchSlotRuntimeMeta,
      clearAdminSearchDisplayRuntime,
      beginAdminInputSession,
      getAdminRecallQueryTargetBall,
      resolveFormulaHash,
    });
    if (matched) {
      setUserTableDisplaySlotId(null);
    }
    // no-match: 포지션 유지, beginAdminInputSession으로 새 입력 상태 진입 (Reset 버튼 없음)
  }, [
    appMode,
    dataset,
    ballsState,
    adminState,
    shotEditor.activeSlot,
    shotEditor.slots,
    isTargetSelected,
    targetColor,
    setAdminState,
    setIsAdminPublishedSearchMatched,
    setAdminTableLayersVisible,
    setShowCoaching,
    actions.applyPositionRecall,
    actions.patchSlotRuntimeMeta,
    clearAdminSearchDisplayRuntime,
    beginAdminInputSession,
    getAdminRecallQueryTargetBall,
  ]);

  const clearUserSearchDisplayRuntime = useCallback(() => {
    setUserTableDisplaySlotId(null);
    trajectory.resetTrajectory();
    setAdminState((prev) => ({
      ...prev,
      sys: createEmptyAdminSysSnapshot(),
    }));
    setOverlayContent(null);
    setOverlayState({ open: false, type: null });
  }, [trajectory]);

  /** USER Reset: balls 유지, 표시/runtime Search draft 제거 (SRCH-004 → resetFlow) */
  const handleUserSearchReset = useCallback(() => {
    runUserSearchReset({
      appMode,
      slots: shotEditor.slots,
      trajectory,
      adminState,
      userTableDisplaySlotId,
      targetColor,
      isTargetSelected,
      setUserTableDisplaySlotId,
      setOverlayContent,
      setOverlayState,
      setAdminState,
      setUserLastSearchRecord,
      clearSearchSlotDrafts: actions.clearSearchSlotDrafts,
      resetUserSearchTargetSelection,
    });
  }, [
    appMode,
    shotEditor.slots,
    trajectory,
    adminState,
    userTableDisplaySlotId,
    targetColor,
    isTargetSelected,
    setUserTableDisplaySlotId,
    setOverlayContent,
    setOverlayState,
    setAdminState,
    setUserLastSearchRecord,
    actions.clearSearchSlotDrafts,
    resetUserSearchTargetSelection,
  ]);

  /** ADMIN→USER: 새로고침 직후 USER 초기 화면과 동일하게 Editing Session 전체 종료. */
  const resetUserSearchSessionOnAdminExit = useCallback(() => {
    actions.clearSearchSlotDrafts();
    setUserLastSearchRecord(null);
    setUserTableDisplaySlotId(null);
    setUserPublishedSearchContext({ shotType: null, systemId: null });

    setTrajectoryExtensionDraft(null);
    setExtensionActiveHandle(null);
    extensionDraftRef.current = null;
    extensionSegmentsRef.current = [];
    extensionHandleRgRef.current = { 1: null, 2: null };
    projectionSegmentsRef.current = [];

    setTargetColor(null);
    setIsTargetSelected(false);
    setIsAdminInputSessionActive(false);
    setIsAdminPublishedSearchMatched(false);
    setIsSaved(false);
    setAdminTableLayersVisible(false);
    setShowCoaching(false);
    setShowBaseLine(false);
    setShowSystemGrid(false);
    setOverlayContent(null);
    setOverlayState({ open: false, type: null, anchorKey: null });

    stopJoystick();
    joyDragRef.current = {
      active: false,
      pointerId: null,
      lastX: 0,
      lastY: 0,
      ballId: null,
    };
    ballDragLastPointerRgRef.current = null;
    setDragState({
      dragging: false,
      ballId: null,
      grabOffsetRg: { x: 0, y: 0 },
      previousPosRg: null,
      joystickVisible: false,
      frozenImpact: null,
      frozenCushionPathAttr: null,
      frozenCushionPathRg: null,
    });

    setBallsState({ ...INITIAL_BALLS_RG });
    trajectory.resetTrajectory();
    setAdminState((prev) => ({
      ...prev,
      sys: createEmptyAdminSysSnapshot(),
      balls: { ...INITIAL_BALLS_RG },
    }));
  }, [actions, trajectory]);

  /** USER Search: published corpus → userStrict recall → draft apply → Runtime Activation (pick과 동일).
   * Phase 5 Mission 01: optional parallel Real Interpolation (VITE_REAL_INTERPOLATION_SEARCH=1).
   */
  const handleUserSearchStrategies = useCallback(async () => {
    if (appMode !== "USER") return;
    if (userSearchInFlightRef.current) return;
    userSearchInFlightRef.current = true;
    const activeSlotAtSearch = shotEditor.activeSlot;
    try {
      const matchedRecord = await runUserSearch({
        ballsState,
        adminState,
        activeSlot: activeSlotAtSearch,
        slots: shotEditor.slots,
        targetColor,
        userPublishedSearchContext,
        setUserLastSearchRecord,
        setUserPublishedSearchContext,
        applyUserSearchRecall: (record) => {
          flushSync(() => {
            actions.applyUserSearchRecall(record);
          });
        },
        clearSearchSlotDrafts: actions.clearSearchSlotDrafts,
        clearUserSearchDisplayRuntime,
        resetUserSearchTargetSelection,
        showToast: userToast.show,
      });
      if (!matchedRecord) {
        if (REAL_INTERPOLATION_SEARCH_ENABLED) {
          setRealInterpolationResults([]);
          setRiUiSelectedIndex(null);
        }
        return;
      }
      const slotId = resolveUserSearchDisplaySlotId(
        matchedRecord,
        activeSlotAtSearch
      );
      if (slotId) {
        activateStrategySlot(slotId);
      }

      // Parallel Real Interpolation path — does not replace Phase 3 / userStrict recall.
      // Envelope: Product-published static corpus via read-only loader (no window global).
      if (REAL_INTERPOLATION_SEARCH_ENABLED) {
        try {
          const query = normalizeBallsToBall3(ballsState);
          const envelopeLoad = await getOrLoadPublishedEnvelopeDataset();
          const envelopeDataset =
            publishedEnvelopeDatasetForSearch(envelopeLoad);
          if (!envelopeDataset) {
            // Fail-closed: RI empty; USER Search path already completed above.
            setRealInterpolationResults([]);
            setRiUiSelectedIndex(null);
            if (typeof window !== "undefined") {
              window.__REAL_INTERPOLATION_TOP3__ = [];
            }
          } else {
            const leafRecords =
              userLastSearchRecord != null
                ? [userLastSearchRecord, matchedRecord].filter(Boolean)
                : [matchedRecord];
            // Prefer full leaf corpus when cache holds it.
            const hintShot =
              userPublishedSearchContext?.shotType ??
              matchedRecord?.strategies?.S1?.signature?.shotType;
            const hintSys =
              userPublishedSearchContext?.systemId ??
              matchedRecord?.strategies?.S1?.signature?.systemId;
            let positionRecords = leafRecords;
            if (hintShot && hintSys) {
              const { getPublishedLeafCacheEntry } = await import(
                "./domain/publishedDatasetStore"
              );
              const cached = getPublishedLeafCacheEntry(hintShot, hintSys);
              if (cached?.status === "ready" && cached.records?.length) {
                positionRecords = cached.records;
              }
            }
            const { results } = runRealInterpolationSearchFlow({
              query,
              positionRecords,
              envelopeDataset,
              resolveEvalProfile,
              resolveAnchorsData,
              // Existing Builder DI — App owns dependency; no window Builder global.
              buildTrajectory,
              buildTrajectoryInput: (riResult) =>
                buildRealInterpolationTrajectoryBuildInput(
                  riResult,
                  riTrajectoryContextRef.current
                ),
            });
            setRealInterpolationResults(results);
            setRiUiSelectedIndex(null);
            // Mission 01 UI hook points: confidence / matchType / top-3 (no redesign).
            if (typeof window !== "undefined") {
              window.__REAL_INTERPOLATION_TOP3__ = results.slice(0, 3).map((r, i) => ({
                slotHint: ["S1", "S2", "S3"][i],
                authoringStrategyId: r.authoringStrategyId,
                matchType: r.matchType,
                confidence: r.confidence,
                strategyRef: r.strategyRef,
              }));
            }
          }
        } catch (err) {
          console.warn("[RealInterpolation] search failed", err);
          setRealInterpolationResults([]);
          setRiUiSelectedIndex(null);
          if (typeof window !== "undefined") {
            window.__REAL_INTERPOLATION_TOP3__ = [];
          }
        }
      }
    } finally {
      userSearchInFlightRef.current = false;
    }
  }, [
    appMode,
    ballsState,
    targetColor,
    actions,
    adminState,
    shotEditor.slots,
    shotEditor.activeSlot,
    clearUserSearchDisplayRuntime,
    userPublishedSearchContext,
    userLastSearchRecord,
    userToast.show,
    resetUserSearchTargetSelection,
    REAL_INTERPOLATION_SEARCH_ENABLED,
  ]);

  const handleOpenUserHistory = useCallback(() => {
    if (appMode !== "USER") return;
    setShowHistoryModal(true);
  }, [appMode, setShowHistoryModal]);

  // OVL-003: useUserOverlayRouter (Batch 2 STEP 2-4)
  const { handleDismissUserInfoOverlayPanel, handleCloseUserInfoOverlay } = useUserOverlayRouter({
    appMode,
    setOverlayContent,
    onFuncOverlayClose,
  });

  // ⭐ 핵심: 버튼 클릭 → Overlay 여는 함수
  function handleSelectAdminButton(buttonId) {
    if (appMode !== "ADMIN") return;

    if (!ADMIN_BUTTONS.includes(buttonId)) return;
    if (!isAdminInputSessionActive || !isAdminTargetReady()) return;

    // 드래그 중이면 강제 종료
    if (dragState.dragging) {
      handlePointerUp({ pointerId: null });
    }
    
    // 조이스틱 숨김
    setDragState(prev => ({ ...prev, joystickVisible: false }));
    
    setOverlayState({
      open: true,
      type: buttonId
    });
  }

  // Admin Mode 토글 함수
  function handleToggleAdminMode() {
    const wasType = overlayState.type;
    setAppMode((prev) => {
      const nextMode = prev === "ADMIN" ? "USER" : "ADMIN";
      
      if (nextMode === "ADMIN") {
        setShowCoaching(false);
        setAdminTableLayersVisible(false);
        setOverlayContent(null);
      }
      
      return nextMode;
    });
    setOverlayState({ open: false, type: null });
    if (wasType && ["SYS", "HPT", "STR", "AI"].includes(wasType)) {
      notifyFuncOverlayClosedByAdminUi();
    }
  }

  // SAVE 핸들러 (기존 - 다른 곳에서 사용 시)
  function handleSave() {
    if (!adminState.sys.system_id) {
      alert("시스템을 선택하세요");
      return;
    }
    const record = {
      timestamp: Date.now(),
      mode: "ADMIN",
      system_id: adminState.sys.system_id,
      balls: adminState.balls,
      sys_input: adminState.sys,
      hpt_input: adminState.hpt,
      str_input: adminState.str,
      ai_text: adminState.ai.text,
      onePointLessons: adminState.ai.onePointLessons ?? []
    };
    console.log("💾 SAVED:", record);
    alert("저장 완료");
  }

  function invalidateSavedAndRecalledForBallId(ballId) {
    if (!ballId) return;
    if (["cue", "target", "target_center", "second", "impact"].includes(ballId)) {
      setIsSaved(false);
      setIsAdminPublishedSearchMatched(false);
    }
  }

  function nudgeBall(ballId, dx, dy) {
    if (!ballId) return;
    setBallsState((prev) => {
      const cur = prev?.[ballId];
      if (!cur) return prev;
      
      // ⭐ impact는 FREE 모드일 때 쿠션 근처까지 허용
      let minX = 0.5;
      let maxX = 79.5;
      let minY = 0.5;
      let maxY = 39.5;
      
      if (ballId === "impact" && impactMode === "FREE") {
        minX = -CUSHION_RG;
        maxX = 80 + CUSHION_RG;
        minY = -CUSHION_RG;
        maxY = 40 + CUSHION_RG;
      }
      
      const next = {
        x: clamp(cur.x + dx, minX, maxX),
        y: clamp(cur.y + dy, minY, maxY),
      };
      return { ...prev, [ballId]: next };
    });
    invalidateSavedAndRecalledForBallId(ballId);
  }

  function startJoystick(direction) {
    const id = dragState.ballId;
    if (!id) return;
    const delta = {
      up: { dx: 0, dy: JOYSTICK_STEP },
      down: { dx: 0, dy: -JOYSTICK_STEP },
      left: { dx: -JOYSTICK_STEP, dy: 0 },
      right: { dx: JOYSTICK_STEP, dy: 0 },
    }[direction];
    if (!delta) return;
    // single nudge immediately
    nudgeBall(id, delta.dx, delta.dy);
    // repeat while pressed
    stopJoystick();
    joyIntervalRef.current = window.setInterval(() => {
      nudgeBall(id, delta.dx, delta.dy);
    }, JOYSTICK_REPEAT_MS);
  }

  function stopJoystick() {
    if (joyIntervalRef.current != null) {
      window.clearInterval(joyIntervalRef.current);
      joyIntervalRef.current = null;
    }
  }


// Drag-pad Joystick handlers (mobile friendly)
/** Joystick drag 시작 — pad DOM / table SVG 어느 쪽에서 잡혀도 동일 진입점. */
function beginJoyDrag(e, ballId, captureTarget) {
  // stop any legacy repeat mode
  stopJoystick();

  joyDragRef.current = {
    active: true,
    pointerId: e.pointerId,
    lastX: e.clientX,
    lastY: e.clientY,
    ballId,
  };

  try {
    captureTarget?.setPointerCapture?.(e.pointerId);
  } catch {}
}

function endJoyDrag(e, releaseTarget) {
  joyDragRef.current.active = false;
  joyDragRef.current.pointerId = null;

  try {
    releaseTarget?.releasePointerCapture?.(e.pointerId);
  } catch {}
}

function isJoyDragPointer(e) {
  return (
    joyDragRef.current.active && joyDragRef.current.pointerId === e?.pointerId
  );
}

function handleJoyPadPointerDown(e) {
  // joysticks should never trigger table pointer logic
  e.preventDefault();
  e.stopPropagation();
  if (!dragState.joystickVisible || !dragState.ballId) return;

  beginJoyDrag(e, dragState.ballId, e.currentTarget);
}

function applyJoyDragMove(e) {
  const dxPx = e.clientX - joyDragRef.current.lastX;
  const dyPx = e.clientY - joyDragRef.current.lastY;

  joyDragRef.current.lastX = e.clientX;
  joyDragRef.current.lastY = e.clientY;

  const dragSpeedScale = e.ctrlKey ? 0.2 : e.shiftKey ? 1.5 : 1.0;
  // px -> Rg (SVG y is inverted in toPx/toRg)
  const dxRg = (dxPx / SCALE) * dragSpeedScale;
  const dyRg = (-dyPx / SCALE) * dragSpeedScale;

  const ballId = joyDragRef.current.ballId;
  if (!ballId) return;

  // small deadzone to avoid micro jitter
  if (Math.abs(dxRg) + Math.abs(dyRg) < 0.005) return;

  setBallsState((prev) => {
    const cur = prev?.[ballId];
    if (!cur) return prev;

    const next = {
      x: clamp(cur.x + dxRg, 0.5, 79.5),
      y: clamp(cur.y + dyRg, 0.5, 39.5),
    };

    return { ...prev, [ballId]: next };
  });
  invalidateSavedAndRecalledForBallId(ballId);
}

function handleJoyPadPointerMove(e) {
  if (!isJoyDragPointer(e)) return;

  e.preventDefault();
  e.stopPropagation();

  applyJoyDragMove(e);
}

function handleJoyPadPointerUp(e) {
  if (!isJoyDragPointer(e)) return;

  e.preventDefault();
  e.stopPropagation();

  endJoyDrag(e, e.currentTarget);
}

function handleJoyPadPointerCancel(e) {
  handleJoyPadPointerUp(e);
}
  // ============================================
  // currentButtonId 처리 (USER 모드 오버레이)
  // ============================================
  useEffect(() => {
    // ✅ ADMIN 모드에서는 기존(USER) overlayContent 흐름을 막는다
    if (appMode === "ADMIN") return;
    
    if (!currentButtonId) return;

    hideBallPositionController();

    // 코칭 버튼 처리
    if (currentButtonId === "COACH") {
      setShowCoaching(true);
      console.log("🎯 코칭 버튼 클릭 감지");
    } else if (currentButtonId === "HP/T") {
      setOverlayContent("HPT");
    } else if (currentButtonId === "STR") {
      setOverlayContent("STR");
    } else if (currentButtonId === "AI") {
      setOverlayContent("AI");
    } else if (currentButtonId === "TRAJECTORY") {
      setOverlayContent("CALC");
    } else {
      setOverlayContent(null);
    }
  }, [currentButtonId, appMode]);

  // ============================================
  // currentButtonId 처리 (ADMIN 모드 오버레이)
  // ============================================
  // ✅ ADMIN 모드에서 SYS/HP/T/STR/AI 버튼 클릭 → 관리자 오버레이(openOverlay)로 연결
  useEffect(() => {
    if (appMode !== "ADMIN") return;
    if (!currentButtonId) return;

    hideBallPositionController();

    if (!isAdminInputSessionActive || !isAdminTargetReady()) return;

    if (currentButtonId === "SYS") openOverlay("SYS");
    else if (currentButtonId === "HP/T") openOverlay("HPT");
    else if (currentButtonId === "STR") openOverlay("STR");
    else if (currentButtonId === "AI") openOverlay("AI");
  }, [currentButtonId, appMode, isAdminInputSessionActive, isTargetSelected, targetColor]);

  // ============================================
  // S1/S2/S3: navigation only (no runAutoRecommend)
  // ============================================
  useEffect(() => {
    const slotIds = ["S1", "S2", "S3"];
    if (!slotIds.includes(currentButtonId)) return;

    const prevSlotButton = lastSlotNavButtonRef.current;
    const isCrossSlotNavigation =
      prevSlotButton != null &&
      prevSlotButton !== currentButtonId &&
      slotIds.includes(prevSlotButton);

    actions.switchSlot(currentButtonId);
    setOverlayContent(null);
    setOverlayState({ open: false, type: null });

    lastSlotNavButtonRef.current = currentButtonId;
  }, [currentButtonId, appMode]);

  // ADMIN: slot 전환 시 hydrate (USER는 공략 버튼 클릭 시만)
  useEffect(() => {
    if (appMode === "USER") return;
    lastHydrateTriggerRef.current = "slot_switch";
    hydrateSlotRuntime(shotEditor.activeSlot);
  }, [shotEditor.activeSlot, appMode]);

  // slots/draft 변경 시 sync — USER는 공략 선택 후에만
  useEffect(() => {
    if (appMode === "USER") {
      if (!userTableDisplaySlotId) return;
      runTrajectoryHydrate({
        slotId: userTableDisplaySlotId,
        slots: shotEditor.slots,
        setAdminState,
        trajectory,
      });
      return;
    }
    if (!adminTableLayersVisible) return;
    runTrajectoryHydrate({
      slotId: shotEditor.activeSlot,
      slots: shotEditor.slots,
      setAdminState,
      trajectory,
    });
  }, [
    shotEditor.slots,
    shotEditor.activeSlot,
    appMode,
    userTableDisplaySlotId,
    adminTableLayersVisible,
  ]);

  // Stage에 activeSlot 동기화 (슬롯 버튼 빨간 테두리용)
  useEffect(() => {
    onActiveSlotChange?.(shotEditor.activeSlot);
  }, [shotEditor.activeSlot, onActiveSlotChange]);

  // Stage에 dirty 슬롯 ID 동기화 (S1● S2● 표시용)
  useEffect(() => {
    onDirtySlotsChange?.(actions.getDirtySlotIds?.() ?? []);
  }, [shotEditor.slots, onDirtySlotsChange]);

  // Stage에 appMode 동기화
  useEffect(() => {
    onAppModeChange?.(appMode);
  }, [appMode, onAppModeChange]);

  useEffect(() => {
    onUserSearchHasResultsChange?.(
      appMode === "USER" && userLastSearchRecord != null
    );
  }, [appMode, userLastSearchRecord, onUserSearchHasResultsChange]);

  useEffect(() => {
    if (appMode !== "USER") {
      onUserSearchStrategiesRegister?.(null);
      return;
    }
    onUserSearchStrategiesRegister?.(handleUserSearchStrategies);
    return () => onUserSearchStrategiesRegister?.(null);
  }, [appMode, handleUserSearchStrategies, onUserSearchStrategiesRegister]);

  useEffect(() => {
    if (appMode !== "USER") {
      onUserSearchResetRegister?.(null);
      return;
    }
    onUserSearchResetRegister?.(handleUserSearchReset);
    return () => onUserSearchResetRegister?.(null);
  }, [appMode, handleUserSearchReset, onUserSearchResetRegister]);

  useEffect(() => {
    const prev = prevAppModeForUserSessionRef.current;
    if (prev === "ADMIN" && appMode === "USER") {
      resetUserSearchSessionOnAdminExit();
    }
    prevAppModeForUserSessionRef.current = appMode;
  }, [appMode, resetUserSearchSessionOnAdminExit]);

  useEffect(() => {
    if (appMode === "USER") {
      setAdminTableLayersVisible(false);
      return;
    }
    setUserLastSearchRecord(null);
    setUserTableDisplaySlotId(null);
  }, [appMode]);

  /** ADMIN 진입 직후 adminState.sys 스냅샷 (shotType "" 추적) */
  useEffect(() => {
    if (appMode !== "ADMIN") return;
    console.log("[ADMIN_ENTRY_SYS]", adminState?.sys);
  }, [appMode]);

  const prevAppModeForAfterEnterRef = useRef(appMode);
  const afterEnterSyncPendingRef = useRef(false);
  useEffect(() => {
    if (appMode !== "ADMIN") {
      afterEnterSyncPendingRef.current = false;
      prevAppModeForAfterEnterRef.current = appMode;
      return;
    }
    const entering =
      prevAppModeForAfterEnterRef.current !== "ADMIN" && appMode === "ADMIN";
    if (entering) {
      afterEnterSyncPendingRef.current = true;
      console.log("[ADMIN_STATE_AFTER_ENTER]", adminState?.sys);
    } else if (afterEnterSyncPendingRef.current) {
      afterEnterSyncPendingRef.current = false;
      console.log("[ADMIN_STATE_AFTER_ENTER]", adminState?.sys);
    }
    prevAppModeForAfterEnterRef.current = appMode;
  }, [appMode, adminState?.sys]);

  useEffect(() => {
    if (appMode !== "ADMIN") {
      onAdminSearchRegister?.(null);
      return;
    }
    onAdminSearchRegister?.(handleAdminSearch);
    return () => onAdminSearchRegister?.(null);
  }, [appMode, handleAdminSearch, onAdminSearchRegister]);

  useEffect(() => {
    if (appMode !== "USER") {
      onUserStrategySlotPickRegister?.(null);
      return;
    }
    const pickStrategySlot = (slotId) => {
      if (!USER_STRATEGY_SLOT_IDS.includes(slotId)) return;
      setOverlayContent(null);
      setOverlayState({ open: false, type: null });
      activateStrategySlot(slotId);
    };
    onUserStrategySlotPickRegister?.(pickStrategySlot);
    return () => onUserStrategySlotPickRegister?.(null);
  }, [
    appMode,
    actions,
    shotEditor.slots,
    onUserStrategySlotPickRegister,
  ]);

  /** Minimal RI selection → existing activateStrategySlot (no Top-3 UI redesign). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!REAL_INTERPOLATION_SEARCH_ENABLED || appMode !== "USER") {
      if (typeof window.__REAL_INTERPOLATION_ACTIVATE__ !== "undefined") {
        delete window.__REAL_INTERPOLATION_ACTIVATE__;
      }
      return;
    }
    window.__REAL_INTERPOLATION_ACTIVATE__ = (arg) => {
      let result = null;
      let slotHint = null;
      if (typeof arg === "number") {
        result = realInterpolationResultsRef.current[arg] ?? null;
        slotHint = ["S1", "S2", "S3"][arg] ?? null;
      } else if (arg && typeof arg === "object") {
        if (typeof arg.index === "number") {
          result = realInterpolationResultsRef.current[arg.index] ?? null;
          slotHint =
            arg.slotHint ?? ["S1", "S2", "S3"][arg.index] ?? null;
        } else {
          result = arg.result ?? arg;
          slotHint = arg.slotHint ?? null;
        }
      }
      if (!result) return false;
      return activateRealInterpolationCandidate(result, slotHint);
    };
    return () => {
      delete window.__REAL_INTERPOLATION_ACTIVATE__;
    };
  }, [appMode, REAL_INTERPOLATION_SEARCH_ENABLED, actions]);

  useEffect(() => {
    if (!userRailActions) return;
    if (appMode === "USER") {
      userRailActions.openHistory = handleOpenUserHistory;
      userRailActions.closeOverlay = handleCloseUserInfoOverlay;
      userRailActions.dismissOverlayPanel = handleDismissUserInfoOverlayPanel;
    } else {
      userRailActions.openHistory = null;
      userRailActions.closeOverlay = null;
      userRailActions.dismissOverlayPanel = null;
    }
    return () => {
      if (!userRailActions) return;
      userRailActions.openHistory = null;
      userRailActions.closeOverlay = null;
      userRailActions.dismissOverlayPanel = null;
    };
  }, [
    appMode,
    handleOpenUserHistory,
    handleCloseUserInfoOverlay,
    handleDismissUserInfoOverlayPanel,
    userRailActions,
  ]);

  const slotRenderShotTypes = useMemo(() => {
    const out = { S1: "", S2: "", S3: "" };
    for (const slotId of ["S1", "S2", "S3"]) {
      const payload = buildSlotRuntimePayload(shotEditor.slots[slotId]);
      out[slotId] = payload.adminSys?.shotType ?? "";
    }
    return out;
  }, [shotEditor.slots]);

  const strategyButtons = useMemo(() => {
    if (appMode !== "USER") return [];
    return buildStrategyButtonsFromRuntime({
      slots: shotEditor.slots,
      activeSlot: shotEditor.activeSlot,
      slotRenderShotTypes,
      searchRecord: userLastSearchRecord,
    });
  }, [
    appMode,
    shotEditor.slots,
    shotEditor.activeSlot,
    slotRenderShotTypes,
    userLastSearchRecord,
  ]);

  /** RI UI surface — consume engine Top-3 as-is (no rerank / no confidence recompute). */
  const realInterpolationUiSurface = useMemo(
    () => buildRealInterpolationUiSurface(realInterpolationResults),
    [realInterpolationResults]
  );

  const handleRealInterpolationUiSelect = useCallback(
    (index) => {
      const result = realInterpolationResultsRef.current[index];
      if (!result) return;
      const slotHint = ["S1", "S2", "S3"][index] ?? null;
      const ok = activateRealInterpolationCandidate(result, slotHint);
      if (ok) setRiUiSelectedIndex(index);
    },
    // activateRealInterpolationCandidate closes over actions/slot hydrate (stable enough via ref/actions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actions]
  );

  const strategyCountMap = useMemo(
    () => strategyCountMapFromButtons(strategyButtons),
    [strategyButtons]
  );

  useEffect(() => {
    const activeSlot = shotEditor.activeSlot;
    const slot = shotEditor.slots[activeSlot];
    adminRecallTraceCtxRef.current = () =>
      buildAdminRecallTraceSnapshot({
        trajectory,
        userTableDisplaySlotId,
        resolvedSlotSys: resolveSlotSysForRender(slot) ?? null,
        userLastSearchRecord,
        strategyButtonsLength: strategyButtons.length,
        adminTableLayersVisible,
        showCoaching,
        appMode,
        activeSlot,
        isAdminInputSessionActive,
        isTargetSelected,
        targetColor,
        datasetLength: dataset?.length ?? 0,
        slotPresence: traceSlotPresence(shotEditor.slots),
      });
  }, [
    trajectory.state,
    userTableDisplaySlotId,
    shotEditor.slots,
    shotEditor.activeSlot,
    userLastSearchRecord,
    strategyButtons.length,
    adminTableLayersVisible,
    showCoaching,
    appMode,
    isAdminInputSessionActive,
    isTargetSelected,
    targetColor,
    dataset,
  ]);

  // STEP 2-2C: mount dataset hydrate + ADMIN→USER + passive USER state trace
  const mountDatasetTraceDoneRef = useRef(false);
  const prevAppModeTraceRef = useRef(appMode);

  useEffect(() => {
    if (mountDatasetTraceDoneRef.current) return;
    mountDatasetTraceDoneRef.current = true;
    let lsRawLength = 0;
    try {
      const saved = localStorage.getItem("positions_dataset");
      lsRawLength = saved ? JSON.parse(saved).length : 0;
    } catch {
      lsRawLength = -1;
    }
    postRecallTraceLog(
      "App.jsx:mount_dataset_hydrate",
      "MOUNT_DATASET_HYDRATE",
      "H2C_G3",
      {
        localStorageRawLength: lsRawLength,
        setDatasetLength: dataset?.length ?? 0,
        datasetSummary: summarizeDatasetRecords(dataset ?? []),
        appMode,
        ballsState,
        adminStateBalls: adminState?.balls ?? null,
        targetColor,
        activeSlot: shotEditor.activeSlot,
        slotPresence: traceSlotPresence(shotEditor.slots),
      }
    );
    if (appMode === "USER") {
      const rawBalls = ballsState ?? adminState?.balls ?? {};
      const normalized = normalizeBallsToBall3(rawBalls);
      postRecallTraceLog(
        "App.jsx:mount_user_refresh",
        "MOUNT_USER_REFRESH_STATE",
        "H2C_G2",
        {
          datasetLength: dataset?.length ?? 0,
          rawBalls,
          normalizedBalls: normalized,
          targetColor,
          compareTrace:
            dataset?.length > 0
              ? buildRecallTracePayload(
                  {
                    dataset: dataset ?? [],
                    balls: normalized,
                    targetBall: targetColor ?? null,
                  },
                  "MOUNT_USER_REFRESH"
                )
              : null,
        }
      );
    }
  }, []);

  useEffect(() => {
    const prev = prevAppModeTraceRef.current;
    if (prev === "ADMIN" && appMode === "USER") {
      const rawBalls = ballsState ?? adminState?.balls ?? {};
      const normalized = normalizeBallsToBall3(rawBalls);
      postRecallTraceLog(
        "App.jsx:admin_to_user",
        "ADMIN_TO_USER_STATE",
        "H2C_G1",
        {
          datasetLength: dataset?.length ?? 0,
          datasetSummary: summarizeDatasetRecords(dataset ?? []),
          rawBalls,
          normalizedBalls: normalized,
          targetColor,
          activeSlot: shotEditor.activeSlot,
          slotPresence: traceSlotPresence(shotEditor.slots),
          userTableDisplaySlotId,
          strategyButtons: strategyButtons.map((b) => ({
            slotId: b.slotId,
            label: b.label,
            hasRecall: b.hasRecall,
          })),
          strategyButtonsCount: strategyButtons.length,
          compareTrace:
            dataset?.length > 0
              ? buildRecallTracePayload(
                  {
                    dataset: dataset ?? [],
                    balls: normalized,
                    targetBall: targetColor ?? null,
                  },
                  "ADMIN_TO_USER"
                )
              : null,
        }
      );
    }
    prevAppModeTraceRef.current = appMode;
  }, [
    appMode,
    dataset,
    ballsState,
    adminState?.balls,
    targetColor,
    shotEditor.activeSlot,
    shotEditor.slots,
    userTableDisplaySlotId,
    strategyButtons,
  ]);

  useEffect(() => {
    if (appMode !== "USER") return;
    const rawBalls = ballsState ?? {};
    const normalized = normalizeBallsToBall3(rawBalls);
    postRecallTraceLog(
      "App.jsx:user_rail_state",
      "USER_RAIL_STATE",
      "H2C_G4",
      {
        datasetLength: dataset?.length ?? 0,
        rawBalls,
        normalizedBalls: normalized,
        targetColor,
        userTableDisplaySlotId,
        strategyButtonsCount: strategyButtons.length,
        strategyButtons: strategyButtons.map((b) => ({
          slotId: b.slotId,
          label: b.label,
          hasRecall: b.hasRecall,
        })),
        slotPresence: traceSlotPresence(shotEditor.slots),
      }
    );
  }, [
    appMode,
    dataset,
    ballsState,
    targetColor,
    userTableDisplaySlotId,
    strategyButtons,
    shotEditor.slots,
  ]);

  useEffect(() => {
    if (appMode !== "USER") {
      setUserTableDisplaySlotId(null);
    }
  }, [appMode]);

  useEffect(() => {
    onStrategyCountMapChange?.(strategyCountMap);
  }, [strategyCountMap, onStrategyCountMapChange]);

  useEffect(() => {
    onStrategyButtonsChange?.(strategyButtons);
  }, [strategyButtons, onStrategyButtonsChange]);

  const userInfoPanel = useMemo(() => {
    if (appMode !== "USER") return null;
    if (!userTableDisplaySlotId) return null;
    const activeSlot = userTableDisplaySlotId;
    const slot = shotEditor.slots[activeSlot];
    const hasSlotSys = !!(slot?.draft?.sys ?? slot?.applied?.sys);
    if (!hasSlotSys) return null;

    const activeStrategyLabel =
      strategyButtons.find((b) => b.slotId === activeSlot && b.hasRecall)?.label ??
      strategyButtons.find((b) => b.hasRecall && b.isActive)?.label ??
      "";
    const appliedSys =
      slot?.applied?.sys ?? slot?.draft?.sys ?? resolvedSlotSys ?? null;
    const hpt =
      slot?.draft?.hpt ?? slot?.applied?.hpt ?? adminState?.hpt ?? null;
    const str =
      slot?.draft?.str ?? slot?.applied?.str ?? adminState?.str ?? null;
    const draftAi = slot?.draft?.ai ?? null;
    const appliedAi = slot?.applied?.ai ?? null;
    const adminAi = adminState?.ai ?? null;
    return buildUserInfoPanel({
      strategyButtonLabel: activeStrategyLabel,
      slotRenderSys,
      resolvedSlotSys: resolvedSlotSys ?? null,
      resolvedSlotSysValues,
      resolvedSlotBaseSysValues,
      appliedSys,
      hpt,
      str,
      ai: draftAi ?? appliedAi ?? adminAi,
      aiLessonSources: [draftAi, appliedAi, adminAi],
      sysHpNResult,
      viewStrategyNarrative: hasSlotSys ? (view?.ui?.strategy ?? null) : null,
    });
  }, [
    appMode,
    userTableDisplaySlotId,
    shotEditor.activeSlot,
    shotEditor.slots,
    strategyButtons,
    slotRenderSys,
    resolvedSlotSys,
    resolvedSlotSysValues,
    resolvedSlotBaseSysValues,
    adminState?.hpt,
    adminState?.str,
    adminState?.ai,
    sysHpNResult,
    view?.ui?.strategy,
  ]);

  const userHptModel = useMemo(() => {
    if (appMode !== "USER") return null;
    if (!userTableDisplaySlotId) {
      return buildUserHptViewModel({ noStrategySelected: true });
    }
    const slot = shotEditor.slots[userTableDisplaySlotId];
    const hpt = slot?.draft?.hpt ?? slot?.applied?.hpt ?? adminState?.hpt ?? null;
    return buildUserHptViewModel({ hpt, sysHpNResult });
  }, [
    appMode,
    userTableDisplaySlotId,
    shotEditor.slots,
    adminState?.hpt,
    sysHpNResult,
  ]);

  const userOverlayLayout = useMemo(
    () => resolveUserOverlayLayout(overlayContent),
    [overlayContent]
  );

  useEffect(() => {
    onUserInfoPanelChange?.(userInfoPanel);
  }, [userInfoPanel, onUserInfoPanelChange]);

  useEffect(() => {
    const shot = SHOTS.find((s) => s.id === currentId);
    if (!shot) {
      setError("샷을 찾을 수 없습니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const basePath = "/samples/5_half_system";

    const url = shot.file === "canonical.json"
      ? `${basePath}/B2T_R/canonical.json`
      : `${basePath}/${shot.file}`;
    
       
    fetch(url)
    
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("✅ 로드:", shot.file);
        // [VERIFY 5] F5/초기 로드 — JSON 원본 데이터
        console.log("[VERIFY 5] fetch 로드 완료 (JSON 원본)", {
          "data.ui?.anchors 키": data?.ui?.anchors ? Object.keys(data.ui.anchors) : null,
          "data.ui?.system?.values": data?.ui?.system?.values,
        });
        const isCanonicalEntry =
          shot.file === "canonical.json";
        const dataToSet =
          isCanonicalEntry
            ? {
                ...data,
                ui: {
                  ...data.ui,
                  balls: { ...INITIAL_BALLS_RG },
                  system: { values: {}, human_readable: {} },
                  anchors: data.ui?.anchors || {},
                  strategy: [],
                },
              }
            : data;
        setView(dataToSet);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ 오류:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [currentId]);

  // ballsState 초기화 — 타겟은 slot SSOT에서 복원 (view 도착이 더블클릭보다 늦어도 유지)
  useEffect(() => {
    if (view && view.ui && view.ui.balls) {
      setBallsState(hydrateBallsStateForUi(view.ui.balls));
      setIsSaved(false);
      setIsAdminPublishedSearchMatched(false);
      setIsAdminInputSessionActive(false);
      const slotTarget = extractSlotTargetBall(
        shotEditor.slots[shotEditor.activeSlot]
      );
      if (slotTarget === "red" || slotTarget === "yellow") {
        setTargetColor(slotTarget);
        setIsTargetSelected(true);
      } else {
        setIsTargetSelected(false);
        setTargetColor(null);
      }
    }
  }, [view]);

  // Strategy Auto Capture: 1초간 안정 시 dataset candidate 생성 (MISC-002 → domain/dataset/autoCapture)
  useAutoCapture({
    canEdit,
    overlayOpen: overlayState.open,
    ballsState,
    adminSys: adminState?.sys,
    adminHptT: adminState?.hpt?.T,
    viewBalls: view?.ui?.balls,
  });

  // ============================================
  // 키보드 단축키 (관리자 모드)
  // ============================================
  useEffect(() => {
    function handleKeyDown(e) {
      // ✅ 조건 3: input/textarea 포커스 시 동작 금지
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      
      // Ctrl+Shift+A: 관리자 모드 토글
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setAppMode(prev => {
          const nextMode = prev === "USER" ? "ADMIN" : "USER";
          
          if (nextMode === "ADMIN") {
            setShowCoaching(false);
            setAdminTableLayersVisible(false);
            setOverlayContent(null);
          }
          
          console.log("🔑 모드 전환:", nextMode);
          return nextMode;
        });
      }
      
      // ESC: 오버레이 닫기
      if (e.key === "Escape" && overlayState.open) {
        closeOverlay();
      }
    }
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [appMode, overlayState.open]);

  // ⚠️ Hooks 규칙: early return 전에 반드시 호출
  const systemCtrl = useSystemController({
    view: view ?? null,
    adminState,
    canEdit,
    setAdminState,
  });
  const display = useDisplayController({ ui: view?.ui });
  // [VERIFY 5] view 로드 후 화면 구성 데이터 소스 (F5/초기 로드 시)
  useEffect(() => {
    if (!view?.ui) return;
    const slot = shotEditor?.slots?.[shotEditor?.activeSlot];
    console.log("[VERIFY 5] view 로드 후 화면 구성 소스", {
      activeSlot: shotEditor?.activeSlot,
      "slot?.applied?.sys": slot?.applied?.sys,
      "display.anchors 키": display?.anchors ? Object.keys(display.anchors) : null,
      "systemCtrl.system?.values": systemCtrl?.system?.values,
    });
  }, [view, shotEditor?.activeSlot, shotEditor?.slots]);
  const ballsForCoaching = view?.ui ? (ballsState ?? (view.ui.balls || {})) : (ballsState ?? {});
  const coachingImpactTarget = useMemo(
    () => resolveImpactTargetBall(ballsForCoaching, targetColor),
    [ballsForCoaching, targetColor]
  );

  /** USER: 공략 선택 후 coaching/labels gate (기준값 토글과 별도, rail/hydrate 비변경) */
  const userStrategyLayersVisible =
    appMode === "USER" && !!userTableDisplaySlotId;
  const effectiveShowCoaching =
    appMode === "USER"
      ? showCoaching || userStrategyLayersVisible
      : showCoaching;

  const coaching = useCoachingController({
    appMode,
    showCoaching: effectiveShowCoaching,
    canEdit,
    T: systemCtrl.T,
    impactMode,
    setImpactMode,
    balls: ballsForCoaching,
    targetPointForImpact: coachingImpactTarget,
    setBallsState,
    calcImpactBall,
    SCALE,
    TABLE_H,
    PADDING,
    RENDER_RADIUS_RG,
    BALL_RADIUS_RG,
  });

  // APP-013: useSysLabelScale (Batch 2 STEP 2-5)
  const sysLabelScale = useSysLabelScale();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#334155' }}>
        로딩 중...
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: 16, color: '#b91c1c', fontFamily: 'monospace' }}>
        오류: {String(error)}
      </div>
    );
  }
  if (!view || !view.ui) {
    return (
      <div style={{ padding: 16, color: '#334155' }}>
        데이터가 없습니다.
      </div>
    );
  }

  const ui = view.ui;
  const balls = ballsState ?? (ui.balls || {});
  const adminTableLayersActive =
    appMode !== "ADMIN" || adminTableLayersVisible;
  const system = systemCtrl.system;
  const userDisplayFlags =
    appMode === "USER"
      ? getUserDisplayFlags(
          userTableDisplayMode,
          trajectoryCardSource,
          trajectoryShowAxisValues
        )
      : null;
  const userDisplayModeActive =
    appMode === "USER" && isUserDisplayModeActive(userTableDisplayMode);
  const userSystemValuesModeActive =
    appMode === "USER" &&
    userTableDisplayMode === "systemValues" &&
    !!userTableDisplaySlotId;

  const userTrajectoryAxisOverlayActive =
    appMode === "USER" &&
    userTableDisplayMode === "trajectory" &&
    trajectoryShowAxisValues &&
    !!userTableDisplaySlotId;

  const userAxisGridLabelsActive =
    (appMode === "USER" && userTableDisplayMode === "systemValues") ||
    userTrajectoryAxisOverlayActive;

  const systemLabelsOutputsForRender =
    appMode === "USER" &&
    !userDisplayModeActive &&
    !userStrategyLayersVisible
      ? null
      : appMode === "USER" && userTableDisplayMode === "systemValues"
        ? !userTableDisplaySlotId
          ? null
          : resolvedSlotSys?.outputs ??
            (Object.keys(resolvedSlotSysValues ?? {}).length > 0
              ? { result: resolvedSlotSysValues }
              : null)
        : appMode === "ADMIN" && !adminTableLayersVisible
          ? null
          : resolvedSlotSys?.outputs ??
            (system?.outputs ??
              (Object.keys(system?.values ?? {}).length > 0
                ? { result: system.values }
                : appMode === "USER" && userDisplayModeActive
                  ? { result: {} }
                  : undefined));
  const opts = display.displayOptions;

  const thicknessForCalc =
    adminState?.hpt?.T ??
    shotEditor?.slots?.[shotEditor?.activeSlot]?.draft?.hpt?.T ??
    shotEditor?.slots?.[shotEditor?.activeSlot]?.applied?.hpt?.T ??
    view?.ui?.display_options?.thickness ??
    0;

  /** 트랙은 슬롯 draft/applied SSOT 우선, 없으면 view JSON fallback. */
  const trackForAnchors =
    resolvedSlotSys?.track || view?.track || "B2T_L";

  const canonical = trackForAnchors;
  const rawSystemIdForGrid = resolvedSlotSys?.systemId ?? "5_half_system";
  const systemIdForGrid = canonicalSystemIdForConfig(rawSystemIdForGrid);

  baselineDraftDragContextRef.current = {
    canEndpointDraftDrag: () =>
      appMode === "ADMIN" &&
      showBaseLine &&
      systemIdForGrid === "5_half_system" &&
      !!trackForAnchors?.startsWith("B2T"),
    captureLabelSlotSnapshot: () =>
      captureBaselineLabelSlotSnapshot(baselineLabelSsotRef.current),
    snapCoPointerRg: (pointerRg) => {
      const rail = coDepartureRailForTrack(trackForAnchors);
      return projectPointToRail(pointerRg, rail);
    },
    snapC1PointerRg: (pointerRg) => {
      const rail = c1ArrivalRailForTrack(trackForAnchors);
      return projectPointToRail(pointerRg, rail);
    },
  };

  // USER/ADMIN 공통: slot SSOT anchors (display.anchors fallback when slot empty)
  const rawAnchors = (() => {
    if (!resolvedSlotSys) {
      if (appMode === "ADMIN") return {};
      return display?.anchors ?? {};
    }
    const sysValues = { ...resolvedSlotSysValues };
    console.log("[VERIFY 2] sysValues 생성 직후 (slot SSOT)", {
      activeSlot: shotEditor.activeSlot,
      resolvedSlotSys,
      "최종 sysValues": sysValues,
    });
    console.log("[SYS_COMPARE]", {
      "view.ui.system.values (JSON 기준)": system?.values,
      sysValues,
    });
    const rawSystemId = resolvedSlotSys?.systemId ?? "5_half_system";
    const systemId = rawSystemId === "5_HALF" ? "5_half_system" : rawSystemId;

    // [VERIFY 3] getAnchorsForRendering 호출 직전
    console.log("[VERIFY 3] getAnchorsForRendering 호출 직전", {
      activeSlot: shotEditor.activeSlot,
      systemId,
      "전달 sysValues": sysValues,
    });
    if (import.meta.env.DEV) {
      console.log("[ANCHOR_INPUT]", resolvedSlotSysValues);
    }
    const anchors = getAnchorsForRendering({
      systemId,
      track: trackForAnchors,
      sysValues,
      anchorsData: resolveAnchorsData(systemId),
      fallback: sysValuesToAnchors(sysValues),
    });
    // [VERIFY 3] getAnchorsForRendering 호출 직후 + [VERIFY 4] fallback 분기
    const anchorKeys = Object.keys(anchors);
    const usedFallback = anchorKeys.length === 0;
    console.log("[VERIFY 3] getAnchorsForRendering 호출 직후", {
      "반환 anchors 키": anchorKeys,
    });
    console.log("[VERIFY 4] anchors fallback 분기", {
      "Object.keys(anchors).length": anchorKeys.length,
      "display.anchors 존재": !!display?.anchors,
      "실제 반환": usedFallback ? "display.anchors (fallback)" : "anchors",
    });
    const finalAnchors = anchorKeys.length > 0 ? anchors : (display.anchors ?? {});
    if (Object.keys(finalAnchors || {}).length === 0) {
    }
    if (import.meta.env.DEV) {
      console.log("[ANCHORS]", finalAnchors["C3"]);
    }
    console.log("[ANCHOR_SPACE_TRACE] rawAnchors 최종", {
      keys: Object.keys(finalAnchors || {}),
      hasSpaceInfo: Object.values(finalAnchors || {}).some(
        (v) => v && typeof v === "object" && ("space" in v || "keyUsed" in v)
      ),
      sample: finalAnchors?.["C1"] ? { "C1": finalAnchors["C1"] } : null,
    });
    return finalAnchors;
  })();

  if (import.meta.env.DEV) {
    console.log("[RENDER_SSOT]", {
      appMode,
      canEdit,
      activeSlot: shotEditor.activeSlot,
      renderSource: resolvedSlotSys ? "slot" : "display.fallback",
      hasSlotRenderSys: !!slotRenderSys,
      hasResolvedSlotSys: !!resolvedSlotSys,
      resolvedSlotSysValuesKeyCount: Object.keys(resolvedSlotSysValues || {}).length,
      corrections: slotRenderSys?.corrections,
      shotType: slotRenderSys?.shotType,
    });
  }

  const rawAnchorsBase =
    resolvedSlotSys && resolvedSlotBaseSysValues
      ? (() => {
          const sysValues = { ...resolvedSlotBaseSysValues };
          const rawSystemId = resolvedSlotSys?.systemId ?? "5_half_system";
          const systemId = rawSystemId === "5_HALF" ? "5_half_system" : rawSystemId;
          const ab = getAnchorsForRendering({
            systemId,
            track: trackForAnchors,
            sysValues,
            anchorsData: resolveAnchorsData(systemId),
            fallback: sysValuesToAnchors(sysValues),
          });
          const keys = Object.keys(ab);
          return keys.length > 0 ? ab : (display?.anchors ?? {});
        })()
      : null;

  // [ANCHOR_COMPARE] 정상(display.anchors) vs 계산(rawAnchors) — reflection 입력 비교
  console.log("[ANCHOR_COMPARE] display.anchors (정상 경로)", {
    CO: display?.anchors?.CO,
    "C1": display?.anchors?.["C1"],
    "C3": display?.anchors?.["C3"],
  });
  console.log("[ANCHOR_COMPARE] rawAnchors (계산 경로)", {
    CO: rawAnchors?.CO,
    "C1": rawAnchors?.["C1"],
    "C3": rawAnchors?.["C3"],
  });

  const strategy = display.strategy;

  // 자동 분리 알고리즘
  function autoSeparate(draggedBall, otherBalls, maxIterations = 3) {
    const MIN_DISTANCE = BALL_DIAMETER_RG;
    
    for (let iter = 0; iter < maxIterations; iter++) {
      let hasOverlap = false;
      
      otherBalls.forEach(other => {
        const dx = draggedBall.x - other.x;
        const dy = draggedBall.y - other.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < MIN_DISTANCE) {
          hasOverlap = true;
          
          // dist=0 가드 (1e-3만큼만 이동)
          if (dist < 1e-6) {
            draggedBall.x += 1e-3;
          } else {
            const overlap = MIN_DISTANCE - dist;
            const angle = Math.atan2(dy, dx);
            draggedBall.x += Math.cos(angle) * overlap;
            draggedBall.y += Math.sin(angle) * overlap;
          }
        }
      });
      
      draggedBall.x = clamp(draggedBall.x, 0.5, 79.5);
      draggedBall.y = clamp(draggedBall.y, 0.5, 39.5);
      
      if (!hasOverlap) return true;
    }
    
    return false;
  }
  
  // 드래그 핸들러
// 드래그/선택 핸들러

/**
 * P0-4f: baseline 라벨 숫자 — 슬롯 SSOT 우선, 드래그 중·Apply 대기 preview만 draft.
 */
function resolveBaselineLabelOverrideValue(
  mark,
  draftVal,
  slotVal,
  { draggingMark, activeMark, snapshotVal }
) {
  if (
    draggingMark === mark &&
    draftVal != null &&
    Number.isFinite(Number(draftVal))
  ) {
    return Number(draftVal);
  }
  const slotN =
    slotVal != null && Number.isFinite(Number(slotVal)) ? Number(slotVal) : null;
  const draftN =
    draftVal != null && Number.isFinite(Number(draftVal)) ? Number(draftVal) : null;
  const snapN =
    snapshotVal != null && Number.isFinite(Number(snapshotVal))
      ? Number(snapshotVal)
      : null;
  if (slotN != null) {
    const pendingPreview =
      activeMark === mark &&
      draftN != null &&
      snapN != null &&
      Math.abs(slotN - snapN) <= 1e-6 &&
      Math.abs(draftN - slotN) > 1e-6;
    if (pendingPreview) return draftN;
    return slotN;
  }
  return draftN;
}

function captureBaselineLabelSlotSnapshot(ssotValues) {
  return {
    CO_f: getLabelNumericSuffix("CO", ssotValues),
    C1_f: getLabelNumericSuffix("C1", ssotValues),
  };
}

function handlePointerDown(e) {
  // ✅ GUARD: 오버레이 열려있으면 SVG 이벤트 차단
  if (overlayState.open) return;

  if (!svgRef.current) return;
  const pointerRgEarly = pointerToRg(e, svgRef.current, SCALE, TABLE_H, PADDING);

  // Priority: Extension Handle → C2 Handle → Baseline Handle → Joystick → Ball
  if (
    pointerRgEarly &&
    tryStartExtensionHandleDrag(
      e,
      pointerRgEarly,
      extensionHandleRgRef.current[1],
      extensionHandleRgRef.current[2]
    )
  ) {
    return;
  }

  if (
    pointerRgEarly &&
    tryStartC2HandleDrag(e, pointerRgEarly, c2HandleRgRef.current)
  ) {
    return;
  }

  if (
    pointerRgEarly &&
    tryStartBaselineEndpointDraftDrag(
      e,
      pointerRgEarly,
      baselineDraftState.coRg ?? baselineCoHandleRgRef.current,
      baselineDraftState.c1Rg ?? baselineC1HandleRgRef.current
    )
  ) {
    console.log("[BASELINE SVG POINTERDOWN]", "baseline drag captured", {
      pointerId: e.pointerId,
      target: e.target?.nodeName,
    });
    return;
  }

  // ✅ Joystick: 좌표 Hit Radius 판정 (Interaction SSOT).
  // DOM(closest) 비의존 — 위에 label/overlay 레이어가 덮여도 pad drag가 유지된다.
  // Pad 밖이면 ball hit-test로 진행:
  //   hit another/same ball → switch/reselect immediately
  //   miss (empty space) → clear selection below
  if (
    dragState.joystickVisible &&
    dragState.ballId &&
    isPointerOnJoystick(
      pointerRgEarly,
      balls[dragState.ballId],
      BALL_RADIUS_RG,
      SCALE
    )
  ) {
    beginJoyDrag(e, dragState.ballId, svgRef.current);
    return;
  }

  // USER 정보 오버레이(AI/HPT/CALC)는 별도 DOM 레이어다.
  // 표시 중에도 볼 선택/조이스틱/이동은 항상 허용한다 (Interaction 비차단).
  if (!svgRef.current) return;

  const pointerRg = pointerToRg(e, svgRef.current, SCALE, TABLE_H, PADDING);
  if (!pointerRg) return;

  // hit-test: Interaction SSOT (BALL_PICK_RADIUS_RG) — render size unchanged
  let closestBall = null;
  let minDist = Infinity;

  for (const [ballId, ballPos] of Object.entries(balls)) {
    if (!ballPos) continue;
    
    // ⭐ impact 드래그 조건
    if (ballId === "impact") {
      // USER 모드: 임펙트볼 드래그 완전 금지
      if (appMode === "USER") continue;
      // ADMIN 모드: FREE 모드일 때만 드래그 가능
      if (impactMode !== "FREE") continue;
    }
    
    const dx = pointerRg.x - ballPos.x;
    const dy = pointerRg.y - ballPos.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= BALL_PICK_RADIUS_RG && dist < minDist) {
      minDist = dist;
      closestBall = { id: ballId, pos: ballPos };
    }
  }

  // Empty space: clear selection only when a ball was already selected
  if (!closestBall) {
    if (dragState.joystickVisible) {
      stopJoystick();
      joyDragRef.current = {
        active: false,
        pointerId: null,
        lastX: 0,
        lastY: 0,
        ballId: null,
      };
      ballDragLastPointerRgRef.current = null;
      setDragState((s) => ({
        ...s,
        dragging: false,
        ballId: null,
        grabOffsetRg: { x: 0, y: 0 },
        previousPosRg: null,
        joystickVisible: false,
        frozenImpact: null,
        frozenCushionPathAttr: null,
        frozenCushionPathRg: null,
      }));
    }
    return;
  }

  // Ball hit: select / switch immediately (one-touch ball→ball)
  if (dragState.joystickVisible) {
    stopJoystick();
  }
  joyDragRef.current = {
    active: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    ballId: null,
  };

  const grabOffset = {
    x: pointerRg.x - closestBall.pos.x,
    y: pointerRg.y - closestBall.pos.y,
  };

  ballDragLastPointerRgRef.current = { x: pointerRg.x, y: pointerRg.y };

  setDragState((s) => ({
    ...s,
    dragging: true,
    ballId: closestBall.id,
    grabOffsetRg: grabOffset,
    previousPosRg: { ...closestBall.pos },
    joystickVisible: true,

    // Freeze: 드래그 시작 시점의 파생 결과 저장
    frozenImpact: derivedRef.current.impact,
    frozenCushionPathAttr: derivedRef.current.cushionPathAttr,
    frozenCushionPathRg: derivedRef.current.cushionPathRg,
  }));

  // Pointer Capture는 여기서 걸지 않는다 — handlePointerMove의 실제 Drag 시작 시점으로 이동.
  // pointerdown에서 캡처하면 두 번째 click의 native dblclick target이
  // Ball <circle>에서 table SVG로 바뀌어 Ball.onDoubleClick이 끊긴다.
}

function handlePointerMove(e) {
  // ✅ GUARD: 오버레이 열려있으면 SVG 이벤트 차단
  if (overlayState.open) return;

  // Joystick drag가 table SVG에서 시작된 경우 (pad DOM이 가려진 모바일 경로)
  if (isJoyDragPointer(e)) {
    applyJoyDragMove(e);
    return;
  }

  if (svgRef.current) {
    const pointerRg = pointerToRg(e, svgRef.current, SCALE, TABLE_H, PADDING);
    if (handleC2PointerMove(pointerRg)) {
      return;
    }
    if (handleBaselineDraftPointerMove(pointerRg)) {
      return;
    }
    if (handleExtensionHandlePointerMove(pointerRg)) {
      return;
    }
  }

  if (!dragState.dragging || !dragState.ballId || !svgRef.current) return;

  const pointerRg = pointerToRg(e, svgRef.current, SCALE, TABLE_H, PADDING);
  if (!pointerRg) return;

  const lastRg = ballDragLastPointerRgRef.current;
  if (!lastRg) {
    ballDragLastPointerRgRef.current = { x: pointerRg.x, y: pointerRg.y };
    return;
  }

  // 실제 Drag가 시작된 시점에만 캡처한다 (click/dblclick target 보존).
  if (svgRef.current && !svgRef.current.hasPointerCapture(e.pointerId)) {
    try {
      svgRef.current.setPointerCapture(e.pointerId);
    } catch {
      // pointer가 이미 해제된 경우 캡처 없이 드래그를 계속한다.
    }
  }

  const deltaRg = {
    x: pointerRg.x - lastRg.x,
    y: pointerRg.y - lastRg.y,
  };
  ballDragLastPointerRgRef.current = { x: pointerRg.x, y: pointerRg.y };

  const dragSpeedScale = e.ctrlKey ? 0.2 : e.shiftKey ? 1.5 : 1.0;
  const scaledDx = deltaRg.x * dragSpeedScale;
  const scaledDy = deltaRg.y * dragSpeedScale;

  let minX = 0.5;
  let maxX = 79.5;
  let minY = 0.5;
  let maxY = 39.5;
  if (dragState.ballId === "impact" && impactMode === "FREE") {
    minX = -CUSHION_RG;
    maxX = 80 + CUSHION_RG;
    minY = -CUSHION_RG;
    maxY = 40 + CUSHION_RG;
  }

  if (dragState.ballId === "impact" && impactMode === "FREE") {
    let thicknessCue = null;
    let thicknessTarget = null;
    let nextImpactForThickness = null;

    setBallsState((prev) => {
      const cue = prev.cue;
      const target =
        resolveImpactTargetBall(prev, targetColor) ??
        prev.target_center ??
        prev.target;

      if (!cue || !target) return prev;

      const cur =
        prev.impact ??
        calcImpactBall(cue, target, adminState?.hpt?.T ?? "8/8");
      if (
        !cur ||
        !Number.isFinite(cur.x) ||
        !Number.isFinite(cur.y)
      ) {
        return prev;
      }

      let nextImpact = {
        x: clamp(cur.x + scaledDx, minX, maxX),
        y: clamp(cur.y + scaledDy, minY, maxY),
      };

      const snap = snapImpactToOrbit(
        target,
        nextImpact,
        cue,
        PHYSICS_SCALE,
        1.0
      );

      if (snap?.snapped) {
        nextImpact = snap.impactBall;
      }

      thicknessCue = cue;
      thicknessTarget = target;
      nextImpactForThickness = nextImpact;

      return {
        ...prev,
        impact: nextImpact,
      };
    });

    if (
      thicknessCue &&
      thicknessTarget &&
      nextImpactForThickness &&
      canEdit
    ) {
      const thicknessInfo = computeThicknessFromImpact(
        thicknessCue,
        thicknessTarget,
        nextImpactForThickness,
        PHYSICS_SCALE
      );

      if (thicknessInfo) {
        if (systemCtrl && typeof systemCtrl.onChangeT === "function") {
          systemCtrl.onChangeT(thicknessInfo.legacyT);
        }
        if (systemCtrl && typeof systemCtrl.onChangeThickness === "function") {
          systemCtrl.onChangeThickness(
            thicknessInfo.displayThickness,
            thicknessInfo.side
          );
        }
      }
    }

    return;
  }

  setBallsState((prev) => {
    const cur = prev?.[dragState.ballId];
    if (!cur) return prev;
    return {
      ...prev,
      [dragState.ballId]: {
        ...cur,
        x: clamp(cur.x + scaledDx, minX, maxX),
        y: clamp(cur.y + scaledDy, minY, maxY),
      },
    };
  });
}

function handlePointerUp(e) {
  // ✅ GUARD: 오버레이 열려있으면 SVG 이벤트 차단
  if (overlayState.open) return;

  if (isJoyDragPointer(e)) {
    endJoyDrag(e, svgRef.current);
    return;
  }

  if (endC2HandleDrag(e)) return;
  if (endCoBaselineDraftDrag(e)) return;
  if (endC1BaselineDraftDrag(e)) return;
  if (endExtensionHandleDrag(e)) return;

  if (!dragState.dragging || !dragState.ballId) return;
  stopJoystick();

  const draggedBall = { ...balls[dragState.ballId] };
  const otherBalls = Object.entries(balls)
    .filter(([id]) => id !== dragState.ballId)
    .map(([, pos]) => pos);

  const success = autoSeparate(draggedBall, otherBalls);

  let nextBallPos = success ? draggedBall : dragState.previousPosRg;

  if (success) {
    setBallsState((prev) => ({
      ...prev,
      [dragState.ballId]: nextBallPos,
    }));
  } else if (dragState.previousPosRg) {
    setBallsState((prev) => ({
      ...prev,
      [dragState.ballId]: dragState.previousPosRg,
    }));
  }

  if (
    ["cue", "target", "target_center", "second", "impact"].includes(
      dragState.ballId
    )
  ) {
    setIsSaved(false);
    setIsAdminPublishedSearchMatched(false);
    // targetColor / isTargetSelected: pointerUp에서 건드리지 않음 (조이스틱=후보, Target으로만 확정/무효화는 뷰/복원 등에서)
  }

  // CAL-006 → ballDragFlow.runBallDrag
  runBallDrag({
    canEdit,
    isAdminInputSessionActive,
    ballId: dragState.ballId,
    nextBallPos,
    balls,
    setAdminState,
  });

  // 드래그는 종료하되, 선택/조이스틱은 유지 (바깥 탭으로 닫기)
  ballDragLastPointerRgRef.current = null;

  setDragState((s) => ({
    ...s,
    dragging: false,
    grabOffsetRg: { x: 0, y: 0 },
    previousPosRg: null,
    frozenImpact: null,
    frozenCushionPathAttr: null,
    frozenCushionPathRg: null,
  }));

  if (svgRef.current) {
    try {
      svgRef.current.releasePointerCapture(e.pointerId);
    } catch {}
  }
}

function handlePointerCancel(e) {
  if (endC2HandleDrag(e)) return;
  if (endCoBaselineDraftDrag(e)) return;
  if (endC1BaselineDraftDrag(e)) return;
  if (endExtensionHandleDrag(e)) return;
  stopJoystick();
  // cancel은 드래그 종료로 처리
  handlePointerUp(e);
}

  // ---------------------------------------------------------------------------
  // Batch 5 Trajectory Integration (STEP 5-8)
  // Batch 6 STEP 6-2: Contract safety supply (D-009) before buildTrajectory
  // buildTrajectory → pathAttrModel → renderModel → baselineHandleModel → JSX
  // ---------------------------------------------------------------------------

  const systemRuntimeContract = getSystemContract(systemIdForGrid);
  const trajectoryContractView = systemRuntimeContract
    ? extractTrajectoryContractView(systemRuntimeContract)
    : null;

  if (trajectoryContractView) {
    supplyReflectionSafety(trajectoryContractView.reflectionSafety);
  }

  // RND-004(partial): buildRgAnchors (Batch 2 STEP 2-5)
  // Batch 6 STEP 6-4: offset_fg2rg from Contract (D-006/D-009 App supply)
  const override = adminState?.anchorsOverride ?? {};
  const profileForCanonical = trajectoryContractView
    ? {
        safety: {
          offset_fg2rg: trajectoryContractView.anchorConversion.offset_fg2rg,
        },
      }
    : {
        safety: {
          offset_fg2rg:
            getSystemContract(systemIdForGrid)?.profile?.safety?.offset_fg2rg ??
            null,
        },
      };
  const { anchors: anchorsBuilt, anchorsBase: anchorsBaseBuilt } = buildRgAnchors({
    rawAnchors,
    rawAnchorsBase,
    canonical,
    systemValues: system?.values,
    profileForCanonical,
    anchorsOverride: override,
  });

  // ADMIN C2 Reflection Override → anchors.C2 (skip Reflection when present)
  const c2OverridePoint =
    appMode === "ADMIN"
      ? reflectionOverrideToPoint(c2ReflectionOverride)
      : null;
  const anchors = c2OverridePoint
    ? { ...anchorsBuilt, C2: c2OverridePoint }
    : anchorsBuilt;
  const anchorsBase =
    c2OverridePoint && anchorsBaseBuilt
      ? { ...anchorsBaseBuilt, C2: c2OverridePoint }
      : anchorsBaseBuilt;

  const resolveAnchorCtx = {
    track: trackForAnchors,
    systemId: systemIdForGrid,
  };

  const HIT_TOLERANCE = Math.max(2, BALL_RADIUS_RG * 4);

  const currentTip = (() => {
    const hp = adminState?.hpt?.hit_point ?? adminState?.hpt?.hp;
    if (!hp || typeof hp.x !== "number" || typeof hp.y !== "number") return null;
    const side = hp.x >= 0 ? "R" : "L";
    const mode = adminState?.hpt?.mode ?? "TIP";
    if (mode === "TIP") {
      const count = Math.max(0, Math.min(4, Math.round(adminState?.hpt?.tipCount ?? 0)));
      return { count, side };
    }
    return { hp: { x: hp.x, y: hp.y }, side };
  })();

  // Snapshot for RI search → existing buildTrajectory DI (same fields as USER path).
  riTrajectoryContextRef.current = {
    anchors,
    anchorsBase,
    rawAnchors,
    resolveAnchorCtx,
    targetColor,
    adminState,
    currentTip,
    c2ManualHint,
    thicknessForCalc,
    shotPattern: view.pattern,
    hitTolerance: HIT_TOLERANCE,
    ballDiameterRg: BALL_DIAMETER_RG,
    ballRadiusRg: BALL_RADIUS_RG,
    curveEps: CURVE_EPS,
    baseSysValues: resolvedSlotBaseSysValues,
    displayCapOpts: c2OverridePoint ? { skipSameRail: true } : undefined,
  };

  const trajectoryBuild = buildTrajectory({
    anchors,
    anchorsBase,
    rawAnchors,
    resolveAnchorCtx,
    balls,
    targetColor,
    slotRenderSys,
    adminState,
    currentTip,
    c2ManualHint,
    thicknessForCalc,
    shotPattern: view.pattern,
    hitTolerance: HIT_TOLERANCE,
    ballDiameterRg: BALL_DIAMETER_RG,
    ballRadiusRg: BALL_RADIUS_RG,
    curveEps: CURVE_EPS,
    baseSysValues: resolvedSlotBaseSysValues,
    displayCapOpts: c2OverridePoint ? { skipSameRail: true } : undefined,
  });

  const {
    corrected: {
      pathNodes: correctedPathNodes,
      cushionPath,
      cushionPathForRender,
      cap: capCorrected,
      coLine,
      c1Line,
      useCurveDeform,
    },
    baseline,
    handles,
    impact: { raw: impactRaw, contactRg: impactContactRg },
    labels: { anchorSources },
    meta: {
      coPrep: CO_prep,
      c1Prep: C1_prep,
      coRail: CO_rail,
      c1Rail,
      reflectedDiagnostics,
    },
  } = trajectoryBuild;

  const CO_line = coLine;
  const C1_line = c1Line;

  if (reflectedDiagnostics && canEdit) {
    console.log("🔷 C2 reflection fallback:", reflectedDiagnostics);
  }

  const impact = dragState.dragging ? dragState.frozenImpact : impactRaw;

  console.log("🔷 레일 교점:", {
    "CO_prep (의미점)": CO_prep,
    "C1_prep (의미점)": C1_prep,
    "CO_rail": CO_rail,
    CO_path0: CO_line,
    "C1_rail (SSOT)": C1_line,
  });

  const capBaseline = baseline?.cap ?? capCorrected;
  const cushionPathBaselineRg = baseline?.cushionPath ?? null;

  const tablePxConfig = { scale: SCALE, tableH: TABLE_H, padding: PADDING };
  const pathAttrModel = buildTrajectoryPathAttrModel(
    trajectoryBuild,
    tablePxConfig
  );
  const cushionPathAttrRaw = pathAttrModel.cushionPathAttrRaw;
  const cushionPathAttrBase = pathAttrModel.cushionPathAttrBase;

  // --- Trajectory Extension Proposal (P2 overlay; Calculated Trajectory untouched) ---
  const extensionOriginGate = resolveOrigin(correctedPathNodes ?? [], {
    kind: "path_node",
    source: "corrected",
  });
  const extensionDraftCount = draftItemCount(trajectoryExtensionDraft);
  const extensionSegments = resolveDraftSegments(
    trajectoryExtensionDraft,
    correctedPathNodes ?? []
  );
  extensionPathNodesRef.current = correctedPathNodes ?? [];
  extensionSegmentsRef.current = extensionSegments;
  extensionHandleRgRef.current = {
    1: extensionSegments.find((s) => s.index === 1)?.end ?? null,
    2: extensionSegments.find((s) => s.index === 2)?.end ?? null,
  };
  const extensionRevealPath =
    extensionDraftCount > 0 && extensionOriginGate
      ? buildRevealPathNodes(
          correctedPathNodes ?? [],
          capCorrected?.endIndex ?? -1,
          extensionOriginGate.index
        )
      : [];
  // Nearest Projection candidates: displayed Calculated + Reveal + Extension only
  projectionSegmentsRef.current = collectDisplayProjectionSegments({
    calculatedPath: pathAttrModel.cushionPathRgSnapshot,
    revealPath: extensionRevealPath,
    extensionSegments,
  });
  const extensionRenderModel = buildTrajectoryExtensionRenderModel({
    revealPath: extensionRevealPath,
    segments: extensionSegments,
    tablePx: tablePxConfig,
    activeHandleMark: extensionActiveHandle,
    draggingHandleMark: extensionDraggingMark,
    showHandles: canEdit,
  });
  const canClickTrajectoryExtension =
    canEdit &&
    canAddAnotherExtension(trajectoryExtensionDraft) &&
    (extensionDraftCount === 1 ||
      canCreateExtensionFromOrigin(extensionOriginGate));

  const handleTrajectoryExtensionClick = () => {
    if (!canClickTrajectoryExtension) return;
    hideBallPositionController();
    const slotId = shotEditor.activeSlot ?? "S1";
    const nodes = correctedPathNodes ?? [];
    if (extensionDraftCount === 0) {
      const next = appendExtension1Draft(nodes, slotId);
      if (next) {
        setTrajectoryExtensionDraft(next);
        setExtensionActiveHandle(1);
      }
      return;
    }
    if (extensionDraftCount === 1 && trajectoryExtensionDraft) {
      const next = appendExtension2Draft(
        trajectoryExtensionDraft,
        nodes,
        slotId
      );
      if (next) {
        setTrajectoryExtensionDraft(next);
        setExtensionActiveHandle(2);
      }
    }
  };

  // 최신 파생 결과를 ref에 보관 (pointerdown에서 Freeze 캡처용)
  derivedRef.current = {
    impact: impactRaw,
    cushionPathAttr: cushionPathAttrRaw,
    cushionPathRg: pathAttrModel.cushionPathRgSnapshot,
  };

  const cushionPathAttr = dragState.dragging
    ? dragState.frozenCushionPathAttr || cushionPathAttrRaw
    : cushionPathAttrRaw;

  const cushionPathForImpactLines = useCurveDeform
    ? cushionPathForRender
    : dragState.dragging && dragState.frozenCushionPathRg
      ? dragState.frozenCushionPathRg
      : cushionPathForRender;


  baselineCoHandleRgRef.current = handles.coRg;
  baselineC1HandleRgRef.current = handles.c1Rg;

  let effectiveCushionPathBaselineRg = cushionPathBaselineRg;
  if (
    Array.isArray(effectiveCushionPathBaselineRg) &&
    effectiveCushionPathBaselineRg.length >= 2
  ) {
    if (baselineDraftState.coRg) {
      effectiveCushionPathBaselineRg = [
        baselineDraftState.coRg,
        ...effectiveCushionPathBaselineRg.slice(1),
      ];
    }
    if (baselineDraftState.c1Rg) {
      effectiveCushionPathBaselineRg = [
        effectiveCushionPathBaselineRg[0],
        baselineDraftState.c1Rg,
        ...effectiveCushionPathBaselineRg.slice(2),
      ];
    }
  }

  const useBaselineLabelAnchors =
    appMode === "USER"
      ? userDisplayFlags?.labelAnchorSource === "baseline"
      : showBaseLine;
  const trajectoryRenderModel = buildTrajectoryRenderModel({
    labelStrategy:
      trajectoryContractView?.render.labelStrategy ?? "anchor_ssot",
    useBaselineLabelAnchors,
    cushionPathBaselineRg,
    capBaseline,
    capCorrected,
  });
  const { activeDisplayCap, visibleKeysForLabels, labelStrategy } =
    trajectoryRenderModel;
  if (import.meta.env.DEV && userDisplayModeActive) {
    console.log("[TRAJ_DISPLAY_CAP]", {
      mode: useBaselineLabelAnchors ? "baseline" : "corrected",
      capCorrected,
      capBaseline,
      activeDisplayCap,
      visibleKeysForLabels,
    });
  }

  // SystemValueLabels는 data.coord.{x,y}를 기대. anchorLookupEngine 형태 { coord, valueSpace }는 그대로 두고, plain {x,y}(예: reflection C2)만 감싼다. 좌표 숫자는 변경하지 않음.
  const labelPayload = (anchorOrPoint) => {
    if (anchorOrPoint == null) return null;
    if (
      typeof anchorOrPoint === "object" &&
      anchorOrPoint.coord != null &&
      typeof anchorOrPoint.coord === "object" &&
      Number.isFinite(anchorOrPoint.coord.x) &&
      Number.isFinite(anchorOrPoint.coord.y)
    ) {
      return anchorOrPoint;
    }
    if (
      typeof anchorOrPoint === "object" &&
      Number.isFinite(anchorOrPoint.x) &&
      Number.isFinite(anchorOrPoint.y)
    ) {
      return { coord: { x: anchorOrPoint.x, y: anchorOrPoint.y } };
    }
    return null;
  };

  // 노란점(라벨): resolveAnchorPoint·anchor 원본 좌표 유지 (FG/RG 변환 없음). 궤적은 cushionPath·computeRailImpactPoint 쪽에서 레일 교점 유지.
  const blKeysForLabels = ["CO", "C1", "C2", "C3"];
  const labelPathRgForAnchors =
    effectiveCushionPathBaselineRg ?? cushionPathBaselineRg;
  const fromBaselinePath =
    useBaselineLabelAnchors &&
    labelPathRgForAnchors &&
    labelPathRgForAnchors.length > 0 &&
    anchorsBase
      ? Object.fromEntries(
          blKeysForLabels
            .map((k, i) => {
              const pt = labelPathRgForAnchors[i];
              if (pt == null || !Number.isFinite(pt.x) || !Number.isFinite(pt.y))
                return [k, null];
              return [k, { coord: { x: pt.x, y: pt.y } }];
            })
            .filter(([, v]) => v != null)
        )
      : null;
  const allAnchors = {
    CO:
      (baselineDraftState.coRg
        ? {
            coord: {
              x: baselineDraftState.coRg.x,
              y: baselineDraftState.coRg.y,
            },
          }
        : null) ??
      (fromBaselinePath && fromBaselinePath.CO) ??
      labelPayload(override.CO) ??
      anchorSources.CO,
    "C1":
      (baselineDraftState.c1Rg
        ? {
            coord: {
              x: baselineDraftState.c1Rg.x,
              y: baselineDraftState.c1Rg.y,
            },
          }
        : null) ??
      (fromBaselinePath && fromBaselinePath["C1"]) ??
      anchorSources.C1,
    "C2":
      (fromBaselinePath && fromBaselinePath["C2"]) ?? anchorSources["C2"],
    "C3":
      (fromBaselinePath && fromBaselinePath["C3"]) ?? anchorSources["C3"],
    "C4":
      labelPayload(useBaselineLabelAnchors && anchorsBase ? anchorsBase["C4"] : anchorSources["C4"]),
    "C5":
      labelPayload(useBaselineLabelAnchors && anchorsBase ? anchorsBase["C5"] : anchorSources["C5"]),
    "C6":
      labelPayload(useBaselineLabelAnchors && anchorsBase ? anchorsBase["C6"] : anchorSources["C6"]),
  };
  const trackAnchorItems =
    resolveAnchorsData(systemIdForGrid)?.trajectories?.[trackForAnchors]
      ?.anchors ?? [];
  console.log("[ANCHOR_BEFORE_RENDER]", {
    stage: "App:allAnchors",
    rawAnchors,
    anchorsAfterCanonical: anchors,
    allAnchors,
    trackForAnchors,
    systemIdForGrid,
  });
  // RND-002: buildSystemAxisLabelModel (Batch 2 STEP 2-5)
  const { labelAnchorsForRender, allAnchorsForLabels } = buildSystemAxisLabelModel({
    appMode,
    userAxisGridLabelsActive,
    visibleKeysForLabels,
    trackAnchorItems,
    allAnchors,
  });
  console.log("[LABEL_VISIBILITY_TRACE]", {
    cushionPathLength: cushionPath.length,
    visibleKeysForLabels,
    allAnchorsKeys: Object.keys(allAnchors),
    passedToLabels: Object.keys(allAnchorsForLabels),
    rawAllAnchors: allAnchors
  });
  console.log("LABEL_INPUT_CO", allAnchorsForLabels["CO"]);
  const renderSystemValues =
    resolvedSlotSysValues && Object.keys(resolvedSlotSysValues).length > 0
      ? { values: resolvedSlotSysValues }
      : system;
  const strategyResult = buildRailGroupedStrategy({
    strategy,
    systemValues: renderSystemValues,
    anchors,
    lastCushion: view.last_cushion,
  });
  const railGroups = strategyResult.railGroups;

  const canEditPosition = true;

  /** USER: 공략 선택 후 시스템이 결정한 타겟만 설명용 하이라이트 */
  const userSystemTargetHighlight =
    appMode === "USER" &&
    !!userTableDisplaySlotId &&
    (targetColor === "red" || targetColor === "yellow");

  function ballTargetEmphasis(ballId) {
    if (appMode === "USER") {
      return userSystemTargetHighlight &&
        isConfirmedTargetBall(ballId, targetColor, true)
        ? "selected"
        : undefined;
    }
    return canEditPosition &&
      isConfirmedTargetBall(ballId, targetColor, isTargetSelected)
      ? "selected"
      : undefined;
  }

  const slotSysValuesForRender =
    resolvedSlotSysValues && Object.keys(resolvedSlotSysValues).length > 0
      ? resolvedSlotSysValues
      : (system?.values ?? {});
  const useBaselineLabelValues =
    appMode === "USER"
      ? userDisplayFlags?.labelValueSource === "baseline"
      : showBaseLine;
  const systemValuesForLabels =
    useBaselineLabelValues &&
    resolvedSlotBaseSysValues &&
    typeof resolvedSlotBaseSysValues === "object" &&
    Object.keys(resolvedSlotBaseSysValues).length > 0
      ? resolvedSlotBaseSysValues
      : slotSysValuesForRender;
  baselineLabelSsotRef.current = systemValuesForLabels;
  const baselineLabelValueOverrides = (() => {
    if (appMode !== "ADMIN" || !showBaseLine) return null;
    const overrides = {};
    const { activeMark } = baselineDraftState;

    const hasCoPending =
      activeMark === "CO" &&
      baselineDraftState.coRg != null &&
      Number.isFinite(baselineDraftState.coRg.x);
    const hasC1Pending =
      activeMark === "C1" &&
      baselineDraftState.c1Rg != null &&
      Number.isFinite(baselineDraftState.c1Rg.x);

    if (hasCoPending) {
      overrides.CO = { preview: true, checkOnly: true };
    }
    if (hasC1Pending) {
      overrides.C1 = { preview: true, checkOnly: true };
    }

    return Object.keys(overrides).length > 0 ? overrides : null;
  })();
  const userShowCorrectedPath =
    appMode === "USER"
      ? userDisplayFlags?.showCorrectedPath ?? true
      : !showBaseLine;
  const userShowBaselinePath =
    appMode === "USER" ? !!userDisplayFlags?.showBaselinePath : showBaseLine;
  const userShowBaselineReferenceOverlay =
    appMode === "USER" && !!userDisplayFlags?.showBaselineReferenceOverlay;
  const userShowTrajectoryOnTable =
    appMode !== "USER" || !!userDisplayFlags?.showTrajectoryOnTable;
  const userShowTrajectoryLabels =
    appMode !== "USER" || !!userDisplayFlags?.showTrajectoryLabels;
  const userShowSystemValuesOnly = userSystemValuesModeActive;
  const impactShowBaseLineOnly =
    appMode === "USER"
      ? userShowBaselinePath && !userShowCorrectedPath
      : showBaseLine;

  const cushionPathForTableImpact =
    !userShowTrajectoryOnTable
      ? []
      : userShowCorrectedPath
        ? cushionPathForImpactLines
        : userShowBaselinePath &&
            Array.isArray(effectiveCushionPathBaselineRg) &&
            effectiveCushionPathBaselineRg.length >= 2
          ? effectiveCushionPathBaselineRg
          : cushionPathForImpactLines;
  const curveDeformActiveForImpact =
    userShowTrajectoryOnTable && userShowCorrectedPath ? useCurveDeform : false;

  /** Phase 2A: Overlay Attach/Visibility — Runtime draft 유지, mount만 제어 */
  const extensionOverlayActiveBranch =
    appMode === "USER" && userShowBaselinePath && !userShowCorrectedPath
      ? "baseline"
      : "corrected";
  const extensionOverlayVisibility = resolveTrajectoryExtensionOverlayVisibility({
    appMode,
    activeBranch: extensionOverlayActiveBranch,
    extensionDraftCount,
    canEdit,
    // CASE A: Continuation Phase에서 true로 확장. Phase 2A는 USER baseline 기본 미부착.
    baselineContinuationAllowed: false,
    baselineCap: capBaseline ?? null,
  });

  const userCalculationDisplayBlock =
    appMode === "USER" &&
    (userDisplayFlags?.showTrajectoryInfoCard || overlayContent === "CALC")
      ? (() => {
          const systemId = canonicalSystemIdForConfig(
            resolvedSlotSys?.systemId ??
              slotRenderSys?.systemId ??
              slotRenderSys?.system_id ??
              slotRenderSys?.system ??
              "5_half_system"
          );
          const corrections = slotRenderSys?.corrections ?? {};
          const { slide, draw } = normalizeSlideDrawCorrections(corrections);
          const unifiedSlide = unifiedSlideFromCorrections({ ...corrections, slide, draw });
          const angleTilt = Number(corrections.curve_ratio) || 0;
          const spin = Number(corrections.spin) || 0;
          const departure = Number(corrections.departure) || 0;
          const useSn = getSysUseSn(systemId);
          // Admin path parity: resolveCoC1C3Keys(forced, spaceSel)
          const spaceSel = slotRenderSys?.spaceSel ?? {
            CO: "f",
            C1: "f",
            C2: "f",
            C3: "f",
            C4: "f",
          };
          const expr =
            getSystemContract(systemId)?.profile?.formulaExpr ?? "";
          const { forced } = parseSysFormulaExpr(expr);
          const { coKey, c1Key, c3Key } = resolveCoC1C3Keys(forced, spaceSel);
          const baseCo = Number(resolvedSlotBaseSysValues?.[coKey]);
          const baseC1 = Number(resolvedSlotBaseSysValues?.[c1Key]);
          const baseC3 = Number(resolvedSlotBaseSysValues?.[c3Key]);
          const effCo = Number(resolvedSlotSysValues?.[coKey]);
          const effC3 = Number(resolvedSlotSysValues?.[c3Key]);
          const hasCorrection =
            unifiedSlide !== 0 ||
            angleTilt !== 0 ||
            spin !== 0 ||
            (!useSn && Math.abs(departure) > 1e-9);

          const displayModel = buildSysCalcDisplayModel({
            systemId,
            hasAllInputs:
              !!userTableDisplaySlotId &&
              (isFiveHalfSystemId(systemId)
                ? [baseCo, baseC1, baseC3].filter((v) => Number.isFinite(v)).length >= 2
                : true),
            useSn,
            baseCo: Number.isFinite(baseCo) ? baseCo : null,
            baseC1: Number.isFinite(baseC1) ? baseC1 : null,
            baseC3: Number.isFinite(baseC3) ? baseC3 : null,
            effCo: Number.isFinite(effCo) ? effCo : null,
            effC3: Number.isFinite(effC3) ? effC3 : null,
            unifiedSlide,
            angleTilt,
            spin,
            hasCorrection,
          });

          return (
            displayModel.blocks.find(
              (block) =>
                block.id ===
                  (trajectoryCardSource === "baseline" ? "baseline" : "corrected") &&
                block.visible
            ) ?? null
          );
        })()
      : null;

  const baselineHandleContract = trajectoryContractView?.baselineHandle ?? {
    enabled: false,
    requireTrackPrefix: null,
  };
  const baselineHandleTrackAllowed =
    baselineHandleContract.requireTrackPrefix == null ||
    baselineHandleContract.requireTrackPrefix === "" ||
    (typeof trackForAnchors === "string" &&
      trackForAnchors.startsWith(baselineHandleContract.requireTrackPrefix));
  const baselineHandleModel = buildBaselineHandleModel(
    trajectoryBuild,
    {
      appMode,
      showBaseLine,
      draftCoRg: baselineDraftState.coRg,
      draftC1Rg: baselineDraftState.c1Rg,
      draggingMark: baselineDraftState.draggingMark,
    },
    tablePxConfig,
    {
      enabled:
        baselineHandleContract.enabled && baselineHandleTrackAllowed,
    }
  );

  const coBaselineHandleNode = baselineHandleModel.co ? (
    <g
      className={baselineHandleModel.co.className}
      data-co-baseline-handle="1"
      pointerEvents="none"
    >
      <circle
        cx={baselineHandleModel.co.cx}
        cy={baselineHandleModel.co.cy}
        r={baselineHandleModel.co.r}
        fill={baselineHandleModel.co.fill}
        stroke={baselineHandleModel.co.stroke}
        strokeWidth={baselineHandleModel.co.strokeWidth}
        opacity={baselineHandleModel.co.opacity}
      />
    </g>
  ) : null;

  const c1BaselineHandleNode = baselineHandleModel.c1 ? (
    <g
      className={baselineHandleModel.c1.className}
      data-c1-baseline-handle="1"
      pointerEvents="none"
    >
      <circle
        cx={baselineHandleModel.c1.cx}
        cy={baselineHandleModel.c1.cy}
        r={baselineHandleModel.c1.r}
        fill={baselineHandleModel.c1.fill}
        stroke={baselineHandleModel.c1.stroke}
        strokeWidth={baselineHandleModel.c1.strokeWidth}
        opacity={baselineHandleModel.c1.opacity}
      />
    </g>
  ) : null;

  // ADMIN C2 rail handle — pathNodes[2] (override or reflected)
  const c2PathRg = (() => {
    const n = correctedPathNodes?.[2];
    if (n && Number.isFinite(n.x) && Number.isFinite(n.y)) return n;
    return c2OverridePoint;
  })();
  c2HandleRgRef.current = c2PathRg ?? null;
  const c2HandleModel = buildC2HandleModel(
    {
      appMode,
      c2Rg: c2PathRg,
      dragging: c2HandleDragging,
    },
    tablePxConfig
  );
  const c2RailHandleNode = c2HandleModel ? (
    <g
      className={c2HandleModel.className}
      data-c2-rail-handle="1"
      pointerEvents="none"
      style={{ cursor: "pointer" }}
    >
      <circle
        cx={c2HandleModel.cx}
        cy={c2HandleModel.cy}
        r={c2HandleModel.r}
        fill={c2HandleModel.fill}
        stroke={c2HandleModel.stroke}
        strokeWidth={c2HandleModel.strokeWidth}
        opacity={c2HandleModel.opacity}
      />
    </g>
  ) : null;

  // ✅ 정보 버튼 클릭 핸들러 (토글 + 즉시 전환)


  const tableSVG = (
    <svg
      ref={svgRef}
      className="table-svg"
      overflow="visible"
      viewBox={`0 0 ${TABLE_W + 2 * PADDING} ${TABLE_H + 2 * PADDING}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ touchAction: "none", overflow: "visible" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <RailFrame />
      <TableGrid />
      {coBaselineHandleNode}
      {c1BaselineHandleNode}
      {c2RailHandleNode}
      {adminTableLayersActive && userShowTrajectoryOnTable && (
      <ImpactLines
        CO_line={CO_line}
        C1_line={C1_line}
        CO_corrected_line={null}
        cushionPath={cushionPathForTableImpact}
        impactSplitRg={
          userShowCorrectedPath
            ? impact &&
                Number.isFinite(impact.x) &&
                Number.isFinite(impact.y)
              ? impact
              : impactContactRg
            : null
        }
        cushionPathAttrBase={cushionPathAttrBase}
        anchorsBase={anchorsBase}
        curveDeformActive={curveDeformActiveForImpact}
        showBaseLine={impactShowBaseLineOnly}
        showBaselineReferencePath={userShowBaselineReferenceOverlay}
        baselineReferencePath={
          userShowBaselineReferenceOverlay ? cushionPathBaselineRg : null
        }
        scale={SCALE}
        tableH={TABLE_H}
        padding={PADDING}
      />
      )}
      {adminTableLayersActive &&
        userShowTrajectoryOnTable &&
        extensionOverlayVisibility.attach && (
          <TrajectoryExtensionLayer
            revealPointsAttr={extensionRenderModel.revealPointsAttr}
            extensionPolylines={extensionRenderModel.extensionPolylines}
            handles={extensionRenderModel.handles}
            showHandles={extensionOverlayVisibility.showHandles}
            pathStroke="#ff4444"
          />
        )}
      {coaching.impactBallPx && (
        <CoachingOverlay
          guideLine={
            coaching.guideLineNode ? (
              <line
                x1={coaching.guideLineNode.x1}
                y1={coaching.guideLineNode.y1}
                x2={coaching.guideLineNode.x2}
                y2={coaching.guideLineNode.y2}
                stroke="#ffffff"
                strokeWidth={2}
                strokeDasharray="4 4"
                opacity={0.75}
                pointerEvents="none"
              />
            ) : null
          }
          impactBallPx={coaching.impactBallPx}
          impactBallRadius={coaching.impactBallRadius}
          impactBallOpacity={coaching.impactBallOpacity}
          onImpactBallDoubleClick={coaching.onImpactBallDoubleClick}
          impactBallCursor={coaching.impactBallCursor}
        />
      )}
      {balls.cue && (
        <Ball
          {...balls.cue}
          color="#ffffff"
          emphasis={
            canEditPosition && dragState.ballId === "cue" ? "selected" : undefined
          }
          onDoubleClick={
            canEdit
              ? (e) => handleBallDoubleClickForTarget("cue", e)
              : undefined
          }
        />
      )}
      {balls.target_center && (
        <Ball
          {...balls.target_center}
          color="#fde047"
          emphasis={ballTargetEmphasis("target_center")}
          onDoubleClick={
            canEdit
              ? (e) => handleBallDoubleClickForTarget("target_center", e)
              : undefined
          }
        />
      )}
      {balls.second && (
        <Ball
          {...balls.second}
          color="#f87171"
          emphasis={ballTargetEmphasis("second")}
          onDoubleClick={
            canEdit
              ? (e) => handleBallDoubleClickForTarget("second", e)
              : undefined
          }
        />
      )}
      {canEdit && (
        <SystemGrid
          track={trackForAnchors}
          anchorsData={resolveAnchorsData(systemIdForGrid)}
          visible={
            appMode === "USER"
              ? userTableDisplayMode === "systemValues"
                ? userSystemValuesModeActive &&
                  !!userDisplayFlags?.showSystemGrid
                : !!userDisplayFlags?.showSystemGrid
              : showSystemGrid
          }
        />
      )}
      {adminTableLayersActive &&
      (userShowTrajectoryLabels || userShowSystemValuesOnly) && (
      <SystemValueLabels
        showSystemValuesOnly={userShowSystemValuesOnly}
        showAxisCaptions={!!userDisplayFlags?.showAxisCaptions}
        labelScale={sysLabelScale}
        showSystemGrid={
          appMode === "USER"
            ? userTableDisplayMode === "systemValues"
              ? userSystemValuesModeActive && !!userDisplayFlags?.showSystemGrid
              : !!userDisplayFlags?.showSystemGrid
            : showSystemGrid
        }
        anchors={userShowSystemValuesOnly ? {} : allAnchorsForLabels}
        labelAnchors={labelAnchorsForRender}
        scale={SCALE}
        tableH={TABLE_H}
        padding={PADDING}
        systemValues={systemValuesForLabels}
        labelValueOverrides={baselineLabelValueOverrides}
        labelStrategy={labelStrategy}
        outputs={systemLabelsOutputsForRender}
        onAnchorDoubleClick={canEdit ? openAnchorEdit : undefined}
        onBaselineDraftApplyClick={
          appMode === "ADMIN" &&
          showBaseLine &&
          baselineDraftState.activeMark
            ? onBaselineDraftApplyClick
            : undefined
        }
      />
      )}
      {/* Joystick pad는 SVG 최상단 렌더 + pointerEvents:all(판정 참여).
          Pad DOM handler가 1차 경로다 — preventDefault(브라우저 기본 동작 차단) +
          stopPropagation(baseline/ball 판정과 격리) + pad `<g>` pointer capture를 함께 수행한다.
          SVG 좌표 SSOT(isPointerOnJoystick) 분기는 Pad가 다른 레이어에 덮인 경우의 fallback. */}
      {dragState.joystickVisible &&
        canEditPosition &&
        dragState.ballId &&
        balls[dragState.ballId] && (() => {
  const bp = balls[dragState.ballId];

  // Joystick geometry: Interaction SSOT와 동일 식 (joystickInteractionPolicy)
  const BASE_R = JOYSTICK_BASE_R_PX;
  const KNOB_R = JOYSTICK_KNOB_R_PX;
  const jc = computeJoystickCenterRg(bp, BALL_RADIUS_RG, SCALE);

  const jp = toPx({ x: jc.x, y: jc.y }, SCALE, TABLE_H);
  const cx = jp.x + PADDING;
  const cy = jp.y + PADDING;

  return (
    <g
      data-joystick="1"
      style={{ pointerEvents: "all", cursor: "grab" }}
      onPointerDown={handleJoyPadPointerDown}
      onPointerMove={handleJoyPadPointerMove}
      onPointerUp={handleJoyPadPointerUp}
      onPointerCancel={handleJoyPadPointerCancel}
    >
      {/* base */}
      <circle cx={cx} cy={cy} r={BASE_R} fill="rgba(15,23,42,0.55)" />
      <circle cx={cx} cy={cy} r={BASE_R - 6} fill="rgba(255,255,255,0.10)" />
      {/* knob (static visual; movement is via drag vector) */}
      <circle cx={cx} cy={cy} r={KNOB_R} fill="rgba(255,255,255,0.85)" />
      <circle cx={cx} cy={cy} r={KNOB_R - 6} fill="rgba(15,23,42,0.35)" />
    </g>
  );
})()}
      {dragState.joystickVisible &&
        canEditPosition &&
        dragState.ballId &&
        balls[dragState.ballId] && (() => {
  const bp = balls[dragState.ballId];
  const fc = computeFineControllerCenterRg(bp, BALL_RADIUS_RG, SCALE);
  const fp = toPx({ x: fc.x, y: fc.y }, SCALE, TABLE_H);
  const fcx = fp.x + PADDING;
  const fcy = fp.y + PADDING;
  const arrowSize = 15;
  const arrowOffset = 32;
  const coordX = bp.x.toFixed(1);
  const coordY = bp.y.toFixed(1);

  const arrows = [
    { id: "up",    dirX: 0, dirY: 1,  ox: 0, oy: -arrowOffset, label: "▲" },
    { id: "down",  dirX: 0, dirY: -1, ox: 0, oy: arrowOffset,  label: "▼" },
    { id: "left",  dirX: -1, dirY: 0, ox: -arrowOffset * 1.8, oy: 0, label: "◀" },
    { id: "right", dirX: 1, dirY: 0,  ox: arrowOffset * 1.8, oy: 0,  label: "▶" },
  ];

  const zones = [
    { id: "up",    dirX: 0, dirY: 1,  x: fcx - FINE_CTRL_ZONE_OUTER_PX, y: fcy - FINE_CTRL_ZONE_OUTER_PX, w: FINE_CTRL_ZONE_OUTER_PX * 2, h: FINE_CTRL_ZONE_OUTER_PX - FINE_CTRL_ZONE_INNER_PX },
    { id: "down",  dirX: 0, dirY: -1, x: fcx - FINE_CTRL_ZONE_OUTER_PX, y: fcy + FINE_CTRL_ZONE_INNER_PX, w: FINE_CTRL_ZONE_OUTER_PX * 2, h: FINE_CTRL_ZONE_OUTER_PX - FINE_CTRL_ZONE_INNER_PX },
    { id: "left",  dirX: -1, dirY: 0, x: fcx - FINE_CTRL_ZONE_OUTER_PX, y: fcy - FINE_CTRL_ZONE_INNER_PX, w: FINE_CTRL_ZONE_OUTER_PX - FINE_CTRL_ZONE_INNER_PX, h: FINE_CTRL_ZONE_INNER_PX * 2 },
    { id: "right", dirX: 1, dirY: 0,  x: fcx + FINE_CTRL_ZONE_INNER_PX, y: fcy - FINE_CTRL_ZONE_INNER_PX, w: FINE_CTRL_ZONE_OUTER_PX - FINE_CTRL_ZONE_INNER_PX, h: FINE_CTRL_ZONE_INNER_PX * 2 },
  ];

  return (
    <g style={{ pointerEvents: "none" }}>
      <rect
        x={fcx - FINE_CTRL_ZONE_INNER_PX}
        y={fcy - FINE_CTRL_ZONE_INNER_PX}
        width={FINE_CTRL_ZONE_INNER_PX * 2}
        height={FINE_CTRL_ZONE_INNER_PX * 2}
        fill="transparent"
        style={{ pointerEvents: "all" }}
        onPointerDown={handleFineCenterPointer}
        onPointerUp={handleFineCenterPointer}
        onPointerCancel={handleFineCenterPointer}
      />
      {zones.map((z) => (
        <rect
          key={z.id}
          x={z.x} y={z.y} width={z.w} height={z.h}
          fill="transparent"
          style={{ pointerEvents: "all", cursor: "pointer" }}
          onPointerDown={(e) => handleFineArrowDown(e, z.dirX, z.dirY)}
          onPointerUp={handleFineArrowUp}
          onPointerCancel={handleFineArrowUp}
        />
      ))}
      <text
        x={fcx} y={fcy}
        textAnchor="middle" dominantBaseline="central"
        fill="rgba(255,255,255,0.85)"
        fontSize="22" fontWeight="400"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >({coordX}, {coordY})</text>
      {arrows.map((a) => (
        <text
          key={a.id}
          x={fcx + a.ox} y={fcy + a.oy}
          textAnchor="middle" dominantBaseline="central"
          fill="rgba(255,255,255,0.8)"
          fontSize={arrowSize} fontWeight="400"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >{a.label}</text>
      ))}
    </g>
  );
})()}
     </svg>
  );

  return (
    <div className="app-layout">
      <UserToast
        message={userToast.message}
        visible={userToast.visible}
        variant={userToast.variant}
      />
      <div className="table-area">
        <div className="table-area-inner">
          {tableSVG}
        </div>
      {appMode === "USER" &&
      realInterpolationUiSurface.candidates.length > 0 ? (
        <RealInterpolationPanel
          surface={realInterpolationUiSurface}
          selectedIndex={riUiSelectedIndex}
          onSelect={handleRealInterpolationUiSelect}
          formatMatchType={formatRiMatchTypeLabel}
          formatConfidence={formatRiConfidenceLabel}
        />
      ) : null}
      {showHistoryModal && (
        <WorkspaceHistoryModal
          history={workspaceHistory}
          onClose={() => setShowHistoryModal(false)}
          onLoad={(id) => {
            handleLoadWorkspaceSnapshot(id);
            setShowHistoryModal(false);
          }}
          onDelete={handleDeleteWorkspaceSnapshot}
          onDeleteOldest30={handleDeleteOldest30}
          onExport={handleExportSnapshots}
        />
      )}

      {/* 관리자 모드 오버레이 */}
      <ModalShell
        open={overlayState.open}
        onClose={closeOverlay}
        draggable
        title={
          overlayState.type === "SYS"
            ? "SYS 설정"
            : overlayState.type === "HPT"
              ? "HP/T 설정"
              : overlayState.type === "STR"
                ? "STR 설정"
                : overlayState.type === "AI"
                  ? "AI 코멘트"
                  : overlayState.type === "ANCHOR_EDIT"
                    ? "Anchor 좌표 수정"
                    : ""
        }
        panelClassName={overlayState.type === "SYS" ? "modal-panel--sys" : ""}
        panelStyle={{
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
            {overlayState.type === 'SYS' && (
              <SysOverlay
                key={`sys-${shotEditor.activeSlot}`}
                data={adminState.sys}
                computeSysOverlayValues={computeSysOverlayValues}
                evaluateSysOverlayHasAllInputs={evaluateSysOverlayHasAllInputs}
                onSave={(newData) => {
                  console.log("[SYS_APPLY_START]", {
                    hypothesisId: "SYS_APPLY_START",
                    ts: Date.now(),
                  });
                  const { system_id, calculated, ...rest } = newData;
                  const activeSlot = shotEditor.activeSlot;
                  const slot = shotEditor.slots[activeSlot];

                  console.log("[SYS APPLY] adminState.sys:", adminState.sys);
                  console.log("[SYS APPLY] slot.applied before:", slot?.applied);

                  // 1. adminState 업데이트
                  setAdminState(prev => ({
                    ...prev,
                    sys: {
                      ...prev.sys,
                      ...rest,
                      system: newData.system || system_id,
                      track: newData.track ?? prev.sys?.track ?? "B2T_L",
                    }
                  }));

                  // 2. slot.applied.sys 동기화 - 항상 수행 (SAVE 시 handleSaveStrategy에서 사용)
                  const systemId = newData.system || system_id || "5_half_system";
                  const numericInputs = mergeSysOverlayPayloadToNumericInputs(newData);
                  const trackVal = newData.track ?? "B2T_L";
                  const applyResult = actions.commitDraftSys(activeSlot, systemId, numericInputs, {
                    track: trackVal,
                  });
                  console.log("[SYS APPLY] commitDraftSys result:", applyResult);
                  if (applyResult.ok) {
                    console.log("[SYS APPLY] committed applied.sys outputs:", applyResult.appliedSys?.outputs);
                    const sysOut = applyResult.appliedSys?.outputs?.result;
                    console.log("[SYS APPLY OUTPUT]", {
                      CO_f: sysOut?.CO_f,
                      C1_f: sysOut?.C1_f,
                      C3_r: sysOut?.C3_r,
                      C4_f: sysOut?.C4_f,
                      Sn: sysOut?.Sn,
                    });
                    const corr = newData.corrections ?? {};
                    actions.patchSlotRuntimeMeta(activeSlot, {
                      corrections: {
                        slide: Number(corr.slide) || 0,
                        curve_ratio: Number(corr.curve_ratio) || 0,
                        draw: Number(corr.draw) || 0,
                        departure: Number(corr.departure) || 0,
                        spin: Number(corr.spin) || 0,
                      },
                      shotType: newData.shotType,
                      system_values:
                        newData.system_values &&
                        typeof newData.system_values === "object"
                          ? { ...newData.system_values }
                          : mergeSysOverlayPayloadToNumericInputs(newData),
                      targetBall:
                        targetColor === "red" || targetColor === "yellow"
                          ? targetColor
                          : null,
                    });
                    const appliedResult = applyResult.appliedSys?.outputs?.result;
                    if (appliedResult && !trajectory.state.adjusted) {
                      trajectory.setAdjusting({
                        sys: {
                          oneC: appliedResult.oneC || 0,
                          threeC: appliedResult.threeC || 0
                        }
                      });
                    }
                    if (appliedResult) {
                      trajectory.applySysResult(appliedResult);
                    }
                  }

                  if (newData.calculated?.HP_n != null) {
                    setSysHpNResult(newData.calculated.HP_n);
                  } else {
                    setSysHpNResult(null);
                  }

                  setIsSaved(false);
                  closeOverlay();
                }}
                onCancel={closeOverlay}
              />
            )}

            {overlayState.type === 'HPT' && (
              <HptOverlay
                data={adminState.hpt}
                sysHpNResult={sysHpNResult}
                onSave={(newData) => {
                  console.log("[HPT_APPLY_START]", {
                    hypothesisId: "HPT_APPLY_START",
                    ts: Date.now(),
                  });
                  setAdminState({ ...adminState, hpt: newData });
                  actions.applyHptToSlot(shotEditor.activeSlot, newData);
                  setIsSaved(false);
                  closeOverlay();
                }}
                onCancel={closeOverlay}
              />
            )}

            {overlayState.type === 'STR' && (
              <StrOverlay
                data={adminState.str}
                onSave={(newData) => {
                  console.log("[STR_APPLY_START]", {
                    hypothesisId: "STR_APPLY_START",
                    ts: Date.now(),
                  });
                  setAdminState({ ...adminState, str: newData });
                  actions.applyStrToSlot(shotEditor.activeSlot, newData);
                  setIsSaved(false);
                  closeOverlay();
                }}
                onCancel={closeOverlay}
              />
            )}

            {overlayState.type === 'ANCHOR_EDIT' && overlayState.anchorKey && (() => {
              const key = overlayState.anchorKey;
              const coord = allAnchors[key]?.coord ?? { x: 0, y: 0 };
              return (
                <AnchorEditOverlay
                  anchorKey={key}
                  initialX={coord.x}
                  initialY={coord.y}
                  onApply={(x, y) => {
                    const round1 = (v) => Math.round(Number(v) * 10) / 10;
                    const newOverride = {
                      ...(adminState?.anchorsOverride ?? {}),
                      [key]: { x: round1(x), y: round1(y) },
                    };
                    setAdminState((prev) => ({
                      ...prev,
                      anchorsOverride: newOverride,
                    }));
                    try {
                      localStorage.setItem(ANCHORS_OVERRIDE_KEY, JSON.stringify(newOverride));
                    } catch (e) {
                      console.warn("anchorsOverride save failed", e);
                    }
                    setIsSaved(false);
                    closeOverlay();
                  }}
                  onCancel={closeOverlay}
                />
              );
            })()}

            {overlayState.type === 'AI' && (
              <AiOverlay
                key={`ai-${shotEditor.activeSlot}-${resolvedSlotSysValues?.CO_f ?? 0}-${adminState.str?.speed ?? 0}`}
                data={adminState.ai}
                sysData={adminState.sys}
                strData={adminState.str}
                slotRenderSys={slotRenderSys}
                resolvedSlotSysValues={resolvedSlotSysValues}
                resolvedSlotBaseSysValues={resolvedSlotBaseSysValues}
                onSave={(newData) => {
                  console.log("[AI_APPLY_START]", {
                    hypothesisId: "AI_APPLY_START",
                    ts: Date.now(),
                  });
                  setAdminState({ ...adminState, ai: newData });
                  actions.applyAiToSlot(shotEditor.activeSlot, newData);
                  setIsSaved(false);
                  closeOverlay();
                }}
                onSaveStrategy={handleSaveStrategy}
                onCancel={closeOverlay}
                onePointLibrary={onePointLibrary}
                sortedOnePointLibrary={filteredSortedOnePointLibrary}
                onePointSelectedId={onePointSelectedId}
                onePointDraft={onePointDraft}
                setOnePointDraft={setOnePointDraft}
                onSelectOnePoint={onSelectOnePoint}
                applyOnePointToShot={applyOnePointToShot}
                saveDraftAsNewLesson={saveDraftAsNewLesson}
                deleteSelectedOnePointLibraryItem={deleteSelectedOnePointLibraryItem}
                onePointLessons={adminState.ai?.onePointLessons ?? []}
                onDeleteLesson={deleteLesson}
                onReorderLessons={reorderLessons}
                onePointCategories={onePointCategories}
                onePointCategoryNo={onePointCategoryNo}
                onSelectOnePointCategory={onSelectOnePointCategory}
                onOpenCategoryManage={() => setShowCategoryManageModal(true)}
                onOpenLessonOrderManage={() => setShowLessonOrderManageModal(true)}
              />
            )}
      </ModalShell>

      <CategoryManageModal
        open={showCategoryManageModal}
        categories={onePointCategories}
        onClose={() => setShowCategoryManageModal(false)}
        onCreate={handleCreateOnePointCategory}
        onUpdate={handleUpdateOnePointCategory}
        onDelete={handleDeleteOnePointCategory}
      />

      <LessonOrderManageModal
        open={showLessonOrderManageModal}
        categoryNo={onePointCategoryNo}
        lessons={filteredSortedOnePointLibrary}
        onClose={() => setShowLessonOrderManageModal(false)}
        onReorder={reorderOnePointLibraryByCategory}
      />
      
      {/* USER Calculation chrome — Overlay 밖 상단 버튼 (계산 모드에서 항상 표시) */}
      {appMode === "USER" && userTableDisplayMode === "trajectory" ? (
        <UserCalcToolbar
          cardSource={trajectoryCardSource}
          onCardSourceChange={onTrajectoryCardSourceChange}
          showAxisValues={trajectoryShowAxisValues}
          onShowAxisValuesChange={onTrajectoryShowAxisValuesChange}
          calcOverlayVisible={calcOverlayVisible}
          onCalcOverlayVisibleChange={onCalcOverlayVisibleChange}
        />
      ) : null}

      {/* USER Overlay Shell (Layout SSOT v1.2) — Content unchanged */}
      <UserOverlayShell
        open={
          appMode === "USER" &&
          !!overlayContent &&
          (overlayContent !== "CALC" || calcOverlayVisible)
        }
        onClose={
          overlayContent === "CALC"
            ? () => onCalcOverlayVisibleChange?.(false)
            : handleCloseUserInfoOverlay
        }
        layoutKey={overlayContent}
        sizeVariant={userOverlayLayout.sizeVariant}
        surface={userOverlayLayout.surface}
        contentTypeScale={userOverlayLayout.contentTypeScale}
        fitContent={userOverlayLayout.fitContent}
        widthRatio={userOverlayLayout.widthRatio}
        maxHeightRatio={userOverlayLayout.maxHeightRatio}
        contentClassName={userOverlayLayout.contentClassName}
        draggable
      >
        {overlayContent === "HPT" && <UserHptPanel model={userHptModel} />}
        {overlayContent === "AI" && <UserAiPanel model={userInfoPanel} />}
        {overlayContent === "CALC" && (
          <UserCalculationPanel
            block={userCalculationDisplayBlock}
            emptyMessage={
              !userTableDisplaySlotId
                ? "공략을 선택한 뒤 계산을 사용해 주세요."
                : "SYS 입력이 완료되지 않았습니다."
            }
          />
        )}
      </UserOverlayShell>
      </div>

      {canEdit && (
        <div className="right-panel">
          <input
            type="file"
            accept="application/json"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileImport}
          />
          <div className="right-panel-top-buttons">
            <button
              type="button"
              className="control-button"
              onClick={() => { hideBallPositionController(); setShowSystemGrid((prev) => !prev); }}
              style={{
                backgroundColor: showSystemGrid ? '#10b981' : '#64748b',
                color: 'white',
              }}
            >
              Grid
            </button>
            <button
              type="button"
              className={`control-button${showBaseLine ? " active" : ""}`}
              onClick={() => { hideBallPositionController(); setShowBaseLine((v) => !v); }}
              style={{
                backgroundColor: showBaseLine ? "#FFD700" : "#64748b",
                color: showBaseLine ? "#1f2937" : "white",
              }}
            >
              기준선
            </button>
            <button
              type="button"
              className="control-button"
              disabled={!canClickTrajectoryExtension}
              onClick={handleTrajectoryExtensionClick}
              style={{
                backgroundColor:
                  extensionDraftCount > 0 ? "#0ea5e9" : "#64748b",
                color: "white",
                opacity: canClickTrajectoryExtension ? 1 : 0.45,
                cursor: canClickTrajectoryExtension ? "pointer" : "not-allowed",
              }}
              title={
                extensionDraftCount >= 2
                  ? "Extension 최대 2개"
                  : "궤적 연장 Proposal 생성"
              }
            >
              궤적 연장
            </button>
            <button
              type="button"
              className={`control-button published-search-btn${isAdminPublishedSearchMatched ? " active" : ""}`}
              onClick={handlePositionRecall}
            >
              Search
            </button>
            <button
              type="button"
              className="control-button"
              onClick={() => { hideBallPositionController(); setShowHistoryModal(true); }}
              style={{ backgroundColor: '#6366f1', color: 'white' }}
            >
              History
            </button>
            <button
              type="button"
              disabled={!canUseSystemControls}
              className={`control-button save-btn${isSaved ? " active" : ""}`}
              onClick={() => { hideBallPositionController(); handleCanonicalRightPanelSave(); }}
              style={{
                opacity: canUseSystemControls ? 1 : 0.45,
                cursor: canUseSystemControls ? "pointer" : "not-allowed",
              }}
            >
              SAVE
            </button>
          </div>
          <div className="right-panel-divider" aria-hidden="true" />
          <div
            className="workspace-cleanup-section"
            style={{ width: "100%", marginTop: 16 }}
          >
            <button
              type="button"
              className="control-button"
              onClick={() => { hideBallPositionController(); setWorkspaceCleanupOpen((open) => !open); }}
              style={{
                backgroundColor: workspaceCleanupOpen ? "#334155" : "#475569",
                color: "#e2e8f0",
                height: 52,
                fontSize: 15,
              }}
              aria-expanded={workspaceCleanupOpen}
            >
              Data 정리
            </button>
            {workspaceCleanupOpen && (
              <div
                className="workspace-cleanup-expand"
                style={{
                  marginTop: 10,
                  padding: "12px 10px",
                  borderRadius: 8,
                  background: "rgba(0, 0, 0, 0.35)",
                  border: "1px solid #334155",
                  fontSize: 12,
                  color: "#cbd5e1",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    marginBottom: 8,
                    cursor: "pointer",
                    lineHeight: 1.4,
                  }}
                >
                  <input
                    type="radio"
                    name="workspaceCleanupMode"
                    checked={
                      workspaceCleanupMode === WORKSPACE_CLEANUP_PRESERVE_DATASET
                    }
                    onChange={() =>
                      setWorkspaceCleanupMode(WORKSPACE_CLEANUP_PRESERVE_DATASET)
                    }
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <span>positions_dataset 제외 삭제</span>
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    marginBottom: 12,
                    cursor: "pointer",
                    lineHeight: 1.4,
                  }}
                >
                  <input
                    type="radio"
                    name="workspaceCleanupMode"
                    checked={workspaceCleanupMode === WORKSPACE_CLEANUP_CLEAR_ALL}
                    onChange={() =>
                      setWorkspaceCleanupMode(WORKSPACE_CLEANUP_CLEAR_ALL)
                    }
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <span>전체 삭제</span>
                </label>
                <button
                  type="button"
                  className="control-button"
                  onClick={handleWorkspaceLocalStorageCleanup}
                  style={{
                    width: "100%",
                    height: 44,
                    fontSize: 14,
                    backgroundColor: "#dc2626",
                    color: "white",
                  }}
                >
                  실행
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useShotSlots, resolveSlotSysForRender } from "./hooks/useShotSlots";
import { useTrajectoryState } from "./hooks/useTrajectoryState";
import { angleSpinTargetRail } from "./domain/angleSpinCorrectionTarget";
import {
  adminSysShallowEqual,
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
  getSysSystemMode,
  getSysUseSn,
  isFiveHalfSystemId,
} from "./domain/system/systemIdentity";
import {
  solveFiveHalfTwoOfThree,
  fiveHalfComputedInputKey,
} from "./domain/calculator/fiveHalfCalculator";
import {
  loadOnePoints,
  saveOnePoints,
} from "./domain/lesson/onePointLibrary";
import {
  resolveCoC1C3Keys,
  normalizeToFormulaInputsApp,
  isRhsKeyReadOnlyForSys,
  buildSysOverlayNumericPayload,
  unifiedSlideFromCorrections,
} from "./overlay/utils/sysOverlayUtils";
import { SysOverlay } from "./components/overlays/SysOverlay";
import { parseSysFormulaExpr } from "./domain/calculator/formulaExpr";
import { SYSTEM_PROFILES } from "./data/systems";
import { calculateByProfileExpr } from "./utils/systemCalculator";
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
  toRg,
  fmt,
  formatResultNum,
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
import { buildTrajectoryRenderModel } from "./renderer/trajectory/trajectoryRenderModel";
import { buildSystemAxisLabelModel } from "./renderer/labels/systemAxisLabelModel";
import { buildRgAnchors } from "./renderer/trajectory/anchorConversionModel";
import {
  computeRailPoints,
  c1ArrivalRailForTrack,
  coDepartureRailForTrack,
  lineToRailIntersections,
  projectPointToRail,
  snapToRail,
} from "./utils/geometry/rail";
import { createCurveSegment } from "./utils/trajectory/curveTrajectory";
import {
  normalizeAnchor,
  resolveAnchorPoint,
  computeRailImpactPoint,
} from "./utils/geometry/anchorResolve";
import { calculateImpact, adjustSystemLine } from "./utils/physics";
import {
  computeThicknessFromImpact,
  snapImpactToOrbit,
} from "./utils/physics/ImpactEngine";
import SystemValueLabels from "./components/table/SystemValueLabels";
import WorkspaceHistoryModal from "./components/WorkspaceHistoryModal";
import ModalShell from "./components/common/ModalShell";
import UserAiPanel from "./components/user/UserAiPanel.jsx";
import UserHptPanel from "./components/user/UserHptPanel.jsx";
import UserToast from "./components/common/UserToast.jsx";
import ImpactLines from "./components/table/ImpactLines";
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
import { buildUserTrajectoryCardModel } from "./domain/userTrajectoryCardViewModel";
import UserTrajectoryInfoCard from "./components/user/UserTrajectoryInfoCard";
import { useUserToast } from "./hooks/useUserToast";
import { normalizeTargetBallForKey } from "./domain/positionMergeEngine";
import { computeSystemFromPositions, sysValuesToAnchors } from "./domain/systemEngine";
import {
  getAnchorsForRendering,
  getLabelNumericSuffix,
} from "./domain/anchorCoordinateEngine";
import { getAnchorCoordFromSys } from "./domain/anchorLookupEngine";
import { buildBaselineDraftApplyDelta } from "./domain/buildBaselineDraftApplyDelta";
import {
  resolveTrajectoryDisplayCap,
  slicePathNodesToCap,
} from "./domain/trajectoryPathDisplayPolicy";

function ingestBaselineP043Debug(location, message, data, hypothesisId) {
  console.log(message, data);
}
import {
  computeReflectionC2,
  detectRail,
  angleDeg,
  resolveSignedSpinDeg,
  chooseCandidateRail,
  intersectRayWithRail,
  directionFromAngleDeg,
} from "./domain/reflectionEngine";
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
import { runSaveStrategy } from "./application/flows/saveFlow";
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
import { getAnchorsForSystem } from "./data/systems/anchorsRegistry";
import {
  useSettings,
  WORKSPACE_CLEANUP_CLEAR_ALL,
  WORKSPACE_CLEANUP_PRESERVE_DATASET,
  runWorkspaceLocalStorageCleanup,
} from "./hooks/useSettings";

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

function traceSearchRuntimeSnapshot(trajectory, adminState, userTableDisplaySlotId) {
  const t = trajectory?.state;
  return {
    userTableDisplaySlotId,
    trajectoryPhase: t?.phase ?? null,
    trajectoryHasAdjusted: !!t?.adjusted,
    trajectoryAdjustedSys: t?.adjusted?.sys ?? null,
    adminSysSystemId: adminState?.sys?.system_id ?? adminState?.sys?.systemId ?? null,
    adminSysShotType: adminState?.sys?.shotType ?? null,
    adminSysHasOutputs: !!adminState?.sys?.outputs?.result,
  };
}

function emitAdminRecallTrace(_message, _hypothesisId, _snapshot) {}

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

/**
 * 궤적·CO→C1 선분용 시작점만 Rg 레일로 보정.
 * CO_rail 이 Fg(-2.25 등)에 머물면 빨간 선이 프레임·라벨과 겹침.
 * 라벨(allAnchors.CO) 정책과 CO_rail(의미/교점) 변수는 그대로 두고, draw path 첫 점만 교정.
 */
function coStartForCushionPath(coRail, coPrep, c1Prep) {
  if (!coRail || !coPrep || !c1Prep) return coRail ?? coPrep ?? null;
  const onRgPlayingRail =
    Math.abs(coRail.x) <= 0.75 ||
    Math.abs(coRail.x - 80) <= 0.75 ||
    Math.abs(coRail.y) <= 0.75 ||
    Math.abs(coRail.y - 40) <= 0.75;
  if (onRgPlayingRail) return coRail;
  const { CO_rail: snapped } = computeRailPoints(coPrep, c1Prep);
  return snapped ?? coRail;
}

/** 이전 궤적 점 → 앵커 의미점 방향, 세그먼트 [from, toward] 기준 첫 레일 교점 (rail.ts) */
function firstRailHitTowardTarget(from, toward) {
  if (!from || !toward) return toward ?? null;
  const hit = lineToRailIntersections(from, toward)?.C1_rail;
  return hit || snapToRail(toward) || toward;
}

/** 궤적용: 앵커 원본에서 의미 좌표만 (라벨/데이터와 독립, 표시 좌표는 변경하지 않음) */
function anchorSemanticForPath(raw, resolveCtx) {
  const n = normalizeAnchor(raw);
  return n ? resolveAnchorPoint(n, resolveCtx) : null;
}

/** pathNodes (C3 이후) spin decay + forward/reverse 보정 — 앵커 엔진과 무관 */
function spinPathGetDistance(A, B) {
  if (!A || !B) return 0;
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function spinPathComputeProgress(pathNodes, index) {
  let total = 0;
  let current = 0;
  for (let i = 0; i < pathNodes.length - 1; i++) {
    const d = spinPathGetDistance(pathNodes[i], pathNodes[i + 1]);
    total += d;
    if (i < index) current += d;
  }
  if (total === 0) return 0;
  return current / total;
}

function spinPathGetSpinFactor(progress) {
  if (progress >= 0.85) return 0.5;
  return 1.0;
}

function spinPathGetDirectionType(A, B, C) {
  if (!A || !B || !C) return "forward";
  const v1 = { x: B.x - A.x, y: B.y - A.y };
  const v2 = { x: C.x - B.x, y: C.y - B.y };
  const cross = v1.x * v2.y - v1.y * v2.x;
  return cross >= 0 ? "forward" : "reverse";
}

function spinPathRotateVector(v, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

function spinPathApplySpin(v, spin, type) {
  const k = 0.015;
  const angle = spin * k * (type === "forward" ? 1 : -1);
  return spinPathRotateVector(v, angle);
}

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

/** 슬롯 고정: target_center = 노란 공 좌표, second = 빨간 공 좌표 (렌더와 동일), cue = 큐 */
function getYellowBallCoords(ballsObj) {
  if (!ballsObj) return null;
  return ballsObj.target_center ?? ballsObj.target ?? null;
}

function getRedBallCoords(ballsObj) {
  if (!ballsObj) return null;
  return ballsObj.second ?? null;
}

/** 임팩트·코칭용 1적구 좌표 (targetColor: 실제 타겟 공 색 — 좌표는 슬롯만 사용) */
function resolveImpactTargetBall(ballsObj, targetColorSel) {
  if (!ballsObj) return null;
  const yellowBall = getYellowBallCoords(ballsObj);
  const redBall = getRedBallCoords(ballsObj);
  if (targetColorSel === "red") return redBall ?? yellowBall ?? null;
  if (targetColorSel === "yellow") return yellowBall ?? redBall ?? null;
  return yellowBall ?? redBall ?? null;
}

/** 조이스틱이 붙은 공 id → 임팩트 타겟 색 (후보/확정 공통 매핑) */
function resolveBallColorFromId(ballId) {
  if (ballId === "target" || ballId === "target_center") return "yellow";
  if (ballId === "second") return "red";
  return null;
}

/** ADMIN 타겟 확정 표시 — isTargetSelected + targetColor SSOT (dragState와 분리) */
function isConfirmedTargetBall(ballId, targetColorSel, isSelected) {
  if (
    !isSelected ||
    (targetColorSel !== "red" && targetColorSel !== "yellow")
  ) {
    return false;
  }
  return resolveBallColorFromId(ballId) === targetColorSel;
}

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

/**
 * 슬롯 sys 병합값(base) + adminState.sys(CV·spaceSel·systemConfig) → 표시/앵커/궤적용 effective 맵.
 * SysOverlay의 normalizedBase → adjustedInputs → effDisplayMap 규약과 동일.
 */
function buildSlotEffectiveRenderSysValues(merged, resolvedSlotSys, adminSys) {
  if (!merged || typeof merged !== "object") return {};

  const mergedNums = {};
  for (const [k, v] of Object.entries(merged)) {
    if (v === "" || v == null) continue;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) continue;
    mergedNums[k] = n;
  }

  const rawSid = resolvedSlotSys?.systemId ?? "5_half_system";
  const systemId = canonicalSystemIdForConfig(rawSid);
  const systemMode = getSysSystemMode(systemId);
  const useSn = getSysUseSn(systemId);
  const profile = SYSTEM_PROFILES[systemId];
  const expr =
    typeof profile?.formula === "string"
      ? profile.formula
      : profile?.formula?.expr || "";
  if (!expr || !expr.trim()) return {};

  const { forced, neededKeys, needsHP, needsAn } = parseSysFormulaExpr(expr);
  const lhs = expr.trim().split("=")[0].trim();
  const rhsKeys = Array.from(neededKeys || []).filter((k) => k !== lhs);

  const spaceSel = adminSys?.spaceSel ?? {
    CO: "f",
    C1: "f",
    C2: "f",
    C3: "f",
    C4: "f",
  };
  const { coKey, c1Key, c3Key } = resolveCoC1C3Keys(forced, spaceSel);

  const corrections = adminSys?.corrections ?? {};
  const unifiedSlide = unifiedSlideFromCorrections(corrections, adminSys?.shotType);
  const p_spin = Number(corrections.spin) || 0;
  const angleTilt = Number(corrections.curve_ratio) || 0;

  let hasAll;
  if (isFiveHalfSystemId(systemId)) {
    const fhIn = {};
    for (const k of [coKey, c1Key, c3Key]) {
      if (mergedNums[k] != null && Number.isFinite(mergedNums[k])) fhIn[k] = mergedNums[k];
    }
    if (Object.keys(fhIn).length < 2) return {};
    hasAll = rhsKeys.every((k) => {
      const comp = fiveHalfComputedInputKey(fhIn, coKey, c1Key, c3Key);
      if (comp && k === comp) return true;
      const v = mergedNums[k];
      return v !== undefined && v !== null && Number.isFinite(v);
    });
  } else {
    hasAll = rhsKeys.every((k) => {
      if (isRhsKeyReadOnlyForSys(k, systemMode, c3Key)) return true;
      const v = mergedNums[k];
      return v !== undefined && v !== null && Number.isFinite(v);
    });
  }
  if (!hasAll) return {};

  const numericPayload = buildSysOverlayNumericPayload(
    mergedNums,
    rhsKeys,
    coKey,
    c1Key,
    c3Key,
    needsHP,
    needsAn
  );
  let normalizedBase;
  if (isFiveHalfSystemId(systemId)) {
    const fhIn = {};
    for (const k of [coKey, c1Key, c3Key]) {
      if (mergedNums[k] != null && Number.isFinite(mergedNums[k])) fhIn[k] = mergedNums[k];
    }
    const solved = solveFiveHalfTwoOfThree(fhIn, coKey, c1Key, c3Key);
    normalizedBase = solved ? { ...numericPayload, ...solved } : numericPayload;
  } else {
    normalizedBase = normalizeToFormulaInputsApp(
      numericPayload,
      systemMode,
      coKey,
      c1Key,
      c3Key,
      0
    );
  }

  const snFor5Half =
    useSn && isFiveHalfSystemId(systemId)
      ? (() => {
          const CO_base = Number(normalizedBase.CO_f) || 0;
          const CO_eff = CO_base + unifiedSlide;
          const C3_r = Number(normalizedBase.C3_r) || 0;
          return { Sn: (CO_eff - 50) * 0.5, C4_f: C3_r + (CO_eff - 50) * 0.5, CO_f: CO_base, C3_r };
        })()
      : null;
  const p_start =
    useSn && isFiveHalfSystemId(systemId) && snFor5Half
      ? snFor5Half.Sn
      : Number(corrections.departure) || 0;

  const adjusted = { ...normalizedBase };
  if ("CO_f" in adjusted) adjusted.CO_f += unifiedSlide;
  if ("CO_r" in adjusted) adjusted.CO_r += unifiedSlide;
  /* angleSpinTargetRail (domain/angleSpinCorrectionTarget): curve_ratio + spin → C3 only */
  if (angleSpinTargetRail === "C3" && systemMode === "full_input") {
    const c3AngleSpin = angleTilt + p_spin;
    if ("C3_f" in adjusted) adjusted.C3_f += c3AngleSpin;
    if ("C3_r" in adjusted) adjusted.C3_r += c3AngleSpin;
  }
  ["C4_f", "C4_r", "C5_f", "C5_r", "C6_f", "C6_r"].forEach((k) => {
    if (k in adjusted) adjusted[k] += p_start;
  });

  const finalCalc = calculateByProfileExpr(expr, adjusted);

  const base = normalizedBase;
  const adj = adjusted;
  let effDisplayMap;
  if (systemMode === "full_input") {
    effDisplayMap = { ...base, ...adjusted };
  } else {
    const CO_eff = Number(adj?.CO_f ?? base?.CO_f ?? 0);
    const c1 = Number((c1Key && base[c1Key]) ?? 0);
    effDisplayMap = { ...base, CO_f: CO_eff };
    if (c3Key) {
      let c3Eff = CO_eff - c1;
      if (angleSpinTargetRail === "C3") {
        c3Eff += angleTilt + p_spin;
      }
      effDisplayMap[c3Key] = c3Eff;
    }
  }

  const out = { ...mergedNums, ...finalCalc, ...effDisplayMap };

  if (useSn && isFiveHalfSystemId(systemId)) {
    const CO_used = Number(effDisplayMap.CO_f ?? 0);
    const C3_used = Number(effDisplayMap.C3_r ?? effDisplayMap.C3_f ?? 0);
    const Sn_eff = (CO_used - 50) * 0.5;
    out.Sn = Sn_eff;
    out.C4_f = C3_used + Sn_eff;
    out.C5_f = out.C4_f;
    out.C6_f = out.C4_f;
    out.CO_f = CO_used;
    if (effDisplayMap.C3_r != null) out.C3_r = C3_used;
  }

  return out;
}

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
  const trajectory = useTrajectoryState();
  const debugSlotSysSnapshotPrevRef = useRef(null);
  /** Last S1/S2/S3 button id — Position reset only on cross-slot navigation, not overlay→slot restore */
  const lastSlotNavButtonRef = useRef(null);
  /** USER: Search 후 공략 클릭 전까지 trajectory/labels 미표시 */
  const [userTableDisplaySlotId, setUserTableDisplaySlotId] = useState(null);
  /** USER: 마지막 Search 성공 record — rail label SSOT */
  const [userLastSearchRecord, setUserLastSearchRecord] = useState(null);
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

  /** sys/hpt/str/ai + trajectory only — never touches targetColor / isTargetSelected */
  function syncSlotRuntimeAdminAndTrajectory(slotId) {
    const payload = buildSlotRuntimePayload(shotEditor.slots[slotId]);
    setAdminState((prev) => {
      const nextSys = payload.adminSys;
      console.log("[SYNC_ADMIN_SYS]", {
        prevShotType: prev.sys?.shotType,
        nextShotType: nextSys?.shotType,
        nextSys,
      });
      if (adminSysShallowEqual(prev.sys, nextSys)) {
        return {
          ...prev,
          hpt: payload.hpt,
          str: payload.str,
          ai: payload.ai,
        };
      }
      return {
        ...prev,
        hpt: payload.hpt,
        str: payload.str,
        ai: payload.ai,
        sys: nextSys,
      };
    });
    const result = payload.trajectoryResult;
    const hasTraj =
      result &&
      (typeof result.oneC === "number" || typeof result.threeC === "number");
    if (hasTraj) {
      trajectory.setAdjusting({
        sys: {
          oneC: Number(result.oneC) || 0,
          threeC: Number(result.threeC) || 0,
        },
      });
      trajectory.applySysResult(result);
    } else {
      trajectory.resetTrajectory();
    }
  }

  /** Slot switch only: targetBall hydrate + admin/trajectory */
  function hydrateSlotRuntime(slotId) {
    const slot = shotEditor.slots[slotId];
    const payload = buildSlotRuntimePayload(slot);
    const slotExtracted = extractSlotTargetBall(slot);
    const adminTarget = getAdminSearchTargetBall(slotId);
    const effectiveTargetBall =
      appMode === "ADMIN"
        ? adminTarget ?? payload.targetBall ?? slotExtracted
        : payload.targetBall ?? slotExtracted;
    applySlotRuntimeTargetBall(effectiveTargetBall);
    syncSlotRuntimeAdminAndTrajectory(slotId);
  }

  /** 궤적/앵커 렌더 SSOT: 활성 슬롯의 sys만 사용 (adminState.sys / view.ui.system 혼합 금지) */
  const resolvedSlotSys = useMemo(() => {
    if (appMode === "USER") {
      if (!userTableDisplaySlotId) return null;
      const slot = shotEditor.slots[userTableDisplaySlotId];
      return resolveSlotSysForRender(slot) ?? null;
    }
    if (appMode === "ADMIN" && !adminTableLayersVisible) return null;
    const slot = shotEditor.slots[shotEditor.activeSlot];
    return resolveSlotSysForRender(slot) ?? null;
  }, [
    appMode,
    userTableDisplaySlotId,
    adminTableLayersVisible,
    shotEditor.slots,
    shotEditor.activeSlot,
  ]);

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
    const effectiveNums = buildSlotEffectiveRenderSysValues(
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
    const built = buildSlotEffectiveRenderSysValues(
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
  /** P0-3a: CO·C1 기준선 끝점 draft (SYS/draft 미반영, CO·C1 동시 유지) */
  const EMPTY_BASELINE_DRAFT = {
    coSysValue: null,
    coRg: null,
    c1SysValue: null,
    c1Rg: null,
    activeMark: null,
    draggingMark: null,
  };
  const [baselineDraftState, setBaselineDraftState] = useState(EMPTY_BASELINE_DRAFT);
  const baselineCoHandleRgRef = useRef(null);
  const baselineC1HandleRgRef = useRef(null);
  /** P0-4f: 드래그 시작 시점 슬롯 SYS — Apply 후 stale draft vs committed slot 구분 */
  const baselineLabelSlotSnapshotRef = useRef({ CO_f: null, C1_f: null });
  const baselineLabelSsotRef = useRef(null);

  useEffect(() => {
    if (appMode !== "ADMIN" || !showBaseLine) {
      setBaselineDraftState(EMPTY_BASELINE_DRAFT);
    }
  }, [appMode, showBaseLine]);

  /** P0-4d: Apply 성공 mark의 draft·activeMark만 정리 (남은 draft는 유지) */
  const clearAppliedBaselineDraftMark = useCallback((mark) => {
    setBaselineDraftState((prev) => {
      const next = { ...prev };

      if (mark === "CO") {
        next.coSysValue = null;
        next.coRg = null;
      } else if (mark === "C1") {
        next.c1SysValue = null;
        next.c1Rg = null;
      }

      if (next.draggingMark === mark) {
        next.draggingMark = null;
      }

      const hasCoDraft =
        Number.isFinite(next.coSysValue) &&
        next.coRg != null &&
        Number.isFinite(next.coRg.x) &&
        Number.isFinite(next.coRg.y);
      const hasC1Draft =
        Number.isFinite(next.c1SysValue) &&
        next.c1Rg != null &&
        Number.isFinite(next.c1Rg.x) &&
        Number.isFinite(next.c1Rg.y);

      if (next.activeMark === mark) {
        if (mark === "CO" && hasC1Draft) {
          next.activeMark = "C1";
        } else if (mark === "C1" && hasCoDraft) {
          next.activeMark = "CO";
        } else {
          next.activeMark = null;
        }
      }

      if (import.meta.env.DEV) {
        console.log("[BASELINE DRAFT CLEAR]", {
          mark,
          activeMark: next.activeMark,
          hasCoDraft,
          hasC1Draft,
        });
      }

      return next;
    });
  }, []);

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

  function buildStrategyPickTrace(slotId, phase) {
    const slot = shotEditor.slots[slotId];
    const payload = buildSlotRuntimePayload(slot);
    return {
      phase,
      selectedStrategyId: slotId,
      activeSlotId: shotEditor.activeSlot,
      userTableDisplaySlotId,
      runtimePayloadTargetBall: payload.targetBall ?? null,
      trajectoryTargetBall: targetColor ?? null,
      trajectoryType: payload.adminSys?.shotType ?? null,
      trajectoryPhase: trajectory.state?.phase ?? null,
      draftShotType: slot?.draft?.shotType ?? null,
      appliedShotType: slot?.applied?.shotType ?? null,
    };
  }

  function emitStrategyPickTrace(_message, _slotId, _phase, _hypothesisId = "Q3") {}

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
    emitAdminTargetStateTrace(phase, "B1", payload);
  }

  function buildAdminTargetStateSnapshot(slotId = shotEditor.activeSlot) {
    const slot = shotEditor.slots[slotId];
    return {
      targetColor: targetColor ?? null,
      isTargetSelected,
      slotRuntimeMetaTargetBall: slot?.draft?.targetBall ?? null,
      draftTargetBall: slot?.draft?.targetBall ?? null,
      appliedTargetBall: slot?.applied?.targetBall ?? null,
      adminStateTargetBall: null,
      adminStateTargetBallNote: "adminState has no targetBall field",
      activeSlot: slotId,
      hasDraft: !!slot?.draft,
      dragStateBallId: dragState.ballId ?? null,
      joystickVisible: dragState.joystickVisible ?? false,
    };
  }

  function emitAdminTargetStateTrace(_message, _hypothesisId, _extra = {}) {}

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
  const saveOnePointLibrary = (next) => {
    setOnePointLibrary(next);
    saveOnePoints(next);
  };
  const sortedOnePointLibrary = useMemo(() => {
    return [...onePointLibrary].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }, [onePointLibrary]);
  const normalizeLesson = (s) => (s || "").trim();
  const onSelectOnePoint = (id) => {
    if (!id) {
      setOnePointSelectedId("");
      setOnePointDraft("");
      return;
    }
    const item = onePointLibrary.find(x => x.id === id);
    if (!item) return;
    setOnePointSelectedId(id);
    setOnePointDraft(item.text);
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
          x.id === onePointSelectedId ? { ...x, text, updatedAt: now } : x
        );
        saveOnePointLibrary(nextLib);
        return;
      }
    }
    const existing = onePointLibrary.find(x => normalizeLesson(x.text) === text);
    if (existing) {
      const nextLib = onePointLibrary.map(x =>
        x.id === existing.id ? { ...x, text, updatedAt: now } : x
      );
      saveOnePointLibrary(nextLib);
      setOnePointSelectedId(existing.id);
      setOnePointDraft(text);
      return;
    }
    const newItem = {
      id: `${now}-${Math.random().toString(16).slice(2)}`,
      text,
      count: 0,
      createdAt: now,
      updatedAt: now,
    };
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

  function emitTargetSelectionTrace(_traceMessage, _ballId, _targetBall, _ballColor) {}

  /** 볼 더블클릭 — setTargetColor / patchSlotRuntimeMeta SSOT */
  function applyTargetFromBallId(ballId, traceMessage) {
    const slotId = shotEditor.activeSlot;
    const before = buildAdminTargetStateSnapshot(slotId);
    const ballColor = resolveBallColorFromId(ballId);
    const targetBall = ballColor;
    emitTargetSelectionTrace(traceMessage, ballId, targetBall, ballColor);
    emitAdminTargetStateTrace(traceMessage, "H1_H2", {
      ballId,
      ballColor,
      targetColor_before: before.targetColor,
      targetColor_after: ballColor,
      isTargetSelected_before: before.isTargetSelected,
      isTargetSelected_after: ballColor ? true : before.isTargetSelected,
      slotRuntimeMetaTargetBall_before: before.slotRuntimeMetaTargetBall,
      draftTargetBall_before: before.draftTargetBall,
      appliedTargetBall_before: before.appliedTargetBall,
      adminStateTargetBall_before: before.adminStateTargetBall,
      patchWillApplyToDraft: before.hasDraft,
    });
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
    const afterSync = buildAdminTargetStateSnapshot(slotId);
    emitAdminTargetStateTrace(`${traceMessage}_SYNC`, "H1", {
      ballId,
      targetColor_after: ballColor,
      draftTargetBall_after_sync: afterSync.draftTargetBall,
      slotRuntimeMetaTargetBall_after_sync: afterSync.slotRuntimeMetaTargetBall,
      note: "React/slot state may update next frame; see POST_FRAME",
    });
    requestAnimationFrame(() => {
      emitAdminTargetStateTrace(`${traceMessage}_POST_FRAME`, "H1_H3", {
        ballId,
        ...buildAdminTargetStateSnapshot(slotId),
      });
    });
  }

  function handleBallDoubleClickForTarget(ballId, e) {
    if (appMode !== "ADMIN") return;
    if (overlayState.open || overlayContent) return;
    e.preventDefault();
    e.stopPropagation();
    applyTargetFromBallId(ballId, "TARGET_SELECTED_BY_DOUBLECLICK");
  }

  const svgRef = useRef(null);
  const derivedRef = useRef({ impact: null, cushionPathAttr: null, cushionPathRg: null });

  // Joystick (mobile fine control)
  const joyIntervalRef = useRef(null);
  const joyDragRef = useRef({ active: false, pointerId: null, lastX: 0, lastY: 0, ballId: null });
  /** 테이블 SVG 볼 드래그 시 직전 포인터 Rg — delta 기반 이동(Ctrl/Shift 스케일)용 */
  const ballDragLastPointerRgRef = useRef(null);
  const JOYSTICK_STEP = 0.1; // Rg
  const JOYSTICK_REPEAT_MS = 60;

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

  /**
   * P0-4c: buildBaselineDraftApplyDelta 결과를 슬롯 SSOT와 병합해 commitDraftSys용 delta 완성.
   * (5½: C3_r = CO_f - C1_f — buildSlotDraftWithUpdatedSys·식 C1_f = CO_f - C3_r 와 동일 관계)
   */
  function mergeBaselineDraftInputDeltaForCommit(
    applyDelta,
    draftState,
    slotMerged,
    systemId
  ) {
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

    const base = { ...applyDelta.inputDelta };
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
    if (applyDelta.targetMark === "CO") {
      const co = base.CO_f;
      const c1FromDraft = draftState.c1SysValue;
      const c1UsesDraft =
        typeof c1FromDraft === "number" && Number.isFinite(c1FromDraft);
      const c1 = c1UsesDraft ? c1FromDraft : c1Slot;
      const c1Source = c1UsesDraft ? "draft.c1SysValue" : "slotMerged.C1_f";
      if (!Number.isFinite(co) || !Number.isFinite(c1)) {
        const early = { branch: "CO_early_return_incomplete", merged: base, co, c1, c1Source };
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
      const early = { branch: "C1_early_return_incomplete", merged: base, co, c1, coSource };
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

  /** P0-4c-2: ✓ 버튼 → baseline draft Apply 체인 */
  function onBaselineDraftApplyClick(mark) {
    console.log("[BASELINE APPLY BUTTON]", mark);
    handleBaselineDraftDoubleClick(mark);
  }

  /** P0-4a/4c: baseline draft Apply SSOT (✓ 버튼에서 호출) */
  function handleBaselineDraftDoubleClick(mark) {
    console.log("[BASELINE DBLCLICK]", { mark, baselineDraftState });
    if (appMode !== "ADMIN" || !showBaseLine) {
      console.log("[BASELINE DBLCLICK] abort", {
        reason: "not ADMIN or showBaseLine off",
        appMode,
        showBaseLine,
      });
      return;
    }
    if (overlayState.open) {
      console.log("[BASELINE DBLCLICK] abort", {
        reason: "overlay open",
        overlayType: overlayState.type,
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
      !trackForAnchors ||
      !systemIdForGrid
    ) {
      console.log("[BASELINE ABORT]", "missing handleRg or track for inverse");
      return;
    }

    const computedSys = baselineSysValueFromHandleRg(
      mark,
      handleRg,
      trackForAnchors,
      systemIdForGrid
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
      systemId: systemIdForGrid,
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

    const activeSlot = shotEditor.activeSlot;
    const slot = shotEditor.slots[activeSlot];
    const slotSys = slot?.draft?.sys ?? slot?.applied?.sys ?? resolvedSlotSys;
    const slotMerged = slotSys
      ? { ...(slotSys.inputs ?? {}), ...(slotSys.outputs?.result ?? {}) }
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

    const systemId = canonicalSystemIdForConfig(systemIdForGrid);
    const trackVal = trackForAnchors ?? slotSys?.track ?? "B2T_L";
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

    const commitResult = actions.commitDraftSys(activeSlot, systemId, inputDelta, {
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
    actions.patchSlotRuntimeMeta(activeSlot, {
      system_values,
      targetBall:
        targetColor === "red" || targetColor === "yellow" ? targetColor : null,
    });

    if (appliedResult && !trajectory.state.adjusted) {
      trajectory.setAdjusting({
        sys: {
          oneC: appliedResult.oneC || 0,
          threeC: appliedResult.threeC || 0,
        },
      });
    }
    if (appliedResult) {
      trajectory.applySysResult(appliedResult);
      console.log("[BASELINE APPLY RESULT]", { applied: true });
    }

    clearAppliedBaselineDraftMark(mark);
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
      saveWorkingDataset,
      setDataset,
      setUserPublishedSearchContext,
      setAdminState,
      patchSlotRuntimeMeta: actions.patchSlotRuntimeMeta,
      saveToFile,
    });
  }

  /** 우측 SAVE: strategy persistence → workspace_history append (snapshot.dataset = result.updated) */
  function handleCanonicalRightPanelSave() {
    if (!canUseSystemControls) {
      alert("Search/로컬DB 편집 세션 및 Target 확정 후 저장할 수 있습니다.");
      return;
    }
    const systemId =
      adminState?.sys?.system_id ?? adminState?.sys?.system ?? "5_half_system";
    if (!systemId || systemId === "null") {
      alert("시스템을 선택하세요 (SYS 설정)");
      return;
    }
    const r = handleSaveStrategy();
    if (!r?.ok) {
      if (import.meta.env.DEV) {
        console.warn("[SAVE] failed", r?.reason);
      }
      if (r?.reason === "missing-balls-state-cue") {
        alert("공 배치(ballsState)를 확인할 수 없습니다. 테이블 공 위치를 확인 후 다시 저장하세요.");
      }
      return;
    }
    commitWorkspaceHistoryWithStrategyDataset(r.updated);
  }

  // SRCH-001: runAdminPositionRecall → application/flows/adminLocalDbFlow.ts (STEP 3-5)

  /** 우측 ADMIN Search (published) — SRCH-002 → adminSearchFlow.runAdminSearch */
  async function handlePositionRecall() {
    if (appMode !== "ADMIN") return;
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

  /** ADMIN→USER: USER session을 새로고침 직후와 동일하게 (recommendedFrom carry-over 금지). */
  const resetUserSearchSessionOnAdminExit = useCallback(() => {
    actions.clearSearchSlotDrafts();
    setUserLastSearchRecord(null);
    setUserTableDisplaySlotId(null);
  }, [actions]);

  /** USER Search: published corpus → userStrict recall → draft apply (SRCH-003 → userSearchFlow.runUserSearch). */
  const handleUserSearchStrategies = useCallback(async () => {
    if (appMode !== "USER") return;
    if (userSearchInFlightRef.current) return;
    userSearchInFlightRef.current = true;
    try {
      await runUserSearch({
        ballsState,
        adminState,
        activeSlot: shotEditor.activeSlot,
        slots: shotEditor.slots,
        targetColor,
        userPublishedSearchContext,
        setUserLastSearchRecord,
        setUserPublishedSearchContext,
        applyUserSearchRecall: actions.applyUserSearchRecall,
        clearSearchSlotDrafts: actions.clearSearchSlotDrafts,
        clearUserSearchDisplayRuntime,
        resetUserSearchTargetSelection,
        showToast: userToast.show,
      });
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
    userToast.show,
    resetUserSearchTargetSelection,
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
function handleJoyPadPointerDown(e) {
  // joysticks should never trigger table pointer logic
  e.preventDefault();
  e.stopPropagation();
  if (!dragState.joystickVisible || !dragState.ballId) return;

  // stop any legacy repeat mode
  stopJoystick();

  joyDragRef.current = {
    active: true,
    pointerId: e.pointerId,
    lastX: e.clientX,
    lastY: e.clientY,
    ballId: dragState.ballId,
  };

  try {
    e.currentTarget.setPointerCapture(e.pointerId);
  } catch {}
}

function handleJoyPadPointerMove(e) {
  if (!joyDragRef.current.active) return;
  if (joyDragRef.current.pointerId !== e.pointerId) return;

  e.preventDefault();
  e.stopPropagation();

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

function handleJoyPadPointerUp(e) {
  if (!joyDragRef.current.active) return;
  if (joyDragRef.current.pointerId !== e.pointerId) return;

  e.preventDefault();
  e.stopPropagation();

  joyDragRef.current.active = false;
  joyDragRef.current.pointerId = null;

  try {
    e.currentTarget.releasePointerCapture(e.pointerId);
  } catch {}
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
      syncSlotRuntimeAdminAndTrajectory(userTableDisplaySlotId);
      return;
    }
    if (!adminTableLayersVisible) return;
    syncSlotRuntimeAdminAndTrajectory(shotEditor.activeSlot);
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
      const hints = resolvePublishedLeafHints(
        adminState?.sys,
        shotEditor.slots,
        shotEditor.activeSlot
      );
      if (hints.shotType || hints.systemId) {
        setUserPublishedSearchContext((ctx) => ({
          shotType: hints.shotType ?? ctx?.shotType ?? null,
          systemId: hints.systemId ?? ctx?.systemId ?? null,
        }));
      }
    }
    prevAppModeForUserSessionRef.current = appMode;
  }, [
    appMode,
    resetUserSearchSessionOnAdminExit,
    adminState?.sys,
    shotEditor.slots,
    shotEditor.activeSlot,
  ]);

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
      const slotIds = ["S1", "S2", "S3"];
      if (!slotIds.includes(slotId)) return;
      emitStrategyPickTrace("STRATEGY_PICK_BEFORE", slotId, "before");
      actions.switchSlot(slotId);
      setOverlayContent(null);
      setOverlayState({ open: false, type: null });
      setUserTableDisplaySlotId(slotId);
      lastHydrateTriggerRef.current = "strategy_pick";
      hydrateSlotRuntime(slotId);
      emitStrategyPickTrace("STRATEGY_PICK_AFTER", slotId, "after");
    };
    onUserStrategySlotPickRegister?.(pickStrategySlot);
    return () => onUserStrategySlotPickRegister?.(null);
  }, [
    appMode,
    actions,
    shotEditor.slots,
    onUserStrategySlotPickRegister,
  ]);

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
      anchorsData: getAnchorsForSystem(systemId),
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
            anchorsData: getAnchorsForSystem(systemId),
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
const BASELINE_ENDPOINT_HIT_RADIUS_RG = 2.5;

/** SYS → 앵커 prep (baseline handle forward 체인용) */
function baselineAnchorPrepFromSys(mark, sysValue, track, systemId) {
  if (!Number.isFinite(sysValue) || !track || !systemId) return null;
  const sysFieldKey = mark === "CO" ? "CO_f" : "C1_f";
  const hit = getAnchorCoordFromSys({
    systemId,
    track,
    mark,
    sysValue,
    sysFieldKey,
  });
  if (!hit) return null;
  return resolveAnchorPoint(
    normalizeAnchor(hit),
    { track, systemId, mark }
  );
}

/**
 * Handle Position SSOT forward: slot CO_f/C1_f → baseline 노란 핸들 Rg.
 * cushionPathBaselineRg[0/1]과 동일 체인 (computeRailImpactPoint + coStartForCushionPath).
 */
function baselineForwardHandleRg(activeMark, coF, c1F, track, systemId) {
  if (
    !Number.isFinite(coF) ||
    !Number.isFinite(c1F) ||
    !track ||
    !systemId
  ) {
    return null;
  }
  const ctx = { track, systemId };
  const coPrep = baselineAnchorPrepFromSys("CO", coF, track, systemId);
  const c1Prep = baselineAnchorPrepFromSys("C1", c1F, track, systemId);
  if (!coPrep || !c1Prep) return null;

  if (activeMark === "CO") {
    const coRail = computeRailImpactPoint(coPrep, c1Prep, { ...ctx, mark: "CO" });
    return coStartForCushionPath(coRail, coPrep, c1Prep);
  }
  if (activeMark === "C1") {
    return computeRailImpactPoint(coPrep, c1Prep, { ...ctx, mark: "C1" });
  }
  return null;
}

function baselineHandleRgDistance(a, b) {
  if (
    !a ||
    !b ||
    !Number.isFinite(a.x) ||
    !Number.isFinite(a.y) ||
    !Number.isFinite(b.x) ||
    !Number.isFinite(b.y)
  ) {
    return Infinity;
  }
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Handle Position SSOT inverse: 핸들 Rg → CO_f 또는 C1_f.
 * Forward와 동일한 computeRailImpactPoint(+coStart) 체인으로 역탐색.
 */
function baselineSysFromHandleRg(
  activeMark,
  handleRg,
  partnerSys,
  track,
  systemId,
  slotSysForMark
) {
  if (
    !handleRg ||
    !Number.isFinite(handleRg.x) ||
    !Number.isFinite(handleRg.y) ||
    !Number.isFinite(partnerSys) ||
    !track ||
    !systemId
  ) {
    return null;
  }

  if (Number.isFinite(slotSysForMark)) {
    const slotCo = activeMark === "CO" ? slotSysForMark : partnerSys;
    const slotC1 = activeMark === "C1" ? slotSysForMark : partnerSys;
    const slotHandle = baselineForwardHandleRg(
      activeMark,
      slotCo,
      slotC1,
      track,
      systemId
    );
    if (baselineHandleRgDistance(slotHandle, handleRg) < 0.02) {
      return slotSysForMark;
    }
  }

  let bestSys = null;
  let bestDist = Infinity;

  for (let s = 0; s <= 90; s += 0.05) {
    const trialCo = activeMark === "CO" ? s : partnerSys;
    const trialC1 = activeMark === "C1" ? s : partnerSys;
    const candidate = baselineForwardHandleRg(
      activeMark,
      trialCo,
      trialC1,
      track,
      systemId
    );
    const d = baselineHandleRgDistance(candidate, handleRg);
    if (d < bestDist) {
      bestDist = d;
      bestSys = s;
    }
  }

  if (bestSys == null) return null;

  const refineLo = Math.max(0, bestSys - 0.5);
  const refineHi = Math.min(90, bestSys + 0.5);
  for (let s = refineLo; s <= refineHi; s += 0.002) {
    const trialCo = activeMark === "CO" ? s : partnerSys;
    const trialC1 = activeMark === "C1" ? s : partnerSys;
    const candidate = baselineForwardHandleRg(
      activeMark,
      trialCo,
      trialC1,
      track,
      systemId
    );
    const d = baselineHandleRgDistance(candidate, handleRg);
    if (d < bestDist) {
      bestDist = d;
      bestSys = s;
    }
  }

  return bestSys;
}

function baselinePartnerAndSlotSys(activeMark, snapshot) {
  const ssot = baselineLabelSsotRef.current;
  const coSlot =
    snapshot?.CO_f ?? getLabelNumericSuffix("CO", ssot);
  const c1Slot =
    snapshot?.C1_f ?? getLabelNumericSuffix("C1", ssot);
  if (activeMark === "CO") {
    return {
      partnerSys: c1Slot,
      slotSysForMark: coSlot,
    };
  }
  return {
    partnerSys: coSlot,
    slotSysForMark: c1Slot,
  };
}

function baselineSysValueFromHandleRg(activeMark, handleRg, track, systemId) {
  const { partnerSys, slotSysForMark } = baselinePartnerAndSlotSys(
    activeMark,
    baselineLabelSlotSnapshotRef.current
  );
  if (!Number.isFinite(partnerSys)) return null;
  return baselineSysFromHandleRg(
    activeMark,
    handleRg,
    partnerSys,
    track,
    systemId,
    slotSysForMark
  );
}

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

function canBaselineEndpointDraftDrag() {
  return (
    appMode === "ADMIN" &&
    showBaseLine &&
    systemIdForGrid === "5_half_system" &&
    !!trackForAnchors?.startsWith("B2T")
  );
}

function tryStartCoBaselineDraftDrag(e, pointerRg, coHandleRg) {
  if (
    !coHandleRg ||
    !Number.isFinite(coHandleRg.x) ||
    !Number.isFinite(coHandleRg.y)
  ) {
    return false;
  }
  const dist = Math.hypot(pointerRg.x - coHandleRg.x, pointerRg.y - coHandleRg.y);
  if (dist > BASELINE_ENDPOINT_HIT_RADIUS_RG) return false;

  baselineLabelSlotSnapshotRef.current = captureBaselineLabelSlotSnapshot(
    baselineLabelSsotRef.current
  );
  setBaselineDraftState((prev) => ({
    ...prev,
    activeMark: "CO",
    draggingMark: "CO",
    coRg: { x: coHandleRg.x, y: coHandleRg.y },
    coSysValue: null,
  }));
  try {
    svgRef.current?.setPointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
  return true;
}

function tryStartC1BaselineDraftDrag(e, pointerRg, c1HandleRg) {
  if (
    !c1HandleRg ||
    !Number.isFinite(c1HandleRg.x) ||
    !Number.isFinite(c1HandleRg.y)
  ) {
    return false;
  }
  const dist = Math.hypot(pointerRg.x - c1HandleRg.x, pointerRg.y - c1HandleRg.y);
  if (dist > BASELINE_ENDPOINT_HIT_RADIUS_RG) return false;

  baselineLabelSlotSnapshotRef.current = captureBaselineLabelSlotSnapshot(
    baselineLabelSsotRef.current
  );
  setBaselineDraftState((prev) => ({
    ...prev,
    activeMark: "C1",
    draggingMark: "C1",
    c1Rg: { x: c1HandleRg.x, y: c1HandleRg.y },
    c1SysValue: null,
  }));
  try {
    svgRef.current?.setPointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
  return true;
}

function tryStartBaselineEndpointDraftDrag(e, pointerRg) {
  if (!canBaselineEndpointDraftDrag()) return false;

  const coHandleRg =
    baselineDraftState.coRg ?? baselineCoHandleRgRef.current;
  const c1HandleRg =
    baselineDraftState.c1Rg ?? baselineC1HandleRgRef.current;

  const dCo =
    coHandleRg &&
    Number.isFinite(coHandleRg.x) &&
    Number.isFinite(coHandleRg.y)
      ? Math.hypot(pointerRg.x - coHandleRg.x, pointerRg.y - coHandleRg.y)
      : Infinity;
  const dC1 =
    c1HandleRg &&
    Number.isFinite(c1HandleRg.x) &&
    Number.isFinite(c1HandleRg.y)
      ? Math.hypot(pointerRg.x - c1HandleRg.x, pointerRg.y - c1HandleRg.y)
      : Infinity;

  const R = BASELINE_ENDPOINT_HIT_RADIUS_RG;
  if (dC1 <= R && (dCo > R || dC1 < dCo)) {
    return tryStartC1BaselineDraftDrag(e, pointerRg, c1HandleRg);
  }
  if (dCo <= R) {
    return tryStartCoBaselineDraftDrag(e, pointerRg, coHandleRg);
  }
  return false;
}

function endCoBaselineDraftDrag(e) {
  if (baselineDraftState.draggingMark !== "CO") return false;
  const coRg = baselineDraftState.coRg;
  setBaselineDraftState((prev) => ({
    ...prev,
    coRg: coRg ? { x: coRg.x, y: coRg.y } : prev.coRg,
    activeMark: "CO",
    draggingMark: null,
  }));
  try {
    if (svgRef.current && e?.pointerId != null) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
  } catch {
    /* ignore */
  }
  return true;
}

function endC1BaselineDraftDrag(e) {
  if (baselineDraftState.draggingMark !== "C1") return false;
  const c1Rg = baselineDraftState.c1Rg;
  setBaselineDraftState((prev) => ({
    ...prev,
    c1Rg: c1Rg ? { x: c1Rg.x, y: c1Rg.y } : prev.c1Rg,
    activeMark: "C1",
    draggingMark: null,
  }));
  try {
    if (svgRef.current && e?.pointerId != null) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
  } catch {
    /* ignore */
  }
  return true;
}

function handlePointerDown(e) {
  // ✅ GUARD: 오버레이 열려있으면 SVG 이벤트 차단
  if (overlayState.open) return;

  if (!svgRef.current) return;
  const pointerRgEarly = pointerToRg(e, svgRef.current, SCALE, TABLE_H, PADDING);
  if (pointerRgEarly && tryStartBaselineEndpointDraftDrag(e, pointerRgEarly)) {
    console.log("[BASELINE SVG POINTERDOWN]", "baseline drag captured", {
      pointerId: e.pointerId,
      target: e.target?.nodeName,
    });
    return;
  }

  // ✅ Rule: joystick closes ONLY when user taps OUTSIDE the joystick.
  // - tap inside joystick: ignore (do not change selection)
  // - tap outside joystick: close joystick immediately and return
  if (dragState.joystickVisible) {
    const inJoy = e.target?.closest?.('[data-joystick="1"]');
    if (inJoy) return;

    stopJoystick();
    // cancel any ongoing joystick drag
    joyDragRef.current = { active: false, pointerId: null, lastX: 0, lastY: 0, ballId: null };
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
    return;
  }

  if (overlayContent) return; // 오버레이 활성 시 비활성화
  if (!svgRef.current) return;

  const pointerRg = pointerToRg(e, svgRef.current, SCALE, TABLE_H, PADDING);
  if (!pointerRg) return;

  // hit-test: 선택 반경 1.35배 (UX 개선)
  const PICK_RADIUS_RG = BALL_RADIUS_RG * 1.35;
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

    if (dist <= PICK_RADIUS_RG && dist < minDist) {
      minDist = dist;
      closestBall = { id: ballId, pos: ballPos };
    }
  }

  // 🔴 공을 못 잡았을 때
  if (!closestBall) {
    // ❗ 조이스틱이 떠 있어도 여기서는 닫지 않음
    // (전용 닫기 영역에서만 닫도록 별도 처리)
    return;
  }


  // ✅ 공을 다시 터치한 경우 → 조이스틱 재설정
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

  svgRef.current.setPointerCapture(e.pointerId);
}

function handlePointerMove(e) {
  // ✅ GUARD: 오버레이 열려있으면 SVG 이벤트 차단
  if (overlayState.open) return;

  if (baselineDraftState.draggingMark === "CO" && svgRef.current) {
    const pointerRg = pointerToRg(e, svgRef.current, SCALE, TABLE_H, PADDING);
    if (pointerRg) {
      const rail = coDepartureRailForTrack(trackForAnchors);
      const snapped = projectPointToRail(pointerRg, rail);
      if (snapped) {
        setBaselineDraftState((prev) =>
          prev.draggingMark === "CO" ? { ...prev, coRg: snapped } : prev
        );
      }
    }
    return;
  }

  if (baselineDraftState.draggingMark === "C1" && svgRef.current) {
    const pointerRg = pointerToRg(e, svgRef.current, SCALE, TABLE_H, PADDING);
    if (pointerRg) {
      const rail = c1ArrivalRailForTrack(trackForAnchors);
      const snapped = projectPointToRail(pointerRg, rail);
      if (snapped) {
        setBaselineDraftState((prev) =>
          prev.draggingMark === "C1" ? { ...prev, c1Rg: snapped } : prev
        );
      }
    }
    return;
  }

  if (!dragState.dragging || !dragState.ballId || !svgRef.current) return;

  const pointerRg = pointerToRg(e, svgRef.current, SCALE, TABLE_H, PADDING);
  if (!pointerRg) return;

  const lastRg = ballDragLastPointerRgRef.current;
  if (!lastRg) {
    ballDragLastPointerRgRef.current = { x: pointerRg.x, y: pointerRg.y };
    return;
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

  if (endCoBaselineDraftDrag(e)) return;
  if (endC1BaselineDraftDrag(e)) return;

  if (!dragState.dragging || !dragState.ballId) return;
  stopJoystick();

  const draggedBall = { ...balls[dragState.ballId] };
  const otherBalls = Object.entries(balls)
    .filter(([id]) => id !== dragState.ballId)
    .map(([, pos]) => pos);

  const success = autoSeparate(draggedBall, otherBalls);

  const nextBallPos = success ? draggedBall : dragState.previousPosRg;
  if (success) {
    setBallsState((prev) => ({
      ...prev,
      [dragState.ballId]: draggedBall,
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

  if (
    canEdit &&
    !isAdminInputSessionActive &&
    nextBallPos &&
    (dragState.ballId === "cue" ||
      dragState.ballId === "target" ||
      dragState.ballId === "target_center")
  ) {
    const nextBalls = { ...balls, [dragState.ballId]: nextBallPos };
    const cuePos = nextBalls.cue;
    const targetPos = nextBalls.target_center ?? nextBalls.target;
    if (cuePos && targetPos) {
      const computed = computeSystemFromPositions({ cue: cuePos, target: targetPos });
      if (Object.keys(computed).length > 0) {
        setAdminState((prev) => {
          const p = prev || {};
          const prevSys = p?.sys ?? {};
          const prevVals = prevSys?.systemValues ?? prevSys?.inputs ?? {};
          return {
            ...p,
            sys: {
              ...prevSys,
              systemValues: { ...prevVals, ...computed },
              inputs: { ...(prevSys?.inputs ?? {}), ...computed },
            },
          };
        });
      }
    }
  }

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
  if (endCoBaselineDraftDrag(e)) return;
  if (endC1BaselineDraftDrag(e)) return;
  stopJoystick();
  // cancel은 드래그 종료로 처리
  handlePointerUp(e);
}

  // RND-004(partial): buildRgAnchors (Batch 2 STEP 2-5)
  // D-005 주의: SYSTEM_PROFILES 직접 참조 → Batch 6 Runtime Contract 해소 예정
  const override = adminState?.anchorsOverride ?? {};
  const { anchors, anchorsBase } = buildRgAnchors({
    rawAnchors,
    rawAnchorsBase,
    canonical,
    systemValues: system?.values,
    profileForCanonical: SYSTEM_PROFILES?.[systemIdForGrid],
    anchorsOverride: override,
  });

  // ⚠️ convertCanonicalAnchors가 이미 Fg → Rg 변환을 함!
  // 따라서 anchors.CO, anchors["C1"]는 Rg 좌표
  // determineRotation에는 원본 Fg 좌표가 필요
  
  const CO_rg_converted = anchors.CO;      // 이미 Rg
  const C1_rg_converted = anchors["C1"];   // 이미 Rg

  const resolveAnchorCtx = {
    track: trackForAnchors,
    systemId: systemIdForGrid,
  };

  const CO_anchor = normalizeAnchor(rawAnchors.CO);
  const C1_anchor = normalizeAnchor(rawAnchors["C1"]);
  const CO_prep = resolveAnchorPoint(CO_anchor, resolveAnchorCtx);
  const C1_prep = resolveAnchorPoint(C1_anchor, resolveAnchorCtx);

  const isBottomCO =
    CO_prep && Math.abs(CO_prep.y + 2.25) < 0.5;

  let CO_rail = CO_prep;

  if (isBottomCO && CO_prep && C1_prep) {
    const pt = computeRailImpactPoint(CO_prep, C1_prep, {
      ...resolveAnchorCtx,
      mark: "CO",
    });

    if (pt) {
      CO_rail = pt;
    }
  }

  const C1_rail =
    CO_prep && C1_prep
      ? computeRailImpactPoint(CO_prep, C1_prep, { ...resolveAnchorCtx, mark: "C1" })
      : null;

  /** 빨간 궤적·CO→C1 선 시작점 (Rg). isBottomCO 외 Fg CO_rail 보정 */
  const CO_path0 = coStartForCushionPath(CO_rail, CO_prep, C1_prep);

  // C2 fallback: anchors["C2"] 없을 때 reflection engine으로 C2 자동 생성
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

  /** Base Line 앞구간(CO→C1→C2): anchorsBase 전용 레일 교점 */
  let CO_path0_base = null;
  let C1_rail_base = null;
  let C2_path_base = null;
  if (anchorsBase) {
    const CO_anchor_bb = normalizeAnchor(anchorsBase.CO);
    const C1_anchor_bb = normalizeAnchor(anchorsBase["C1"]);
    const CO_prep_bb = resolveAnchorPoint(CO_anchor_bb, resolveAnchorCtx);
    const C1_prep_bb = resolveAnchorPoint(C1_anchor_bb, resolveAnchorCtx);
    if (CO_prep_bb && C1_prep_bb) {
      let CO_rail_bb = CO_prep_bb;
      const isBottomCO_bb = Math.abs(CO_prep_bb.y + 2.25) < 0.5;
      if (isBottomCO_bb) {
        const ptCO = computeRailImpactPoint(CO_prep_bb, C1_prep_bb, {
          ...resolveAnchorCtx,
          mark: "CO",
        });
        if (ptCO) CO_rail_bb = ptCO;
      }
      const C1_rail_bb = computeRailImpactPoint(CO_prep_bb, C1_prep_bb, {
        ...resolveAnchorCtx,
        mark: "C1",
      });
      CO_path0_base = coStartForCushionPath(CO_rail_bb, CO_prep_bb, C1_prep_bb);
      C1_rail_base = C1_rail_bb;

      const C3_anchor_bb = anchorsBase["C3"];
      const C3_prep_bb = resolveAnchorPoint(
        normalizeAnchor(C3_anchor_bb),
        resolveAnchorCtx
      );
      const C3_point_bb =
        C3_prep_bb ??
        (C3_anchor_bb &&
        typeof C3_anchor_bb === "object" &&
        "coord" in C3_anchor_bb &&
        C3_anchor_bb.coord
          ? C3_anchor_bb.coord
          : C3_anchor_bb);
      const C3_snapped_bb = snapToRail(C3_point_bb) ?? C3_point_bb;

      let C2_bb = anchorsBase["C2"];
      if (!C2_bb && CO_rail_bb && C1_rail_bb && C3_snapped_bb) {
        const refBb = computeReflectionC2({
          co: CO_rail_bb,
          c1: C1_rail_bb,
          c3: C3_snapped_bb,
          tip: currentTip ?? null,
          track: trackForAnchors ?? undefined,
          manualHint: c2ManualHint ?? null,
        });
        C2_bb = refBb?.c2 ?? null;
      }
      const c2Sem_bb = anchorSemanticForPath(C2_bb, resolveAnchorCtx);
      C2_path_base =
        C1_rail_base && c2Sem_bb
          ? firstRailHitTowardTarget(C1_rail_base, c2Sem_bb)
          : null;
    }
  }

  const C3_anchor = anchors["C3"];
  const C3_prep = resolveAnchorPoint(normalizeAnchor(C3_anchor), resolveAnchorCtx);
  const C3_point =
    C3_prep ??
    (C3_anchor && typeof C3_anchor === "object" && "coord" in C3_anchor && C3_anchor.coord
      ? C3_anchor.coord
      : C3_anchor);
  const C3_snapped = snapToRail(C3_point) ?? C3_point;

  if (anchors["C2"]) {
    console.log("[C2_ANALYZE] C2 from anchors (stored), reflection skip", {
      "anchors[C2]": anchors["C2"],
    });
  }

  const reflected =
    !anchors["C2"] && CO_rail && C1_rail && C3_snapped
      ? (() => {
          const c1Rail = detectRail(C1_rail);
          const c3Rail = detectRail(C3_snapped);
          if (!c1Rail || !c3Rail) {
            console.log("[C2_ANALYZE] input (rail detection failed)", {
              CO_rail,
              C1_rail,
              C3_original: C3_point,
              C3_snapped,
              c1Rail,
              c3Rail,
            });
            console.log("[C2_ANALYZE] failure summary", {
              railDetection: "FAIL",
              snapImpact: "N/A",
              rayDirection: "N/A",
              railOrdering: "N/A",
              intersectionState: "N/A",
              segmentCheck: "N/A",
              guardBlocked: "N/A",
              primaryCause: "Rail Detection 실패",
            });
            return computeReflectionC2({
              co: CO_rail,
              c1: C1_rail,
              c3: C3_snapped,
              tip: currentTip ?? null,
              track: trackForAnchors ?? undefined,
              manualHint: c2ManualHint ?? null,
            });
          }
          const thetaInDeg = angleDeg(CO_rail, C1_rail);
          const spinAdjustDeg = resolveSignedSpinDeg(
            trackForAnchors,
            currentTip ?? null,
            c2ManualHint?.deltaAngleDeg ?? 0
          );
          const thetaOutDeg = thetaInDeg + spinAdjustDeg;
          const chosen = chooseCandidateRail(
            c1Rail,
            trackForAnchors,
            c2ManualHint?.preferredRail
          );
          const orderedRails = [
            chosen.rail,
            ...chosen.candidates.filter((r) => r !== chosen.rail),
          ];

          const dx_snap = C3_point && C3_snapped
            ? Math.abs(C3_point.x - C3_snapped.x)
            : 0;
          const dy_snap = C3_point && C3_snapped
            ? Math.abs(C3_point.y - C3_snapped.y)
            : 0;

          const dir_C1_to_C3 = (() => {
            const dx = C3_snapped.x - C1_rail.x;
            const dy = C3_snapped.y - C1_rail.y;
            const len = Math.hypot(dx, dy);
            if (len < 1e-9) return { x: 0, y: 0 };
            return { x: dx / len, y: dy / len };
          })();
          const ray = directionFromAngleDeg(thetaOutDeg);
          const dotDirRay = dir_C1_to_C3.x * ray.dx + dir_C1_to_C3.y * ray.dy;

          const profile = SYSTEM_PROFILES?.[systemIdForGrid];
          const m_min = profile?.safety?.m_min ?? 0.05;
          const theta_t_max = profile?.safety?.theta_t_max ?? 68;

          const B2T_R_expected = ["RIGHT", "BOTTOM", "LEFT"];
          const railOrderingOk =
            trackForAnchors === "B2T_R"
              ? JSON.stringify(orderedRails) === JSON.stringify(B2T_R_expected)
              : true;

          console.log("[C2_ANALYZE] input", {
            CO_rail,
            C1_rail,
            C3_original: C3_point,
            C3_snapped,
            dx_snap,
            dy_snap,
            dir_C1_to_C3,
            ray,
            dotDirRay,
            rayDirectionReversed: dotDirRay < 0,
            c1Rail,
            c3Rail,
            thetaInDeg,
            spinAdjustDeg,
            thetaOutDeg,
            orderedRails,
            selectedBy: chosen.selectedBy,
            railOrderingOk,
            B2T_R_expected: trackForAnchors === "B2T_R" ? B2T_R_expected : null,
            m_min,
            theta_t_max,
          });

          const RG_W = 80;
          const RG_H = 40;

          const triedRails = orderedRails.map((rail) => {
            const p = intersectRayWithRail(C1_rail, thetaOutDeg, rail);
            const { dx, dy } = (() => {
              const rad = (thetaOutDeg * Math.PI) / 180;
              return { dx: Math.cos(rad), dy: Math.sin(rad) };
            })();
            let rejectedReason = null;
            let segmentOk = null;
            if (!p) {
              if (rail === "TOP" || rail === "BOTTOM") {
                rejectedReason = Math.abs(dy) < 1e-9 ? "평행(ray 수평)" : "t<=0 또는 세그먼트 밖";
              } else {
                rejectedReason = Math.abs(dx) < 1e-9 ? "평행(ray 수직)" : "t<=0 또는 세그먼트 밖";
              }
            } else {
              segmentOk =
                p.x >= 0 && p.x <= RG_W && p.y >= 0 && p.y <= RG_H;
            }
            return {
              rail,
              candidateIntersection: p,
              rejectedReason: p ? null : rejectedReason,
              segmentOk: p ? segmentOk : null,
            };
          });

          triedRails.forEach((tr) => {
            console.log("[C2_ANALYZE] rail candidate", {
              rail: tr.rail,
              lineFrom: C1_rail,
              lineTo: C3_snapped,
              candidateIntersection: tr.candidateIntersection,
              rejectedReason: tr.rejectedReason,
              segmentOk: tr.segmentOk,
            });
          });

          const result = computeReflectionC2({
            co: CO_rail,
            c1: C1_rail,
            c3: C3_snapped,
            tip: currentTip ?? null,
            track: trackForAnchors ?? undefined,
            manualHint: c2ManualHint ?? null,
          });

          const hasIntersection = triedRails.some((t) => t.candidateIntersection != null);
          const anySegmentOutside =
            triedRails.some(
              (t) => t.candidateIntersection != null && t.segmentOk === false
            );
          const guardBlocked =
            Math.abs(thetaOutDeg) > theta_t_max;

          const snapImpact =
            dy_snap <= 3 && dx_snap < 0.01 ? "NONE" : dy_snap > 5 || dx_snap > 2 ? "LARGE" : "SMALL";

          if (!result) {
            let primaryCause = "unknown";
            if (!c1Rail || !c3Rail) primaryCause = "Rail Detection 실패";
            else if (dotDirRay < 0) primaryCause = "Ray 방향 반대";
            else if (!railOrderingOk) primaryCause = "Rail ordering 오류";
            else if (!hasIntersection) primaryCause = "모든 rail 교차점 없음";
            else if (anySegmentOutside) primaryCause = "Segment 범위 밖";
            else if (guardBlocked) primaryCause = "Reflection guard 차단";
            else if (snapImpact === "LARGE") primaryCause = "C3 snap 영향";
            else primaryCause = "교차 판정 조건 문제";

            console.log("[C2_ANALYZE] failure summary", {
              railDetection: c1Rail && c3Rail ? "OK" : "FAIL",
              snapImpact,
              rayDirection: dotDirRay >= 0 ? "OK" : "REVERSED",
              railOrdering: railOrderingOk ? "OK" : "WRONG",
              intersectionState: hasIntersection ? "EXISTS" : "NONE",
              segmentCheck: anySegmentOutside ? "OUTSIDE" : "OK",
              guardBlocked: guardBlocked ? "YES" : "NO",
              primaryCause,
              c2Candidates: triedRails
                .filter((t) => t.candidateIntersection)
                .map((t) => ({ rail: t.rail, point: t.candidateIntersection })),
              triedRails: triedRails.map((t) => ({
                rail: t.rail,
                intersection: t.candidateIntersection,
                rejectedReason: t.rejectedReason,
                segmentOk: t.segmentOk,
              })),
            });
          }

          return result;
        })()
      : null;

  const C2 = anchors["C2"] ?? reflected?.c2 ?? null;
  // 라벨 표시는 원본 좌표를 유지하고, snapped는 trajectory/계산 전용으로 분리한다.
  const C3_label = C3_point ?? C3_anchor;

  if (reflected && canEdit) {
    console.log("🔷 C2 reflection fallback:", reflected.diagnostics);
  }

  const C4_anchor = anchors["C4"];
  const C4_prep = resolveAnchorPoint(normalizeAnchor(C4_anchor), resolveAnchorCtx);
  const C4_point =
    C4_prep ??
    (C4_anchor && typeof C4_anchor === "object" && "coord" in C4_anchor && C4_anchor.coord
      ? C4_anchor.coord
      : C4_anchor);
  const C4 = C4_anchor;

  const C5_anchor = anchors["C5"];
  const C5_prep = resolveAnchorPoint(normalizeAnchor(C5_anchor), resolveAnchorCtx);
  const C5_point =
    C5_prep ??
    (C5_anchor && typeof C5_anchor === "object" && "coord" in C5_anchor && C5_anchor.coord
      ? C5_anchor.coord
      : C5_anchor);
  const C5 = C5_anchor;

  const C6_anchor = anchors["C6"];
  const C6_prep = resolveAnchorPoint(normalizeAnchor(C6_anchor), resolveAnchorCtx);
  const C6_point =
    C6_prep ??
    (C6_anchor && typeof C6_anchor === "object" && "coord" in C6_anchor && C6_anchor.coord
      ? C6_anchor.coord
      : C6_anchor);
  const C6 = C6_anchor;

  const cueBall = balls.cue;
  const yellowBall = getYellowBallCoords(balls);
  const redBall = getRedBallCoords(balls);
  const targetBall =
    targetColor === "red"
      ? redBall
      : targetColor === "yellow"
        ? yellowBall
        : yellowBall ?? redBall ?? null;
  const secondBall =
    targetColor === "red"
      ? yellowBall
      : targetColor === "yellow"
        ? redBall
        : redBall ?? yellowBall ?? null;

  const impactCO = CO_prep ?? CO_rail ?? { x: cueBall?.x ?? 0, y: cueBall?.y ?? 0 };
  const impactC1 = C1_prep ?? C1_rail ?? impactCO;
  const impactTargetBall =
    targetBall && Number.isFinite(targetBall.x) && Number.isFinite(targetBall.y)
      ? targetBall
      : balls.target_center ?? balls.target ?? null;
  const impactRaw = calculateImpact(
    cueBall ?? balls.cue,
    impactTargetBall,
    impactCO,
    impactC1,
    thicknessForCalc || "1/2",
    view.pattern || "뒤돌리기",
    BALL_DIAMETER_RG,
    BALL_RADIUS_RG
  );
  const impact = dragState.dragging ? dragState.frozenImpact : impactRaw;

  // CO→C1 선은 레일(Rg) 시작점 — Fg 의미점과 분리 (CO_line ≠ 라벨 좌표일 수 있음)
  const C1_line = C1_rail;

  // CO Dual Trajectory: 보정선 (양수 unifiedSlide / curve_ratio 시 CO_corrected 표시)
  const corrections = slotRenderSys?.corrections ?? {};
  const corrBundleForCurve = {
    slide: corrections.slide ?? 0,
    draw: corrections.draw ?? 0,
  };
  const shotTypeForCurve = slotRenderSys?.shotType || "뒤돌리기";
  const unifiedSlideForCurve = unifiedSlideFromCorrections(
    corrBundleForCurve,
    shotTypeForCurve
  );
  const curveVal = Number(corrections.curve_ratio) || 0;
  const slidePortionForCoLine =
    unifiedSlideForCurve > 0 ? unifiedSlideForCurve : 0;
  const totalCorrection = slidePortionForCoLine + curveVal;
  const hasCorrection = slidePortionForCoLine !== 0 || curveVal !== 0;

  let CO_corrected_line = null;
  if (hasCorrection && CO_path0 && C1_rail) {
    // 레일 방향으로 CO를 totalCorrection만큼 이동 (1 sys unit ≈ 1 grid unit)
    const isBottomRail = Math.abs(CO_path0.y - 0) < 0.5;
    const isTopRail = Math.abs(CO_path0.y - 40) < 0.5;
    const isLeftRail = Math.abs(CO_path0.x - 0) < 0.5;
    const isRightRail = Math.abs(CO_path0.x - 80) < 0.5;
    if (isBottomRail || isTopRail) {
      CO_corrected_line = { x: CO_path0.x + totalCorrection, y: CO_path0.y };
    } else if (isLeftRail || isRightRail) {
      CO_corrected_line = { x: CO_path0.x, y: CO_path0.y + totalCorrection };
    } else {
      CO_corrected_line = { x: CO_path0.x + totalCorrection, y: CO_path0.y };
    }
  }

  const CO_line = CO_path0;

  console.log("🔷 레일 교점:", {
    "CO_prep (의미점)": CO_prep,
    "C1_prep (의미점)": C1_prep,
    "CO_rail": CO_rail,
    CO_path0,
    "C1_rail (SSOT)": C1_rail
  });

  const HIT_TOLERANCE = Math.max(2, BALL_RADIUS_RG * 4);

  // 궤적: 각 구간은 이전 레일 교점 → 다음 앵커 의미점 방향의 첫 레일 교점까지만 (anchor.coord는 방향 기준, 노란점/앵커 데이터는 변경 없음)
  const c2Sem = anchorSemanticForPath(C2, resolveAnchorCtx);
  const c3Sem = C3_point ?? anchorSemanticForPath(C3_anchor, resolveAnchorCtx);
  const c4Sem = C4_point ?? anchorSemanticForPath(C4_anchor, resolveAnchorCtx);
  const c5Sem = C5_point ?? anchorSemanticForPath(C5_anchor, resolveAnchorCtx);
  const c6Sem = C6_point ?? anchorSemanticForPath(C6_anchor, resolveAnchorCtx);

  const C2_path =
    C1_rail && c2Sem ? firstRailHitTowardTarget(C1_rail, c2Sem) : null;
  const C3_path =
    C2_path && c3Sem ? firstRailHitTowardTarget(C2_path, c3Sem) : null;
  const C4_path =
    C3_path && c4Sem ? firstRailHitTowardTarget(C3_path, c4Sem) : null;
  const C5_path =
    C4_path && c5Sem ? firstRailHitTowardTarget(C4_path, c5Sem) : null;
  const C6_path =
    C5_path && c6Sem ? firstRailHitTowardTarget(C5_path, c6Sem) : null;

  const pathNodesRaw = [
    CO_path0,
    C1_rail,
    C2_path,
    C3_path,
    C4_path,
    C5_path,
    C6_path,
  ];
  // DEBUG: spin 보정 비활성화 — pathNodesRaw(순수 교점 궤적) 그대로 사용. 아래 for 블록 주석 해제로 복구.
  const adjustedNodes = [...pathNodesRaw];
  /*
  for (let i = 3; i < adjustedNodes.length - 1; i++) {
    const A = adjustedNodes[i - 1];
    const B = adjustedNodes[i];
    const C = adjustedNodes[i + 1];
    if (!A || !B || !C) continue;

    const progress = spinPathComputeProgress(adjustedNodes, i);
    const spinFactor = spinPathGetSpinFactor(progress);
    const baseSpin = (adminState?.str?.spin ?? 1.0) * spinFactor;
    const type = spinPathGetDirectionType(A, B, C);
    const v = { x: C.x - B.x, y: C.y - B.y };
    const v2 = spinPathApplySpin(v, baseSpin, type);
    adjustedNodes[i + 1] = { x: B.x + v2.x, y: B.y + v2.y };

    if (import.meta.env.DEV) {
      console.log("[SPIN]", { index: i, progress, spinFactor, type });
    }
  }
  */
  const pathNodes = adjustedNodes;

  const secondPoint =
    secondBall &&
    Number.isFinite(secondBall.x) &&
    Number.isFinite(secondBall.y)
      ? { x: secondBall.x, y: secondBall.y }
      : null;

  const capCorrected = resolveTrajectoryDisplayCap(
    pathNodes,
    secondPoint,
    HIT_TOLERANCE
  );
  const cushionPath = slicePathNodesToCap(pathNodes, capCorrected);

  let capBaseline = capCorrected;

  const calcImpactForContact = calcImpactBall(
    cueBall ?? balls.cue,
    impactTargetBall,
    adminState?.hpt?.T ?? "8/8"
  );
  const impactContactRg = balls.impact ?? calcImpactForContact;

  const useCurveDeform =
    !!impactContactRg &&
    !!pathNodes[0] &&
    !!pathNodes[1] &&
    Math.abs(unifiedSlideForCurve) > CURVE_EPS;
  console.log("[FIX] useCurveDeform:", useCurveDeform);

  let curvePointsLen = 0;
  let curvePointsSampleRg = [];

  /** CO → curve(P…M) → 이후 쿠션 궤적. tail은 display cap 반영된 cushionPath 사용. CO는 polyline에 넣지 않음(직선 구간 제거). */
  let cushionPathForRender;
  if (useCurveDeform) {
    console.log("[H-App]", {
      canEdit,
      unifiedSlideForCurve,
      corrSlotSlide: corrections?.slide,
      corrSlotDraw: corrections?.draw,
      corrBundleForCurve,
    });
    const curveSegment = createCurveSegment(
      impactContactRg,
      pathNodes[0],
      pathNodes[1],
      unifiedSlideForCurve
    );
    console.log("[PATH AFTER CURVE]", {
      curveLast: curveSegment[curveSegment.length - 1],
      nextTailFirst: cushionPath?.[1],
      tailPreview: cushionPath?.slice(1, 4),
    });
    curvePointsLen = curveSegment.length;
    curvePointsSampleRg = curveSegment
      .slice(0, 5)
      .map((p) => ({ x: p.x, y: p.y }));
    /** 빨간 polyline에서 CO_eff→임팩트 접점 직선만 제외: curve는 이미 impactContactRg에서 시작 */
    cushionPathForRender =
      curveSegment.length > 0
        ? [...curveSegment, ...cushionPath.slice(1)]
        : cushionPath;
  } else {
    cushionPathForRender = cushionPath;
  }

  console.log("[RENDER PATH CHECK]", {
    useCurveDeform,
    length: cushionPathForRender.length,
    first: cushionPathForRender[0],
    mid: cushionPathForRender[Math.floor(cushionPathForRender.length / 2)],
    last: cushionPathForRender[cushionPathForRender.length - 1],
  });

  const rgSample = (arr, n) =>
    !Array.isArray(arr) || arr.length === 0
      ? []
      : arr
          .slice(0, n)
          .map((p) =>
            p && typeof p.x === "number" && typeof p.y === "number"
              ? { x: p.x, y: p.y }
              : p
          );

  const cushionPathAttrRaw = cushionPathForRender.map((pt) => {
    const p = toPx(pt, SCALE, TABLE_H);
    return `${p.x + PADDING},${p.y + PADDING}`;
  }).join(" ");
  // 최신 파생 결과를 ref에 보관 (pointerdown에서 Freeze 캡처용)
  derivedRef.current = {
    impact: impactRaw,
    cushionPathAttr: cushionPathAttrRaw,
    cushionPathRg: cushionPathForRender.map((p) =>
      p && typeof p.x === "number" && typeof p.y === "number"
        ? { x: p.x, y: p.y }
        : p
    ),
  };

  const cushionPathAttr = dragState.dragging
    ? dragState.frozenCushionPathAttr || cushionPathAttrRaw
    : cushionPathAttrRaw;

  const cushionPathForImpactLines = useCurveDeform
    ? cushionPathForRender
    : dragState.dragging && dragState.frozenCushionPathRg
      ? dragState.frozenCushionPathRg
      : cushionPathForRender;


  let cushionPathAttrBase = null;
  /** Base Line ON 시 궤적 소스 — slide/draw/curve/spin 0·Sn 유지 슬롯과 동일 레일 교점 열 */
  let cushionPathBaselineRg = null;
  if (anchorsBase && CO_path0_base && C1_rail_base) {
    const C3_anchor_b = anchorsBase["C3"];
    const C3_prep_b = resolveAnchorPoint(normalizeAnchor(C3_anchor_b), resolveAnchorCtx);
    const C3_point_b =
      C3_prep_b ??
      (C3_anchor_b &&
      typeof C3_anchor_b === "object" &&
      "coord" in C3_anchor_b &&
      C3_anchor_b.coord
        ? C3_anchor_b.coord
        : C3_anchor_b);
    const C4_anchor_b = anchorsBase["C4"];
    const C4_prep_b = resolveAnchorPoint(normalizeAnchor(C4_anchor_b), resolveAnchorCtx);
    const C4_point_b =
      C4_prep_b ??
      (C4_anchor_b &&
      typeof C4_anchor_b === "object" &&
      "coord" in C4_anchor_b &&
      C4_anchor_b.coord
        ? C4_anchor_b.coord
        : C4_anchor_b);
    const C5_anchor_b = anchorsBase["C5"];
    const C5_prep_b = resolveAnchorPoint(normalizeAnchor(C5_anchor_b), resolveAnchorCtx);
    const C5_point_b =
      C5_prep_b ??
      (C5_anchor_b &&
      typeof C5_anchor_b === "object" &&
      "coord" in C5_anchor_b &&
      C5_anchor_b.coord
        ? C5_anchor_b.coord
        : C5_anchor_b);
    const C6_anchor_b = anchorsBase["C6"];
    const C6_prep_b = resolveAnchorPoint(normalizeAnchor(C6_anchor_b), resolveAnchorCtx);
    const C6_point_b =
      C6_prep_b ??
      (C6_anchor_b &&
      typeof C6_anchor_b === "object" &&
      "coord" in C6_anchor_b &&
      C6_anchor_b.coord
        ? C6_anchor_b.coord
        : C6_anchor_b);

    const c3Sem_b = C3_point_b ?? anchorSemanticForPath(C3_anchor_b, resolveAnchorCtx);
    const c4Sem_b = C4_point_b ?? anchorSemanticForPath(C4_anchor_b, resolveAnchorCtx);
    const c5Sem_b = C5_point_b ?? anchorSemanticForPath(C5_anchor_b, resolveAnchorCtx);
    const c6Sem_b = C6_point_b ?? anchorSemanticForPath(C6_anchor_b, resolveAnchorCtx);

    const C3_path_b =
      C2_path_base && c3Sem_b
        ? firstRailHitTowardTarget(C2_path_base, c3Sem_b)
        : null;
    const C4_path_b =
      C3_path_b && c4Sem_b ? firstRailHitTowardTarget(C3_path_b, c4Sem_b) : null;
    const C5_path_b =
      C4_path_b && c5Sem_b ? firstRailHitTowardTarget(C4_path_b, c5Sem_b) : null;
    const C6_path_b =
      C5_path_b && c6Sem_b ? firstRailHitTowardTarget(C5_path_b, c6Sem_b) : null;

    const pathNodesBase = [
      CO_path0_base,
      C1_rail_base,
      C2_path_base,
      C3_path_b,
      C4_path_b,
      C5_path_b,
      C6_path_b,
    ];

    capBaseline = resolveTrajectoryDisplayCap(
      pathNodesBase,
      secondPoint,
      HIT_TOLERANCE
    );
    const cushionPathBase = slicePathNodesToCap(pathNodesBase, capBaseline);

    cushionPathBaselineRg = cushionPathBase;
    cushionPathAttrBase = cushionPathBase
      .map((pt) => {
        const p = toPx(pt, SCALE, TABLE_H);
        return `${p.x + PADDING},${p.y + PADDING}`;
      })
      .join(" ");
  }

  baselineCoHandleRgRef.current =
    cushionPathBaselineRg?.[0] &&
    Number.isFinite(cushionPathBaselineRg[0].x) &&
    Number.isFinite(cushionPathBaselineRg[0].y)
      ? { x: cushionPathBaselineRg[0].x, y: cushionPathBaselineRg[0].y }
      : null;

  baselineC1HandleRgRef.current =
    cushionPathBaselineRg?.[1] &&
    Number.isFinite(cushionPathBaselineRg[1].x) &&
    Number.isFinite(cushionPathBaselineRg[1].y)
      ? { x: cushionPathBaselineRg[1].x, y: cushionPathBaselineRg[1].y }
      : null;

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
  // TRJ-002: buildTrajectoryRenderModel (Batch 2 STEP 2-5)
  const { activeDisplayCap, visibleKeysForLabels } = buildTrajectoryRenderModel({
    systemIdForGrid,
    useBaselineLabelAnchors,
    cushionPathBaselineRg,
    capBaseline,
    capCorrected,
  });
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
      labelPayload(CO_prep),
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
      labelPayload(C1_prep),
    "C2": (fromBaselinePath && fromBaselinePath["C2"]) ?? labelPayload(C2),
    "C3":
      (fromBaselinePath && fromBaselinePath["C3"]) ??
      labelPayload(C3_label ?? anchors["C3"]),
    "C4": labelPayload(useBaselineLabelAnchors && anchorsBase ? anchorsBase["C4"] : C4),
    "C5": labelPayload(useBaselineLabelAnchors && anchorsBase ? anchorsBase["C5"] : C5),
    "C6": labelPayload(useBaselineLabelAnchors && anchorsBase ? anchorsBase["C6"] : C6),
  };
  const trackAnchorItems =
    getAnchorsForSystem(systemIdForGrid)?.trajectories?.[trackForAnchors]?.anchors ?? [];
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
  // TRJ-002: labelStrategy (from buildTrajectoryRenderModel — D-005: Batch 6 해소 예정)
  const labelStrategy = buildTrajectoryRenderModel({
    systemIdForGrid,
    useBaselineLabelAnchors,
    cushionPathBaselineRg,
    capBaseline,
    capCorrected,
  }).labelStrategy;

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

  const userTrajectoryCardModel =
    appMode === "USER" && userDisplayFlags?.showTrajectoryInfoCard
      ? buildUserTrajectoryCardModel({
          source: trajectoryCardSource,
          slotRenderSys,
          resolvedSlotSys,
          resolvedSlotBaseSysValues,
          resolvedSlotSysValues,
          noStrategySelected: !userTableDisplaySlotId,
        })
      : null;

  const coBaselineHandleRg =
    baselineDraftState.coRg ?? baselineCoHandleRgRef.current;
  const c1BaselineHandleRg =
    baselineDraftState.c1Rg ?? baselineC1HandleRgRef.current;

  let coBaselineHandleNode = null;
  if (
    appMode === "ADMIN" &&
    showBaseLine &&
    systemIdForGrid === "5_half_system" &&
    trackForAnchors?.startsWith("B2T") &&
    coBaselineHandleRg &&
    Number.isFinite(coBaselineHandleRg.x) &&
    Number.isFinite(coBaselineHandleRg.y)
  ) {
    const hp = toPx(coBaselineHandleRg, SCALE, TABLE_H);
    coBaselineHandleNode = (
      <g className="co-baseline-drag-handle" data-co-baseline-handle="1" pointerEvents="none">
        <circle
          cx={hp.x + PADDING}
          cy={hp.y + PADDING}
          r={7}
          fill="#facc15"
          stroke="#a16207"
          strokeWidth={1.5}
          opacity={baselineDraftState.draggingMark === "CO" ? 1 : 0.85}
        />
      </g>
    );
  }

  let c1BaselineHandleNode = null;
  if (
    appMode === "ADMIN" &&
    showBaseLine &&
    systemIdForGrid === "5_half_system" &&
    trackForAnchors?.startsWith("B2T") &&
    c1BaselineHandleRg &&
    Number.isFinite(c1BaselineHandleRg.x) &&
    Number.isFinite(c1BaselineHandleRg.y)
  ) {
    const hp = toPx(c1BaselineHandleRg, SCALE, TABLE_H);
    c1BaselineHandleNode = (
      <g className="c1-baseline-drag-handle" data-c1-baseline-handle="1" pointerEvents="none">
        <circle
          cx={hp.x + PADDING}
          cy={hp.y + PADDING}
          r={7}
          fill="#facc15"
          stroke="#a16207"
          strokeWidth={1.5}
          opacity={baselineDraftState.draggingMark === "C1" ? 1 : 0.85}
        />
      </g>
    );
  }

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
      {dragState.joystickVisible &&
        canEditPosition &&
        dragState.ballId &&
        balls[dragState.ballId] && (() => {
  const bp = balls[dragState.ballId];

  // Joystick position: 10 Rg toward table center (clamped inside table)
  const CENTER = { x: 40, y: 20 };
  let dx = CENTER.x - bp.x;
  let dy = CENTER.y - bp.y;
  let len = Math.hypot(dx, dy);

  if (len < 1e-6) {
    dx = 0;
    dy = -1;
    len = 1;
  }

  const ux = dx / len;
  const uy = dy / len;

  const jx = clamp(bp.x + ux * 10, 3, 77);
  const jy = clamp(bp.y + uy * 10, 3, 37);

  const jp = toPx({ x: jx, y: jy }, SCALE, TABLE_H);
  const cx = jp.x + PADDING;
  const cy = jp.y + PADDING;

  // Mobile-friendly sizes (px in SVG viewBox units)
  const BASE_R = 52;   // bigger hit area
  const KNOB_R = 22;

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
      {canEdit && (
        <SystemGrid
          track={trackForAnchors}
          anchorsData={getAnchorsForSystem(systemIdForGrid)}
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
          userDisplayFlags?.showTrajectoryInfoCard &&
          userTrajectoryCardModel &&
          onTrajectoryCardSourceChange && (
            <UserTrajectoryInfoCard
              model={userTrajectoryCardModel}
              cardSource={trajectoryCardSource}
              onCardSourceChange={onTrajectoryCardSourceChange}
              showAxisValues={trajectoryShowAxisValues}
              onShowAxisValuesChange={onTrajectoryShowAxisValuesChange}
              dragOffset={trajectoryCardOffset}
              onDragOffsetChange={onTrajectoryCardOffsetChange}
            />
          )}
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
        panelStyle={{
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
            {overlayState.type === 'SYS' && (
              <SysOverlay
                key={`sys-${shotEditor.activeSlot}`}
                data={adminState.sys}
                computeValues={calculateByProfileExpr}
                solveFiveHalf={solveFiveHalfTwoOfThree}
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
                sortedOnePointLibrary={sortedOnePointLibrary}
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
              />
            )}
      </ModalShell>
      
      {/* USER 모드 오버레이 — read-only info (AI panel = userInfoPanel SSOT) */}
      <ModalShell
        open={appMode === "USER" && !!overlayContent}
        onClose={handleCloseUserInfoOverlay}
        draggable={false}
        panelClassName={
          overlayContent === "HPT"
            ? "modal-panel--user-hpt"
            : overlayContent === "AI"
              ? "modal-panel--user-ai"
              : "modal-panel--compact"
        }
        title={undefined}
        panelStyle={{
          maxHeight:
            overlayContent === "AI"
              ? undefined
              : overlayContent === "HPT"
                ? undefined
                : "78vh",
          ...(overlayContent === "HPT"
            ? { minWidth: 0, minHeight: 0, overflowY: "auto" }
            : overlayContent === "AI"
              ? { minWidth: 0, minHeight: 0, overflowY: "auto" }
              : { overflowY: "auto" }),
        }}
      >
        {overlayContent === "HPT" && <UserHptPanel model={userHptModel} />}
        {overlayContent === "AI" && <UserAiPanel model={userInfoPanel} />}
      </ModalShell>
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
              onClick={() => setShowSystemGrid((prev) => !prev)}
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
              onClick={() => setShowBaseLine((v) => !v)}
              style={{
                backgroundColor: showBaseLine ? "#FFD700" : "#64748b",
                color: showBaseLine ? "#1f2937" : "white",
              }}
            >
              기준선
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
              onClick={() => setShowHistoryModal(true)}
              style={{ backgroundColor: '#6366f1', color: 'white' }}
            >
              History
            </button>
            <button
              type="button"
              disabled={!canUseSystemControls}
              className={`control-button save-btn${isSaved ? " active" : ""}`}
              onClick={() => handleCanonicalRightPanelSave()}
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
              onClick={() => setWorkspaceCleanupOpen((open) => !open)}
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

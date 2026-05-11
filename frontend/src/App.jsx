import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { convertCanonicalAnchors } from "./lib/convertCanonicalAnchors";
import { useShotSlots } from "./hooks/useShotSlots";
import { useTrajectoryState } from "./hooks/useTrajectoryState";
import { angleSpinTargetRail } from "./domain/angleSpinCorrectionTarget";
import { SYSTEM_PROFILES } from "./data/systems";
import { calculateByProfileExpr } from "./utils/systemCalculator";
import { convertThetaToClock } from "./utils/tipClockConverter";
import {
  buildPlayStrategy,
  hitPointToTipDisplay,
  hitPointToRotationText,
  hitPointToVerticalText,
  formatThickness,
  getSystemNameKo,
  strengthToKo,
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
import {
  computeRailPoints,
  lineToRailIntersections,
  snapToRail,
} from "./utils/geometry/rail";
import { createCurveSegment } from "./utils/trajectory/curveTrajectory";
import { isSegmentHitBall } from "./utils/geometry";
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
import ImpactLines from "./components/table/ImpactLines";
import SystemGrid from "./components/table/SystemGrid";
import CoachingOverlay from "./components/table/CoachingOverlay";
import { useCoachingController } from "./hooks/useCoachingController";
import { useSystemController } from "./hooks/useSystemController";
import { useDisplayController } from "./hooks/useDisplayController";
import { TABLE_CONFIG } from "./config/tableConfig";
import { buildRailGroupedStrategy } from "./domain/railEngine";
import { createStrategyEntry } from "./domain/adminSaveEngine";
import {
  MERGE_EPSILON,
  normalizeDatasetFromStorage,
  upsertPositionRecord,
} from "./domain/positionMergeEngine";
import { evaluateStrategy } from "./domain/evaluateStrategy";
import { makeSignature } from "./domain/strategySignature";
import { computeSystemFromPositions, sysValuesToAnchors } from "./domain/systemEngine";
import { getAnchorsForRendering } from "./domain/anchorCoordinateEngine";
import {
  computeReflectionC2,
  detectRail,
  angleDeg,
  resolveSignedSpinDeg,
  chooseCandidateRail,
  intersectRayWithRail,
  directionFromAngleDeg,
} from "./domain/reflectionEngine";
import { createCaptureCandidate } from "./data/autoCaptureEngine";
import { runAutoRecommend, normalizeBallsToBall3 } from "./admin/slotAutoRecommend";
import { PositionKDIndex } from "./domain/search/positionKDIndex";
import { recallPosition, runPositionRecall } from "./domain/positionRecallEngine";
import { makeSignatureKey } from "./domain/search/signatureKey";
import { initFileHandle, saveToFile } from "./domain/fileService";
import { getAnchorsForSystem } from "./data/systems/anchorsRegistry";
import {
  generateUUID,
  getNextVersion,
  buildSnapshotName,
  loadWorkspaceHistory,
  saveWorkspaceHistory,
  findSnapshotById,
  deleteSnapshotById,
  deleteOldest30,
  updateSnapshotsExported,
} from "./domain/workspaceHistory";

// IMPORTANT:
// Main app currently renders the LOCAL SysOverlay defined in this file.
// admin/sys/SysOverlay.tsx is NOT used by main.jsx.
// When modifying the SYS modal UI, edit the SysOverlay component inside App.jsx.
// There are currently two SysOverlay implementations in the project.
// Overlay modularization/refactor is planned after system stabilization.

const { SCALE, TABLE_W_UNITS, TABLE_H_UNITS, TABLE_W, TABLE_H, PADDING } = TABLE_CONFIG;

const ADMIN_BUTTONS = ["SYS", "HPT", "STR", "AI"];

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

function Ball({ x, y, color, opacity = 1, emphasis, ...eventProps }) {
  const p = toPx({ x, y }, SCALE, TABLE_H);
  const r = BALL_RADIUS_RG * SCALE;
  const stroke = emphasis === "selected" ? "#ffffff" : "none";
  const strokeW = emphasis === "selected" ? 3 : 0;
  return (
    <circle
      cx={p.x + PADDING}
      cy={p.y + PADDING}
      r={r}
      fill={color}
      opacity={opacity}
      stroke={stroke}
      strokeWidth={strokeW}
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

function resolveCoC1C3Keys(forced, spaceSel) {
  const co = forced?.CO ? `CO_${forced.CO}` : `CO_${spaceSel.CO}`;
  const c1 = forced?.C1 ? `C1_${forced.C1}` : `C1_${spaceSel.C1}`;
  const c3 = forced?.C3 ? `C3_${forced.C3}` : `C3_${spaceSel.C3}`;
  return { coKey: co, c1Key: c1, c3Key: c3 };
}

/** 시스템별 SYS 입력 유도·Sn 사용 (신규 시스템은 이 테이블에만 등록) */
const SYS_SYSTEM_CONFIG = {
  five_half: { mode: "derived", useSn: true },
  "5_half_system": { mode: "derived", useSn: true },
  "5_HALF": { mode: "derived", useSn: true },
  sunrise_sunset: { mode: "full_input", useSn: false },
  sunset: { mode: "full_input", useSn: false },
};

function canonicalSystemIdForConfig(systemId) {
  if (systemId == null || systemId === "") return "5_half_system";
  return systemId === "5_HALF" ? "5_half_system" : systemId;
}

function getSysSystemMode(systemId) {
  const sid = canonicalSystemIdForConfig(systemId);
  return SYS_SYSTEM_CONFIG[sid]?.mode ?? "full_input";
}

function getSysUseSn(systemId) {
  const sid = canonicalSystemIdForConfig(systemId);
  return SYS_SYSTEM_CONFIG[sid]?.useSn ?? false;
}

function isFiveHalfSystemId(systemId) {
  const s = systemId == null ? "" : String(systemId);
  return s === "5_half_system" || s === "5_HALF" || s === "five_half";
}

/** formData.inputs 기준: 비어 있지 않고 유한 숫자면 값 반환, 아니면 null */
function sysOverlayInputFinite(inputs, key) {
  if (!inputs || !(key in inputs)) return null;
  const v = inputs[key];
  if (v === "" || v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * 5&Half 전용 2-of-3: CO·C1·C3 중 2개 입력 시 나머지 1개 계산 (base만, CV 미사용).
 * C1 = CO − C3 정합: CO+C1→C3, CO+C3→C1, C1+C3→CO 모두 CO_base(co)만 사용.
 */
function solveFiveHalfTwoOfThree(inputs, coKey, c1Key, c3Key) {
  const co = sysOverlayInputFinite(inputs, coKey);
  const c1 = sysOverlayInputFinite(inputs, c1Key);
  const c3 = sysOverlayInputFinite(inputs, c3Key);
  const out = {};
  if (co != null && c1 != null) {
    out[coKey] = co;
    out[c1Key] = c1;
    out[c3Key] = co - c1;
    return out;
  }
  if (co != null && c3 != null) {
    out[coKey] = co;
    out[c3Key] = c3;
    out[c1Key] = co - c3;
    return out;
  }
  if (c1 != null && c3 != null) {
    out[c1Key] = c1;
    out[c3Key] = c3;
    out[coKey] = c1 + c3;
    return out;
  }
  return null;
}

/** CO/C1/C3 중 자동으로 채워지는 입력 키 (2-of-3) */
function fiveHalfComputedInputKey(inputs, coKey, c1Key, c3Key) {
  const co = sysOverlayInputFinite(inputs, coKey);
  const c1 = sysOverlayInputFinite(inputs, c1Key);
  const c3 = sysOverlayInputFinite(inputs, c3Key);
  if (co != null && c1 != null) return c3Key;
  if (co != null && c3 != null) return c1Key;
  if (c1 != null && c3 != null) return coKey;
  return null;
}

/** 5&Half SYS 표시용 숫자 포맷 (계산 로직과 무관) */
function fmtFiveHalfDisplayNum(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "?";
  return x % 1 === 0 ? String(Math.round(x)) : String(Math.round(x * 10) / 10);
}

/**
 * derived: CO·C1으로 c3Key 자동 (C3 = CO + coSlide − C1). coSlide는 기본 0(공식 C1_f=CO_f−C3_r 정합).
 * full_input: CO/C1/C3 등 사용자 입력 필드는 수정하지 않음.
 */
function normalizeToFormulaInputsApp(
  numericPayload,
  systemMode,
  coKey,
  c1Key,
  c3Key,
  coSlide = 0
) {
  const out = { ...numericPayload };
  if (systemMode !== "derived" || !c3Key || !coKey || !c1Key) {
    return out;
  }
  const coN = Number(out[coKey]);
  const c1N = Number(out[c1Key]);
  const co = Number.isFinite(coN) ? coN : 0;
  const c1 = Number.isFinite(c1N) ? c1N : 0;
  const coEff = co + (Number(coSlide) || 0);
  out[c3Key] = coEff - c1;
  return out;
}

function isRhsKeyReadOnlyForSys(key, systemMode, c3Key) {
  if (!key || key === "HP_n" || key === "An") return false;
  if (systemMode === "derived" && c3Key && key === c3Key) return true;
  return false;
}

function isMarkBasisReadOnly(mark, systemMode) {
  return systemMode === "derived" && mark === "C3";
}

function lhsTokenFromExpr(expr) {
  if (!expr || !expr.trim()) return "";
  const parts = expr.trim().split("=");
  return parts[0]?.trim() ?? "";
}

function showMarkRowExtraForSys(mark, systemMode, lhsToken) {
  if (systemMode !== "derived" || !lhsToken) return false;
  if (mark === "C1" && lhsToken.startsWith("C1_")) return true;
  if (mark === "C3" && lhsToken.startsWith("C3_")) return true;
  return false;
}

/** 적용 시 저장된 system_values(base)를 입력 필드 초기값으로 병합 */
function buildSysOverlayInitialInputs(data) {
  const ins = {
    CO_f: data?.inputs?.CO_f ?? "",
    CO_r: data?.inputs?.CO_r ?? "",
    C1_f: data?.inputs?.C1_f ?? "",
    C1_r: data?.inputs?.C1_r ?? "",
    C2_f: data?.inputs?.C2_f ?? "",
    C2_r: data?.inputs?.C2_r ?? "",
    C3_f: data?.inputs?.C3_f ?? "",
    C3_r: data?.inputs?.C3_r ?? "",
    C4_f: data?.inputs?.C4_f ?? "",
    C4_r: data?.inputs?.C4_r ?? "",
    HP_n: data?.inputs?.HP_n ?? 0,
    An: data?.inputs?.An ?? 0.0,
  };
  const saved = data?.system_values;
  if (saved && typeof saved === "object") {
    for (const [k, v] of Object.entries(saved)) {
      if (!(k in ins)) continue;
      if (v === undefined || v === null) continue;
      if (k === "HP_n") ins.HP_n = typeof v === "number" ? v : Number(v) || 0;
      else if (k === "An") ins.An = typeof v === "number" ? v : Number(v) || 0;
      else ins[k] = v;
    }
  }
  return ins;
}

/** normalize 전 숫자 payload (rhs + CO/C1/C3 토큰 + HP/An) */
function buildSysOverlayNumericPayload(
  inputs,
  rhsKeys,
  coKey,
  c1Key,
  c3Key,
  needsHP,
  needsAn
) {
  const payload = {};
  (rhsKeys || []).forEach((k) => {
    const v = inputs[k];
    payload[k] = v === "" || v == null ? 0 : Number(v);
  });
  [coKey, c1Key, c3Key].forEach((k) => {
    if (!k) return;
    if (!(k in payload)) {
      const v = inputs[k];
      payload[k] = v === "" || v == null ? 0 : Number(v);
    }
  });
  if (needsHP) payload.HP_n = Number(inputs.HP_n ?? 0);
  if (needsAn) payload.An = Number(inputs.An ?? 0);
  return payload;
}

/** SysOverlay·슬롯 렌더 공통: 공식에서 강제 cushion면·RHS 키 집합 추출 */
/** slide(양수 밀림)와 draw(음수 끌림 저장) 상호 배타 → 단일 signed 스칼라 (물리·곡선 공통). */
function unifiedSlideFromCorrections(corrections) {
  if (!corrections || typeof corrections !== "object") return 0;
  const s = Number(corrections.slide);
  const d = Number(corrections.draw);
  const slideVal = Math.abs(Number.isFinite(s) ? s : 0);
  const drawVal = -Math.abs(Number.isFinite(d) ? d : 0);
  return drawVal !== 0 ? drawVal : slideVal;
}

/** 저장·복원 시 slide≥0, draw≤0, 상호 배타(draw 우선 시 slide=0) */
function normalizeSlideDrawCorrections(corrections) {
  if (!corrections || typeof corrections !== "object") {
    return { slide: 0, draw: 0 };
  }
  const s = Number(corrections.slide);
  const d = Number(corrections.draw);
  let slide = Math.abs(Number.isFinite(s) ? s : 0);
  let draw = Number.isFinite(d) ? d : 0;
  if (draw !== 0) draw = -Math.abs(draw);
  if (draw !== 0) slide = 0;
  return { slide, draw };
}

function parseSysFormulaExpr(expr) {
  if (!expr) return { forced: {}, neededKeys: new Set(), needsHP: false, needsAn: false };

  const rx = /\b(CO|C1|C2|C3|C4)_(f|r)\b/g;
  const forced = { CO: null, C1: null, C2: null, C3: null, C4: null };
  const neededKeys = new Set();

  let m;
  while ((m = rx.exec(expr)) !== null) {
    const mark = m[1];
    const sp = m[2];
    forced[mark] = sp;
    neededKeys.add(`${mark}_${sp}`);
  }

  const needsHP = /\bHP_n\b/.test(expr);
  const needsAn = /\bAn\b/.test(expr);

  return { forced, neededKeys, needsHP, needsAn };
}

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
  const systemId = rawSid === "5_HALF" ? "5_half_system" : rawSid;
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
  const unifiedSlide = unifiedSlideFromCorrections(corrections);
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

/** 표시용 식: full_input은 profile 그대로, derived(5½)는 C3 자동 관계 안내 문구 */
function getDisplayExprForSys(expr, systemId, systemMode) {
  if (!expr || !expr.trim()) return expr;
  if (systemMode === "full_input") return expr;
  if (!isFiveHalfSystemId(systemId)) return expr;
  return "C3_r = CO_f - C1_f";
}

/** SysOverlay 표시 전용 — admin/sys SysOverlay.tsx와 동일 규약 */
function formatFormulaDisplay(expr, output) {
  const idx = expr.indexOf("=");
  if (idx < 0) return expr;
  const lhs = expr.slice(0, idx).trim();
  const rhs = expr.slice(idx + 1).trim();
  const lhsVal = lhs in output ? formatResultNum(output[lhs]) : "?";
  const rhsSubstituted = rhs.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (token) => {
    if (token in output) {
      return `${token}_${formatResultNum(output[token])}`;
    }
    return token;
  });
  return `${lhs}_${lhsVal} = ${rhsSubstituted}`;
}

function SysOverlay({ data, onSave, onCancel }) {
  // ==========================================
  // v1 공략 유형 (내부 상수 고정)
  // ==========================================
  const SHOT_TYPE_OPTIONS = [
    "뒤돌리기",
    "옆돌리기",
    "앞돌리기",
    "세워치기",
    "비켜치기",
    "더블쿠션",
    "횡단샷",
    "리버스",
    "짧은 뒤돌리기",
    "뒤돌리기 대회전",
    "옆돌리기 대회전",
    "앞돌리기 대회전",
    "더블 레일",
    "1뱅크",
    "2뱅크",
    "3뱅크",
    "대회전 뱅크",
    "바운딩"
  ];

  // ==========================================
  // v1 적용 시스템 (내부 상수 고정)
  // ==========================================
  const SYSTEM_OPTIONS = [
    { id: "5_half_system", label: "파이브 앤드 하프 시스템" },
    { id: "rodriguez", label: "로드리게스" },
    { id: "ball_system", label: "볼 시스템" },
    { id: "sunrise_sunset", label: "일출·일몰 시스템" },
    { id: "plus_system", label: "플러스 시스템" },
    { id: "plus2_system", label: "플러스2 시스템" },
    { id: "3tip_plus", label: "3팁 플러스" },
    { id: "2_3_system", label: "3분의 2 시스템" },
    { id: "35half", label: "35와 ½ 시스템" },
    { id: "double_rail", label: "더블 레일" },
    { id: "peruvian_system", label: "페루 시스템" },
    { id: "reverse_end_system", label: "리버스 엔드" },
    { id: "zigzag_system", label: "지그재그" },
    { id: "7_system", label: "7 시스템" },
    { id: "99 to 1", label: "99 to 1" },
    { id: "clay_shooting", label: "클레이 사격" },
    { id: "long_plate_system", label: "긴각 접시" },
    { id: "long_wedge", label: "롱 웨지" },
    { id: "reverse_system", label: "리버스 시스템" },
    { id: "schaefer_system", label: "쉐퍼 시스템" },
    { id: "tokyo_system", label: "도쿄 시스템" },
    { id: "turkish_angle_system", label: "터키 시스템" },
    { id: "short_plate_system", label: "짧은각 접시" },
    { id: "short_wedge", label: "숏 웨지" },
    { id: "spider_web", label: "거미줄 시스템" },
    { id: "0tip plus", label: "0팁 플러스" },
    { id: "1byhalf", label: "반팁 시스템" },
    { id: "3and4_system", label: "3과4 시스템" },
    { id: "3tip_across", label: "3팁 횡단" },
    { id: "Plus_5_system", label: "플러스 5" },
    { id: "minus_5_system", label: "마이너스 5" },
    { id: "n_across", label: "N자 횡단" },
    { id: "n_across_short", label: "짧은 N자 횡단" },
    { id: "spread30", label: "스프레드 30" },
    { id: "split", label: "분열" },
    { id: "accordion", label: "아코디언" },
    { id: "florida_system", label: "플로리다 시스템" }
  ];

  // ==========================================
  // HP_n 드롭다운 옵션
  // ==========================================
  const HP_OPTIONS = [
    { label: "좌 4팁 (-4)", value: -4 },
    { label: "좌 3팁 (-3)", value: -3 },
    { label: "좌 2팁 (-2)", value: -2 },
    { label: "좌 1팁 (-1)", value: -1 },
    { label: "무회전 (0)", value: 0 },
    { label: "우 1팁 (1)", value: 1 },
    { label: "우 2팁 (2)", value: 2 },
    { label: "우 3팁 (3)", value: 3 },
    { label: "우 4팁 (4)", value: 4 },
  ];

  // ==========================================
  // 상태 관리 (완성 키 방식)
  // ==========================================
  const [formData, setFormData] = useState({
    shotType: data?.shotType || "뒤돌리기",
    system: data?.system || data?.system_id || SYSTEM_OPTIONS[0]?.id || "5_half_system",
    track: data?.track || "B2T_L",
    inputs: buildSysOverlayInitialInputs(data),
    corrections: {
      curve_ratio: data?.corrections?.curve_ratio || 0,
      departure: data?.corrections?.departure || 0,
      spin: data?.corrections?.spin || 0,
      ...normalizeSlideDrawCorrections(data?.corrections),
    },
  });

  useEffect(() => {
    const t = data?.track || "B2T_L";
    setFormData((prev) => (prev.track === t ? prev : { ...prev, track: t }));
  }, [data?.track]);

  // UI 토글 상태 (표시용) - 계산키와 분리
  const [spaceSel, setSpaceSel] = useState({
    CO: data?.spaceSel?.CO || "f",
    C1: data?.spaceSel?.C1 || "f",
    C2: data?.spaceSel?.C2 || "f",
    C3: data?.spaceSel?.C3 || "f",
    C4: data?.spaceSel?.C4 || "f"
  });

  /** true면 저장값 복원 직후 — normalizeToFormulaInputsApp 비활성(덮어쓰기 방지) */
  const [isRestored, setIsRestored] = useState(() => {
    const s = data?.system_values;
    return !!(s && typeof s === "object" && Object.keys(s).length > 0);
  });

  useEffect(() => {
    const saved = data?.system_values;
    if (!saved || typeof saved !== "object" || Object.keys(saved).length === 0) return;
    setFormData((prev) => {
      const mergedCorr = { ...prev.corrections, ...(data.corrections || {}) };
      return {
        ...prev,
        inputs: buildSysOverlayInitialInputs(data),
        corrections: {
          ...mergedCorr,
          ...normalizeSlideDrawCorrections(mergedCorr),
        },
      };
    });
    setIsRestored(true);
  }, [data?.system_values]);

  // ==========================================
  // 공식 로딩 및 파싱 (expr 변경 시에만 재계산 — 매 렌더 새 참조 방지)
  // ==========================================
  const profile = SYSTEM_PROFILES?.[formData.system];
  const expr = typeof profile?.formula === "string"
    ? profile.formula
    : profile?.formula?.expr || "";

  const parsed = useMemo(() => parseSysFormulaExpr(expr), [expr]);
  const { forced, neededKeys, needsHP, needsAn } = parsed;

  // rhsKeys: expr에 의존, neededKeys는 parsed 내부이므로 expr과 동기화
  const rhsKeys = useMemo(() => {
    const keyList = Array.from(neededKeys || []);
    if (!expr || !expr.trim()) return keyList;
    const lhs = expr.trim().split('=')[0].trim();
    return keyList.filter((k) => k !== lhs);
  }, [expr, neededKeys]);

  const exprLhsToken = useMemo(() => lhsTokenFromExpr(expr), [expr]);
  const { coKey, c1Key, c3Key } = useMemo(
    () => resolveCoC1C3Keys(forced, spaceSel),
    [forced, spaceSel]
  );

  const systemMode = getSysSystemMode(formData.system);
  const useSnForSystem = getSysUseSn(formData.system);

  const normalizedBasePayload = useMemo(() => {
    if (!expr || !expr.trim()) return {};
    const payload = buildSysOverlayNumericPayload(
      formData.inputs,
      rhsKeys,
      coKey,
      c1Key,
      c3Key,
      needsHP,
      needsAn
    );
    if (isRestored) {
      return payload;
    }
    if (isFiveHalfSystemId(formData.system)) {
      const solved = solveFiveHalfTwoOfThree(formData.inputs, coKey, c1Key, c3Key);
      if (solved) {
        return { ...payload, ...solved };
      }
      return payload;
    }
    const mode = getSysSystemMode(formData.system);
    return normalizeToFormulaInputsApp(payload, mode, coKey, c1Key, c3Key, 0);
  }, [
    expr,
    rhsKeys,
    formData.inputs,
    formData.system,
    needsHP,
    needsAn,
    coKey,
    c1Key,
    c3Key,
    isRestored,
  ]);

  // 공식 로딩 시 f/r 스위치 자동 고정
  useEffect(() => {
    const { forced: forcedSpaces } = parsed;
    setSpaceSel(prev => {
      const next = { ...prev };
      (["CO", "C1", "C2", "C3", "C4"]).forEach(k => {
        if (forcedSpaces[k]) next[k] = forcedSpaces[k]; // 공식이 강제하면 자동 세팅
      });
      return next;
    });
  }, [expr]);

  // 공식에 필요한 입력: 5&Half는 CO/C1/C3 중 2개 이상, 그 외는 RHS 규칙.
  const hasAllInputs = useMemo(() => {
    if (!rhsKeys || rhsKeys.length === 0) return false;

    const mode = getSysSystemMode(formData.system);
    let ok;
    if (isFiveHalfSystemId(formData.system)) {
      const filled = [coKey, c1Key, c3Key].filter(
        (k) => sysOverlayInputFinite(formData.inputs, k) != null
      ).length;
      ok = filled >= 2;
      if (ok) {
        const preview = solveFiveHalfTwoOfThree(formData.inputs, coKey, c1Key, c3Key);
        ok = !!preview && rhsKeys.every((k) => Number.isFinite(Number(preview[k])));
      }
    } else {
      ok = rhsKeys.every((k) => {
        if (isRhsKeyReadOnlyForSys(k, mode, c3Key)) return true;
        const v = formData.inputs && formData.inputs[k];
        return v !== "" && v !== null && v !== undefined;
      });
    }
    if (!ok) return false;

    if (needsHP) {
      const v = formData.inputs.HP_n;
      if (v === "" || v === null || v === undefined) return false;
    }
    if (needsAn) {
      const v = formData.inputs.An;
      if (v === "" || v === null || v === undefined) return false;
    }
    return true;
  }, [formData.inputs, rhsKeys, needsHP, needsAn, formData.system, c3Key, coKey, c1Key]);

  // ==========================================
  // 계산 엔진 연결 (실시간 업데이트) — 입력값 부족 시 계산 안 함
  // ==========================================
  const [calcResult, setCalcResult] = useState({});

  useEffect(() => {
    if (!expr) {
      setCalcResult({});
      return;
    }
    if (!hasAllInputs) {
      setCalcResult({});
      return;
    }

    const result = calculateByProfileExpr(expr, normalizedBasePayload);
    setCalcResult((prev) => {
      const prevKey = Object.keys(prev)[0];
      const nextKey = Object.keys(result)[0];
      if (prevKey === nextKey && prev[prevKey] === result[nextKey]) return prev;
      return result;
    });
  }, [expr, hasAllInputs, normalizedBasePayload]);

  const baseResultValue = Object.keys(calcResult).length > 0 ? Object.values(calcResult)[0] : null;
  const baseResultKey = Object.keys(calcResult).length > 0 ? Object.keys(calcResult)[0] : null;

  // 기준 계산값 → inputs[baseResultKey] 강제 동기화 (5&Half 2-of-3과 충돌하므로 5&Half에서는 생략)
  useEffect(() => {
    if (isFiveHalfSystemId(formData.system)) return;
    if (!baseResultKey || baseResultValue == null) return;

    setFormData(prev => {
      if (Number(prev.inputs[baseResultKey]) === Number(baseResultValue)) return prev;
      return {
        ...prev,
        inputs: { ...prev.inputs, [baseResultKey]: formatResultNum(baseResultValue) }
      };
    });
  }, [baseResultValue, baseResultKey, formData.system]);

  // 물리 보정: unifiedSlide→CO_eff만; curve_ratio+spin→C3( angleSpinTargetRail ); p_start→C4/C5/C6
  const formUnifiedSlide = unifiedSlideFromCorrections(formData.corrections);
  const p_spin = Number(formData.corrections.spin) || 0;
  const formAngleTilt = Number(formData.corrections.curve_ratio) || 0;
  const snFor5Half = useMemo(() => {
    if (!useSnForSystem || !isFiveHalfSystemId(formData.system)) return null;
    const CO_base = Number(normalizedBasePayload.CO_f) || 0;
    const CO_eff = CO_base + formUnifiedSlide;
    const C3_r = Number(normalizedBasePayload.C3_r) || 0;
    return { Sn: (CO_eff - 50) * 0.5, C4_f: C3_r + (CO_eff - 50) * 0.5, CO_f: CO_base, C3_r };
  }, [formData.system, normalizedBasePayload, useSnForSystem, formUnifiedSlide]);
  const p_start =
    useSnForSystem && isFiveHalfSystemId(formData.system) && snFor5Half
      ? snFor5Half.Sn
      : Number(formData.corrections.departure) || 0;

  const { adjustedInputs, finalCalc, lhsKey } = useMemo(() => {
    if (!expr || !expr.trim()) return { adjustedInputs: {}, finalCalc: {}, lhsKey: null };
    if (!hasAllInputs) return { adjustedInputs: {}, finalCalc: {}, lhsKey: null };
    const adjusted = { ...normalizedBasePayload };
    if ("CO_f" in adjusted) adjusted.CO_f += formUnifiedSlide;
    if ("CO_r" in adjusted) adjusted.CO_r += formUnifiedSlide;
    if (angleSpinTargetRail === "C3" && systemMode === "full_input") {
      const c3AngleSpin = formAngleTilt + p_spin;
      if ("C3_f" in adjusted) adjusted.C3_f += c3AngleSpin;
      if ("C3_r" in adjusted) adjusted.C3_r += c3AngleSpin;
    }
    ["C4_f", "C4_r", "C5_f", "C5_r", "C6_f", "C6_r"].forEach((k) => {
      if (k in adjusted) adjusted[k] += p_start;
    });

    const final = calculateByProfileExpr(expr, adjusted);
    const keys = Object.keys(final);
    return { adjustedInputs: adjusted, finalCalc: final, lhsKey: keys.length > 0 ? keys[0] : null };
  }, [
    expr,
    hasAllInputs,
    normalizedBasePayload,
    formUnifiedSlide,
    p_spin,
    formAngleTilt,
    systemMode,
    p_start,
    needsHP,
    needsAn,
  ]);

  /** 표시용: full_input은 base 그대로, derived는 CO 보정 후 C3 = CO_eff − C1(base). */
  const effDisplayMap = useMemo(() => {
    if (!hasAllInputs) return {};
    const base = normalizedBasePayload;
    if (systemMode === "full_input") {
      return { ...base, ...adjustedInputs };
    }
    const adj = adjustedInputs;
    const CO_eff = Number(adj?.CO_f ?? base?.CO_f ?? 0);
    const c1 = Number((c1Key && base[c1Key]) ?? 0);
    const out = { ...base, CO_f: CO_eff };
    if (c3Key) {
      let c3Eff = CO_eff - c1;
      if (angleSpinTargetRail === "C3") {
        c3Eff += formAngleTilt + p_spin;
      }
      out[c3Key] = c3Eff;
    }
    return out;
  }, [
    hasAllInputs,
    normalizedBasePayload,
    adjustedInputs,
    systemMode,
    c1Key,
    c3Key,
    formAngleTilt,
    p_spin,
  ]);

  const snFor5HalfEffective = useMemo(() => {
    if (!useSnForSystem || !isFiveHalfSystemId(formData.system) || !hasAllInputs) return null;
    const basePl = normalizedBasePayload;
    if (!effDisplayMap || Object.keys(effDisplayMap).length === 0) return null;
    const CO_used = Number(effDisplayMap?.CO_f ?? basePl?.CO_f ?? 0);
    const C3_used = Number(effDisplayMap?.C3_r ?? basePl?.C3_r ?? 0);
    const Sn_eff = (CO_used - 50) * 0.5;
    const C4_eff = C3_used + Sn_eff;
    return {
      Sn: Sn_eff,
      C4_f: C4_eff,
      CO_f: CO_used,
      C3_r: C3_used,
    };
  }, [formData.system, hasAllInputs, effDisplayMap, normalizedBasePayload, useSnForSystem]);

  const finalResultDisplay = (() => {
    if (!lhsKey) return null;
    const v = finalCalc[lhsKey];
    return v != null ? v : null;
  })();

  const handleInputChange = (key, value) => {
    setIsRestored(false);
    setFormData((prev) => ({
      ...prev,
      inputs: { ...prev.inputs, [key]: value },
    }));
  };

  // ==========================================
  // 저장 핸들러
  // ==========================================
  const handleSave = () => {
    const systemValuesBase =
      hasAllInputs &&
      normalizedBasePayload &&
      Object.keys(normalizedBasePayload).length > 0
        ? { ...normalizedBasePayload }
        : undefined;
    console.log("[SAVE] system_values (base) =", systemValuesBase);
    const saveData = {
      ...formData,
      track: formData.track,
      spaceSel,
      calculated: calcResult,
      finalResult: finalResultDisplay,
      adjustedInputs,
      ...(systemValuesBase != null ? { system_values: systemValuesBase } : {}),
      sys_system_mode: systemMode,
      sys_use_sn: useSnForSystem,
    };
    onSave(saveData);
  };

  const displayExpr = useMemo(
    () => getDisplayExprForSys(expr, formData.system, systemMode),
    [expr, formData.system, systemMode]
  );

  const baseDisplayMap = useMemo(
    () => ({ ...normalizedBasePayload, ...calcResult }),
    [normalizedBasePayload, calcResult]
  );

  const baseFormulaLine = useMemo(() => {
    if (!displayExpr || !displayExpr.trim()) return "입력 대기 중...";
    if (!hasAllInputs) return "입력 대기 중...";
    return formatFormulaDisplay(displayExpr, baseDisplayMap);
  }, [displayExpr, hasAllInputs, baseDisplayMap]);

  /** 기준(base): 항상 C1 = CO − C3, 값은 normalizedBasePayload만 */
  const fiveHalfBaseDisplayLine = useMemo(() => {
    if (!isFiveHalfSystemId(formData.system) || !hasAllInputs) return null;
    const co = Number(normalizedBasePayload[coKey]);
    const c1 = Number(normalizedBasePayload[c1Key]);
    const c3 = Number(normalizedBasePayload[c3Key]);
    return `${c1Key}_${fmtFiveHalfDisplayNum(c1)} = ${coKey}_${fmtFiveHalfDisplayNum(co)} - ${c3Key}_${fmtFiveHalfDisplayNum(c3)}`;
  }, [formData.system, hasAllInputs, normalizedBasePayload, coKey, c1Key, c3Key]);

  const effectiveFormulaLine = useMemo(() => {
    if (!displayExpr || !displayExpr.trim()) return null;
    if (!hasAllInputs) return null;
    return formatFormulaDisplay(displayExpr, effDisplayMap);
  }, [displayExpr, hasAllInputs, effDisplayMap]);

  const hasSlideDraw = formUnifiedSlide !== 0;
  const hasRailAngleSpin = formAngleTilt !== 0 || p_spin !== 0;
  const hasManualDeparture =
    !snFor5HalfEffective &&
    Math.abs(Number(formData.corrections.departure) || 0) > 1e-9;
  const hasAnyCorrection = hasSlideDraw || hasRailAngleSpin || hasManualDeparture;

  /** 5½ derived: C3 after CO 슬라이드만 (레일 기울기·스핀 제외) */
  const c3AfterSlideOnlyFiveHalf = useMemo(() => {
    if (!isFiveHalfSystemId(formData.system) || !hasAllInputs || systemMode === "full_input") {
      return null;
    }
    const coE = Number(adjustedInputs[coKey]);
    const c1 = Number(normalizedBasePayload[c1Key]);
    if (!Number.isFinite(coE) || !Number.isFinite(c1)) return null;
    return coE - c1;
  }, [
    formData.system,
    hasAllInputs,
    systemMode,
    adjustedInputs,
    coKey,
    c1Key,
    normalizedBasePayload,
  ]);

  const eduStartCorrectionLine = useMemo(() => {
    if (!hasSlideDraw || !hasAllInputs) return null;
    const coBase = Number(normalizedBasePayload[coKey]);
    const coEff = Number(adjustedInputs[coKey]);
    if (!Number.isFinite(coBase) || !Number.isFinite(coEff)) return null;
    const f = fmtFiveHalfDisplayNum;
    if (formUnifiedSlide > 0) {
      return `출발값 보정 : ${coKey}_${f(coBase)} + 밀림 ${f(formUnifiedSlide)} = ${coKey}_${f(coEff)}`;
    }
    return `출발값 보정 : ${coKey}_${f(coBase)} - 끌림 ${f(Math.abs(formUnifiedSlide))} = ${coKey}_${f(coEff)}`;
  }, [
    hasSlideDraw,
    hasAllInputs,
    normalizedBasePayload,
    coKey,
    adjustedInputs,
    formUnifiedSlide,
  ]);

  const eduRailCorrectionLine = useMemo(() => {
    if (!hasRailAngleSpin || !hasAllInputs || !c3Key) return null;
    const c3Eff = Number(effDisplayMap[c3Key]);
    if (!Number.isFinite(c3Eff)) return null;
    const f = fmtFiveHalfDisplayNum;
    let c3Mid;
    if (isFiveHalfSystemId(formData.system) && systemMode !== "full_input" && c3AfterSlideOnlyFiveHalf != null) {
      c3Mid = c3AfterSlideOnlyFiveHalf;
    } else {
      c3Mid = Number(normalizedBasePayload[c3Key]);
    }
    if (!Number.isFinite(c3Mid)) return null;
    const parts = [`${c3Key}_${f(c3Mid)}`];
    if (formAngleTilt !== 0) {
      parts.push(
        formAngleTilt > 0
          ? `+ 기울기 ${f(formAngleTilt)}`
          : `- 기울기 ${f(Math.abs(formAngleTilt))}`
      );
    }
    if (p_spin !== 0) {
      parts.push(p_spin > 0 ? `+ 스핀 ${f(p_spin)}` : `- 스핀 ${f(Math.abs(p_spin))}`);
    }
    return `3쿠션값 보정 : ${parts.join(" ")} = ${c3Key}_${f(c3Eff)}`;
  }, [
    hasRailAngleSpin,
    hasAllInputs,
    c3Key,
    effDisplayMap,
    normalizedBasePayload,
    formAngleTilt,
    p_spin,
    formData.system,
    systemMode,
    c3AfterSlideOnlyFiveHalf,
  ]);

  const eduCorrectedFormulaLine = useMemo(() => {
    if (!hasAnyCorrection || !hasAllInputs) return null;
    if (isFiveHalfSystemId(formData.system) && (hasSlideDraw || hasRailAngleSpin)) {
      const c1 = Number(normalizedBasePayload[c1Key]);
      const coE = Number(effDisplayMap[coKey]);
      const c3E = Number(effDisplayMap[c3Key]);
      if (!Number.isFinite(c1) || !Number.isFinite(coE) || !Number.isFinite(c3E)) return null;
      const f = fmtFiveHalfDisplayNum;
      return `${c1Key}_${f(c1)} = ${coKey}_${f(coE)} - ${c3Key}_${f(c3E)}`;
    }
    if (!displayExpr || !displayExpr.trim()) return null;
    return effectiveFormulaLine;
  }, [
    hasAnyCorrection,
    hasAllInputs,
    formData.system,
    hasSlideDraw,
    hasRailAngleSpin,
    normalizedBasePayload,
    c1Key,
    coKey,
    c3Key,
    effDisplayMap,
    displayExpr,
    effectiveFormulaLine,
  ]);

  return (
    <div
      style={{
        color: '#334155',
        fontSize: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        flexWrap: 'wrap',
        maxHeight: '95vh',
        overflow: 'hidden',
        overflowX: 'hidden'
      }}
    >
      {/* [B] 상단 설정: 공략 유형(고정폭) | 적용 시스템(남은 공간) */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: '0 0 auto' }}>
        <div style={{ flex: '0 0 160px' }}>
          <select
            value={formData.shotType}
            onChange={(e) => {
              setIsRestored(false);
              setFormData({ ...formData, shotType: e.target.value });
            }}
            style={{
              width: '100%',
              height: '36px',
              padding: '0 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            {SHOT_TYPE_OPTIONS.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <select
            value={formData.system}
            onChange={(e) => {
              setIsRestored(false);
              setFormData({ ...formData, system: e.target.value });
            }}
            style={{
              width: '100%',
              height: '36px',
              padding: '0 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            {SYSTEM_OPTIONS.map(sys => (
              <option key={sys.id} value={sys.id}>{sys.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>트랙 (Track)</span>
        <select
          value={formData.track}
          onChange={(e) => {
            setIsRestored(false);
            setFormData({ ...formData, track: e.target.value });
          }}
          style={{
            width: '100%',
            height: '36px',
            padding: '0 10px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: '#fff'
          }}
        >
          <option value="B2T_R">B2T_R</option>
          <option value="B2T_L">B2T_L</option>
          <option value="T2B_R">T2B_R</option>
          <option value="T2B_L">T2B_L</option>
        </select>
      </div>

      {/* [D] 기준 입력값: flex-wrap, 폭 하드 지정 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          alignItems: 'center'
        }}
      >
        {["CO", "C1", "C2", "C3", "C4"].map(mark => {
          const sel = spaceSel[mark];
          const key = `${mark}_${sel}`;
          let inputKey = key;
          if (
            showMarkRowExtraForSys(mark, systemMode, exprLhsToken) &&
            mark === "C1" &&
            exprLhsToken.startsWith("C1_")
          ) {
            inputKey = exprLhsToken;
          } else if (
            showMarkRowExtraForSys(mark, systemMode, exprLhsToken) &&
            mark === "C3" &&
            exprLhsToken.startsWith("C3_")
          ) {
            inputKey = exprLhsToken;
          } else if (
            showMarkRowExtraForSys(mark, systemMode, exprLhsToken) &&
            mark === "CO" &&
            exprLhsToken.startsWith("CO_")
          ) {
            inputKey = exprLhsToken;
          }
          const enabled = neededKeys.has(key) || showMarkRowExtraForSys(mark, systemMode, exprLhsToken);
          const lock = !!forced[mark];
          const fiveHalfComp = isFiveHalfSystemId(formData.system)
            ? fiveHalfComputedInputKey(formData.inputs, coKey, c1Key, c3Key)
            : null;
          const basisRO =
            (mark === "CO" || mark === "C1" || mark === "C3") &&
            (isFiveHalfSystemId(formData.system)
              ? fiveHalfComp != null && inputKey === fiveHalfComp
              : isMarkBasisReadOnly(mark, systemMode));
          const readOnly = basisRO;
          const numDisplay =
            normalizedBasePayload[inputKey] != null && Number.isFinite(Number(normalizedBasePayload[inputKey]))
              ? normalizedBasePayload[inputKey]
              : formData.inputs[inputKey] ?? "";
          return (
            <div
              key={mark}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: enabled ? 1 : 0.3,
                pointerEvents: enabled ? 'auto' : 'none'
              }}
            >
              <label style={{ minWidth: '22px', fontSize: '12px', fontWeight: '600' }}>{mark}</label>
              <input
                type="number"
                step="0.5"
                readOnly={readOnly}
                value={readOnly ? numDisplay : formData.inputs[inputKey] ?? ""}
                onChange={(e) => !readOnly && handleInputChange(inputKey, e.target.value)}
                style={{
                  width: '70px',
                  height: '32px',
                  padding: '0 6px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  backgroundColor: readOnly ? "#f1f5f9" : "#fff"
                }}
              />
              <div style={{ display: 'flex', gap: '1px' }}>
                <button
                  type="button"
                  disabled={lock || basisRO}
                  onClick={() => {
                    setIsRestored(false);
                    setSpaceSel((p) => ({ ...p, [mark]: "f" }));
                  }}
                  style={{
                    width: '24px',
                    height: '32px',
                    padding: 0,
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '600',
                    cursor: lock || basisRO ? 'not-allowed' : 'pointer',
                    backgroundColor: sel === "f" ? '#3b82f6' : '#fff',
                    color: sel === "f" ? '#fff' : '#64748b'
                  }}
                >
                  f
                </button>
                <button
                  type="button"
                  disabled={lock || basisRO}
                  onClick={() => {
                    setIsRestored(false);
                    setSpaceSel((p) => ({ ...p, [mark]: "r" }));
                  }}
                  style={{
                    width: '24px',
                    height: '32px',
                    padding: 0,
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '600',
                    cursor: lock || basisRO ? 'not-allowed' : 'pointer',
                    backgroundColor: sel === "r" ? '#ef4444' : '#fff',
                    color: sel === "r" ? '#fff' : '#64748b'
                  }}
                >
                  r
                </button>
              </div>
            </div>
          );
        })}
        <div style={{ opacity: needsHP ? 1 : 0.3, pointerEvents: needsHP ? 'auto' : 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600' }}>HP_n</label>
          <select
            value={formData.inputs.HP_n}
            onChange={(e) => handleInputChange('HP_n', Number(e.target.value))}
            style={{
              width: '110px',
              height: '32px',
              padding: '0 6px',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              fontSize: '13px',
              backgroundColor: '#fff',
              cursor: 'pointer',
              boxSizing: 'border-box'
            }}
          >
            {HP_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div style={{ opacity: needsAn ? 1 : 0.3, pointerEvents: needsAn ? 'auto' : 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600' }}>An</label>
          <input
            type="number"
            step="0.1"
            value={formData.inputs.An}
            onChange={(e) => {
              const v = Number(e.target.value);
              handleInputChange('An', isNaN(v) ? 0 : Math.round(v * 10) / 10);
            }}
            style={{
              width: '70px',
              height: '32px',
              padding: '0 6px',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              fontSize: '13px',
              backgroundColor: '#fff',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* [C] 계산 공식 (입력 필드 아래) */}
      <div
        style={{
          padding: '6px 8px',
          backgroundColor: '#f1f5f9',
          borderRadius: '6px',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '13px',
          border: '1px solid #e2e8f0'
        }}
      >
        계산 공식 :{" "}
        {isFiveHalfSystemId(formData.system) && systemMode !== "full_input"
          ? "C1_f = CO_f - C3_r"
          : (expr || "(공식 없음)")}
      </div>

      <div
        style={{
          padding: '6px 10px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          fontSize: '15px',
          color: '#0f172a',
          fontWeight: 600,
          lineHeight: 1.45,
          wordBreak: 'keep-all'
        }}
      >
        <span style={{ color: '#1e40af', fontWeight: 700 }}>[용어 설명]</span>
        <span style={{ display: 'inline', marginLeft: '6px', letterSpacing: '0.04em' }}>
          C1_f : 1쿠션 프레임 값
        </span>
        <span style={{ color: '#94a3b8', margin: '0 10px', fontWeight: 400 }}>,</span>
        <span style={{ letterSpacing: '0.04em' }}>CO_f : 출발 프레임 값</span>
        <span style={{ color: '#94a3b8', margin: '0 10px', fontWeight: 400 }}>,</span>
        <span style={{ letterSpacing: '0.04em' }}>C3_r : 3쿠션 레일 값</span>
      </div>

      {/* [E] 물리 보정: 밀림 · 끌림 · 기울기 · 스핀 · 출발값 보정 */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { key: 'slide', label: '밀림' },
          { key: 'draw', label: '끌림' },
          { key: 'curve_ratio', label: '기울기' },
          { key: 'spin', label: '스핀' },
          { key: 'departure', label: '출발값 보정' },
        ].map(({ key, label }) => {
          const isDeparture = key === 'departure';
          const displayValue = isDeparture && snFor5HalfEffective
            ? snFor5HalfEffective.Sn
            : formData.corrections[key];
          return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', minWidth: isDeparture ? '70px' : '32px' }}>{label}</label>
            <input
              type="number"
              step="0.5"
              value={displayValue}
              readOnly={isDeparture && !!snFor5HalfEffective}
              onChange={(e) => {
                if (isDeparture && snFor5HalfEffective) return;
                setIsRestored(false);
                const raw = Number(e.target.value);
                const fin = Number.isFinite(raw) ? raw : 0;
                const nextCorr = { ...formData.corrections };
                if (key === "slide") {
                  nextCorr.slide = Math.abs(fin);
                  nextCorr.draw = 0;
                } else if (key === "draw") {
                  nextCorr.draw = fin === 0 ? 0 : -Math.abs(fin);
                  nextCorr.slide = 0;
                } else {
                  nextCorr[key] = fin;
                }
                setFormData({
                  ...formData,
                  corrections: nextCorr,
                });
              }}
              style={{
                width: '70px',
                height: '32px',
                padding: '0 6px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                fontSize: '13px',
                backgroundColor: '#fff',
                boxSizing: 'border-box'
              }}
            />
          </div>
          );
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            hasAnyCorrection && eduCorrectedFormulaLine
              ? 'repeat(2, minmax(0, 1fr))'
              : 'minmax(0, 1fr)',
          gap: '6px',
          alignItems: 'stretch'
        }}
      >
        <div
          style={{
            padding: '6px 8px',
            backgroundColor: '#fff3bf',
            borderRadius: '6px',
            border: '1px solid #fde68a',
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <strong>기준 계산값</strong>
          <span style={{ fontFamily: 'Consolas, Monaco, "Courier New", monospace', lineHeight: 1.45 }}>
            {isFiveHalfSystemId(formData.system) && fiveHalfBaseDisplayLine != null
              ? fiveHalfBaseDisplayLine
              : baseFormulaLine}
          </span>
        </div>

        {hasAnyCorrection && eduCorrectedFormulaLine && (
          <div
            style={{
              padding: '6px 8px',
              backgroundColor: '#d3f9d8',
              borderRadius: '6px',
              border: '1px solid #86efac',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <strong>보정 계산값</strong>
            <span style={{ fontFamily: 'Consolas, Monaco, "Courier New", monospace', lineHeight: 1.45 }}>
              {eduCorrectedFormulaLine}
            </span>
          </div>
        )}
      </div>

      {hasAnyCorrection && (eduStartCorrectionLine || eduRailCorrectionLine) && (
        <div
          style={{
            padding: '6px 8px',
            backgroundColor: '#eff6ff',
            borderRadius: '6px',
            border: '1px solid #bfdbfe',
            fontSize: '12px',
            color: '#1e3a8a',
            lineHeight: 1.45,
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          }}
        >
          {eduStartCorrectionLine && (
            <div style={{ marginBottom: eduRailCorrectionLine ? '4px' : 0 }}>{eduStartCorrectionLine}</div>
          )}
          {eduRailCorrectionLine && <div>{eduRailCorrectionLine}</div>}
        </div>
      )}

      {useSnForSystem && isFiveHalfSystemId(formData.system) && hasAllInputs && snFor5HalfEffective && (() => {
        const { Sn: Sn_eff, C4_f: C4_eff, CO_f: CO_used, C3_r: C3_used } = snFor5HalfEffective;
        const fmt = (n) => {
          const x = Number(n);
          if (Number.isNaN(x)) return "0";
          return x % 1 === 0 ? String(Math.round(x)) : String(Math.round(x * 10) / 10);
        };
        const c3Label = c3Key || "C3_r";
        const coLabel = coKey || "CO_f";
        const signMid = Sn_eff >= 0 ? "+" : "−";
        const midAbs = fmt(Math.abs(Sn_eff));
        return (
          <div
            style={{
              marginTop: "4px",
              padding: "6px 10px",
              backgroundColor: "#f0fdf4",
              borderRadius: "6px",
              border: "1px solid #bbf7d0",
              fontSize: "12px",
              lineHeight: 1.5,
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              color: "#166534",
            }}
          >
            <div style={{ fontWeight: "700", fontSize: "14px", marginBottom: "4px" }}>
              4쿠션 도착값 : {fmt(C4_eff)}
            </div>
            <div>
              4쿠션 도착값 : {c3Label}_{fmt(C3_used)} {signMid} {midAbs} = {fmt(C4_eff)}
            </div>
            <div style={{ marginTop: "4px" }}>
              출발값 보정 계산 : ({coLabel}_{fmt(CO_used)} - 50) × 0.5 = {fmt(Sn_eff)}
            </div>
          </div>
        );
      })()}

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '4px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
        <button
          type="button"
          disabled={!hasAllInputs}
          onClick={handleSave}
          title={!hasAllInputs ? "공식에 필요한 입력을 모두 채운 뒤 적용할 수 있습니다." : undefined}
          style={{
            flex: 1,
            height: '36px',
            padding: '0 16px',
            backgroundColor: hasAllInputs ? '#3b82f6' : '#94a3b8',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: hasAllInputs ? 'pointer' : 'not-allowed',
            opacity: hasAllInputs ? 1 : 0.85,
          }}
        >
          적용
        </button>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            height: '36px',
            padding: '0 16px',
            backgroundColor: '#e2e8f0',
            color: '#475569',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          취소
        </button>
      </div>
    </div>
  );
}

function AnchorEditOverlay({ anchorKey, initialX, initialY, onApply, onCancel }) {
  const [x, setX] = useState(String(initialX));
  const [y, setY] = useState(String(initialY));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: "280px" }}>
      <div>
        <strong>앵커:</strong> {cushionMarkToDisplayLabel(anchorKey)}
      </div>
      <div>
        <label style={{ display: "block", marginBottom: "4px" }}>X:</label>
        <input
          type="number"
          step="0.1"
          value={x}
          onChange={(e) => setX(e.target.value)}
          style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
        />
      </div>
      <div>
        <label style={{ display: "block", marginBottom: "4px" }}>Y:</label>
        <input
          type="number"
          step="0.1"
          value={y}
          onChange={(e) => setY(e.target.value)}
          style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
        />
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
        <button
          onClick={() => onApply(x, y)}
          style={{ padding: "8px 16px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
        >
          적용
        </button>
        <button
          onClick={onCancel}
          style={{ padding: "8px 16px", backgroundColor: "#64748b", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
        >
          취소
        </button>
      </div>
    </div>
  );
}

function HptOverlay({ data, sysHpNResult, onSave, onCancel }) {
  const [tempData, setTempData] = useState(data);
  const [lastChanged, setLastChanged] = useState(null); // 'x' or 'y'
  const [isClamped, setIsClamped] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // STEP A: useHptController 어댑터 (hit_point ↔ hp)
  // hit_point는 항상 hp(±4) 저장. Rg 오해석 제거 → 내부로 드래그 시 바깥으로 튐 방지
  const rawX = Number.isFinite(tempData.hit_point?.x) ? tempData.hit_point.x : 0;
  const rawY = Number.isFinite(tempData.hit_point?.y) ? tempData.hit_point.y : 0;
  const hpClamped = clampHpToRadius(rawX, rawY, 4);
  const rCv = Math.hypot(hpClamped.x, hpClamped.y);
  if (rCv > 4.0001) {
    console.error("[CLAMP BREAK - controllerValue]", { rawX: hpClamped.x, rawY: hpClamped.y, r: rCv });
  }
  const controllerValue = {
    T: tempData.T ?? "8/8",
    hp: { x: hpClamped.x, y: hpClamped.y },
    mode: tempData.mode ?? "TIP",
    tipCount: tempData.tipCount,
  };
  const onControllerChange = (next) => {
    const rx = next.hp?.x ?? 0;
    const ry = next.hp?.y ?? 0;
    const r = Math.hypot(rx, ry);
    if (r > 4.0001) {
      console.error("[CLAMP BREAK - parent store]", next.hp);
    }
    const c = clampHpToRadius(rx, ry, 4);
    setTempData((prev) => ({
      ...prev,
      T: next.T,
      hit_point: { x: c.x, y: c.y },
      mode: next.mode ?? "TIP",
      tipCount: next.tipCount,
    }));
  };
  const hpt = useHptController({
    cue: null,
    target: null,
    hpt: controllerValue,
    onChange: onControllerChange,
  });

  useEffect(() => {
    if (sysHpNResult != null) {
      const dir = sysHpNResult >= 0 ? "right" : "left";
      const tip = Math.min(4, Math.max(0, Number(Math.abs(sysHpNResult).toFixed(1))));
      hpt.setHpFromTip(dir, tip);
    }
  }, [sysHpNResult]);

  // T값 옵션 (0/8 ~ 8/8, 17개)
  const T_OPTIONS = [
    { value: "8/8", label: "정면 (8/8)" },
    { value: "+7/8", label: "우측 7/8" },
    { value: "+6/8", label: "우측 6/8" },
    { value: "+5/8", label: "우측 5/8" },
    { value: "+4/8", label: "우측 4/8" },
    { value: "+3/8", label: "우측 3/8" },
    { value: "+2/8", label: "우측 2/8" },
    { value: "+1/8", label: "우측 1/8" },
    { value: "+0/8", label: "우측 0/8 (극단적 얇은 두께)" },
    { value: "-0/8", label: "좌측 0/8 (극단적 얇은 두께)" },
    { value: "-1/8", label: "좌측 1/8" },
    { value: "-2/8", label: "좌측 2/8" },
    { value: "-3/8", label: "좌측 3/8" },
    { value: "-4/8", label: "좌측 4/8" },
    { value: "-5/8", label: "좌측 5/8" },
    { value: "-6/8", label: "좌측 6/8" },
    { value: "-7/8", label: "좌측 7/8" },
    { value: "BANK", label: "뱅크 샷" }
  ];

  // ==========================================
  // 타점 입력 핸들러 (클램프 포함)
  // ==========================================
  const MAX_VALUE = 4.0;
  const CLAMP_RADIUS = 4.0; // 점선 원 = 입력값 4까지

  const safeNum = (v) => (typeof v === 'number' && !isNaN(v) ? v : 0);

  const handleHitPointChange = (axis, rawValue) => {
    const num = parseFloat(rawValue);
    if (isNaN(num)) return;

    // 1차 제한: ±4, 소수점 1자리
    let value = Math.max(-MAX_VALUE, Math.min(MAX_VALUE, num));
    value = Math.round(value * 10) / 10;

    const currentX = axis === 'x' ? value : hpt.hp.x;
    const currentY = axis === 'y' ? value : hpt.hp.y;

    // 2차 제한: 원형 클램프 (한계 반지름 4)
    const distance = Math.sqrt(currentX ** 2 + currentY ** 2);
    
    let finalX = currentX;
    let finalY = currentY;
    let clamped = false;

    if (distance > CLAMP_RADIUS) {
      clamped = true;
      
      // 마지막 변경 축만 클램프
      if (axis === 'x') {
        // X를 방금 변경 → X만 한계선으로 클램프
        const maxX = Math.sqrt(Math.max(0, CLAMP_RADIUS ** 2 - currentY ** 2));
        finalX = currentX > 0 ? Math.min(currentX, maxX) : Math.max(currentX, -maxX);
        finalX = Math.round(finalX * 10) / 10;
        // Y는 그대로 유지
        finalY = currentY;
      } else {
        // Y를 방금 변경 → Y만 한계선으로 클램프
        const maxY = Math.sqrt(Math.max(0, CLAMP_RADIUS ** 2 - currentX ** 2));
        finalY = currentY > 0 ? Math.min(currentY, maxY) : Math.max(currentY, -maxY);
        finalY = Math.round(finalY * 10) / 10;
        // X는 그대로 유지
        finalX = currentX;
      }
    }

    // STEP A: 컨트롤러 경유 → onControllerChange → tempData
    hpt.setHp({ x: finalX, y: finalY });
    setLastChanged(axis);
    setIsClamped(clamped);

    // 클램프 피드백 0.5초 후 제거
    if (clamped) {
      setTimeout(() => setIsClamped(false), 500);
    }
  };

  // ==========================================
  // 두께값 파싱 (숫자 변환)
  // ==========================================
  const parseThickness = (tValue) => {
    if (!tValue) return 0;
    
    // "8/8" → 8 (완전 겹침)
    if (tValue === "8/8") return 8;
    
    // "+7/8" → 7, "-3/8" → -3
    const match = tValue.match(/^([+-]?)(\d+)\/8$/);
    if (!match) return 0;
    
    const sign = match[1] === '-' ? -1 : 1;
    const num = parseInt(match[2], 10);
    return sign * num;
  };

  const thickness = parseThickness(tempData.T);
  const isRightImpact = thickness >= 0;

  // ==========================================
  // 볼 시각화 설정
  // ==========================================
  const BALL_RADIUS = 120; // 40 → 120 (3배)
  const CANVAS_WIDTH = 600; // 300 → 600 (2배)
  const CANVAS_HEIGHT = 300; // 150 → 300 (2배)
  const CENTER_Y = CANVAS_HEIGHT / 2;
  const CENTER_X = CANVAS_WIDTH / 2;
  
  // 두께에 따른 X 위치 (지름 기준)
  // 뱅크샷: 두께 불필요 → 정면(8/8)으로 시각화
  const thicknessValue = tempData.T === "BANK" ? 8 : Math.abs(thickness); // 0~8 (표기의 n)
  const thicknessFraction = thicknessValue / 8; // n/8 그대로 사용
  const centerDistance = (1 - thicknessFraction) * (2 * BALL_RADIUS); // 지름 기준
  
  let impactX, targetX;
  if (isRightImpact) {
    // 우측이 임펙트볼 (앞)
    impactX = CENTER_X + centerDistance / 2;
    targetX = CENTER_X - centerDistance / 2;
  } else {
    // 좌측이 임펙트볼 (앞)
    impactX = CENTER_X - centerDistance / 2;
    targetX = CENTER_X + centerDistance / 2;
  }
  
  // 60% 원의 반지름
  const limit60Radius = BALL_RADIUS * 0.6;

  // ==========================================
  // 드래그 핸들러
  // ==========================================
  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleDragMove(e);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    handleDragMove(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDragMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 픽셀 → 논리 좌표 변환
    const scale = MAX_VALUE / limit60Radius;
    
    const logicalX = (mouseX - impactX) * scale;
    const logicalY = (CENTER_Y - mouseY) * scale; // Y축 반전
    
    // 클램프 적용 (반지름 4 기준)
    const distance = Math.sqrt(logicalX ** 2 + logicalY ** 2);
    let finalX = logicalX;
    let finalY = logicalY;
    
    if (distance > CLAMP_RADIUS) {
      const clampScale = CLAMP_RADIUS / distance;
      finalX = logicalX * clampScale;
      finalY = logicalY * clampScale;
    }
    
    // 소수점 1자리로 반올림 (STEP A: 컨트롤러 경유 → onControllerChange → tempData)
    finalX = Math.round(finalX * 10) / 10;
    finalY = Math.round(finalY * 10) / 10;

    hpt.setHp({ x: finalX, y: finalY });
  };

  return (
    <div style={{ color: '#334155', fontSize: '14px' }}>
      {/* ========================================
          볼 시각화 영역
      ======================================== */}
      <div style={{ 
        marginBottom: '24px', 
        padding: '20px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ 
          fontSize: '14px', 
          fontWeight: '700', 
          marginBottom: '16px',
          color: '#1f2937'
        }}>
          타점/두께 시각화
        </h3>
        
        <svg 
          width={CANVAS_WIDTH} 
          height={CANVAS_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ 
            display: 'block', 
            margin: '0 auto',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        >
          {/* 타겟볼 (뒤) */}
          <circle
            cx={targetX}
            cy={CENTER_Y}
            r={BALL_RADIUS}
            fill="#ef4444"
            stroke="#991b1b"
            strokeWidth="3"
          />
          
          {/* 임펙트볼 (앞) */}
          <circle
            cx={impactX}
            cy={CENTER_Y}
            r={BALL_RADIUS}
            fill="#ffffff"
            stroke="#1f2937"
            strokeWidth="3"
          />
          
          {/* 임펙트볼 전용 표시 */}
          {/* 60% 한계선 */}
          <circle
            cx={impactX}
            cy={CENTER_Y}
            r={limit60Radius}
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1.5"
            strokeDasharray="6,3"
            opacity="0.6"
          />
          
          {/* 중심 십자선 (60% 원까지) */}
          <line
            x1={impactX - limit60Radius}
            y1={CENTER_Y}
            x2={impactX + limit60Radius}
            y2={CENTER_Y}
            stroke="#d1d5db"
            strokeWidth="1"
            opacity="0.5"
          />
          <line
            x1={impactX}
            y1={CENTER_Y - limit60Radius}
            x2={impactX}
            y2={CENTER_Y + limit60Radius}
            stroke="#d1d5db"
            strokeWidth="1"
            opacity="0.5"
          />
          
          {/* 중심점 (작게) */}
          <circle
            cx={impactX}
            cy={CENTER_Y}
            r="3"
            fill="#6b7280"
            opacity="0.7"
          />
          
          {/* 클램프 피드백 (빨간 테두리) */}
          {isClamped && (
            <circle
              cx={impactX}
              cy={CENTER_Y}
              r={limit60Radius}
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
              opacity="0.6"
            />
          )}
          
          {/* 타점 마커 (STEP B: hpt.hp) */}
          {(() => {
            const hitX = hpt.hp.x;
            const hitY = hpt.hp.y;
            
            // 타점 좌표를 픽셀로 변환 (±4 → 볼 반지름 60%)
            const scale = limit60Radius / MAX_VALUE;
            const markerX = impactX + (hitX * scale);
            const markerY = CENTER_Y - (hitY * scale); // Y축 반전
            const markerRadius = BALL_RADIUS / 12;
            
            return (
              <circle
                cx={markerX}
                cy={markerY}
                r={markerRadius}
                fill="#000000"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            );
          })()}
        </svg>
      </div>

      {/* 1줄: 두께 | 타점 | 시침 값 */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>두께</label>
            <select
              value={tempData.T ?? "8/8"}
              onChange={(e) => hpt.setT(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              {T_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>타점</label>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', width: '100%', boxSizing: 'border-box' }}>
              <button type="button" onClick={() => { const next = Number((hpt.displayTip - 0.1).toFixed(1)); hpt.setSystemTip(hpt.hpDirection, next); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}>−</button>
              <span onClick={() => hpt.setSystemTip(hpt.hpDirection === "left" ? "right" : "left", hpt.displayTip)} style={{ cursor: 'pointer', fontSize: '14px', margin: '0 4px' }}>{hpt.hpDirection === "left" ? "좌측" : "우측"}</span>
              <input type="number" step="0.1" min="0" max="4" value={hpt.displayTip}
                onChange={(e) => { if (e.target.value === "") return; const raw = Number(e.target.value); if (isNaN(raw)) return; hpt.setSystemTip(hpt.hpDirection, raw); }}
                style={{ width: '48px', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', textAlign: 'center' }} />
              <span style={{ fontSize: '14px' }}>팁</span>
              <button type="button" onClick={() => { const next = Number((hpt.displayTip + 0.1).toFixed(1)); hpt.setSystemTip(hpt.hpDirection, next); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}>+</button>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '80px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>시침 값</label>
            <div style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', fontSize: '14px', textAlign: 'center' }}>
              {hpt.displayClock}
            </div>
          </div>
        </div>
      </div>

      {/* 2줄: 회전 | 당점 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>회전</label>
            <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', backgroundColor: 'white', gap: '8px' }}>
              <button type="button" onClick={() => hpt.setRotationTip(hpt.rotationTip - 0.1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}>−</button>
              <span onClick={() => hpt.setRotationTip(-hpt.rotationTip)} style={{ minWidth: '32px', textAlign: 'center', fontSize: '14px', cursor: 'pointer' }}>
                {hpt.displayRotation >= 0 ? '우측' : '좌측'}
              </span>
              <input type="number" step="0.1" min="0" max="4" value={Number(Math.abs(hpt.displayRotation).toFixed(1))}
                onChange={(e) => {
                  if (e.target.value === '') return;
                  const raw = Number(e.target.value);
                  if (isNaN(raw)) return;
                  const sign = hpt.rotationTip >= 0 ? 1 : -1;
                  hpt.setRotationTip(sign * Number(Math.min(4, Math.max(0, raw)).toFixed(1)));
                }}
                style={{ width: '80px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', textAlign: 'center' }} />
              <span style={{ fontSize: '14px' }}>팁</span>
              <button type="button" onClick={() => hpt.setRotationTip(hpt.rotationTip + 0.1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}>+</button>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>당점</label>
            <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', backgroundColor: 'white', gap: '8px' }}>
              <button type="button" onClick={() => hpt.setVerticalTip(hpt.verticalTip - 0.1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}>−</button>
              <span onClick={() => hpt.setVerticalTip(-hpt.verticalTip)} style={{ minWidth: '32px', textAlign: 'center', fontSize: '14px', cursor: 'pointer' }}>
                {hpt.displayVertical >= 0 ? '상단' : '하단'}
              </span>
              <input type="number" step="0.1" min="0" max="4" value={Number(Math.abs(hpt.displayVertical).toFixed(1))}
                onChange={(e) => {
                  if (e.target.value === '') return;
                  const raw = Number(e.target.value);
                  if (isNaN(raw)) return;
                  const sign = hpt.verticalTip >= 0 ? 1 : -1;
                  hpt.setVerticalTip(sign * Number(Math.min(4, Math.max(0, raw)).toFixed(1)));
                }}
                style={{ width: '80px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', textAlign: 'center' }} />
              <span style={{ fontSize: '14px' }}>팁</span>
              <button type="button" onClick={() => hpt.setVerticalTip(hpt.verticalTip + 0.1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}>+</button>
            </div>
          </div>
        </div>
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
        <button
          onClick={() => onSave(tempData)}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          적용
        </button>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#e2e8f0',
            color: '#334155',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          취소
        </button>
      </div>
    </div>
  );
}

function StrOverlay({ data, onSave, onCancel }) {
  const [tempData, setTempData] = useState({
    type: data?.type ?? null,
    acceleration: data?.acceleration || 'smooth_const',
    speed: data?.speed ?? 2.5,
    depth: data?.depth ?? 2,
    impact: data?.impact || 'medium'
  });

  // 스트로크 타입 옵션 (null = 선택 안함)
  const STROKE_TYPES = [
    { value: null, label: '선택 안함' },
    { value: 'long_follow', label: '롱 팔로우' },
    { value: 'through_shot', label: '관통 샷' },
    { value: 'stop_shot', label: '스톱 샷' },
    { value: 'short_shot', label: '숏 샷' }
  ];

  // 가속 패턴 옵션
  const ACCELERATION_PATTERNS = [
    { value: 'smooth_accel', label: '부드러운 가속' },
    { value: 'sharp_accel', label: '날카로운 가속' },
    { value: 'smooth_const', label: '부드러운 등속' },
    { value: 'intentional_decel', label: '의도적 감속' }
  ];

  // 타격 강도 옵션
  const IMPACT_STRENGTHS = [
    { value: 'soft', label: '부드러운' },
    { value: 'medium', label: '평범한' },
    { value: 'hard', label: '강한' },
    { value: 'sharp', label: '날카로운' }
  ];

  return (
    <div style={{ color: '#334155', fontSize: '16px' }}>
      {/* 1. 스트로크 타입 */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: '600',
          fontSize: '16px'
        }}>
          스트로크 타입
        </label>
        <select
          value={tempData.type ?? ""}
          onChange={(e) => setTempData({ ...tempData, type: e.target.value === "" ? null : e.target.value })}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          {STROKE_TYPES.map(opt => (
            <option key={opt.value ?? "null"} value={opt.value ?? ""}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* 2. 가속 패턴 */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: '600',
          fontSize: '16px'
        }}>
          가속 패턴
        </label>
        <select
          value={tempData.acceleration}
          onChange={(e) => setTempData({ ...tempData, acceleration: e.target.value })}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          {ACCELERATION_PATTERNS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* 3. 목표 속도 (슬라이더) */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '10px', 
          fontWeight: '600',
          fontSize: '16px'
        }}>
          목표 속도
        </label>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '4px'
        }}>
          <input
            type="range"
            min="0.5"
            max="7.0"
            step="0.5"
            value={tempData.speed}
            onChange={(e) => setTempData({ ...tempData, speed: Number(e.target.value) })}
            style={{
              flex: 1,
              cursor: 'pointer'
            }}
          />
          <span style={{ 
            minWidth: '100px',
            textAlign: 'right',
            fontWeight: '600',
            fontSize: '18px',
            color: '#2563eb'
          }}>
            {tempData.speed.toFixed(1)} 레일
          </span>
        </div>
      </div>

      {/* 4. 스트로크 깊이 (슬라이더) */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '10px', 
          fontWeight: '600',
          fontSize: '16px'
        }}>
          스트로크 깊이
        </label>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '4px'
        }}>
          <input
            type="range"
            min="0.5"
            max="6.0"
            step="0.5"
            value={tempData.depth}
            onChange={(e) => setTempData({ ...tempData, depth: Number(e.target.value) })}
            style={{
              flex: 1,
              cursor: 'pointer'
            }}
          />
          <span style={{ 
            minWidth: '100px',
            textAlign: 'right',
            fontWeight: '600',
            fontSize: '18px',
            color: '#2563eb'
          }}>
            {tempData.depth.toFixed(1)} Ball
          </span>
        </div>
      </div>

      {/* 5. 타격 강도 */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: '600',
          fontSize: '16px'
        }}>
          타격 강도
        </label>
        <select
          value={tempData.impact}
          onChange={(e) => setTempData({ ...tempData, impact: e.target.value })}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          {IMPACT_STRENGTHS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
        <button
          onClick={() => onSave(tempData)}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          적용
        </button>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#e2e8f0',
            color: '#334155',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          취소
        </button>
      </div>
    </div>
  );
}

function ensureLessonItems(items) {
  if (!items || !Array.isArray(items)) return [];
  return items.map((item, idx) => {
    if (typeof item === "string") {
      return { id: `legacy-${idx}-${item.slice(0, 40).replace(/\s/g, "_")}`, text: item };
    }
    if (item && typeof item === "object" && item.id != null && item.text != null) {
      return item;
    }
    const t = String(item?.text ?? item ?? "");
    return { id: `fix-${idx}-${t.slice(0, 20)}`, text: t };
  });
}

function LessonRow({ lesson, selected, onSelect }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        padding: "4px 0",
        background: selected ? "#eef2ff" : "transparent",
        opacity: isDragging ? 0.5 : 1,
      }}
      onClick={onSelect}
    >
      <div
        {...attributes}
        {...listeners}
        className="drag-handle"
        style={{ marginRight: 8, flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        ☰
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.6, flex: 1 }}>
        - {lesson.text}
      </div>
    </div>
  );
}

function AiOverlay({
  data,
  sysData,
  hptData,
  strData,
  appliedSys,
  sysHpNResult,
  onSave,
  onSaveStrategy,
  onCancel,
  // 원 포인트 레슨
  onePointLibrary,
  sortedOnePointLibrary,
  onePointSelectedId,
  onePointDraft,
  setOnePointDraft,
  onSelectOnePoint,
  applyOnePointToShot,
  saveDraftAsNewLesson,
  onePointLessons,
  onDeleteLesson,
  onReorderLessons,
}) {
  const sys = sysData || data?.sys || {};
  const hpt = hptData || data?.hpt || {};
  const str = strData || data?.str || {};

  // 플레이 전략 자동 생성 (adminState 기반, overlay open 시 항상 최신값 반영)
  const buildPlayStrategyText = () => {
    const systemId = sys.system || sys.system_id || "5_half_system";
    const systemName = getSystemNameKo(systemId);
    const shotType = sys.shotType || "뒤돌리기";
    const thicknessText = formatThickness(hpt.T);
    const mode = hpt.mode ?? "TIP";
    const hitPoint = hpt.hit_point ?? hpt.hp ?? { x: 0, y: 0 };

    let tipText = "";
    let tipClockText = "";
    if (mode === "TIP") {
      if (sysHpNResult != null && typeof sysHpNResult === "number") {
        const dir = sysHpNResult >= 0 ? "right" : "left";
        const n = Math.abs(sysHpNResult);
        tipText = n === 0 ? "중앙(12시)" : dir === "right" ? `우측 ${n}팁` : `좌측 ${n}팁`;
        const theta = (dir === "right" ? 1 : -1) * (Math.PI / 2) * (1 - n / 4);
        tipClockText = convertThetaToClock(theta);
      } else {
        const tip = hitPointToTipDisplay(hitPoint);
        tipText = tip.tipText;
        tipClockText = tip.tipClockText;
      }
    }

    const rotationText = hitPointToRotationText(hitPoint);
    const verticalText = hitPointToVerticalText(hitPoint);

    const res = appliedSys?.outputs?.result || {};
    const toNum = (v) => (typeof v === "number" && !isNaN(v) ? v : null);

    // SYS: applied.sys.outputs.result에서만 읽기 (AI는 계산하지 않음, 출력된 값만 사용)
    const arrivalValue = toNum(res.threeC) ?? toNum(res.C4_f) ?? toNum(res.C4_r) ?? toNum(res.arrival) ?? null;
    const firstCushionValue = toNum(res.oneC) ?? toNum(res.C1_f) ?? toNum(res.C1_r) ?? null;

    const STROKE_TYPE_KO = {
      long_follow: "롱 팔로우",
      medium_follow: "미디엄 팔로우",
      standard: "미디엄 팔로우",
      through_shot: "관통 샷",
      stop_shot: "스톱 샷",
      short_shot: "숏 샷",
    };
    const ACCEL_PATTERN_KO = {
      smooth_accel: "부드러운 가속",
      sharp_accel: "날카로운 가속",
      smooth_const: "부드러운 등속",
      intentional_decel: "의도적 감속",
    };

    const strokeTypeText = (str.type && (STROKE_TYPE_KO[str.type] || str.type)) || null;
    const accelPatternText = ACCEL_PATTERN_KO[str.acceleration] || str.acceleration || "부드러운 등속";
    const passBalls = typeof str.depth === "number" ? str.depth : 2;
    const speedRails = typeof str.speed === "number" ? str.speed : 3;
    const impactStrengthKo = strengthToKo(str.impact) || "평범한";

    return buildPlayStrategy({
      systemName,
      shotType,
      arrivalValue,
      firstCushionValue,
      thicknessText,
      tipText,
      tipClockText,
      rotationText,
      verticalText,
      mode,
      passBalls,
      speedRails,
      accelPatternText,
      strokeTypeText,
      impactStrengthKo,
    });
  };

  const [aiText, setAiText] = useState(() => buildPlayStrategyText());
  const [selectedLessonId, setSelectedLessonId] = useState(null);

  useEffect(() => {
    setAiText(buildPlayStrategyText());
  }, [sysData, hptData, strData, appliedSys, sysHpNResult]);

  const lessons = useMemo(() => ensureLessonItems(onePointLessons), [onePointLessons]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(lessons, oldIndex, newIndex);
    onReorderLessons?.(next);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Delete" && selectedLessonId) {
        onDeleteLesson?.(selectedLessonId);
        setSelectedLessonId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLessonId, onDeleteLesson]);

  return (
    <div style={{ color: '#334155', fontSize: '18px', maxWidth: '1200px' }}>
      <div
        className="strategy-box"
        style={{
          border: '1px solid #d0d7de',
          borderRadius: 8,
          padding: 20,
          background: '#ffffff',
        }}
      >
        <div className="section-title" style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
          AI 코멘트
        </div>
        <div className="section-body" style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {aiText}
        </div>
        {lessons.length > 0 && (
          <>
            <div style={{ height: 24 }} />
            <div className="section-title" style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
              원 포인트 레슨
            </div>
            <div className="section-body" style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={lessons.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {lessons.map((lesson) => (
                    <LessonRow
                      key={lesson.id}
                      lesson={lesson}
                      selected={selectedLessonId === lesson.id}
                      onSelect={() => setSelectedLessonId(lesson.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: 24, marginBottom: '24px' }}>
        <select
          value={onePointSelectedId}
          onChange={(e) => {
            const id = e.target.value;
            if (id) onSelectOnePoint(id);
          }}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            marginBottom: 8,
            backgroundColor: '#fff',
          }}
        >
          <option value="">선택하세요</option>
          {(sortedOnePointLibrary || onePointLibrary || []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.text}
            </option>
          ))}
        </select>
        <textarea
          value={onePointDraft}
          onChange={(e) => setOnePointDraft?.(e.target.value)}
          placeholder="문장 입력 또는 수정"
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            marginBottom: 10,
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => applyOnePointToShot?.()}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#334155',
              backgroundColor: '#e2e8f0',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            적용
          </button>
          <button
            onClick={() => saveDraftAsNewLesson?.()}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#fff',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            저장
          </button>
        </div>
      </div>

      {/* 전체 적용 / 취소 */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button
          onClick={() => {
            const newData = { ...data, text: aiText, onePointLessons: data?.onePointLessons ?? [] };
            onSave(newData);
            onSaveStrategy?.(newData);
          }}
          style={{
            flex: 1,
            padding: '10px 16px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          전체 적용
        </button>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px 16px',
            backgroundColor: '#e2e8f0',
            color: '#334155',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          취소
        </button>
      </div>
    </div>
  );
}


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
  onActiveSlotChange,
  onFuncOverlayClose,
  onDirtySlotsChange,
  onAppModeChange,
  onStrategyCountMapChange,
  onSystemControlsAvailabilityChange,
}) {
  const [currentId, setCurrentId] = useState(SHOTS[0].id);
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overlayContent, setOverlayContent] = useState(null);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7263/ingest/2d7c02db-24bd-4dad-8e7a-c7f7bce1b5b1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "75c16c",
      },
      body: JSON.stringify({
        sessionId: "75c16c",
        runId: "snap-debug-pre",
        hypothesisId: "H5",
        location: "App.jsx:mount-effect",
        message: "App mounted in browser runtime",
        data: { currentId: SHOTS[0]?.id ?? null },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, []);
  
  // ============================================
  // ShotSlots & TrajectoryState 훅 연결 (ballsState 이후에 연결)
  // ============================================
  
  // ============================================
  // 관리자 모드 상태 (v0)
  // ============================================
  const [appMode, setAppMode] = useState("USER"); // "USER" | "ADMIN"
  
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

  /** 궤적/앵커 렌더 SSOT: 활성 슬롯의 sys만 사용 (adminState.sys / view.ui.system 혼합 금지) */
  const resolvedSlotSys = useMemo(() => {
    const slot = shotEditor.slots[shotEditor.activeSlot];
    return slot?.draft?.sys ?? slot?.applied?.sys ?? null;
  }, [shotEditor.slots, shotEditor.activeSlot]);

  const resolvedSlotSysValues = useMemo(() => {
    if (!resolvedSlotSys) return {};
    const merged = {
      ...(resolvedSlotSys.inputs ?? {}),
      ...(resolvedSlotSys.outputs?.result ?? {}),
    };
    const effectiveNums = buildSlotEffectiveRenderSysValues(
      merged,
      resolvedSlotSys,
      adminState?.sys
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
  }, [resolvedSlotSys, shotEditor.activeSlot, adminState?.sys]);

  const adminSysNoCorrections = useMemo(() => {
    if (!adminState?.sys) return undefined;
    return {
      ...adminState.sys,
      corrections: {
        ...(adminState.sys.corrections ?? {}),
        slide: 0,
        draw: 0,
        spin: 0,
        curve_ratio: 0,
      },
    };
  }, [adminState?.sys]);

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
      adminSysNoCorrections
    );
    const out =
      built && typeof built === "object" && Object.keys(built).length > 0
        ? { ...merged, ...built }
        : merged;
    return out;
  }, [resolvedSlotSys, shotEditor.activeSlot, adminSysNoCorrections]);

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

  const [showSystemGrid, setShowSystemGrid] = useState(true);
  const [showBaseLine, setShowBaseLine] = useState(false);
  const autoSave = true;

  /** 우측 패널: 상태 가시성 (버튼 = 시스템 상태 표현) */
  const [isPositionLocked, setIsPositionLocked] = useState(false);
  const [isTargetSelected, setIsTargetSelected] = useState(false);
  const [isRecalled, setIsRecalled] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [targetColor, setTargetColor] = useState(null);

  const canUseSystemControls =
    appMode === "ADMIN" && isPositionLocked && isTargetSelected;

  useEffect(() => {
    onSystemControlsAvailabilityChange?.(canUseSystemControls);
  }, [canUseSystemControls, onSystemControlsAvailabilityChange]);

  // dataset: PositionRecord[] (localStorage "positions_dataset")
  const [dataset, setDataset] = useState(() => {
    try {
      const saved = localStorage.getItem("positions_dataset");
      const raw = saved ? JSON.parse(saved) : [];
      return normalizeDatasetFromStorage(raw);
    } catch {
      return [];
    }
  });

  /** SYS에서 계산된 HP_n 결과 임시 저장 (HP/T 열릴 때만 반영, UI 동기화용) */
  const [sysHpNResult, setSysHpNResult] = useState(null);

  /** C2 reflection fallback용 수동 힌트 (추후 draggable C2 UI 연결용) */
  const [c2ManualHint, setC2ManualHint] = useState(null);

  // 원 포인트 레슨 라이브러리 (로컬스토리지)
  const ONE_POINT_KEY = "ONE_POINT_LESSON_LIBRARY_V1";
  const [onePointLibrary, setOnePointLibrary] = useState([]);
  const [onePointSelectedId, setOnePointSelectedId] = useState("");
  const [onePointDraft, setOnePointDraft] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ONE_POINT_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setOnePointLibrary(parsed);
    } catch (e) {
      console.warn("Failed to load onePointLibrary", e);
    }
  }, []);
  const saveOnePointLibrary = (next) => {
    setOnePointLibrary(next);
    try {
      localStorage.setItem(ONE_POINT_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to save onePointLibrary", e);
    }
  };
  const sortedOnePointLibrary = useMemo(() => {
    return [...onePointLibrary].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }, [onePointLibrary]);
  const normalizeLesson = (s) => (s || "").trim();
  const onSelectOnePoint = (id) => {
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
    const existing = onePointLibrary.find(x => normalizeLesson(x.text) === text);
    if (existing) {
      const nextLib = onePointLibrary.map(x =>
        x.id === existing.id ? { ...x, text } : x
      );
      saveOnePointLibrary(nextLib);
      setOnePointSelectedId(existing.id);
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

  function applyTarget() {
    const color = resolveBallColorFromId(dragState.ballId);
    if (!color) return;
    stopJoystick();
    setTargetColor(color);
    setIsTargetSelected(true);
    setDragState((s) => ({
      ...s,
      joystickVisible: false,
    }));
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

  // KD-Tree 인덱스 (dataset 변경 시 rebuild, runAutoRecommend용)
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

  function handleImportDataset() {
    fileInputRef.current?.click();
  }

  function handleFileImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);

        const importedDataset = json.dataset ?? (Array.isArray(json) ? json : null);
        if (!importedDataset) {
          alert("Invalid dataset.json format");
          return;
        }
        const normalized = normalizeDatasetFromStorage(importedDataset);
        setDataset(normalized);
        localStorage.setItem(
          "positions_dataset",
          JSON.stringify(normalized)
        );
      } catch (err) {
        alert("Failed to import dataset.json");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  // 오버레이 열기 (가드 로직 포함)
  function openOverlay(type) {
    // 드래그 중이면 강제 종료
    if (dragState.dragging) {
      handlePointerUp({ pointerId: null });
    }
    
    // 조이스틱 숨김
    setDragState(prev => ({ ...prev, joystickVisible: false }));
    
    setOverlayState({ open: true, type });
  }

  function openAnchorEdit(anchorKey) {
    setOverlayState({ open: true, type: "ANCHOR_EDIT", anchorKey });
  }

  // 오버레이 닫기
  function closeOverlay() {
    const wasType = overlayState.type;
    setOverlayState({ open: false, type: null, anchorKey: null });
    // SYS/HP/T/STR/AI 오버레이 닫힐 때 부모에 알려 선택 초기화 → 같은 버튼 재클릭 시 즉시 열림
    if (wasType && ["SYS", "HPT", "STR", "AI"].includes(wasType)) {
      onFuncOverlayClose?.();
    }
  }

  useEffect(() => {
    if (appMode !== "ADMIN") return;
    if (isPositionLocked && isTargetSelected) return;
    if (!overlayState.open) return;
    const t = overlayState.type;
    if (!t || !["SYS", "HPT", "STR", "AI"].includes(t)) return;
    onFuncOverlayClose?.();
    setOverlayState({ open: false, type: null, anchorKey: null });
  }, [
    appMode,
    isPositionLocked,
    isTargetSelected,
    overlayState.open,
    overlayState.type,
    onFuncOverlayClose,
  ]);

  const evalForSave = (args) =>
    evaluateStrategy({
      balls: args.balls,
      sysInputs: args.sysInputs,
      signature: args.signature,
      systemId: args.signature.systemId,
      profile: SYSTEM_PROFILES[args.signature.systemId],
      anchorsData: getAnchorsForSystem(args.signature.systemId),
      hpT: { T: adminState.hpt?.T ?? "8/8" },
      trackId: args.track ?? "B2T_L",
    });

  function handleSaveStrategy(aiOverride = null) {
    console.log("[SAVE] START");

    const slotId = shotEditor.activeSlot;
    const slot = shotEditor.slots[slotId];
    const applied = slot?.applied ?? {};

    const sys = applied.sys;

    console.log("[SAVE] slotId:", slotId);
    console.log("[SAVE] adminState:", adminState);
    console.log("[SAVE] slot:", slot);
    console.log("[SAVE] sys:", sys);
    console.log("[SAVE] sys?.inputs:", sys?.inputs);
    console.log("[SAVE] dataset length:", dataset?.length);

    const balls = adminState.balls ?? { cue: { x: 10, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } };
    console.log("[SAVE] balls:", balls);

    if (!sys?.inputs) {
      console.log("[SAVE] EARLY RETURN: sys?.inputs 없음");
      return;
    }

    const systemId = sys.systemId ?? sys.system_id ?? "5_half_system";
    const profile = SYSTEM_PROFILES[systemId];
    const formulaHash = (profile?.formula?.expr ?? profile?.meta?.version ?? "v1").slice(0, 32);
    const shotType = "default";
    const signature = makeSignature({ systemId, formulaHash, shotType });
    console.log("[SAVE] signature:", signature);

    const safe = (obj) => {
      if (obj === undefined || obj === null) return obj;
      try {
        return JSON.parse(JSON.stringify(obj));
      } catch (e) {
        console.warn("[SAVE] safe clone failed:", e);
        return undefined;
      }
    };

    const cleanBalls = safe(balls);
    const cleanSysInputs = safe(sys.inputs ?? {});
    const cleanHpt = safe(applied.hpt);
    const cleanStr = safe(applied.str);
    const cleanAi = safe(aiOverride ?? applied.ai);

    const ball3ForDataset = normalizeBallsToBall3(ballsState ?? adminState.balls ?? {});
    const cleanBall3 = safe(ball3ForDataset) ?? ball3ForDataset;
    const datasetTargetBall =
      targetColor === "red" || targetColor === "yellow" ? targetColor : undefined;

    console.log("[SAVE] Creating StrategyEntry");
    let strategy;
    try {
      strategy = createStrategyEntry({
        slot: slotId,
        signature,
        sysInputs: cleanSysInputs ?? {},
        hpT: cleanHpt,
        str: cleanStr,
        ai: cleanAi,
        balls: cleanBall3,
        track: sys.track ?? "B2T_L",
        evaluateStrategy: evalForSave,
      });
      console.log("[SAVE] strategy JSON check:", JSON.stringify(strategy));
    } catch (e) {
      console.error("[SAVE] createStrategyEntry 에러:", e);
      throw e;
    }

    console.log("[SAVE] Running upsertPositionRecord");
    const updated = upsertPositionRecord(
      dataset,
      ball3ForDataset,
      strategy,
      MERGE_EPSILON,
      datasetTargetBall
    );
    console.log("[SAVE] updated length:", updated?.length);

    setDataset(updated);

    console.log("[SAVE] Saving dataset to localStorage");
    console.log("[SAVE] updated dataset:", updated);
    try {
      localStorage.setItem("positions_dataset", JSON.stringify(updated));
      console.log("[SAVE] localStorage 저장 완료");
    } catch (e) {
      console.warn("[SAVE] Failed to save positions_dataset", e);
    }

    if (autoSave) {
      saveToFile({
        version: "1.0",
        saved_at: new Date().toISOString(),
        dataset: updated,
      });
    }
  }

  const HARD_THRESHOLD = 12.0; // 제곱 거리 기준, 초과 시 참고용 안내

  function handlePositionRecall() {
    const currentBalls = normalizeBallsToBall3(ballsState ?? adminState?.balls ?? {});
    const sys = adminState?.sys;
    const systemId = sys?.systemId ?? sys?.system_id ?? "5_half_system";
    const profile = SYSTEM_PROFILES[systemId];
    const formulaHash = (profile?.formula?.expr ?? profile?.meta?.version ?? "v1").slice(0, 32);
    const shotType = sys?.shotType ?? "default";
    const signatureKey = makeSignatureKey({ systemId, formulaHash, shotType });

    const result = runPositionRecall({
      dataset: dataset ?? [],
      balls: currentBalls,
      signatureKey,
      thresholds: { soft: Infinity, hard: Infinity },
      targetBall: targetColor ?? null,
    });

    if (!result || result.kind === "no-match") {
      alert(result?.reason === "empty-dataset" ? "추천 데이터 없음 (데이터셋 비어 있음)" :
        result?.reason === "signature-not-found" ? "추천 데이터 없음 (해당 시그니처 없음)" :
        "추천 데이터 없음");
      return;
    }

    actions.applyPositionRecall(result.record);
    if (result.record.targetBall === "red" || result.record.targetBall === "yellow") {
      setTargetColor(result.record.targetBall);
      setIsTargetSelected(true);
    }
    setIsRecalled(true);

    if (result.distance > HARD_THRESHOLD) {
      alert("유사도 낮음");
    }
  }

  // ⭐ 핵심: 버튼 클릭 → Overlay 여는 함수
  function handleSelectAdminButton(buttonId) {
    if (appMode !== "ADMIN") return;

    if (!ADMIN_BUTTONS.includes(buttonId)) return;
    if (!isPositionLocked || !isTargetSelected) return;

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
      
      // ADMIN 모드 진입 시 항상 코칭 표시 상태로 설정
      if (nextMode === "ADMIN") {
        setShowCoaching(true);
      }
      
      return nextMode;
    });
    setOverlayState({ open: false, type: null });
    if (wasType && ["SYS", "HPT", "STR", "AI"].includes(wasType)) {
      onFuncOverlayClose?.();
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

  // Workspace History: 스냅샷 생성 및 저장
  const [workspaceHistoryVersion, setWorkspaceHistoryVersion] = useState(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [exportDirHandle, setExportDirHandle] = useState(null);
  const workspaceHistory = useMemo(
    () => loadWorkspaceHistory(),
    [workspaceHistoryVersion]
  );

  function handleTogglePositionLock() {
    if (isPositionLocked) {
      setIsPositionLocked(false);
      actions.clearBallsSnapshotsFromSlots();
      return;
    }
    if (!isTargetSelected) {
      alert("먼저 Target 버튼으로 타겟을 확정하세요.");
      return;
    }
    const snap = ballsState;
    if (!snap || !snap.cue) {
      alert("공 배치를 확인할 수 없습니다.");
      return;
    }
    setIsPositionLocked(true);
    actions.syncBallsToAllSlots(snap);
    const ball3 = normalizeBallsToBall3(snap);
    setAdminState((prev) => ({
      ...prev,
      balls: JSON.parse(JSON.stringify(ball3)),
    }));

    const recalled = recallPosition(ball3, dataset ?? []);
    if (recalled) {
      const hasAny =
        recalled.strategies?.S1 ||
        recalled.strategies?.S2 ||
        recalled.strategies?.S3;
      if (hasAny) {
        actions.applyPositionRecall(recalled);
        setIsRecalled(true);
        console.log(
          "[Recall] Position LOCK: 유사 포지션 데이터 불러옴",
          recalled.positionId
        );
      }
    }
  }

  function handleSaveWorkspaceSnapshot(silent = false) {
    if (!canUseSystemControls) {
      if (!silent) alert("Position LOCK 및 Target 확정 후 저장할 수 있습니다.");
      return;
    }
    const systemId = adminState?.sys?.system_id ?? adminState?.sys?.system ?? "5_half_system";
    if (!systemId || systemId === "null") {
      alert("시스템을 선택하세요 (SYS 설정)");
      return;
    }
    const pattern = adminState?.sys?.shotType ?? "뒤돌리기";
    const history = loadWorkspaceHistory();
    const version = getNextVersion(history, systemId, pattern);
    const timestamp = new Date().toISOString();
    const name = buildSnapshotName(pattern, systemId, version, timestamp);
    const snapshot = {
      id: generateUUID(),
      name,
      systemId,
      pattern,
      version,
      timestamp,
      exported: false,
      state: {
        adminState: JSON.parse(JSON.stringify(adminState)),
        ballsState: ballsState ? JSON.parse(JSON.stringify(ballsState)) : null,
        dataset: JSON.parse(JSON.stringify(dataset ?? [])),
        shotEditor: JSON.parse(JSON.stringify(shotEditor)),
        targetBall: targetColor ?? null,
      },
    };
    const nextHistory = [...history, snapshot];
    saveWorkspaceHistory(nextHistory);
    setWorkspaceHistoryVersion((v) => v + 1);
    setIsSaved(true);
    console.log("💾 Workspace snapshot saved:", name);
    if (!silent) alert(`스냅샷 저장: ${name}`);
  }

  // Workspace History: 스냅샷 복원 (전체 상태 overwrite)
  function handleLoadWorkspaceSnapshot(id) {
    const history = loadWorkspaceHistory();
    const snapshot = findSnapshotById(history, id);
    if (!snapshot) {
      alert("스냅샷을 찾을 수 없습니다.");
      return;
    }
    const s = snapshot.state;
    setAdminState(s.adminState);
    setBallsState(s.ballsState);
    const nextDataset = normalizeDatasetFromStorage(s.dataset ?? []);
    setDataset(nextDataset);
    try {
      localStorage.setItem("positions_dataset", JSON.stringify(nextDataset));
    } catch (e) {
      console.warn("Failed to persist dataset on restore", e);
    }
    actions.restoreShotEditor(s.shotEditor);
    setWorkspaceHistoryVersion((v) => v + 1);
    setIsSaved(false);
    setIsRecalled(false);
    setIsPositionLocked(false);
    const restoredTarget = s.targetBall ?? null;
    setTargetColor(restoredTarget);
    setIsTargetSelected(!!restoredTarget);
    console.log("📂 Workspace restored:", snapshot.name);
    alert(`복원 완료: ${snapshot.name}`);
  }

  // Workspace History: 스냅샷 삭제
  function handleDeleteWorkspaceSnapshot(id) {
    deleteSnapshotById(id);
    setWorkspaceHistoryVersion((v) => v + 1);
  }

  // Workspace History: 가장 오래된 30개 삭제
  function handleDeleteOldest30() {
    deleteOldest30();
    setWorkspaceHistoryVersion((v) => v + 1);
  }

  // Export: systemId/pattern 기반 폴더에 자동 저장
  async function pickExportFolder() {
    if (!window.showDirectoryPicker) {
      alert("이 브라우저는 폴더 선택을 지원하지 않습니다.");
      return null;
    }
    alert("data 폴더를 선택하세요 (system 폴더가 아닌 상위 폴더)");
    try {
      const handle = await window.showDirectoryPicker();
      setExportDirHandle(handle);
      return handle;
    } catch (e) {
      if (e.name !== "AbortError") console.warn("Export folder pick cancelled or failed", e);
      return null;
    }
  }

  async function getOrCreateDir(parent, name) {
    return await parent.getDirectoryHandle(name, { create: true });
  }

  async function getNextVersionFromDir(patternDir) {
    let maxVer = 0;
    try {
      for await (const [fileName, handle] of patternDir.entries()) {
        if (handle.kind === "file" && fileName.endsWith(".json")) {
          const match = fileName.match(/v(\d+)/);
          if (match) {
            const v = parseInt(match[1], 10);
            if (v > maxVer) maxVer = v;
          }
        }
      }
    } catch (e) {
      console.warn("getNextVersionFromDir failed", e);
    }
    return maxVer + 1;
  }

  function buildExportFileName({ pattern, systemId, version, date }) {
    const verStr = String(version).padStart(3, "0");
    return `${systemId}_${pattern}_v${verStr}_${date}.json`;
  }

  function getToday() {
    return new Date().toISOString().slice(0, 10);
  }

  async function saveSnapshotToFile(snapshot) {
    let dir = exportDirHandle;
    if (!dir) {
      dir = await pickExportFolder();
      if (!dir) return false;
    }
    try {
      let systemDir;
      if (dir.name === snapshot.systemId) {
        systemDir = dir;
      } else {
        systemDir = await getOrCreateDir(dir, snapshot.systemId);
      }
      const patternDir = await getOrCreateDir(systemDir, snapshot.pattern);
      const version = await getNextVersionFromDir(patternDir);
      const fileName = buildExportFileName({
        pattern: snapshot.pattern,
        systemId: snapshot.systemId,
        version,
        date: getToday(),
      });
      const fileHandle = await patternDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(snapshot, null, 2));
      await writable.close();
      return true;
    } catch (e) {
      console.error("saveSnapshotToFile failed", e);
      alert(`Export 실패: ${e.message}`);
      return false;
    }
  }

  // Workspace History: 선택 스냅샷 Export (폴더 저장 + exported=true)
  async function handleExportSnapshots(ids) {
    const history = loadWorkspaceHistory();
    const toExport = ids
      .map((id) => findSnapshotById(history, id))
      .filter(Boolean);
    if (toExport.length === 0) return;
    for (const snap of toExport) {
      const ok = await saveSnapshotToFile(snap);
      if (!ok) return;
    }
    updateSnapshotsExported(ids);
    setWorkspaceHistoryVersion((v) => v + 1);
    alert(`${toExport.length}개 스냅샷 Export 완료`);
  }

  function invalidateSavedAndRecalledForBallId(ballId) {
    if (!ballId) return;
    if (["cue", "target", "target_center", "second", "impact"].includes(ballId)) {
      setIsSaved(false);
      setIsRecalled(false);
    }
  }

  function nudgeBall(ballId, dx, dy) {
    if (!ballId) return;
    if (isPositionLocked) return;
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

  if (
    isPositionLocked &&
    ["cue", "target", "target_center", "second"].includes(ballId)
  ) {
    return;
  }

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
    }
    else if (currentButtonId === "SYS") setOverlayContent("SYS");
    else if (currentButtonId === "HP/T") setOverlayContent("HPT");
    else if (currentButtonId === "STR") setOverlayContent("STR");
    else if (currentButtonId === "AI") setOverlayContent("AI");
    else setOverlayContent(null);
  }, [currentButtonId, appMode]);

  // ============================================
  // currentButtonId 처리 (ADMIN 모드 오버레이)
  // ============================================
  // ✅ ADMIN 모드에서 SYS/HP/T/STR/AI 버튼 클릭 → 관리자 오버레이(openOverlay)로 연결
  useEffect(() => {
    if (appMode !== "ADMIN") return;
    if (!currentButtonId) return;
    if (!isPositionLocked || !isTargetSelected) return;

    if (currentButtonId === "SYS") openOverlay("SYS");
    else if (currentButtonId === "HP/T") openOverlay("HPT");
    else if (currentButtonId === "STR") openOverlay("STR");
    else if (currentButtonId === "AI") openOverlay("AI");
  }, [currentButtonId, appMode, isPositionLocked, isTargetSelected]);

  // ============================================
  // S1/S2/S3: 슬롯(전략)만 전환 — currentId/view/ballsState는 건드리지 않음 (공 배치 SSOT)
  // ============================================
  useEffect(() => {
    if (currentButtonId === 'S1') {
      actions.switchSlot('S1');
      setOverlayContent(null);
      setOverlayState({ open: false, type: null });
      const systemId = adminState.sys?.system_id;
      if (!systemId) return;
      if (!kdIndexRef.current) return;
      const profile = SYSTEM_PROFILES[systemId];
      const formulaHash = adminState.sys?.formulaHash ?? (profile?.formula?.expr ?? profile?.meta?.version ?? "v1").slice(0, 32);
      const currentSignature = makeSignature({ systemId, formulaHash, shotType: "default" });
      runAutoRecommend({
        slot: "S1",
        currentBalls: normalizeBallsToBall3(adminState.balls ?? {}),
        currentSignature,
        dataset: dataset ?? [],
        kdIndex: kdIndexRef.current,
        targetBall: targetColor ?? null,
        loadDraftFromStrategyEntry: actions.loadDraftFromStrategyEntry,
      });
    }
    else if (currentButtonId === 'S2') {
      actions.switchSlot('S2');
      setOverlayContent(null);
      setOverlayState({ open: false, type: null });
      const systemId = adminState.sys?.system_id;
      if (!systemId) return;
      if (!kdIndexRef.current) return;
      const profile = SYSTEM_PROFILES[systemId];
      const formulaHash = adminState.sys?.formulaHash ?? (profile?.formula?.expr ?? profile?.meta?.version ?? "v1").slice(0, 32);
      const currentSignature = makeSignature({ systemId, formulaHash, shotType: "default" });
      runAutoRecommend({
        slot: "S2",
        currentBalls: normalizeBallsToBall3(adminState.balls ?? {}),
        currentSignature,
        dataset: dataset ?? [],
        kdIndex: kdIndexRef.current,
        targetBall: targetColor ?? null,
        loadDraftFromStrategyEntry: actions.loadDraftFromStrategyEntry,
      });
    }
    else if (currentButtonId === 'S3') {
      actions.switchSlot('S3');
      setOverlayContent(null);
      setOverlayState({ open: false, type: null });
      const systemId = adminState.sys?.system_id;
      if (!systemId) return;
      if (!kdIndexRef.current) return;
      const profile = SYSTEM_PROFILES[systemId];
      const formulaHash = adminState.sys?.formulaHash ?? (profile?.formula?.expr ?? profile?.meta?.version ?? "v1").slice(0, 32);
      const currentSignature = makeSignature({ systemId, formulaHash, shotType: "default" });
      runAutoRecommend({
        slot: "S3",
        currentBalls: normalizeBallsToBall3(adminState.balls ?? {}),
        currentSignature,
        dataset: dataset ?? [],
        kdIndex: kdIndexRef.current,
        targetBall: targetColor ?? null,
        loadDraftFromStrategyEntry: actions.loadDraftFromStrategyEntry,
      });
    }
  }, [currentButtonId]);

  // activeSlot/slots 변경 시: hpt/str/ai만 슬롯 → admin 동기화 (SYS는 슬롯 SSOT, 여기서 덮어쓰지 않음)
  useEffect(() => {
    const slot = shotEditor.slots[shotEditor.activeSlot];
    const draft = slot?.draft;
    const applied = slot?.applied;
    const defaultHpt = { T: "8/8", hit_point: { x: 0, y: 0 }, mode: "TIP", tipCount: 0 };
    const defaultStr = { curve: "constant", type: null, acceleration: "smooth_const", speed: 2.5, depth: 2, impact: "medium" };
    const defaultAi = { text: "", onePointLessons: [] };
    setAdminState((prev) => ({
      ...prev,
      hpt: draft?.hpt ?? applied?.hpt ?? defaultHpt,
      str: draft?.str ?? applied?.str ?? defaultStr,
      ai: draft?.ai ?? applied?.ai ?? defaultAi,
    }));
  }, [shotEditor.activeSlot, shotEditor.slots]);

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

  // USER 모드용: 현재 balls 기준 유사 포지션의 slot별 전략 개수
  const strategyCountMap = useMemo(() => {
    const currentBalls = normalizeBallsToBall3(ballsState ?? adminState?.balls ?? {});
    if (!dataset?.length) return {};
    const sys = adminState?.sys;
    const systemId = sys?.systemId ?? sys?.system_id ?? "5_half_system";
    const profile = SYSTEM_PROFILES?.[systemId];
    const formulaHash = (profile?.formula?.expr ?? profile?.meta?.version ?? "v1")?.slice(0, 32) ?? "v1";
    const shotType = sys?.shotType ?? "default";
    const signatureKey = makeSignatureKey({ systemId, formulaHash, shotType });
    const result = runPositionRecall({
      dataset: dataset ?? [],
      balls: currentBalls,
      signatureKey,
      thresholds: { soft: Infinity, hard: Infinity },
      targetBall: targetColor ?? null,
      topK: 5,
    });
    const map = {};
    if (!result || result.kind === "no-match" || !result.record) return map;
    for (const slotId of ["S1", "S2", "S3"]) {
      if (result.record.strategies[slotId]) {
        map[slotId] = (map[slotId] || 0) + 1;
      }
    }
    return map;
  }, [dataset, ballsState, adminState?.balls, adminState?.sys, targetColor]);

  useEffect(() => {
    onStrategyCountMapChange?.(strategyCountMap);
  }, [strategyCountMap, onStrategyCountMapChange]);

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

  // ballsState 초기화
  useEffect(() => {
    if (view && view.ui && view.ui.balls) {
      setBallsState(view.ui.balls);
      setIsSaved(false);
      setIsRecalled(false);
      setIsPositionLocked(false);
      setIsTargetSelected(false);
      setTargetColor(null);
    }
  }, [view]);

  // Strategy Auto Capture: 1초간 안정 시 dataset candidate 생성
  const lastCapturedRef = useRef(null);
  useEffect(() => {
    if (!canEdit || overlayState.open) return;
    const balls = ballsState ?? view?.ui?.balls ?? {};
    const cue = balls.cue;
    const target = balls.target_center ?? balls.target;
    if (!cue || !target) return;
    const timer = setTimeout(() => {
      const impact = balls.impact ?? (calcImpactBall(cue, target, adminState?.hpt?.T ?? "8/8"));
      const sysVals = adminState?.sys?.systemValues ?? adminState?.sys?.inputs ?? {};
      const candidate = createCaptureCandidate({
        balls,
        impact: impact ?? undefined,
        systemValues: sysVals,
      });
      lastCapturedRef.current = candidate;
    }, 1000);
    return () => clearTimeout(timer);
  }, [canEdit, overlayState.open, ballsState, adminState?.sys, adminState?.hpt?.T, view?.ui?.balls]);

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
          
          // ADMIN 모드 진입 시 항상 코칭 표시 상태로 설정
          if (nextMode === "ADMIN") {
            setShowCoaching(true);
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
  const coaching = useCoachingController({
    appMode,
    showCoaching,
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
  const system = systemCtrl.system;
  const opts = display.displayOptions;

  const thicknessForCalc =
    adminState?.hpt?.T ??
    shotEditor?.slots?.[shotEditor?.activeSlot]?.draft?.hpt?.T ??
    shotEditor?.slots?.[shotEditor?.activeSlot]?.applied?.hpt?.T ??
    view?.ui?.display_options?.thickness ??
    0;

  /** 트랙은 입력값(슬롯 draft/applied 또는 뷰 JSON). 공/샷 경로로 추론하지 않음. */
  const trackForAnchors = (() => {
    if (canEdit) {
      return resolvedSlotSys?.track || view?.track || "B2T_L";
    }
    return view?.track || "B2T_L";
  })();

  const canonical = trackForAnchors;
  const systemIdForGrid = (() => {
    if (canEdit) {
      const raw = resolvedSlotSys?.systemId ?? "5_half_system";
      return raw === "5_HALF" ? "5_half_system" : raw;
    }
    return "5_half_system";
  })();

  // ADMIN: anchors.json 기반 좌표 생성 | USER: display.anchors
  const rawAnchors = canEdit
    ? (() => {
        if (!resolvedSlotSys) {
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
      })()
    : (display.anchors ?? {});

  const rawAnchorsBase =
    canEdit && resolvedSlotSys && resolvedSlotBaseSysValues
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
function handlePointerDown(e) {
  // ✅ GUARD: 오버레이 열려있으면 SVG 이벤트 차단
  if (overlayState.open) return;

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

  if (isPositionLocked) return;

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
  if (isPositionLocked) return;

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
    setIsRecalled(false);
    // targetColor / isTargetSelected: pointerUp에서 건드리지 않음 (조이스틱=후보, Target으로만 확정/무효화는 뷰/복원 등에서)
  }

  if (canEdit && nextBallPos && (dragState.ballId === "cue" || dragState.ballId === "target" || dragState.ballId === "target_center")) {
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
  stopJoystick();
  // cancel은 드래그 종료로 처리
  handlePointerUp(e);
}

  // canonical 처리 (안전하게) — canonical은 위에서 이미 계산됨
  let anchors = rawAnchors;

  const profileForCanonical = SYSTEM_PROFILES?.[systemIdForGrid];
  const offsetFg2rg =
    typeof system?.values?.offset_fg2rg === "number"
      ? system.values.offset_fg2rg
      : profileForCanonical?.safety?.offset_fg2rg;

  const hasConversionData =
    canonical &&
    canonical !== "canonical" &&
    typeof offsetFg2rg === "number";

  if (hasConversionData) {
    try {
      const canonicalConfig = {
        track: canonical,
        coords: {
          offset_fg2rg: offsetFg2rg ?? 2.25,
        },
      };
      anchors = convertCanonicalAnchors(rawAnchors, canonicalConfig);
    } catch (e) {
      console.warn("좌표 변환 실패, 원본 사용:", e);
    }
  } else {
    if (!canonical) {
      console.warn("canonical 정보 없음, 좌표 변환 스킵");
    } else if (typeof offsetFg2rg !== "number") {
      console.warn("offset_fg2rg 없음(profile/view), 좌표 변환 스킵");
    }
  }

  const override = adminState?.anchorsOverride ?? {};
  anchors = { ...anchors, ...override };

  let anchorsBase = null;
  if (rawAnchorsBase) {
    anchorsBase = rawAnchorsBase;
    if (hasConversionData) {
      try {
        const canonicalConfigBase = {
          track: canonical,
          coords: {
            offset_fg2rg: offsetFg2rg ?? 2.25,
          },
        };
        anchorsBase = convertCanonicalAnchors(rawAnchorsBase, canonicalConfigBase);
      } catch (e) {
        console.warn("base trajectory 좌표 변환 실패, 원본 사용:", e);
      }
    }
    anchorsBase = { ...anchorsBase, ...override };
  }

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
  const corrections = canEdit ? (resolvedSlotSys?.corrections || {}) : {};
  const corrBundleForCurve = {
    slide:
      resolvedSlotSys?.corrections?.slide ??
      adminState?.sys?.corrections?.slide ??
      formData?.corrections?.slide,
    draw:
      resolvedSlotSys?.corrections?.draw ??
      adminState?.sys?.corrections?.draw ??
      formData?.corrections?.draw,
  };
  const unifiedSlideForCurve = unifiedSlideFromCorrections(corrBundleForCurve);
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

  let pathEndIndex = 3;
  if (secondPoint) {
    const postC3Segments = [
      [pathNodes[3], pathNodes[4]],
      [pathNodes[4], pathNodes[5]],
      [pathNodes[5], pathNodes[6]],
    ];
    for (let i = 0; i < postC3Segments.length; i++) {
      const [A, B] = postC3Segments[i];
      if (!A || !B) continue;
      if (isSegmentHitBall(A, B, secondPoint, HIT_TOLERANCE)) {
        pathEndIndex = 4 + i;
        break;
      }
    }
  }

  const cushionPath = [];
  for (let i = 0; i <= pathEndIndex && i < pathNodes.length; i++) {
    const p = pathNodes[i];
    if (p == null) break;
    cushionPath.push(p);
  }

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

  /** CO → curve(P…M) → 이후 쿠션 궤적. tail은 pathEndIndex 반영된 cushionPath 사용. CO는 polyline에 넣지 않음(직선 구간 제거). */
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
    // #region agent log
    fetch("http://127.0.0.1:7698/ingest/05c8c604-4ee9-4069-8fc1-5ac9e58f8454", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "6a4663",
      },
      body: JSON.stringify({
        sessionId: "6a4663",
        location: "App.jsx:cushionPathForRender:path_after_curve",
        message: "tail_assembly",
        hypothesisId: "H-C",
        data: {
          curveLast: curveSegment[curveSegment.length - 1],
          nextTailFirst: cushionPath?.[1],
          tailPreviewLen: cushionPath ? cushionPath.length - 1 : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
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

  // #region agent log
  const payload = {
    location: "App.jsx:curvePathTriple",
    message: "curve_path_lengths",
    timestamp: Date.now(),
    curvePointsLength: curvePointsLen,
    cushionPathForRenderLength: cushionPathForRender.length,
    cushionPathForImpactLinesLength: cushionPathForImpactLines.length,
    curvePointsSample: curvePointsSampleRg,
    cushionPathForRenderSample: rgSample(cushionPathForRender, 5),
    cushionPathForImpactLinesSample: rgSample(cushionPathForImpactLines, 5),
  };
  fetch("/__debug/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion

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

    /** 기준선 표시 정책: 세컨드볼·C5/C6 확장 없이 CO→C4(인덱스 0~4)까지만 */
    const pathEndIndexBase = 4;

    const cushionPathBase = [];
    for (let i = 0; i <= pathEndIndexBase && i < pathNodesBase.length; i++) {
      const p = pathNodesBase[i];
      if (p == null) break;
      cushionPathBase.push(p);
    }

    cushionPathBaselineRg = cushionPathBase;
    cushionPathAttrBase = cushionPathBase
      .map((pt) => {
        const p = toPx(pt, SCALE, TABLE_H);
        return `${p.x + PADDING},${p.y + PADDING}`;
      })
      .join(" ");
  }

  const orderedKeys = ["CO", "C1", "C2", "C3", "C4", "C5", "C6"];
  // NOTE: 라벨 미표시 원인 구분용 — 현재는 좌표계 이슈와 별개로
  // visibleKeysForLabels(cushionPath 길이 기반) 정책이 먼저 라벨 대상을 제한한다.
  const labelPathLengthForKeys =
    showBaseLine && cushionPathBaselineRg?.length
      ? cushionPathBaselineRg.length
      : cushionPath.length;
  const visibleKeysForLabels = orderedKeys.slice(
    0,
    Math.min(labelPathLengthForKeys, orderedKeys.length)
  );

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
  const fromBaselinePath =
    showBaseLine &&
    cushionPathBaselineRg &&
    cushionPathBaselineRg.length > 0 &&
    anchorsBase
      ? Object.fromEntries(
          blKeysForLabels
            .map((k, i) => {
              const pt = cushionPathBaselineRg[i];
              if (pt == null || !Number.isFinite(pt.x) || !Number.isFinite(pt.y))
                return [k, null];
              return [k, { coord: { x: pt.x, y: pt.y } }];
            })
            .filter(([, v]) => v != null)
        )
      : null;
  const allAnchors = {
    CO:
      (fromBaselinePath && fromBaselinePath.CO) ??
      labelPayload(override.CO) ??
      labelPayload(CO_prep),
    "C1":
      (fromBaselinePath && fromBaselinePath["C1"]) ?? labelPayload(C1_prep),
    "C2": (fromBaselinePath && fromBaselinePath["C2"]) ?? labelPayload(C2),
    "C3":
      (fromBaselinePath && fromBaselinePath["C3"]) ??
      labelPayload(C3_label ?? anchors["C3"]),
    "C4": labelPayload(showBaseLine && anchorsBase ? anchorsBase["C4"] : C4),
    "C5": labelPayload(showBaseLine && anchorsBase ? anchorsBase["C5"] : C5),
    "C6": labelPayload(showBaseLine && anchorsBase ? anchorsBase["C6"] : C6),
  };
  const trackAnchorItems =
    getAnchorsForSystem(systemIdForGrid)?.trajectories?.[trackForAnchors]?.anchors ?? [];
  const labelAnchorsForRaw = {};
  trackAnchorItems.forEach((a) => {
    const id = a?.id;
    if (typeof id !== "string") return;
    const match = id.match(/^([A-Z0-9]+)_\(([-\d.]+),([-\d.]+)\)_(\d+)/);
    if (!match) return;
    const label = match[1];
    const x = parseFloat(match[2]);
    const y = parseFloat(match[3]);
    const value = parseFloat(match[4]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(value)) return;
    if (!labelAnchorsForRaw[label]) {
      labelAnchorsForRaw[label] = [];
    }
    labelAnchorsForRaw[label].push({
      coord: { x, y },
      value,
    });
  });
  console.log("[ANCHOR_BEFORE_RENDER]", {
    stage: "App:allAnchors",
    rawAnchors,
    anchorsAfterCanonical: anchors,
    allAnchors,
    trackForAnchors,
    systemIdForGrid,
  });
  const allAnchorsForLabels = Object.fromEntries(
    visibleKeysForLabels
      .map((k) => [k, allAnchors[k]])
      .filter(([, v]) => v && v.coord != null)
  );
  console.log("[LABEL_VISIBILITY_TRACE]", {
    cushionPathLength: cushionPath.length,
    visibleKeysForLabels,
    allAnchorsKeys: Object.keys(allAnchors),
    passedToLabels: Object.keys(allAnchorsForLabels),
    rawAllAnchors: allAnchors
  });
  console.log("[LABEL_VISIBILITY_TRACE]", {
    orderedKeys,
    visibleKeysForLabels,
    cushionPathLength: cushionPath.length,
    allAnchorsKeys: Object.keys(allAnchors),
    passedToLabels: Object.keys(allAnchorsForLabels)
  });
  console.log("LABEL_INPUT_CO", allAnchorsForLabels["CO"]);
  const strategyResult = buildRailGroupedStrategy({
    strategy,
    systemValues: canEdit ? { values: resolvedSlotSysValues } : system,
    anchors,
    lastCushion: view.last_cushion,
  });
  const railGroups = strategyResult.railGroups;

  const canEditPosition = !isPositionLocked;

  const systemValuesForLabels =
    showBaseLine &&
    canEdit &&
    resolvedSlotBaseSysValues &&
    typeof resolvedSlotBaseSysValues === "object" &&
    Object.keys(resolvedSlotBaseSysValues).length > 0
      ? resolvedSlotBaseSysValues
      : canEdit
        ? (resolvedSlotSysValues && Object.keys(resolvedSlotSysValues).length > 0
            ? resolvedSlotSysValues
            : (system?.values ?? {}))
        : (system?.values ?? {});
  const labelStrategy =
    systemIdForGrid === "5_half_system"
      ? "five_half_reference"
      : "anchor_ssot";

  const cushionPathForTableImpact =
    showBaseLine &&
    Array.isArray(cushionPathBaselineRg) &&
    cushionPathBaselineRg.length >= 2
      ? cushionPathBaselineRg
      : cushionPathForImpactLines;
  const curveDeformActiveForImpact = showBaseLine ? false : useCurveDeform;

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
      <ImpactLines
        CO_line={CO_line}
        C1_line={C1_line}
        CO_corrected_line={null}
        cushionPath={cushionPathForTableImpact}
        impactSplitRg={
          showBaseLine
            ? null
            : impact &&
                Number.isFinite(impact.x) &&
                Number.isFinite(impact.y)
              ? impact
              : impactContactRg
        }
        cushionPathAttrBase={cushionPathAttrBase}
        anchorsBase={anchorsBase}
        curveDeformActive={curveDeformActiveForImpact}
        showBaseLine={showBaseLine}
        scale={SCALE}
        tableH={TABLE_H}
        padding={PADDING}
      />
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
        />
      )}
      {balls.target_center && (
        <Ball
          {...balls.target_center}
          color="#fde047"
          emphasis={
            canEditPosition &&
            (dragState.ballId === "target_center" || dragState.ballId === "target")
              ? "selected"
              : undefined
          }
        />
      )}
      {balls.second && (
        <Ball
          {...balls.second}
          color="#f87171"
          emphasis={
            canEditPosition && dragState.ballId === "second"
              ? "selected"
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
          visible={showSystemGrid}
        />
      )}
      <SystemValueLabels
        showSystemGrid={showSystemGrid}
        anchors={allAnchorsForLabels}
        labelAnchors={labelAnchorsForRaw}
        scale={SCALE}
        tableH={TABLE_H}
        padding={PADDING}
        systemValues={systemValuesForLabels}
        labelStrategy={labelStrategy}
        outputs={
          canEdit
            ? resolvedSlotSys?.outputs
            : system?.outputs ??
              (Object.keys(system?.values ?? {}).length > 0
                ? { result: system.values }
                : undefined)
        }
        onAnchorDoubleClick={canEdit ? openAnchorEdit : undefined}
      />
     </svg>
  );

  return (
    <div className="app-layout">
      <div className="table-area">
        <div className="table-area-inner">
          {tableSVG}
        </div>
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
      {overlayState.open && (
        <div
          onClick={closeOverlay}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '16px',
              padding: '40px',
              minWidth: '700px',
              width: '750px',
              maxWidth: '90%',
              maxHeight: '80%',
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                {overlayState.type === 'SYS' && 'SYS 설정'}
                {overlayState.type === 'HPT' && 'HP/T 설정'}
                {overlayState.type === 'STR' && 'STR 설정'}
                {overlayState.type === 'AI' && 'AI 코멘트'}
                {overlayState.type === 'ANCHOR_EDIT' && 'Anchor 좌표 수정'}
              </h2>
              <button
                onClick={closeOverlay}
                style={{
                  fontSize: '28px',
                  color: '#94a3b8',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {overlayState.type === 'SYS' && (
              <SysOverlay
                data={adminState.sys}
                onSave={(newData) => {
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

                  closeOverlay();
                  setTimeout(() => handleSaveWorkspaceSnapshot(true), 0);
                }}
                onCancel={closeOverlay}
              />
            )}

            {overlayState.type === 'HPT' && (
              <HptOverlay
                data={adminState.hpt}
                sysHpNResult={sysHpNResult}
                onSave={(newData) => {
                  setAdminState({ ...adminState, hpt: newData });
                  actions.applyHptToSlot(shotEditor.activeSlot, newData);
                  closeOverlay();
                  setTimeout(() => handleSaveWorkspaceSnapshot(true), 0);
                }}
                onCancel={closeOverlay}
              />
            )}

            {overlayState.type === 'STR' && (
              <StrOverlay
                data={adminState.str}
                onSave={(newData) => {
                  setAdminState({ ...adminState, str: newData });
                  actions.applyStrToSlot(shotEditor.activeSlot, newData);
                  closeOverlay();
                  setTimeout(() => handleSaveWorkspaceSnapshot(true), 0);
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
                    closeOverlay();
                    setTimeout(() => handleSaveWorkspaceSnapshot(true), 0);
                  }}
                  onCancel={closeOverlay}
                />
              );
            })()}

            {overlayState.type === 'AI' && (
              <AiOverlay
                key={`ai-${adminState.hpt?.hit_point?.x ?? 0}-${adminState.hpt?.hit_point?.y ?? 0}-${adminState.str?.speed ?? 0}`}
                data={adminState.ai}
                sysData={adminState.sys}
                hptData={adminState.hpt}
                strData={adminState.str}
                appliedSys={actions?.getActiveSlot?.()?.draft?.sys ?? actions?.getActiveSlot?.()?.applied?.sys}
                sysHpNResult={sysHpNResult}
                onSave={(newData) => {
                  setAdminState({ ...adminState, ai: newData });
                  actions.applyAiToSlot(shotEditor.activeSlot, newData);
                  closeOverlay();
                  setTimeout(() => handleSaveWorkspaceSnapshot(true), 0);
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
                onePointLessons={adminState.ai?.onePointLessons ?? []}
                onDeleteLesson={deleteLesson}
                onReorderLessons={reorderLessons}
              />
            )}
          </div>
        </div>
      )}
      
      {/* 기존 USER 모드 오버레이 (조건 2: 완전 보존) */}
      {overlayContent && (
        <div
          onClick={() => setOverlayContent(null)}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '16px',
              padding: '24px',
              minWidth: '320px',
              maxWidth: '70%',
              maxHeight: '60%',
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                {overlayContent === 'SYS' && 'SYS'}
                {overlayContent === 'HPT' && 'HP/T'}
                {overlayContent === 'STR' && 'STR'}
                {overlayContent === 'AI' && 'AI'}
              </h2>
              <button
                onClick={() => setOverlayContent(null)}
                style={{
                  fontSize: '28px',
                  color: '#94a3b8',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ color: '#334155', fontSize: '14px' }}>
              {overlayContent === 'SYS' && (
                <div>
                  {system.human_readable && Object.keys(system.human_readable).length > 0 ? (
                    Object.entries(system.human_readable).map(([key, formula]) => (
                      <div key={key} style={{ fontFamily: 'monospace', marginBottom: '8px' }}>
                        {formula}
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#64748b' }}>시스템 정보 없음</p>
                  )}
                </div>
              )}
              
              {overlayContent === 'HPT' && (
                <div>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>타점 (Hit Point)</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{opts.hitpoint_clock || '-'}</div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontWeight: '600' }}>두께:</span> {thicknessForCalc || '-'}
                  </div>
                  <div>
                    <span style={{ fontWeight: '600' }}>회전:</span> {opts.english_tips || '-'}
                  </div>
                </div>
              )}
              
              {overlayContent === 'STR' && (
                <STRContent trajectoryState={trajectory} />
              )}
              
              {overlayContent === 'AI' && (
                <div>
                  <p style={{ lineHeight: 1.6 }}>
                    AI 추천 기능은 추후 구현 예정입니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
              className={`control-button recall-btn${isRecalled ? " active" : ""}`}
              onClick={handlePositionRecall}
            >
              Recall
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
              onClick={() => handleSaveWorkspaceSnapshot()}
              style={{
                opacity: canUseSystemControls ? 1 : 0.45,
                cursor: canUseSystemControls ? "pointer" : "not-allowed",
              }}
            >
              SAVE
            </button>
          </div>
          <div className="right-panel-divider" aria-hidden="true" />
          <div className="right-panel-input-buttons input-buttons">
            <button
              type="button"
              className={`target-btn${isTargetSelected ? " active" : ""}`}
              onClick={applyTarget}
            >
              Target
            </button>
            <button
              type="button"
              className={`position-btn${isPositionLocked ? " active" : ""}`}
              onClick={handleTogglePositionLock}
            >
              Position
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

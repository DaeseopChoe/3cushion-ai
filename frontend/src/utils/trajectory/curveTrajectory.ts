/** 표시용 2차 베지어 샘플 (Rg 좌표) */

/** impact→M chord 대신 CO→C1 길이로 스케일할 때 사용하는 배율 (시각적 곡선 확보; 0.15 → 단계적 증가) */
const CURVE_MAGNITUDE_SCALE = 0.4;

/** impact→merge chord 상 제어점 베이스 (초반 curvature 집중, 후반 straighten) */
const CONTROL_BASE_T = 0.25;

/** effect line 투영 후 원시 제어점 쪽으로 허용하는 오프셋 비율 (대부분 레일에 붙임) */
const CONTROL_OFFSET_RATIO = 0.15;

export function createQuadraticBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  steps = 20
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x =
      (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
    const y =
      (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
    points.push({ x, y });
  }

  return points;
}

/** Curve A 종료점 = impact→advance 빗변 상 비율 (3/5) */
const CURVE_A_ADVANCE_PEAK_T = 3 / 5;
/** 보정선 위 advance = foot + tEff × (스케일×d); 피크를 C1 쪽으로 더 보냄 */
const CURVE_A_ADVANCE_DISTANCE_SCALE = 1.5;
/** Curve A 제어점 = impact→peak chord 비율 (거의 중앙; pre-bend만 추가 오프셋) */
const CURVE_A_CONTROL_ON_CHORD_T = 0.5;
/** Curve A chord 대비 수직 pre-bend 비율 (half-plane 내에서만 적용) */
const CURVE_A_PREBEND_RATIO = 0.15;
/** Curve B 제어점: peak→merge 거리 대비 dirTB 방향 연장 비율 */
const CURVE_B_TANGENT_FRAC = 0.35;
/** tangent 기반 controlB에 chord 중점을 살짝 섞어 merge 쪽 수렴 보조 */
const CURVE_B_CHORD_BLEND = 0.12;
/** Hybrid Segment A 샘플링 시 초반 normal bend 세기 비율 */
const HYBRID_DECAY_BEND_RATIO = 0.02;
/** Hybrid Segment A 샘플링 시 bend 감쇠 지수 */
const HYBRID_DECAY_POWER = 3.0;

function normalizeVec(v: { x: number; y: number }): { x: number; y: number } {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-12) return { x: 1, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function normalize(v: { x: number; y: number }): { x: number; y: number } {
  return normalizeVec(v);
}

/** impact → C1 직접 단일 cubic: 초반 inward bend(unifiedSlide) + 후반 보정선 방향 직선화 */
function buildDirectCubicToC1(
  impact: { x: number; y: number },
  _coEff: { x: number; y: number },
  C1: { x: number; y: number },
  _inwardNormal: { x: number; y: number },
  unifiedSlide: number
): {
  P0: { x: number; y: number };
  P1: { x: number; y: number };
  P2: { x: number; y: number };
  P3: { x: number; y: number };
} {
  const P0 = impact;
  const P3 = C1;

  const totalDist = Math.hypot(P3.x - P0.x, P3.y - P0.y);

  const dir = normalize({
    x: P3.x - P0.x,
    y: P3.y - P0.y,
  });

  const startDir = dir;
  const bendNormal = {
    x: -dir.y * Math.sign(unifiedSlide),
    y: dir.x * Math.sign(unifiedSlide),
  };

  const bendStrength = Math.abs(unifiedSlide) * totalDist * 0.0075;

  const forwardLen = totalDist * 0.22;

  const P1 = {
    x: P0.x + startDir.x * forwardLen + bendNormal.x * bendStrength,
    y: P0.y + startDir.y * forwardLen + bendNormal.y * bendStrength,
  };

  const straightRatio = 0.25;
  const handleLen = totalDist * straightRatio;
  const bendFactor = 0.4;

  const P2 = {
    x: P3.x - dir.x * handleLen + bendNormal.x * bendStrength * bendFactor,
    y: P3.y - dir.y * handleLen + bendNormal.y * bendStrength * bendFactor,
  };

  return { P0, P1, P2, P3 };
}

/** Hybrid Segment A: impact→snappedJoin. P2는 chord 방향(dir)으로만 배치 */
function buildHybridSegmentACubic(
  impact: { x: number; y: number },
  _coEff: { x: number; y: number },
  snappedJoin: { x: number; y: number },
  _inwardNormal: { x: number; y: number },
  unifiedSlide: number
): {
  P0: { x: number; y: number };
  P1: { x: number; y: number };
  P2: { x: number; y: number };
  P3: { x: number; y: number };
} {
  const P0 = impact;
  const P3 = snappedJoin;

  const chordA = Math.hypot(P3.x - P0.x, P3.y - P0.y);

  const dir = normalize({
    x: P3.x - P0.x,
    y: P3.y - P0.y,
  });

  const startDir = dir;
  const bendNormal = {
    x: -dir.y * Math.sign(unifiedSlide),
    y: dir.x * Math.sign(unifiedSlide),
  };

  const forwardLen = chordA * 0.25;
  const bendStrength = Math.abs(unifiedSlide) * chordA * 0.0075;

  const P1 = {
    x: P0.x + startDir.x * forwardLen,
    y: P0.y + startDir.y * forwardLen,
  };

  const straightRatio = 0.25;
  const handleLen = chordA * straightRatio;
  const bendFactor = 0.4;

  const P2 = {
    x: P3.x - dir.x * handleLen + bendNormal.x * bendStrength * bendFactor,
    y: P3.y - dir.y * handleLen + bendNormal.y * bendStrength * bendFactor,
  };

  return { P0, P1, P2, P3 };
}

/** 표준 Bézier 파라미터 t ∈ [0,1]에서 3차 곡선 상의 점 (sampleCubic의 easing과 무관) */
function cubicBezierPoint(
  cubic: {
    P0: { x: number; y: number };
    P1: { x: number; y: number };
    P2: { x: number; y: number };
    P3: { x: number; y: number };
  },
  t: number
): { x: number; y: number } {
  const { P0, P1, P2, P3 } = cubic;
  const u = Math.max(0, Math.min(1, t));
  const om = 1 - u;
  return {
    x:
      om ** 3 * P0.x +
      3 * om ** 2 * u * P1.x +
      3 * om * u ** 2 * P2.x +
      u ** 3 * P3.x,
    y:
      om ** 3 * P0.y +
      3 * om ** 2 * u * P1.y +
      3 * om * u ** 2 * P2.y +
      u ** 3 * P3.y,
  };
}

/** 단위 방향 `lineDir`인 직선 (origin 통과)에 p의 정사영 */
function projectToLine(
  p: { x: number; y: number },
  origin: { x: number; y: number },
  lineDir: { x: number; y: number }
): { x: number; y: number } {
  const vx = p.x - origin.x;
  const vy = p.y - origin.y;
  const s = vx * lineDir.x + vy * lineDir.y;
  return {
    x: origin.x + s * lineDir.x,
    y: origin.y + s * lineDir.y,
  };
}

function decayBend(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return Math.pow(1 - u, HYBRID_DECAY_POWER);
}

function sampleHybridSegmentAWithDecay(
  cubic: ReturnType<typeof buildHybridSegmentACubic>,
  bendNormal: { x: number; y: number },
  unifiedSlide: number,
  chordA: number,
  snappedJoin: { x: number; y: number },
  steps: number,
  joinT: number
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const bendAmplitude =
    Math.abs(unifiedSlide) * chordA * HYBRID_DECAY_BEND_RATIO;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const basePoint = cubicBezierPoint(cubic, t);
    const u = joinT > 1e-12 ? t / joinT : 0;
    const clampedU = Math.max(0, Math.min(1, u));
    const decay = decayBend(clampedU);
    const offset = bendAmplitude * decay * clampedU;

    let point = {
      x: basePoint.x + bendNormal.x * offset,
      y: basePoint.y + bendNormal.y * offset,
    };

    if (i === steps) {
      point = { ...snappedJoin };
    }

    out.push(point);
  }

  return out;
}

function sampleLineSegment(
  a: { x: number; y: number },
  b: { x: number; y: number },
  steps: number
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    pts.push({
      x: a.x + u * (b.x - a.x),
      y: a.y + u * (b.y - a.y),
    });
  }
  return pts;
}

function cubicHermite(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  t0: { x: number; y: number },
  t1: { x: number; y: number },
  u: number
): { x: number; y: number } {
  const s = Math.max(0, Math.min(1, u));
  const s2 = s * s;
  const s3 = s2 * s;

  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;

  return {
    x: h00 * p0.x + h10 * t0.x + h01 * p1.x + h11 * t1.x,
    y: h00 * p0.y + h10 * t0.y + h01 * p1.y + h11 * t1.y,
  };
}

function sampleHermiteCurve(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  t0: { x: number; y: number },
  t1: { x: number; y: number },
  steps: number
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const n = Math.max(1, steps);
  for (let i = 0; i <= n; i++) {
    const u = Math.pow(i / n, 1.3);
    out.push(cubicHermite(p0, p1, t0, t1, u));
  }
  return out;
}

/** 시각 품질 개선용 polyline smoothing (geometry는 보존, 양 끝점 고정) */
function smoothPolyline(
  points: { x: number; y: number }[],
  alpha = 0.15
): { x: number; y: number }[] {
  if (points.length < 3) return points;

  const result: { x: number; y: number }[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    result.push({
      x: curr.x * (1 - alpha) + (prev.x + next.x) * 0.5 * alpha,
      y: curr.y * (1 - alpha) + (prev.y + next.y) * 0.5 * alpha,
    });
  }
  result.push(points[points.length - 1]);
  return result;
}

/** 균일 파라미터 + ease-out 변형으로 초반 곡률 가중 */
function sampleCubic(
  points: ReturnType<typeof buildDirectCubicToC1>,
  steps = 30
): { x: number; y: number }[] {
  const { P0, P1, P2, P3 } = points;
  const result: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    let t = i / steps;

    const k = 2.2;
    t = 1 - Math.pow(1 - t, k);

    const x =
      Math.pow(1 - t, 3) * P0.x +
      3 * Math.pow(1 - t, 2) * t * P1.x +
      3 * (1 - t) * Math.pow(t, 2) * P2.x +
      Math.pow(t, 3) * P3.x;

    const y =
      Math.pow(1 - t, 3) * P0.y +
      3 * Math.pow(1 - t, 2) * t * P1.y +
      3 * (1 - t) * Math.pow(t, 2) * P2.y +
      Math.pow(t, 3) * P3.y;

    result.push({ x, y });
  }

  return result;
}

function applyEffectLineBlendToControl(
  controlRaw: { x: number; y: number },
  pContact: { x: number; y: number },
  dir: { x: number; y: number },
  coEff: { x: number; y: number } | null | undefined,
  c1Eff: { x: number; y: number } | null | undefined,
  tEff: { x: number; y: number },
  hasEffectLine: boolean
): { x: number; y: number } {
  if (hasEffectLine && coEff != null && c1Eff != null) {
    const vcx = controlRaw.x - coEff.x;
    const vcy = controlRaw.y - coEff.y;
    const proj = vcx * tEff.x + vcy * tEff.y;
    const controlProjected = {
      x: coEff.x + tEff.x * proj,
      y: coEff.y + tEff.y * proj,
    };
    return {
      x:
        controlProjected.x +
        (controlRaw.x - controlProjected.x) * CONTROL_OFFSET_RATIO,
      y:
        controlProjected.y +
        (controlRaw.y - controlProjected.y) * CONTROL_OFFSET_RATIO,
    };
  }
  return { ...controlRaw };
}

/**
 * impact→merge(full) 기준 stem 제어점·곡률 (Curve B 등 후속 구간에서 재사용).
 */
function computeStemControl(
  pContact: { x: number; y: number },
  M: { x: number; y: number },
  /** 양수=밀림, 음수=끌림(App에서 통합된 단일 보정 스칼라) */
  slide: number,
  coEff: { x: number; y: number } | null | undefined,
  c1Eff: { x: number; y: number } | null | undefined
): {
  control: { x: number; y: number };
  controlRaw: { x: number; y: number };
  curvature: number;
  perpEff: { x: number; y: number };
  perp: { x: number; y: number };
  dir: { x: number; y: number };
  tEff: { x: number; y: number };
  basePoint: { x: number; y: number };
  chordLen: number;
  lenForCurve: number;
  mode: "effective" | "fallback_chord";
  hasEffectLine: boolean;
  edx: number;
  edy: number;
  elen: number;
} | null {
  const dx = M.x - pContact.x;
  const dy = M.y - pContact.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.001) {
    return null;
  }

  const dir = {
    x: dx / len,
    y: dy / len,
  };

  const basePoint = {
    x: pContact.x + dx * CONTROL_BASE_T,
    y: pContact.y + dy * CONTROL_BASE_T,
  };

  const perpChord = {
    x: -dir.y,
    y: dir.x,
  };

  let perp: { x: number; y: number };
  let mode: "effective" | "fallback_chord";
  let tEff: { x: number; y: number };
  let perpEff: { x: number; y: number };

  const edx =
    coEff != null && c1Eff != null ? c1Eff.x - coEff.x : NaN;
  const edy =
    coEff != null && c1Eff != null ? c1Eff.y - coEff.y : NaN;
  const elen = Math.hypot(edx, edy);

  const hasEffectLine =
    coEff != null &&
    c1Eff != null &&
    Number.isFinite(edx) &&
    Number.isFinite(edy) &&
    elen >= 1e-6;

  if (hasEffectLine && coEff != null && c1Eff != null) {
    const tn = { x: edx / elen, y: edy / elen };
    tEff = tn;
    perpEff = { x: -tn.y, y: tn.x };
    perp = perpEff;
    mode = "effective";
  } else {
    tEff = { ...dir };
    perpEff = { ...perpChord };
    perp = perpChord;
    mode = "fallback_chord";
  }

  const delta = slide;

  const chordLen = len;

  const lenForCurve = hasEffectLine ? elen : chordLen;

  const curvatureRaw = delta * lenForCurve * CURVE_MAGNITUDE_SCALE;
  const clampMin = -lenForCurve * 0.5;
  const clampMax = lenForCurve * 0.5;
  const curvature = Math.max(
    clampMin,
    Math.min(clampMax, curvatureRaw)
  );

  const controlRaw = {
    x: basePoint.x + perp.x * curvature,
    y: basePoint.y + perp.y * curvature,
  };

  const control = applyEffectLineBlendToControl(
    controlRaw,
    pContact,
    dir,
    coEff,
    c1Eff,
    tEff,
    hasEffectLine
  );

  return {
    control,
    controlRaw,
    curvature,
    perpEff,
    perp,
    dir,
    tEff,
    basePoint,
    chordLen,
    lenForCurve,
    mode,
    hasEffectLine,
    edx,
    edy,
    elen,
  };
}

/** effect line(impactProjected→C1_eff) 남은 구간의 절반 지점에 merge (0.5) */
const MERGE_ALONG_EFFECT_RAIL = 0.5;

/** impact에서 CO_eff→C1_eff 무한 직선에 내린 수선의 발 */
function footPerpendicularOnEffectLine(
  impact: { x: number; y: number },
  coEff: { x: number; y: number },
  c1Eff: { x: number; y: number }
): { foot: { x: number; y: number }; tEff: { x: number; y: number }; elen: number } | null {
  const edx = c1Eff.x - coEff.x;
  const edy = c1Eff.y - coEff.y;
  const elen = Math.hypot(edx, edy);
  if (elen < 1e-12) {
    return null;
  }
  const tEff = { x: edx / elen, y: edy / elen };
  const proj =
    (impact.x - coEff.x) * tEff.x + (impact.y - coEff.y) * tEff.y;
  const foot = {
    x: coEff.x + tEff.x * proj,
    y: coEff.y + tEff.y * proj,
  };
  return { foot, tEff, elen };
}

/** effect line 대비 부호있는 거리((p−co)×(c1−co))/|c1−co| — 임팩트 반평면 구분 */
function signedCrossEffectLine(
  p: { x: number; y: number },
  coEff: { x: number; y: number },
  c1Eff: { x: number; y: number }
): number {
  const edx = c1Eff.x - coEff.x;
  const edy = c1Eff.y - coEff.y;
  const elen = Math.hypot(edx, edy);
  if (elen < 1e-12) {
    return 0;
  }
  return ((p.x - coEff.x) * edy - (p.y - coEff.y) * edx) / elen;
}

/** impact에서 보정선으로 향하는 단위 inward 법선 (foot − impact); 퇴화 시 반평면 기준 fallback */
function resolveEffectLineInwardNormal(
  pImpact: { x: number; y: number },
  coEff: { x: number; y: number },
  c1Eff: { x: number; y: number }
): { x: number; y: number } | null {
  const fp = footPerpendicularOnEffectLine(pImpact, coEff, c1Eff);
  if (!fp) {
    return null;
  }
  const { foot, tEff } = fp;
  const vx = foot.x - pImpact.x;
  const vy = foot.y - pImpact.y;
  const len = Math.hypot(vx, vy);
  const lenEps = 1e-9;
  if (len >= lenEps) {
    return { x: vx / len, y: vy / len };
  }
  const si = signedCrossEffectLine(pImpact, coEff, c1Eff);
  const perpEff = { x: -tEff.y, y: tEff.x };
  const probe = 1e-4;
  let n = perpEff;
  const sp = signedCrossEffectLine(
    {
      x: pImpact.x + n.x * probe,
      y: pImpact.y + n.y * probe,
    },
    coEff,
    c1Eff
  );
  if (sp * si < 0 && Math.abs(si) >= 1e-12) {
    n = { x: -perpEff.x, y: -perpEff.y };
  }
  return n;
}

/** baseChord에서 effect-line inward로 pre-bend; 반평면 유지 위해 λ 상한 클램프 */
function curveAControlWithPrebend(
  baseOnChord: { x: number; y: number },
  chordLen: number,
  pImpact: { x: number; y: number },
  coEff: { x: number; y: number },
  c1Eff: { x: number; y: number }
): { x: number; y: number } {
  if (chordLen < 1e-12) {
    // #region agent log
    if (import.meta.env.DEV) {
      fetch(
        "http://127.0.0.1:7698/ingest/05c8c604-4ee9-4069-8fc1-5ac9e58f8454",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "f47042",
          },
          body: JSON.stringify({
            sessionId: "f47042",
            hypothesisId: "H1",
            location: "curveTrajectory.ts:curveAControlWithPrebend",
            message: "prebend_skip_chordLen",
            data: { chordLen },
            timestamp: Date.now(),
          }),
        }
      ).catch(() => {});
    }
    // #endregion
    return { ...baseOnChord };
  }
  const si = signedCrossEffectLine(pImpact, coEff, c1Eff);
  if (Math.abs(si) < 1e-10) {
    // #region agent log
    if (import.meta.env.DEV) {
      fetch(
        "http://127.0.0.1:7698/ingest/05c8c604-4ee9-4069-8fc1-5ac9e58f8454",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "f47042",
          },
          body: JSON.stringify({
            sessionId: "f47042",
            hypothesisId: "H1",
            location: "curveTrajectory.ts:curveAControlWithPrebend",
            message: "prebend_skip_si_zero",
            data: { si },
            timestamp: Date.now(),
          }),
        }
      ).catch(() => {});
    }
    // #endregion
    return { ...baseOnChord };
  }

  const n_in = resolveEffectLineInwardNormal(pImpact, coEff, c1Eff);
  if (!n_in) {
    return { ...baseOnChord };
  }

  const magMax = chordLen * CURVE_A_PREBEND_RATIO;

  const prodAt = (lam: number) =>
    signedCrossEffectLine(
      {
        x: baseOnChord.x + n_in.x * lam,
        y: baseOnChord.y + n_in.y * lam,
      },
      coEff,
      c1Eff
    ) * si;

  let lo = 0;
  let hi = magMax;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) * 0.5;
    if (prodAt(mid) >= -1e-10) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const controlOut = {
    x: baseOnChord.x + n_in.x * lo,
    y: baseOnChord.y + n_in.y * lo,
  };

  // #region agent log
  if (import.meta.env.DEV) {
    fetch(
      "http://127.0.0.1:7698/ingest/05c8c604-4ee9-4069-8fc1-5ac9e58f8454",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "f47042",
        },
        body: JSON.stringify({
          sessionId: "f47042",
          hypothesisId: "H1-H2-H6",
          location: "curveTrajectory.ts:curveAControlWithPrebend:out",
          message: "curve_a_prebend_internal",
          data: {
            chordLen,
            CURVE_A_PREBEND_RATIO,
            magMax,
            si,
            n_in,
            prebendAppliedLambda: lo,
            ratioAppliedVsMax: magMax > 1e-14 ? lo / magMax : null,
            prodAtMidMagMax: prodAt(magMax * 0.5),
            prodAtMagMax: prodAt(magMax),
            baseOnChord,
            controlOut,
            prebendVecLen: Math.hypot(
              controlOut.x - baseOnChord.x,
              controlOut.y - baseOnChord.y
            ),
          },
          timestamp: Date.now(),
        }),
      }
    ).catch(() => {});
  }
  // #endregion

  return controlOut;
}

function distancePointToLine(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy);
  if (L < 1e-12) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / L;
}

/**
 * Merge는 CO_eff→C1_eff 보정선 위에만 존재.
 * impact를 레일에 투영한 뒤, 투영점→C1 거리의 절반만큼 C1 방향으로 이동.
 * (참고) `createCurveSegment`는 현재 merge 없이 impact→C1 직접 cubic을 사용; 이 함수는 보조·호환용으로 유지.
 */
export function getMergePoint(
  pContact: { x: number; y: number },
  coEff: { x: number; y: number },
  c1Eff: { x: number; y: number }
): { x: number; y: number } {
  if (!coEff || !c1Eff || !pContact) {
    console.warn("[SAFE] getMergePoint skipped", {
      co: coEff,
      c1: c1Eff,
      pContact,
    });
    return c1Eff ? { ...c1Eff } : { x: 0, y: 0 };
  }

  const edx = c1Eff.x - coEff.x;
  const edy = c1Eff.y - coEff.y;
  const elen = Math.hypot(edx, edy);

  if (elen < 1e-9) {
    return { ...c1Eff };
  }

  const tEff = { x: edx / elen, y: edy / elen };

  const vImpact = {
    x: pContact.x - coEff.x,
    y: pContact.y - coEff.y,
  };
  let projImpact = vImpact.x * tEff.x + vImpact.y * tEff.y;
  projImpact = Math.max(0, Math.min(elen, projImpact));

  const impactProjected = {
    x: coEff.x + tEff.x * projImpact,
    y: coEff.y + tEff.y * projImpact,
  };

  const impactToC1Len = Math.hypot(
    c1Eff.x - impactProjected.x,
    c1Eff.y - impactProjected.y
  );

  const mergeLen = impactToC1Len * MERGE_ALONG_EFFECT_RAIL;

  const mergePoint = {
    x: impactProjected.x + tEff.x * mergeLen,
    y: impactProjected.y + tEff.y * mergeLen,
  };

  const forwardDot =
    (mergePoint.x - impactProjected.x) * tEff.x +
    (mergePoint.y - impactProjected.y) * tEff.y;

  if (forwardDot < -1e-6) {
    console.warn("[INVALID MERGE DIRECTION]");
  }

  const distanceToEffectLine = distancePointToLine(mergePoint, coEff, c1Eff);

  console.log("[STRICT EFFECT MERGE]", {
    impactContact: pContact,
    impactProjected,
    mergePoint,
    coEff,
    c1Eff,
    mergeLen,
    forwardDot,
    distanceToEffectLine,
  });

  return mergePoint;
}

export function getControlPoint(
  pContact: { x: number; y: number },
  M: { x: number; y: number },
  slide: number,
  coEff?: { x: number; y: number } | null,
  c1Eff?: { x: number; y: number } | null
): { x: number; y: number } {
  const dx = M.x - pContact.x;
  const dy = M.y - pContact.y;

  const len = Math.hypot(dx, dy);
  if (len < 0.001) {
    const p0 = pContact;
    const p2 = M;
    const midDeg = { x: (p0.x + p2.x) * 0.5, y: (p0.y + p2.y) * 0.5 };
    const controlDeg = { x: pContact.x, y: pContact.y };
    const dirDeg =
      len < 1e-12 ? { x: 1, y: 0 } : { x: dx / len, y: dy / len };
    const perpDeg = { x: -dirDeg.y, y: dirDeg.x };
    const dist_mid_control = Math.hypot(
      controlDeg.x - midDeg.x,
      controlDeg.y - midDeg.y
    );
    console.log("[CURVE ANALYSIS] degenerate P→M chord, len=", len);
    console.log("[CP]", {
      p0,
      p2,
      mid: midDeg,
      control: controlDeg,
      curvature: undefined,
      perp: perpDeg,
      dist_mid_control,
      degenerateChord: true,
    });
    console.log("[CURVE SHAPE DEBUG]", {
      p0,
      control: controlDeg,
      p2: M,
      coEff: coEff ?? null,
      c1Eff: c1Eff ?? null,
      tEff: null,
      perpEff: null,
      curvature: undefined,
      distP0P2: Math.hypot(M.x - pContact.x, M.y - pContact.y),
      distMidControl: dist_mid_control,
      degenerateChord: true,
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
        location: "curveTrajectory.ts:getControlPoint:degenerate",
        message: "cp_degenerate",
        hypothesisId: "H-A",
        data: { len, dist_mid_control, degenerateChord: true },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return {
      x: pContact.x,
      y: pContact.y,
    };
  }

  const stem = computeStemControl(
    pContact,
    M,
    slide,
    coEff,
    c1Eff
  );
  if (!stem) {
    return {
      x: pContact.x,
      y: pContact.y,
    };
  }

  const {
    control,
    controlRaw,
    basePoint,
    curvature,
    perp,
    tEff,
    perpEff,
    mode,
    dir,
    chordLen,
    lenForCurve,
  } = stem;

  const delta = slide;
  const curvatureRaw = delta * lenForCurve * CURVE_MAGNITUDE_SCALE;

  let controlProjected: { x: number; y: number };
  if (stem.hasEffectLine && coEff != null && c1Eff != null) {
    const vcx = controlRaw.x - coEff.x;
    const vcy = controlRaw.y - coEff.y;
    const proj = vcx * tEff.x + vcy * tEff.y;
    controlProjected = {
      x: coEff.x + tEff.x * proj,
      y: coEff.y + tEff.y * proj,
    };
  } else {
    const projChord =
      (controlRaw.x - pContact.x) * dir.x +
      (controlRaw.y - pContact.y) * dir.y;
    controlProjected = {
      x: pContact.x + dir.x * projChord,
      y: pContact.y + dir.y * projChord,
    };
  }

  console.log("[H-GCP]", {
    curvatureRaw,
    curvatureAfterClamp: curvature,
    lenForCurve,
  });

  console.log("[CURVE CONTROL REBUILD]", {
    p0: pContact,
    mergePoint: M,
    basePoint,
    controlRaw,
    controlProjected,
    control,
    curvature,
  });

  console.log("[CURVE PERP]", {
    mode,
    coEff: coEff ?? null,
    c1Eff: c1Eff ?? null,
    tEff,
    perpEff,
    curvature,
    lenForCurve,
    chordLen,
    scale: CURVE_MAGNITUDE_SCALE,
  });

  const p0 = pContact;
  const p2 = M;
  const crossOnChord =
    dx * (control.y - pContact.y) - dy * (control.x - pContact.x);
  const dist_control_to_chord = Math.abs(crossOnChord) / (len || 1);

  console.log("[CP]", {
    p0,
    p2,
    basePoint,
    control,
    curvature,
    dist_base_control: Math.hypot(
      control.x - basePoint.x,
      control.y - basePoint.y
    ),
  });

  // === CURVE ANALYSIS (FINAL) ===
  const dx1 = M.x - pContact.x;
  const dy1 = M.y - pContact.y;

  const dx2 = control.x - pContact.x;
  const dy2 = control.y - pContact.y;

  const cross = dx1 * dy2 - dy1 * dx2;

  const perpendicularDist = Math.abs(cross) / (chordLen || 1);

  const curvatureRatio = perpendicularDist / (chordLen || 1);

  const dot = dir.x * perp.x + dir.y * perp.y;

  console.log("[CURVE ANALYSIS FINAL]");
  console.log({
    pContact,
    M,
    control,

    chordLen,
    lenForCurve,
    perpendicularDist,
    curvatureRatio,

    delta: slide,
    curvature,

    dot,

    isCollinear: Math.abs(cross) < 0.01,
  });

  console.log("[CURVE SHAPE DEBUG]", {
    p0: pContact,
    control,
    p2: M,
    coEff: coEff ?? null,
    c1Eff: c1Eff ?? null,
    tEff,
    perpEff,
    curvature,
    distP0P2: Math.hypot(M.x - pContact.x, M.y - pContact.y),
    distBaseControl: Math.hypot(
      control.x - basePoint.x,
      control.y - basePoint.y
    ),
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
      location: "curveTrajectory.ts:getControlPoint",
      message: "curve_collinearity_final",
      hypothesisId: "H-A",
      data: {
        cross,
        chordLen,
        perpendicularDist,
        curvatureRatio,
        isCollinear: Math.abs(cross) < 0.01,
        dotDirPerp: dot,
        curvature,
        slide,
        delta: slide,
        dist_base_control: Math.hypot(
          control.x - basePoint.x,
          control.y - basePoint.y
        ),
        dist_control_to_chord,
        lenForCurve,
        curveScale: CURVE_MAGNITUDE_SCALE,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  // #region agent log
  fetch("http://127.0.0.1:7698/ingest/05c8c604-4ee9-4069-8fc1-5ac9e58f8454", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "6a4663",
    },
    body: JSON.stringify({
      sessionId: "6a4663",
      location: "curveTrajectory.ts:getControlPoint:shape_debug",
      message: "curve_shape_hypotheses",
      hypothesisId: "H-AB",
      data: {
        distP0P2: Math.hypot(M.x - pContact.x, M.y - pContact.y),
        distBaseControl: Math.hypot(
          control.x - basePoint.x,
          control.y - basePoint.y
        ),
        chordLen,
        lenForCurve,
        curvature,
        cross,
        perpendicularDist,
        curvatureRatio,
        delta: slide,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return control;
}

/**
 * impact → 보정선 hybrid: Segment A는 impact→snappedJoin 단일 cubic(P3=snappedJoin, P2는 chord dir 축),
 * Segment B는 snappedJoin→C1 직선 (보정선 위).
 */
export function createCurveSegment(
  pContact: { x: number; y: number },
  coEff: { x: number; y: number },
  c1Eff: { x: number; y: number },
  slide: number,
  options?: { curveMode?: "legacyBezier" | "offsetDecay" | "tangentCurve" }
): { x: number; y: number }[] {
  console.log("[H-Entry]", {
    slide,
    delta: slide,
  });
  if (!coEff) {
    return [];
  }

  const p0 = pContact ?? coEff;
  const c1 = c1Eff ?? coEff;

  const chordLen = Math.hypot(c1.x - p0.x, c1.y - p0.y);
  if (chordLen < 1e-9) {
    return [];
  }

  let inwardNormal = resolveEffectLineInwardNormal(p0, coEff, c1);
  if (!inwardNormal) {
    const edx = c1.x - coEff.x;
    const edy = c1.y - coEff.y;
    const elen = Math.hypot(edx, edy);
    if (elen >= 1e-6) {
      const tEff = { x: edx / elen, y: edy / elen };
      inwardNormal = { x: -tEff.y, y: tEff.x };
      const si = signedCrossEffectLine(p0, coEff, c1);
      const probe = 1e-4;
      const sp = signedCrossEffectLine(
        {
          x: p0.x + inwardNormal.x * probe,
          y: p0.y + inwardNormal.y * probe,
        },
        coEff,
        c1
      );
      if (sp * si < 0 && Math.abs(si) >= 1e-12) {
        inwardNormal = { x: -inwardNormal.x, y: -inwardNormal.y };
      }
    } else {
      const dirFallback = normalizeVec({ x: c1.x - p0.x, y: c1.y - p0.y });
      inwardNormal = { x: -dirFallback.y, y: dirFallback.x };
    }
  }

  const cubic = buildDirectCubicToC1(p0, coEff, c1, inwardNormal, slide);

  const edxL = c1.x - coEff.x;
  const edyL = c1.y - coEff.y;
  const effectLen = Math.hypot(edxL, edyL);
  const curveMode = "legacyBezier";
  if (options?.curveMode && options.curveMode !== "legacyBezier") {
    console.warn(
      "[curveMode] experimental modes are disabled; forcing legacyBezier",
      options.curveMode
    );
  }

  let curvePoints: { x: number; y: number }[];
  if (effectLen < 1e-9) {
    curvePoints = sampleCubic(cubic, 30);
  } else {
    const lineDir = normalize({
      x: edxL,
      y: edyL,
    });

    const joinT = 0.9;
    const joinPoint = cubicBezierPoint(cubic, joinT);
    const snappedJoin = projectToLine(joinPoint, coEff, lineDir);

    const chordSnapped = Math.hypot(snappedJoin.x - p0.x, snappedJoin.y - p0.y);
    if (chordSnapped < 1e-9) {
      curvePoints = sampleLineSegment(p0, c1, 24);
    } else {
      const stepsA = 16;
      const stepsB = 15;
      const dirToJoin = normalize({
        x: snappedJoin.x - p0.x,
        y: snappedJoin.y - p0.y,
      });
      // chord(p0→snappedJoin)에 수직인 raw normal
      const bendNormalRaw = { x: -dirToJoin.y, y: dirToJoin.x };
      // 보정선 방향(inward)과 정렬되는 쪽으로 부호를 맞춘다
      // inwardNormal은 1097라인에서 이미 보정선 방향으로 계산됨
      const inwardAlignDot = inwardNormal
        ? bendNormalRaw.x * inwardNormal.x + bendNormalRaw.y * inwardNormal.y
        : 1;
      const bendNormal =
        inwardAlignDot >= 0
          ? bendNormalRaw
          : { x: -bendNormalRaw.x, y: -bendNormalRaw.y };
      // Hermite Segment A: connect p0 -> snappedJoin directly (no jump to C)
      // earlyRatio 0.5 → 0.75 (A 구간 샘플/길이 기준 ~1.5배 확장)
      const earlyRatio = 0.75;
      const hermiteCutIdx = Math.max(2, Math.floor(stepsA * earlyRatio));
      const pHermite0 = p0;
      // A의 끝점을 snappedJoin으로 강제하여 A→C 점프 제거
      const pHermite1 = { ...snappedJoin };
      const startDir = normalize({
        x: c1.x - p0.x,
        y: c1.y - p0.y,
      });
      const correctionDir = normalize({
        x: snappedJoin.x - p0.x,
        y: snappedJoin.y - p0.y,
      });
      const toC1Dir = normalize({
        x: c1.x - p0.x,
        y: c1.y - p0.y,
      });
      const w = 0.5;
      // T0 방향: chord(p0→snappedJoin)에 chord-수직 성분(bendNormal)을 섞어
      // Hermite가 직선이 아니라 보정선 방향으로 부풀도록 만든다
      const t0Dir = normalize({
        x: dirToJoin.x + bendNormal.x * 1.2,
        y: dirToJoin.y + bendNormal.y * 1.2,
      });
      const tHermite0 = {
        x: t0Dir.x * chordSnapped * 0.4,
        y: t0Dir.y * chordSnapped * 0.4,
      };
      let t1Dir = normalize({
        x: startDir.x * (1 - w) + correctionDir.x * (w * 2.0),
        y: startDir.y * (1 - w) + correctionDir.y * (w * 2.0),
      });
      // cone constraint (simple guard)
      if (t1Dir.x * correctionDir.x + t1Dir.y * correctionDir.y < 0) {
        t1Dir = { ...correctionDir };
      }
      if (t1Dir.x * toC1Dir.x + t1Dir.y * toC1Dir.y > 1) {
        t1Dir = { ...toC1Dir };
      }
      // C 방향 (snappedJoin → c1)
      const toC1Dir_local = normalize({
        x: c1.x - snappedJoin.x,
        y: c1.y - snappedJoin.y,
      });
      // 🔥 핵심: C 방향 기준으로 tangent 정렬 (correctionDir/C 균등 블렌드)
      let tMidDir = normalize({
        x: correctionDir.x * 0.5 + toC1Dir_local.x * 0.5,
        y: correctionDir.y * 0.5 + toC1Dir_local.y * 0.5,
      });
      // 🔒 안전: C 방향과 반대면 강제 정렬
      if (tMidDir.x * toC1Dir_local.x + tMidDir.y * toC1Dir_local.y < 0) {
        tMidDir = { ...toC1Dir_local };
      }
      const tMid = {
        x: tMidDir.x * chordSnapped * 1.0,
        y: tMidDir.y * chordSnapped * 1.0,
      };
      // 🔥 샘플 수 증가 (곡선 부드러움 개선, geometry 동일)
      const hermiteSamples = Math.max(12, Math.floor(hermiteCutIdx * 1.5));
      const hermiteA = sampleHermiteCurve(
        pHermite0,
        pHermite1,
        tHermite0,
        tMid,
        hermiteSamples
      );
      const segmentAWithHermite = [...hermiteA];
      for (let i = 1; i < segmentAWithHermite.length; i++) {
        const prev = segmentAWithHermite[i - 1];
        const cur = segmentAWithHermite[i];
        const sPrev =
          (prev.x - coEff.x) * lineDir.x + (prev.y - coEff.y) * lineDir.y;
        const sCur = (cur.x - coEff.x) * lineDir.x + (cur.y - coEff.y) * lineDir.y;
        if (sCur < sPrev) {
          segmentAWithHermite[i] = { ...prev };
        }
      }
      const linePoints = sampleLineSegment(snappedJoin, c1, stepsB);
      curvePoints = [...segmentAWithHermite, ...linePoints.slice(1)];
      // 🔥 후처리 smoothing (양 끝점 고정, geometry 사실상 보존)
      curvePoints = smoothPolyline(curvePoints, 0.15);
    }
  }

  console.log("[SEGMENT INPUT]", {
    pContact: p0,
    C1: c1,
    inwardNormal,
    unifiedSlide: slide,
  });
  const curveLast = curvePoints[curvePoints.length - 1];
  const distLastToC1 =
    curveLast && c1
      ? Math.hypot(curveLast.x - c1.x, curveLast.y - c1.y)
      : NaN;
  console.log("[CURVE END VS C1]", {
    curveLast,
    C1: c1,
    distLastToC1,
  });
  const mi = Math.floor(curvePoints.length / 2);
  const first = curvePoints[0];
  const midPt = curvePoints[mi];
  const last = curvePoints[curvePoints.length - 1];
  let segMaxDev: number | null = null;
  if (curvePoints.length >= 3 && first && last) {
    const ax = last.x - first.x;
    const ay = last.y - first.y;
    const alen = Math.hypot(ax, ay);
    if (alen > 1e-12) {
      let maxD = 0;
      for (let i = 1; i < curvePoints.length - 1; i++) {
        const p = curvePoints[i];
        const cross = Math.abs((p.x - first.x) * ay - (p.y - first.y) * ax);
        maxD = Math.max(maxD, cross / alen);
      }
      segMaxDev = maxD;
    }
  }
  console.log("[SEGMENT OUTPUT]", {
    length: curvePoints.length,
    first: curvePoints[0],
    mid: curvePoints[Math.floor(curvePoints.length / 2)],
    last: curvePoints[curvePoints.length - 1],
    segMaxDeviationFromChord: segMaxDev,
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
      location: "curveTrajectory.ts:createCurveSegment:endpoint",
      message: "curve_last_vs_c1",
      hypothesisId: "H-C",
      data: {
        distLastToC1,
        curveLast,
        C1: c1,
        segMaxDeviationFromChord: segMaxDev,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  // #region agent log
  fetch("http://127.0.0.1:7698/ingest/05c8c604-4ee9-4069-8fc1-5ac9e58f8454", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "6a4663",
    },
    body: JSON.stringify({
      sessionId: "6a4663",
      location: "curveTrajectory.ts:createCurveSegment:afterBezier",
      message: "segment_output",
      hypothesisId: "H-B",
      data: {
        length: curvePoints.length,
        first,
        mid: midPt,
        last,
        segMaxDeviationFromChord: segMaxDev,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return curvePoints;
}

/*
 * -----------------------------------------------------------------------------
 * LEGACY_MERGE_CURVE_AB (참고용)
 * -----------------------------------------------------------------------------
 * 과거 `createCurveSegment`는 `getMergePoint(p0, coEff, c1)`로 merge M을 두고,
 * `computeStemControl` + foot 기반 peak 후 quadratic Curve A / Curve B를 이어
 * impact → M 까지 그렸음. 복구 시 이 저장소 git 히스토리에서 해당 함수 본문을 가져오면 됨.
 * -----------------------------------------------------------------------------
 */

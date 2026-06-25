import React, { useMemo } from "react";
import { toPx } from "../../utils/geometry/coords";

/** 놀이구역 Rg 직사각형 (toPx 이전에만 사용) */
const TABLE_RG_X_MIN = 0;
const TABLE_RG_X_MAX = 80;
const TABLE_RG_Y_MIN = 0;
const TABLE_RG_Y_MAX = 40;

function pointInsideTableRg(p) {
  return (
    p.x >= TABLE_RG_X_MIN &&
    p.x <= TABLE_RG_X_MAX &&
    p.y >= TABLE_RG_Y_MIN &&
    p.y <= TABLE_RG_Y_MAX
  );
}

function intersectWithTableBounds(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  if (Math.abs(dx) < 1e-14 && Math.abs(dy) < 1e-14) {
    return pointInsideTableRg(p1) ? { x: p1.x, y: p1.y } : null;
  }

  if (pointInsideTableRg(p1) && pointInsideTableRg(p2)) {
    return { x: p2.x, y: p2.y };
  }
  if (!pointInsideTableRg(p1)) {
    if (pointInsideTableRg(p2)) return { x: p2.x, y: p2.y };
    return null;
  }

  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    const x = p1.x + mid * dx;
    const y = p1.y + mid * dy;
    if (pointInsideTableRg({ x, y })) lo = mid;
    else hi = mid;
  }
  const t = lo;
  return {
    x: p1.x + t * dx,
    y: p1.y + t * dy,
  };
}

function anchorToRgPoint(a) {
  if (a == null) return null;
  if (
    typeof a.x === "number" &&
    typeof a.y === "number" &&
    Number.isFinite(a.x) &&
    Number.isFinite(a.y)
  ) {
    return { x: a.x, y: a.y };
  }
  if (
    a.coord != null &&
    typeof a.coord === "object" &&
    Number.isFinite(a.coord.x) &&
    Number.isFinite(a.coord.y)
  ) {
    return { x: a.coord.x, y: a.coord.y };
  }
  return null;
}

/** 기존 trajectory 폴리라인만 사용: impact를 가장 가까운 변에 정사영해 front / tail Rg 점열로 분할 */
function splitCushionPathAtImpactProjection(path, impact) {
  if (!impact || !Number.isFinite(impact.x) || !Number.isFinite(impact.y)) {
    return null;
  }
  if (!Array.isArray(path) || path.length < 2) return null;

  const pts = [];
  for (const pt of path) {
    const q = anchorToRgPoint(pt);
    if (q == null) return null;
    pts.push(q);
  }

  const RG_JOIN_MAX_DIST = 2.5;
  const VERTEX_EPS = 1e-3;

  let bestI = -1;
  let bestDist = Infinity;
  let bestP = /** @type {{ x: number; y: number } | null} */ (null);

  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i];
    const B = pts[i + 1];
    const abx = B.x - A.x;
    const aby = B.y - A.y;
    const ab2 = abx * abx + aby * aby;
    if (ab2 < 1e-18) continue;
    let t = ((impact.x - A.x) * abx + (impact.y - A.y) * aby) / ab2;
    t = Math.max(0, Math.min(1, t));
    const Px = A.x + t * abx;
    const Py = A.y + t * aby;
    const d = Math.hypot(impact.x - Px, impact.y - Py);
    if (d < bestDist) {
      bestDist = d;
      bestI = i;
      bestP = { x: Px, y: Py };
    }
  }

  if (bestI < 0 || !bestP || bestDist > RG_JOIN_MAX_DIST) return null;

  const A = pts[bestI];
  const B = pts[bestI + 1];
  const dPA = Math.hypot(bestP.x - A.x, bestP.y - A.y);
  const dPB = Math.hypot(bestP.x - B.x, bestP.y - B.y);

  let front;
  let tail;
  if (dPA <= VERTEX_EPS) {
    front = pts.slice(0, bestI + 1);
    tail = pts.slice(bestI);
  } else if (dPB <= VERTEX_EPS) {
    front = pts.slice(0, bestI + 2);
    tail = pts.slice(bestI + 1);
  } else {
    front = [...pts.slice(0, bestI + 1), bestP];
    tail = [bestP, ...pts.slice(bestI + 1)];
  }

  return { front, tail };
}

function rgPolylineToPointsString(pts, scale, tableH, padding) {
  if (!Array.isArray(pts) || pts.length < 2) return "";
  const parts = [];
  for (const q of pts) {
    if (!q || !Number.isFinite(q.x) || !Number.isFinite(q.y)) return "";
    const p = toPx(q, scale, tableH);
    parts.push(`${p.x + padding},${p.y + padding}`);
  }
  return parts.join(" ");
}

function isStraightLine(rgPoints) {
  if (!Array.isArray(rgPoints) || rgPoints.length < 3) return true;
  const a = rgPoints[0];
  const b = rgPoints[rgPoints.length - 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return true;
  const eps = 0.02;
  for (let i = 1; i < rgPoints.length - 1; i++) {
    const p = rgPoints[i];
    const cross = Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx);
    const dist = cross / len;
    if (dist > eps) return false;
  }
  return true;
}

export default function ImpactLines({
  CO_line,
  C1_line,
  CO_corrected_line,
  cushionPath,
  /** trajectory 폴리라인 분할 기준점 (Rg) — 기존 path 위 정사영만 사용 */
  impactSplitRg = null,
  cushionPathAttrBase,
  anchorsBase,
  /** true: slide/draw 곡선 변형 활성 — 빨간 trajectory + CO–C1 보조선 등 */
  curveDeformActive = true,
  showBaseLine = false,
  /** Level 3: corrected path 위에 baseline reference polyline 추가 */
  showBaselineReferencePath = false,
  baselineReferencePath = null,
  /** 픽셀 좌표 { x1, y1, x2, y2 } — 전달 시 베이스 라인으로 우선 렌더 */
  guideLineNode = null,
  /** SVG polyline points 문자열(픽셀) — guideLineNode 없을 때 선택 */
  baseLinePoints = null,
  scale,
  tableH,
  padding,
}) {
  const usedEffectivePolylinePoints = useMemo(() => {
    if (!cushionPath || cushionPath.length <= 1) return "";
    const parts = [];
    for (const pt of cushionPath) {
      if (pt == null) break;
      const p = toPx(pt, scale, tableH);
      parts.push(`${p.x + padding},${p.y + padding}`);
    }
    return parts.join(" ");
  }, [cushionPath, scale, tableH, padding]);

  const baselineReferencePolylinePoints = useMemo(() => {
    if (!showBaselineReferencePath || !baselineReferencePath?.length) return "";
    const parts = [];
    for (const pt of baselineReferencePath) {
      if (pt == null) break;
      const p = toPx(pt, scale, tableH);
      parts.push(`${p.x + padding},${p.y + padding}`);
    }
    return parts.join(" ");
  }, [showBaselineReferencePath, baselineReferencePath, scale, tableH, padding]);

  const basePoints = [];
  if (anchorsBase) {
    basePoints.push(
      anchorsBase.CO,
      anchorsBase["C1"],
      anchorsBase["C2"],
      anchorsBase["C3"]
    );
    if (anchorsBase["C4"]) {
      const p1 = anchorToRgPoint(anchorsBase["C3"]);
      const p2 = anchorToRgPoint(anchorsBase["C4"]);
      const clipped = p1 && p2 ? intersectWithTableBounds(p1, p2) : null;
      basePoints.push(clipped ?? anchorsBase["C4"]);
    }
  }

  let baseRgPoints = basePoints
    .filter(Boolean)
    .map(anchorToRgPoint)
    .filter(Boolean);

  const pC3 = anchorsBase ? anchorToRgPoint(anchorsBase["C3"]) : null;
  const pC4 = anchorsBase ? anchorToRgPoint(anchorsBase["C4"]) : null;
  if (pC3 && pC4 && baseRgPoints.length >= 2) {
    const cEnd = intersectWithTableBounds(pC3, pC4);
    if (cEnd) {
      baseRgPoints = [...baseRgPoints];
      baseRgPoints[baseRgPoints.length - 1] = cEnd;
    }
  }

  let basePolylinePointsFromAnchors = null;
  if (typeof cushionPathAttrBase === "string" && cushionPathAttrBase.trim()) {
    /** App.jsx가 pathEndIndex까지 완전한 Rg 경로를 전달 — C4 클리핑 append 생략 */
    basePolylinePointsFromAnchors = cushionPathAttrBase.trim();
  } else if (baseRgPoints.length >= 2) {
    basePolylinePointsFromAnchors = baseRgPoints
      .map((pt) => {
        const p = toPx(pt, scale, tableH);
        return `${p.x + padding},${p.y + padding}`;
      })
      .join(" ");
  }

  let basePolylineFromAnchorsValid = false;
  if (basePolylinePointsFromAnchors) {
    const segs = basePolylinePointsFromAnchors.trim().split(/\s+/).filter(Boolean);
    if (segs.length >= 2) {
      basePolylineFromAnchorsValid = true;
      for (const seg of segs) {
        const comma = seg.indexOf(",");
        if (comma < 0) {
          basePolylineFromAnchorsValid = false;
          break;
        }
        const x = Number(seg.slice(0, comma));
        const y = Number(seg.slice(comma + 1));
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          basePolylineFromAnchorsValid = false;
          break;
        }
      }
    }
  }

  const hasGuideLine =
    guideLineNode != null &&
    Number.isFinite(guideLineNode.x1) &&
    Number.isFinite(guideLineNode.y1) &&
    Number.isFinite(guideLineNode.x2) &&
    Number.isFinite(guideLineNode.y2);

  const basePolylinePoints =
    typeof baseLinePoints === "string" && baseLinePoints.trim()
      ? baseLinePoints.trim()
      : basePolylineFromAnchorsValid
        ? basePolylinePointsFromAnchors
        : null;

  let basePolylineValid = false;
  if (basePolylinePoints) {
    const segs = basePolylinePoints.trim().split(/\s+/).filter(Boolean);
    if (segs.length >= 2) {
      basePolylineValid = true;
      for (const seg of segs) {
        const comma = seg.indexOf(",");
        if (comma < 0) {
          basePolylineValid = false;
          break;
        }
        const x = Number(seg.slice(0, comma));
        const y = Number(seg.slice(comma + 1));
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          basePolylineValid = false;
          break;
        }
      }
    }
  }

  const showGuideLineBaseline =
    curveDeformActive && showBaseLine && hasGuideLine;
  const showAnchorsBaselinePolyline =
    curveDeformActive && showBaseLine && !hasGuideLine && basePolylineValid;

  const pathSplit = useMemo(() => {
    if (!impactSplitRg || !Array.isArray(cushionPath) || cushionPath.length < 2) {
      return null;
    }
    return splitCushionPathAtImpactProjection(cushionPath, impactSplitRg);
  }, [cushionPath, impactSplitRg]);

  const frontTrajectoryPx = useMemo(
    () =>
      pathSplit
        ? rgPolylineToPointsString(
            pathSplit.front,
            scale,
            tableH,
            padding
          )
        : "",
    [pathSplit, scale, tableH, padding]
  );

  const tailTrajectoryPx = useMemo(
    () =>
      pathSplit
        ? rgPolylineToPointsString(pathSplit.tail, scale, tableH, padding)
        : "",
    [pathSplit, scale, tableH, padding]
  );

  const cushionTrajectoryPolyline = (() => {
    if (!Array.isArray(cushionPath) || cushionPath.length <= 2) return null;

    if (pathSplit && (frontTrajectoryPx || tailTrajectoryPx)) {
      return (
        <>
          {frontTrajectoryPx ? (
            <polyline
              points={frontTrajectoryPx}
              stroke="#EAB308"
              strokeWidth={1}
              fill="none"
              pointerEvents="none"
            />
          ) : null}
          {tailTrajectoryPx ? (
            <polyline
              points={tailTrajectoryPx}
              stroke="#ff4444"
              strokeWidth={2}
              fill="none"
            />
          ) : null}
        </>
      );
    }

    const rgPoints = [];
    for (const pt of cushionPath) {
      const q = anchorToRgPoint(pt);
      if (q == null) return null;
      rgPoints.push(q);
    }

    const STRAIGHT_EPS = 0.02;
    let deviation = null;
    let isStraight = true;
    if (rgPoints.length >= 3) {
      const a = rgPoints[0];
      const b = rgPoints[rgPoints.length - 1];
      const sdx = b.x - a.x;
      const sdy = b.y - a.y;
      const slen = Math.hypot(sdx, sdy);
      if (slen < 1e-12) {
        deviation = 0;
        isStraight = true;
      } else {
        let maxD = 0;
        for (let i = 1; i < rgPoints.length - 1; i++) {
          const p = rgPoints[i];
          const cross = Math.abs((p.x - a.x) * sdy - (p.y - a.y) * sdx);
          maxD = Math.max(maxD, cross / slen);
        }
        deviation = maxD;
        isStraight = maxD <= STRAIGHT_EPS;
      }
    } else {
      deviation = null;
      isStraight = true;
    }

    if (!curveDeformActive) {
      const whiteStrokeWidth = showBaseLine ? 1 : 2;
      return (
        <polyline
          points={usedEffectivePolylinePoints}
          stroke="#ffffff"
          strokeWidth={whiteStrokeWidth}
          fill="none"
          pointerEvents="none"
        />
      );
    }

    const isCurvePath = cushionPath.length > 2 && !isStraightLine(rgPoints);
    if (!isCurvePath) return null;

    return (
      <polyline
        points={usedEffectivePolylinePoints}
        stroke="#ff4444"
        strokeWidth={2}
        fill="none"
      />
    );
  })();

  return (
    <>
      {curveDeformActive && CO_line && C1_line && (
        <line
          x1={toPx(CO_line, scale, tableH).x + padding}
          y1={toPx(CO_line, scale, tableH).y + padding}
          x2={toPx(C1_line, scale, tableH).x + padding}
          y2={toPx(C1_line, scale, tableH).y + padding}
          stroke="#fb923c"
          strokeWidth={1}
        />
      )}
      {CO_corrected_line && C1_line && !showBaseLine && (
        <line
          x1={toPx(CO_corrected_line, scale, tableH).x + padding}
          y1={toPx(CO_corrected_line, scale, tableH).y + padding}
          x2={toPx(C1_line, scale, tableH).x + padding}
          y2={toPx(C1_line, scale, tableH).y + padding}
          stroke="#ffffff"
          strokeWidth={2}
        />
      )}

      {showGuideLineBaseline && (
        <line
          x1={guideLineNode.x1}
          y1={guideLineNode.y1}
          x2={guideLineNode.x2}
          y2={guideLineNode.y2}
          stroke="#FFD400"
          strokeWidth={1.25}
          strokeDasharray="4 4"
          opacity={0.8}
          pointerEvents="none"
        />
      )}

      {showAnchorsBaselinePolyline && (
        <polyline
          points={basePolylinePoints}
          stroke="#FFD700"
          strokeWidth={0.5}
          strokeDasharray="none"
          opacity={0.9}
          fill="none"
          pointerEvents="none"
        />
      )}

      {showBaselineReferencePath && baselineReferencePolylinePoints && (
        <polyline
          points={baselineReferencePolylinePoints}
          stroke="#ffffff"
          strokeWidth={1}
          fill="none"
          opacity={0.85}
          pointerEvents="none"
        />
      )}

      {cushionTrajectoryPolyline}
    </>
  );
}

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
  cushionPathAttrBase,
  anchorsBase,
  showBaseLine = false,
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
    basePolylinePointsFromAnchors = cushionPathAttrBase.trim();
    const p1 = anchorToRgPoint(anchorsBase?.["C3"]);
    const p2 = anchorToRgPoint(anchorsBase?.["C4"]);
    const clippedRg = p1 && p2 ? intersectWithTableBounds(p1, p2) : null;
    if (clippedRg) {
      const p = toPx(clippedRg, scale, tableH);
      basePolylinePointsFromAnchors += ` ${p.x + padding},${p.y + padding}`;
    }
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

  const showGuideLineBaseline = showBaseLine && hasGuideLine;
  const showAnchorsBaselinePolyline =
    showBaseLine && !hasGuideLine && basePolylineValid;

  if (import.meta.env.DEV) {
    console.log("[DRAW BASELINE]", guideLineNode);
    console.log("[DRAW CURVE]", cushionPath?.length);
  }

  const redPolyline = (() => {
    if (!Array.isArray(cushionPath) || cushionPath.length <= 2) return null;

    const rgPoints = [];
    for (const pt of cushionPath) {
      const q = anchorToRgPoint(pt);
      if (q == null) return null;
      rgPoints.push(q);
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
      {CO_line && C1_line && (
        <line
          x1={toPx(CO_line, scale, tableH).x + padding}
          y1={toPx(CO_line, scale, tableH).y + padding}
          x2={toPx(C1_line, scale, tableH).x + padding}
          y2={toPx(C1_line, scale, tableH).y + padding}
          stroke="#fb923c"
          strokeWidth={2}
        />
      )}
      {CO_corrected_line && C1_line && (
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

      {redPolyline}
    </>
  );
}

import React from "react";
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

/**
 * C3→C4 등: p1에서 p2 방향 선분을 테이블 경계에서 잘라, 안쪽에 남는 끝점(Rg).
 * projection/toPx와 무관.
 */
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

/** 앵커/점 객체 → Rg {x,y} (로그·검증용, 투영 로직 없음) */
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

export default function ImpactLines({
  CO_line,
  C1_line,
  CO_corrected_line,
  cushionPath,
  cushionPathAttr,
  cushionPathAttrBase,
  anchorsBase,
  showBaseLine = false,
  scale,
  tableH,
  padding
}) {
  /** 렌더 검증용: CO→C3 고정 + C4 존재 시 연장 */
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
      const clipped =
        p1 && p2 ? intersectWithTableBounds(p1, p2) : null;
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

  if (import.meta.env.DEV) {
    console.log("BASE_EXTENDED", basePoints);
    if (pC3 && pC4) {
      console.log("BASE_CLIP_RG", {
        p1: pC3,
        p2: pC4,
        clipped: intersectWithTableBounds(pC3, pC4),
      });
    }
    console.log("BASE_CHAIN_CHECK", {
      hasCO: !!anchorsBase?.CO,
      hasC1: !!anchorsBase?.["C1"],
      hasC2: !!anchorsBase?.["C2"],
      hasC3: !!anchorsBase?.["C3"],
      hasC4: !!anchorsBase?.["C4"],
    });
    if (cushionPathAttrBase) {
      const segs = cushionPathAttrBase.trim().split(/\s+/).filter(Boolean);
      console.log("BASE_CUSHION_SEGS", segs.length, segs);
    }
  }

  /** App에서 온 레일 체인은 기본 pathEnd가 C3까지 — C4 앵커가 있으면 렌더만 C3→C4 연장 */
  let basePolylinePoints = null;
  if (typeof cushionPathAttrBase === "string" && cushionPathAttrBase.trim()) {
    basePolylinePoints = cushionPathAttrBase.trim();
    const p1 = anchorToRgPoint(anchorsBase?.["C3"]);
    const p2 = anchorToRgPoint(anchorsBase?.["C4"]);
    const clippedRg = p1 && p2 ? intersectWithTableBounds(p1, p2) : null;
    if (clippedRg) {
      const p = toPx(clippedRg, scale, tableH);
      basePolylinePoints += ` ${p.x + padding},${p.y + padding}`;
    }
  } else if (baseRgPoints.length >= 2) {
    basePolylinePoints = baseRgPoints
      .map((pt) => {
        const p = toPx(pt, scale, tableH);
        return `${p.x + padding},${p.y + padding}`;
      })
      .join(" ");
  }

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

      {showBaseLine && basePolylineValid && (
        <polyline
          points={basePolylinePoints}
          stroke="#FFD700"
          strokeWidth={0.5}
          strokeDasharray="none"
          opacity={0.9}
          fill="none"
        />
      )}
      {cushionPath.length > 1 && (
        <polyline
          points={cushionPathAttr}
          stroke="#ef4444"
          strokeWidth={2}
          fill="none"
        />
      )}
    </>
  );
}

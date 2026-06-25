/**
 * 시스템값 모드 그룹 라벨 배치 (표시 전용).
 * "1쿠션", "출발값" 등은 축 캡션이 아니라 해당 mark 숫자 그룹의 라벨.
 *
 * OPEN-04 확정 엔진: A Space → B Space → Internal Max Gap (순차 판단)
 */

export type AxisSide = "top" | "bottom" | "left" | "right";

const MARK_CAPTION_KO: Record<string, string> = {
  CO: "출발값",
  C1: "1쿠션",
  C3: "3쿠션",
  C4: "4쿠션",
  C5: "5쿠션",
  C6: "6쿠션",
};

const FG_TOP = 42.25;
const FG_BOTTOM = -2.25;
const FG_LEFT = -2.25;
const FG_RIGHT = 82.25;

export const CAPTION_FONT_SIZE = 10;
const CAPTION_MIN_ALONG_SEP = 28;
const GRID_GAP_MULTIPLIER = 2;

/** 마크별 캡션 추정 픽셀 폭 */
const CAPTION_ESTIMATED_WIDTH_PX: Record<string, number> = {
  CO: 34,
  C1: 24,
  C3: 24,
  C4: 24,
  C5: 24,
  C6: 24,
};
const CAPTION_DEFAULT_WIDTH_PX = 24;

/** 숫자 라벨 반폭 추정치(px) */
const HALF_NUMBER_WIDTH_PX = 6;

export type CaptionLayoutScale = {
  labelScale: number;
  fontSize: number;
  minAlongSep: number;
  halfNumberWidth: number;
  captionWidthForMark: (mark: string) => number;
};

/** Placement constants scaled with system value labelScale. */
export function buildCaptionLayoutScale(labelScale = 1): CaptionLayoutScale {
  const scale = Number.isFinite(labelScale) && labelScale > 0 ? labelScale : 1;
  return {
    labelScale: scale,
    fontSize: CAPTION_FONT_SIZE * scale,
    minAlongSep: CAPTION_MIN_ALONG_SEP * scale,
    halfNumberWidth: HALF_NUMBER_WIDTH_PX * scale,
    captionWidthForMark: (mark: string) =>
      (CAPTION_ESTIMATED_WIDTH_PX[mark] ?? CAPTION_DEFAULT_WIDTH_PX) * scale,
  };
}

export type GroupAnchorPoint = {
  pxX: number;
  pxY: number;
  fgX: number;
  fgY: number;
  value: number;
};

export type TablePixelBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type CaptionPlacement = {
  mark: string;
  side: AxisSide;
  x: number;
  y: number;
  text: string;
  rotationDeg: number;
  fontSize: number;
  fill: string;
};

export function markToUserCaption(mark: string): string | null {
  return MARK_CAPTION_KO[mark] ?? null;
}

/** SystemValueLabels raw 숫자와 동일 색상 */
export function getMarkLabelColor(mark: string): string {
  if (mark === "C4") return "#00E5FF";
  if (mark === "C5") return "#FF4D6D";
  if (mark === "C6") return "#A8FF60";
  return "#FFD700";
}

/** anchors.json FG 좌표 기준 가장 가까운 레일/프레임 축 */
export function detectAxisSideFromFg(x: number, y: number): AxisSide {
  const distTop = Math.abs(y - FG_TOP);
  const distBottom = Math.abs(y - FG_BOTTOM);
  const distLeft = Math.abs(x - FG_LEFT);
  const distRight = Math.abs(x - FG_RIGHT);
  const min = Math.min(distTop, distBottom, distLeft, distRight);
  if (min === distTop) return "top";
  if (min === distBottom) return "bottom";
  if (min === distLeft) return "left";
  return "right";
}

function isHorizontalSide(side: AxisSide): boolean {
  return side === "top" || side === "bottom";
}

function alongCoord(side: AxisSide, p: GroupAnchorPoint): number {
  return isHorizontalSide(side) ? p.pxX : p.pxY;
}

function meanPerpCoord(side: AxisSide, points: GroupAnchorPoint[]): number {
  if (points.length === 0) return 0;
  const sum = points.reduce(
    (acc, p) => acc + (isHorizontalSide(side) ? p.pxY : p.pxX),
    0
  );
  return sum / points.length;
}

function toPixelPosition(
  side: AxisSide,
  along: number,
  perp: number
): { x: number; y: number } {
  if (isHorizontalSide(side)) {
    return { x: along, y: perp };
  }
  return { x: perp, y: along };
}

/**
 * 화면 공간 순서(좌→우 / 상→하)로 정렬.
 */
export function sortPointsForGroupLabel(
  side: AxisSide,
  points: GroupAnchorPoint[]
): GroupAnchorPoint[] {
  const sorted = [...points];
  if (isHorizontalSide(side)) {
    sorted.sort((a, b) => a.pxX - b.pxX);
  } else {
    sorted.sort((a, b) => a.pxY - b.pxY);
  }
  return sorted;
}

function denseGridStep(sorted: GroupAnchorPoint[], side: AxisSide): number {
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(Math.abs(alongCoord(side, sorted[i]) - alongCoord(side, sorted[i - 1])));
  }
  if (gaps.length === 0) return 20;
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)] || gaps[0];
  const dense = gaps.filter((g) => g <= median * 2.5);
  return dense[0] || gaps[0] || 20;
}

/**
 * OPEN-04 확정 배치 엔진.
 *
 * 판단 순서:
 *   1순위 A Space  — boundsMin ~ 첫 숫자 좌측(2grid 포함) 구간이 최대 내부 Gap보다 넓을 때
 *   2순위 B Space  — A 불가, boundsMax ~ 마지막 숫자 우측(2grid 포함) 구간이 최대 내부 Gap보다 넓을 때
 *   3순위 Internal — 최대 내부 Gap 정중앙
 *
 * A/B 배치: 숫자 끝에서 2grid 이격, 캡션 끝이 이격점에 인접 (공간 중앙 금지).
 * Gap 배치: 정중앙.
 * 최종 결과는 tableBounds 기준 ±2px 렌더링 버퍼로 clamp.
 */
function findBestAlongSequential(
  sorted: GroupAnchorPoint[],
  side: AxisSide,
  tableBounds: TablePixelBounds,
  mark: string,
  layout: CaptionLayoutScale
): number {
  const n = sorted.length;
  const isH = isHorizontalSide(side);
  const boundsMin = isH ? tableBounds.minX : tableBounds.minY;
  const boundsMax = isH ? tableBounds.maxX : tableBounds.maxY;

  const captionW = layout.captionWidthForMark(mark);
  const halfNum = layout.halfNumberWidth;
  const tableSpan = isH
    ? tableBounds.maxX - tableBounds.minX
    : tableBounds.maxY - tableBounds.minY;
  const tableUnits = isH ? 80 : 40;
  const scalePx = tableSpan / tableUnits;
  const safetyMargin = GRID_GAP_MULTIPLIER * scalePx;

  const firstAlong = alongCoord(side, sorted[0]);
  const lastAlong = alongCoord(side, sorted[n - 1]);

  const aEnd = firstAlong - halfNum - safetyMargin;
  const bStart = lastAlong + halfNum + safetyMargin;

  const aWidthCompare = firstAlong - halfNum - boundsMin;
  const bWidthCompare = boundsMax - (lastAlong + halfNum);

  let maxGapFree = 0;
  let bestGapLeft = firstAlong;
  let bestGapRight = lastAlong;
  for (let i = 0; i < n - 1; i++) {
    const rawGap = alongCoord(side, sorted[i + 1]) - alongCoord(side, sorted[i]);
    const freeGap = rawGap - 2 * halfNum;
    if (freeGap > maxGapFree) {
      maxGapFree = freeGap;
      bestGapLeft = alongCoord(side, sorted[i]);
      bestGapRight = alongCoord(side, sorted[i + 1]);
    }
  }

  let along: number;

  if (aWidthCompare >= maxGapFree) {
    along = aEnd - captionW / 2;
  } else if (bWidthCompare >= maxGapFree) {
    along = bStart + captionW / 2;
  } else {
    along = (bestGapLeft + bestGapRight) / 2;
  }

  const clampMin = boundsMin + captionW / 2 + 2;
  const clampMax = boundsMax - captionW / 2 - 2;
  return Math.max(clampMin, Math.min(clampMax, along));
}

/**
 * OPEN-04 엔진 기반 mark 그룹 라벨 along 배치.
 * 숫자 그룹과 동일 선상(perp 고정), findBestAlongSequential로 along 결정.
 */
export function computeGroupLabelPosition(
  side: AxisSide,
  points: GroupAnchorPoint[],
  tableBounds?: TablePixelBounds,
  mark?: string,
  _coLookupPoints?: GroupAnchorPoint[],
  labelScale = 1
): { x: number; y: number } | null {
  if (points.length === 0) return null;
  if (!tableBounds) return null;

  const layout = buildCaptionLayoutScale(labelScale);
  const sorted = sortPointsForGroupLabel(side, points);
  const perp = meanPerpCoord(side, sorted);

  const alongPos = findBestAlongSequential(
    sorted,
    side,
    tableBounds,
    mark ?? "",
    layout
  );

  return toPixelPosition(side, alongPos, perp);
}

function computeSingleGroupPlacement(
  mark: string,
  side: AxisSide,
  points: GroupAnchorPoint[],
  tableBounds?: TablePixelBounds,
  labelScale = 1
): CaptionPlacement | null {
  const text = markToUserCaption(mark);
  if (!text || points.length === 0) return null;

  const layout = buildCaptionLayoutScale(labelScale);
  const pos = computeGroupLabelPosition(
    side,
    points,
    tableBounds,
    mark,
    undefined,
    labelScale
  );
  if (!pos) return null;

  const rotationDeg =
    side === "left" ? -90 : side === "right" ? 90 : 0;

  return {
    mark,
    side,
    x: pos.x,
    y: pos.y,
    text,
    rotationDeg,
    fontSize: layout.fontSize,
    fill: getMarkLabelColor(mark),
  };
}

/** 같은 축(side) 라벨이 along 방향으로만 겹치면 분리 (perp 오프셋 금지). */
function resolveSameSideCollisions(
  placements: CaptionPlacement[],
  layout: CaptionLayoutScale
): void {
  if (placements.length <= 1) return;

  const horizontal = isHorizontalSide(placements[0].side);
  const along = (p: CaptionPlacement) => (horizontal ? p.x : p.y);
  const setAlong = (p: CaptionPlacement, v: number) => {
    if (horizontal) p.x = v;
    else p.y = v;
  };

  placements.sort((a, b) => along(a) - along(b));

  for (let i = 1; i < placements.length; i++) {
    const prev = placements[i - 1];
    const curr = placements[i];
    const gap = along(curr) - along(prev);
    if (gap < layout.minAlongSep) {
      setAlong(curr, along(prev) + layout.minAlongSep);
    }
  }
}


export type CaptionBucketInput = {
  mark: string;
  side: AxisSide;
  points: GroupAnchorPoint[];
};

/**
 * (axis + mark) 버킷별 그룹 라벨 1회 배치 + 같은 축 내 along 충돌 분리.
 */
export function computeGroupCaptionPlacements(
  buckets: CaptionBucketInput[],
  tableBounds?: TablePixelBounds,
  labelScale = 1
): CaptionPlacement[] {
  const layout = buildCaptionLayoutScale(labelScale);
  const bySide = new Map<AxisSide, CaptionPlacement[]>();

  for (const bucket of buckets) {
    const placement = computeSingleGroupPlacement(
      bucket.mark,
      bucket.side,
      bucket.points,
      tableBounds,
      labelScale
    );
    if (!placement) continue;
    if (!bySide.has(bucket.side)) bySide.set(bucket.side, []);
    bySide.get(bucket.side)!.push(placement);
  }

  const result: CaptionPlacement[] = [];
  for (const sidePlacements of bySide.values()) {
    resolveSameSideCollisions(sidePlacements, layout);
    result.push(...sidePlacements);
  }
  return result;
}

/** @deprecated — computeGroupCaptionPlacements 사용 */
export function computeCaptionPlacement(
  mark: string,
  numberPxX: number,
  numberPxY: number,
  fgX: number,
  fgY: number,
  labelScale = 1
): {
  x: number;
  y: number;
  text: string;
  horizontal: boolean;
  rotationDeg: number;
  fontSize: number;
} | null {
  const text = markToUserCaption(mark);
  if (!text) return null;

  const layout = buildCaptionLayoutScale(labelScale);
  const side = detectAxisSideFromFg(fgX, fgY);
  const rotationDeg =
    side === "left" ? -90 : side === "right" ? 90 : 0;

  return {
    x: numberPxX,
    y: numberPxY,
    text,
    horizontal: rotationDeg === 0,
    rotationDeg,
    fontSize: layout.fontSize,
  };
}

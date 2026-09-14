/**
 * Cushion value panel — presentation grouping from labelAnchorsForRender.
 * Reuses detectAxisSideFromFg; no SYS/Fg/Rg/trajectory calculation.
 */
import {
  detectAxisSideFromFg,
  getMarkLabelColor,
  type AxisSide,
} from "../../domain/systemAxisCaption";

export type Rail = AxisSide;
export type ToggleKey = `${Rail}:${string}`;

export type LabelPoint = {
  rail: Rail;
  family: string;
  value: number;
  fgX: number;
  fgY: number;
};

export type ToggleGroup = {
  key: ToggleKey;
  rail: Rail;
  family: string;
  points: LabelPoint[];
  /** Median along-axis for chip ordering on that rail */
  orderKey: number;
  color: string;
};

export type CushionToggleCatalog = {
  byKey: Record<ToggleKey, ToggleGroup>;
  /** Chips per rail, spatially ordered */
  byRail: Record<Rail, ToggleGroup[]>;
  keys: ToggleKey[];
};

const CORNER_EPS = 0.01;
const FG_LEFT = -2.25;
const FG_RIGHT = 82.25;
const FG_TOP = 42.25;
const FG_BOTTOM = -2.25;

type RawEntry = { coord?: { x?: number; y?: number }; value?: number };

function isHorizontal(rail: Rail): boolean {
  return rail === "top" || rail === "bottom";
}

function alongFg(rail: Rail, fgX: number, fgY: number): number {
  return isHorizontal(rail) ? fgX : fgY;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function makeToggleKey(rail: Rail, family: string): ToggleKey {
  return `${rail}:${family}`;
}

function isCornerCoord(fgX: number, fgY: number): boolean {
  const atLeft = Math.abs(fgX - FG_LEFT) < CORNER_EPS;
  const atRight = Math.abs(fgX - FG_RIGHT) < CORNER_EPS;
  const atTop = Math.abs(fgY - FG_TOP) < CORNER_EPS;
  const atBottom = Math.abs(fgY - FG_BOTTOM) < CORNER_EPS;
  return (atLeft || atRight) && (atTop || atBottom);
}

function cornerSideRail(fgX: number): Rail {
  return Math.abs(fgX - FG_LEFT) < CORNER_EPS ? "left" : "right";
}

/**
 * Same CO corner dual-bucket policy as SystemValueLabels captions:
 * primary rail via detectAxisSideFromFg + adjacent left/right for corners.
 */
export function railsForLabelPoint(
  family: string,
  fgX: number,
  fgY: number
): Rail[] {
  const primary = detectAxisSideFromFg(fgX, fgY);
  if (family === "CO" && isCornerCoord(fgX, fgY)) {
    const side = cornerSideRail(fgX);
    if (side !== primary) return [primary, side];
  }
  return [primary];
}

function pushPoint(
  map: Map<ToggleKey, LabelPoint[]>,
  rail: Rail,
  family: string,
  value: number,
  fgX: number,
  fgY: number
) {
  const key = makeToggleKey(rail, family);
  if (!map.has(key)) map.set(key, []);
  map.get(key)!.push({ rail, family, value, fgX, fgY });
}

function sortPointsForRail(rail: Rail, points: LabelPoint[]): LabelPoint[] {
  const copy = [...points];
  if (isHorizontal(rail)) {
    copy.sort((a, b) => a.fgX - b.fgX);
  } else {
    // Screen top → bottom: higher FG y first
    copy.sort((a, b) => b.fgY - a.fgY);
  }
  return copy;
}

function sortGroupsOnRail(rail: Rail, groups: ToggleGroup[]): ToggleGroup[] {
  const copy = [...groups];
  if (isHorizontal(rail)) {
    copy.sort((a, b) => a.orderKey - b.orderKey);
  } else {
    // orderKey is median fgY; higher y = visually higher → first
    copy.sort((a, b) => b.orderKey - a.orderKey);
  }
  return copy;
}

/**
 * Build toggle catalog from labelAnchorsForRender (SSOT).
 * Does not invent families — only groups what exists.
 */
export function buildCushionToggleCatalog(
  labelAnchorsForRender: Record<string, RawEntry | RawEntry[]> | null | undefined
): CushionToggleCatalog {
  const bucket = new Map<ToggleKey, LabelPoint[]>();

  if (!labelAnchorsForRender) {
    return { byKey: {}, byRail: emptyByRail(), keys: [] };
  }

  for (const [family, item] of Object.entries(labelAnchorsForRender)) {
    const list = Array.isArray(item) ? item : [item];
    for (const entry of list) {
      const fgX = Number(entry?.coord?.x);
      const fgY = Number(entry?.coord?.y);
      const value = Number(entry?.value);
      if (!Number.isFinite(fgX) || !Number.isFinite(fgY) || !Number.isFinite(value)) {
        continue;
      }
      for (const rail of railsForLabelPoint(family, fgX, fgY)) {
        pushPoint(bucket, rail, family, value, fgX, fgY);
      }
    }
  }

  const byKey: Record<ToggleKey, ToggleGroup> = {};
  const byRail = emptyByRail();

  for (const [key, rawPoints] of bucket.entries()) {
    const [rail, family] = key.split(":") as [Rail, string];
    const points = sortPointsForRail(rail, rawPoints);
    const along = points.map((p) => alongFg(rail, p.fgX, p.fgY));
    const group: ToggleGroup = {
      key,
      rail,
      family,
      points,
      orderKey: median(along),
      color: getMarkLabelColor(family),
    };
    byKey[key] = group;
    byRail[rail].push(group);
  }

  for (const rail of Object.keys(byRail) as Rail[]) {
    byRail[rail] = sortGroupsOnRail(rail, byRail[rail]);
  }

  return {
    byKey,
    byRail,
    keys: Object.keys(byKey) as ToggleKey[],
  };
}

function emptyByRail(): Record<Rail, ToggleGroup[]> {
  return { top: [], bottom: [], left: [], right: [] };
}

/** Drop keys missing from catalog; keep overlapping keys. */
export function pruneSelectedToggleKeys(
  selected: Iterable<ToggleKey>,
  catalog: CushionToggleCatalog
): ToggleKey[] {
  const next: ToggleKey[] = [];
  for (const key of selected) {
    if (catalog.byKey[key]) next.push(key);
  }
  return next;
}

export function toggleKeyInSet(
  selected: Set<ToggleKey> | ToggleKey[],
  key: ToggleKey
): ToggleKey[] {
  const set = selected instanceof Set ? new Set(selected) : new Set(selected);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  return [...set];
}

export const CUSHION_PANEL_HINT_INITIAL = "확대하려는 값을 터치하세요.";
export const CUSHION_PANEL_HINT_AFTER =
  "보고 싶은 값을 각각 켜고 끌 수 있습니다.";

export function resolveCushionPanelHint(hasEverSelected: boolean): string {
  return hasEverSelected
    ? CUSHION_PANEL_HINT_AFTER
    : CUSHION_PANEL_HINT_INITIAL;
}

/** USER mobile + cushion-point (axis labels) active */
export function shouldEnableCushionValuePanel(
  appMode: string | undefined,
  matchesUserMobileTable: boolean,
  cushionPointActive: boolean
): boolean {
  return (
    appMode === "USER" && matchesUserMobileTable && cushionPointActive === true
  );
}

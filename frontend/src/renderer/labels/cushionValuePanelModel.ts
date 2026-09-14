/**
 * Cushion value panel — family availability + focus scale (presentation-only).
 * Reuses labelAnchorsForRender SSOT; no SYS/Fg/Rg/trajectory calculation.
 */
import { detectAxisSideFromFg, type AxisSide } from "../../domain/systemAxisCaption";
import {
  SYS_LABEL_BASE_FONT_SIZE,
  SYS_LABEL_PHONE_LANDSCAPE_SCALE,
} from "../../config/tableConfig";

export const FIXED_CUSHION_FAMILIES = [
  "CO",
  "C1",
  "C3",
  "C4",
  "C5",
  "C6",
] as const;

export type FixedCushionFamily = (typeof FIXED_CUSHION_FAMILIES)[number];

export type FamilyAvailability = {
  family: FixedCushionFamily;
  enabled: boolean;
};

type RawEntry = { coord?: { x?: number; y?: number }; value?: number };
type LabelAnchors = Record<string, RawEntry | RawEntry[]> | null | undefined;

export const CUSHION_PANEL_HINT_INITIAL = "보시려는 값의 버튼을 누르세요.";
export const CUSHION_PANEL_HINT_AFTER =
  "보고 싶은 값을 각각 켜고 끌 수 있습니다.";

/** Unified focus text fill (not family-colored). */
export const CUSHION_FOCUS_VALUE_COLOR = "#F8FAFC";

export const FOCUS_FONT_FLOOR = SYS_LABEL_BASE_FONT_SIZE * SYS_LABEL_PHONE_LANDSCAPE_SCALE; // 15
export const FOCUS_FONT_PREFERRED = 30;
export const FOCUS_FONT_CEILING = 34;

export function resolveCushionPanelHint(hasEverSelected: boolean): string {
  return hasEverSelected
    ? CUSHION_PANEL_HINT_AFTER
    : CUSHION_PANEL_HINT_INITIAL;
}

export function listAvailableFamilies(labelAnchors: LabelAnchors): Set<string> {
  const set = new Set<string>();
  if (!labelAnchors) return set;
  for (const [family, item] of Object.entries(labelAnchors)) {
    const list = Array.isArray(item) ? item : [item];
    const hasValid = list.some((entry) => {
      const x = Number(entry?.coord?.x);
      const y = Number(entry?.coord?.y);
      const v = Number(entry?.value);
      return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(v);
    });
    if (hasValid) set.add(family);
  }
  return set;
}

export function buildFixedFamilyAvailability(
  labelAnchors: LabelAnchors
): FamilyAvailability[] {
  const available = listAvailableFamilies(labelAnchors);
  return FIXED_CUSHION_FAMILIES.map((family) => ({
    family,
    enabled: available.has(family),
  }));
}

export function pruneSelectedFamilies(
  selected: Iterable<string>,
  labelAnchors: LabelAnchors
): string[] {
  const available = listAvailableFamilies(labelAnchors);
  const next: string[] = [];
  for (const family of selected) {
    if (available.has(family)) next.push(family);
  }
  return next;
}

export function toggleFamilyInSet(
  selected: Iterable<string>,
  family: string,
  enabled: boolean
): string[] {
  if (!enabled) {
    return [...(selected instanceof Set ? selected : selected)];
  }
  const set = new Set(selected);
  if (set.has(family)) set.delete(family);
  else set.add(family);
  return [...set];
}

export function shouldEnableCushionValuePanel(
  appMode: string | undefined,
  matchesUserMobileTable: boolean,
  cushionPointActive: boolean
): boolean {
  return (
    appMode === "USER" && matchesUserMobileTable && cushionPointActive === true
  );
}

type Point = { fgX: number; fgY: number };

function collectFamilyPoints(
  labelAnchors: LabelAnchors,
  family: string
): Point[] {
  if (!labelAnchors?.[family]) return [];
  const item = labelAnchors[family];
  const list = Array.isArray(item) ? item : [item];
  const points: Point[] = [];
  for (const entry of list) {
    const fgX = Number(entry?.coord?.x);
    const fgY = Number(entry?.coord?.y);
    if (!Number.isFinite(fgX) || !Number.isFinite(fgY)) continue;
    points.push({ fgX, fgY });
  }
  return points;
}

function isHorizontal(side: AxisSide): boolean {
  return side === "top" || side === "bottom";
}

/**
 * Min adjacent spacing (viewBox px) along each rail for selected families.
 * Uses same FG→toPx convention as SystemValueLabels (FG treated as RG for toPx).
 */
export function minNeighborSpacingPx(
  labelAnchors: LabelAnchors,
  families: string[],
  scale: number
): number | null {
  if (!families.length || !(scale > 0)) return null;
  let min = Infinity;
  for (const family of families) {
    const points = collectFamilyPoints(labelAnchors, family);
    const byRail = new Map<AxisSide, Point[]>();
    for (const p of points) {
      const rail = detectAxisSideFromFg(p.fgX, p.fgY);
      if (!byRail.has(rail)) byRail.set(rail, []);
      byRail.get(rail)!.push(p);
    }
    for (const [rail, group] of byRail) {
      if (group.length < 2) continue;
      const along = group
        .map((p) => (isHorizontal(rail) ? p.fgX : p.fgY))
        .sort((a, b) => a - b);
      for (let i = 1; i < along.length; i++) {
        const d = Math.abs(along[i] - along[i - 1]) * scale;
        if (d > 0 && d < min) min = d;
      }
    }
  }
  return Number.isFinite(min) ? min : null;
}

/**
 * Responsive focus font (viewBox px).
 * Preferred ≈ 2× current mobile normal (15 → 30), clamped by spacing/viewport.
 */
export function resolveFocusedSystemLabelSize(args: {
  labelAnchors: LabelAnchors;
  selectedFamilies: string[];
  scale: number;
  /** SVG client height (CSS px); optional viewport clamp */
  clientHeight?: number;
}): number {
  const preferred = FOCUS_FONT_PREFERRED;
  const floor = FOCUS_FONT_FLOOR;
  const ceiling = FOCUS_FONT_CEILING;

  const spacing = minNeighborSpacingPx(
    args.labelAnchors,
    args.selectedFamilies,
    args.scale
  );
  // Allow glyph ≈ 70% of neighbor gap before collision
  const spacingSafe =
    spacing != null && spacing > 0 ? Math.max(floor, spacing * 0.7) : preferred;

  let viewportSafe = preferred;
  if (Number.isFinite(args.clientHeight) && (args.clientHeight as number) > 0) {
    // Keep focus glyphs from dominating short landscape height
    viewportSafe = Math.max(floor, (args.clientHeight as number) * 0.09);
  }

  const raw = Math.min(preferred, spacingSafe, viewportSafe, ceiling);
  return Math.max(floor, Math.min(ceiling, raw));
}

/** Normal (non-focus) system label font for given labelScale. */
export function resolveNormalSystemLabelSize(labelScale = 1): number {
  const s = Number.isFinite(labelScale) && labelScale > 0 ? labelScale : 1;
  return SYS_LABEL_BASE_FONT_SIZE * s;
}

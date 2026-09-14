/**
 * Cushion value panel — family availability + focus scale (presentation-only).
 * Reuses labelAnchorsForRender SSOT; no SYS/Fg/Rg/trajectory calculation.
 */
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

export type FocusedSystemLabelTypography = {
  fontSize: number;
  color: string;
  readabilityScale: number;
};

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

/**
 * USER cushion-point Focus panel — PC and Mobile.
 * Mobile match is intentionally NOT required (responsive presentation stays separate).
 */
export function shouldEnableCushionValuePanel(
  appMode: string | undefined,
  cushionPointActive: boolean
): boolean {
  return appMode === "USER" && cushionPointActive === true;
}

/**
 * Responsive focus font (viewBox px).
 * Preferred ≈ 2× mobile normal (15 → 30).
 * Viewport clamp only — selected family count / cross-family overlap must NOT shrink size.
 */
export function resolveFocusedSystemLabelSize(args: {
  /** kept for call-site compatibility; unused for size (no spacing shrink) */
  labelAnchors?: LabelAnchors;
  selectedFamilies?: string[];
  scale?: number;
  /** SVG/table client height (CSS px); optional viewport clamp */
  clientHeight?: number;
}): number {
  const preferred = FOCUS_FONT_PREFERRED;
  const floor = FOCUS_FONT_FLOOR;
  const ceiling = FOCUS_FONT_CEILING;

  let viewportSafe = preferred;
  if (Number.isFinite(args.clientHeight) && (args.clientHeight as number) > 0) {
    viewportSafe = Math.max(floor, (args.clientHeight as number) * 0.09);
  }

  const raw = Math.min(preferred, viewportSafe, ceiling);
  return Math.max(floor, Math.min(ceiling, raw));
}

/** Shared Focus typography for family captions + value digits. */
export function getFocusedSystemLabelTypography(
  fontSize: number,
  labelScale = 1
): FocusedSystemLabelTypography {
  const size =
    Number.isFinite(fontSize) && fontSize > 0 ? fontSize : FOCUS_FONT_PREFERRED;
  return {
    fontSize: size,
    color: CUSHION_FOCUS_VALUE_COLOR,
    readabilityScale: Math.max(
      Number.isFinite(labelScale) && labelScale > 0 ? labelScale : 1,
      2
    ),
  };
}

/** Normal (non-focus) system label font for given labelScale. */
export function resolveNormalSystemLabelSize(labelScale = 1): number {
  const s = Number.isFinite(labelScale) && labelScale > 0 ? labelScale : 1;
  return SYS_LABEL_BASE_FONT_SIZE * s;
}

/* ─── Focus display SSOT: calculation meaning (_f/_r) → presentation layer ─── */

export type FocusDisplayLayer = "FRAME" | "RAIL";
export type FocusAxisSide = "top" | "bottom" | "left" | "right";

/** Diamond / FG edge (POINT_OFFSET_RG ≈ 2.25). */
export const FOCUS_FRAME_EDGE = {
  left: -2.25,
  right: 82.25,
  bottom: -2.25,
  top: 42.25,
} as const;

/** Cloth / rail boundary (RG 0 / 40 / 80). */
export const FOCUS_RAIL_EDGE = {
  left: 0,
  right: 80,
  bottom: 0,
  top: 40,
} as const;

const FOCUS_FRAME_FAMILIES = new Set<string>([
  "CO",
  "C1",
  "C4",
  "C5",
  "C6",
]);

/**
 * Family → Focus display layer (single SSOT).
 * CO/C1/C4/C5/C6 (_f) → FRAME; C3 (_r) → RAIL.
 */
export function getFocusDisplayLayer(family: string): FocusDisplayLayer {
  if (family === "C3") return "RAIL";
  if (FOCUS_FRAME_FAMILIES.has(family)) return "FRAME";
  // Unknown family: FRAME is safer default for diamond-aligned system values
  return "FRAME";
}

/** Nearest axis side from FG diamond edges (same rule as detectAxisSideFromFg). */
export function detectFocusAxisSide(
  x: number,
  y: number
): FocusAxisSide {
  const distTop = Math.abs(y - FOCUS_FRAME_EDGE.top);
  const distBottom = Math.abs(y - FOCUS_FRAME_EDGE.bottom);
  const distLeft = Math.abs(x - FOCUS_FRAME_EDGE.left);
  const distRight = Math.abs(x - FOCUS_FRAME_EDGE.right);
  const min = Math.min(distTop, distBottom, distLeft, distRight);
  if (min === distTop) return "top";
  if (min === distBottom) return "bottom";
  if (min === distLeft) return "left";
  return "right";
}

export type FocusLabelPosition = {
  x: number;
  y: number;
  side: FocusAxisSide;
  layer: FocusDisplayLayer;
};

/**
 * Preserve along-axis anchor; snap normal to FRAME or RAIL edge for Focus display.
 * Does not invent new system coordinates or apply collision nudges.
 */
export function resolveFocusLabelPosition(
  anchor: { x: number; y: number },
  family: string
): FocusLabelPosition {
  const x0 = Number(anchor?.x);
  const y0 = Number(anchor?.y);
  const x = Number.isFinite(x0) ? x0 : 0;
  const y = Number.isFinite(y0) ? y0 : 0;
  const layer = getFocusDisplayLayer(family);
  const side = detectFocusAxisSide(x, y);
  const edge = layer === "RAIL" ? FOCUS_RAIL_EDGE : FOCUS_FRAME_EDGE;

  if (side === "top" || side === "bottom") {
    return { x, y: edge[side], side, layer };
  }
  return { x: edge[side], y, side, layer };
}

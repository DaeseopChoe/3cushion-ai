/**
 * Overlay Layout SSOT v1.1 — Ratio / Surface / Position tokens.
 * Layout Layer only. Content must not redefine absolute overlay width.
 */

export type OverlaySizeVariant = "small" | "medium" | "large";
/** `glassDark` — AI trial Surface (공통 확장 전 AI 전용). */
export type OverlaySurface =
  | "normal"
  | "strong"
  | "transparent"
  | "dark"
  | "glassDark";
export type UserOverlayKind =
  | "AI"
  | "HPT"
  | "CALC"
  | "SYS"
  | "SYSTEM_LESSON";

export type OverlaySizeToken = {
  widthRatio: number;
  maxHeightRatio: number;
  /** When true, width is fit-content capped by maxWidth (= tableW × widthRatio). */
  fitContent: boolean;
};

export const OVERLAY_SIZE_VARIANTS: Record<OverlaySizeVariant, OverlaySizeToken> = {
  small: { widthRatio: 0.55, maxHeightRatio: 0.82, fitContent: true },
  medium: { widthRatio: 0.72, maxHeightRatio: 0.88, fitContent: false },
  large: { widthRatio: 0.84, maxHeightRatio: 0.9, fitContent: false },
};

/**
 * AI Overlay silhouette ≈ width:height 6:4 on a 2:1 table.
 * width = tableW × 0.42 ⇒ ≈ 0.84 × tableH; height≈auto targets ~0.56 × tableH at 6:4.
 */
export const AI_OVERLAY_WIDTH_RATIO = 0.42;
export const AI_OVERLAY_MAX_HEIGHT_RATIO = 0.85;
/** OFF silhouette + Reading ON originalAspect (width / height). */
export const AI_OVERLAY_ASPECT_RATIO = 6 / 4;

/** HPT shares AI Shell silhouette; Reading ON uses this originalAspect. */
export const HPT_OVERLAY_ASPECT_RATIO = AI_OVERLAY_ASPECT_RATIO;

/**
 * Calculation Overlay — wider than AI so dense DisplayModel lines reflow less.
 * ~48% wider than AI (0.42 → 0.62); table-area ratio only (no vw/px).
 */
export const CALC_OVERLAY_WIDTH_RATIO = 0.62;
export const CALC_OVERLAY_MAX_HEIGHT_RATIO = AI_OVERLAY_MAX_HEIGHT_RATIO;

export const OVERLAY_CLAMP_INSET_RATIO = 0.02;

/**
 * Reading Mode (DISPLAY_BOUNDARY_POLICY_SSOT §15) — Presentation UX only.
 * Max height = table inner height; typography × ReadingFontScale.
 * Width: AI/HPT use originalAspect; CALC keeps OFF max-box aspect (widthRatio/maxHeightRatio).
 */
export const READING_FONT_SCALE = 1.45;
export const READING_MODE_MAX_HEIGHT_RATIO = 1;

export const OVERLAY_TYPOGRAPHY = {
  fontBaseRatio: 0.028,
  titleRatio: 1.25,
  sectionRatio: 1.1,
  bodyRatio: 1.0,
  noteRatio: 0.8,
  metricRatio: 1.2,
  lineHeight: 1.4,
  outerPadVRatio: 0.9,
  outerPadHRatio: 1.05,
  gapRatio: 0.65,
  radiusRefPx: 12,
  radiusScaleMin: 0.85,
  radiusScaleMax: 1.1,
  /** Legacy content px bases used only to derive --ai-scale / --overlay-scale. */
  legacyAiFontPx: 32,
  legacyOverlayFontPx: 20,
} as const;

/**
 * AI body readability: prior AI scale (1.12) × ~1.3.
 * Applied via contentTypeScale → Overlay Typography Token (no absolute px).
 */
export const OVERLAY_CONTENT_TYPE_SCALE: Record<UserOverlayKind, number> = {
  AI: 1.456,
  HPT: 1.0,
  CALC: 1.0,
  SYS: 1.0,
  SYSTEM_LESSON: 1.0,
};

export type UserOverlayLayoutChoice = {
  sizeVariant: OverlaySizeVariant;
  surface: OverlaySurface;
  contentTypeScale: number;
  contentClassName: string;
  fitContent: boolean;
  /** Optional Ratio overrides (SSOT-derived; never absolute px). */
  widthRatio?: number;
  maxHeightRatio?: number;
  /**
   * Reading ON only — width/height originalAspect.
   * AI/HPT: design silhouette. CALC: omit → legacy max-box aspect.
   */
  readingOriginalAspect?: number;
};

/**
 * Map Content class / kind → Reading originalAspect.
 * Undefined ⇒ Reading width uses OFF max-box (widthRatio/maxHeightRatio) — CALC path.
 */
export function resolveReadingOriginalAspect(
  kindOrClassName?: string | null
): number | undefined {
  if (!kindOrClassName) return undefined;
  if (kindOrClassName === "AI" || kindOrClassName.includes("user-ai")) {
    return AI_OVERLAY_ASPECT_RATIO;
  }
  if (kindOrClassName === "HPT" || kindOrClassName.includes("user-hpt")) {
    return HPT_OVERLAY_ASPECT_RATIO;
  }
  return undefined;
}

/** Overlay selects Variant + Surface only (SSOT mapping). */
export function resolveUserOverlayLayout(
  kind: UserOverlayKind | string | null | undefined
): UserOverlayLayoutChoice {
  switch (kind) {
    case "HPT":
      return {
        sizeVariant: "medium",
        surface: "glassDark",
        contentTypeScale: OVERLAY_CONTENT_TYPE_SCALE.AI,
        contentClassName: "modal-panel--user-hpt",
        fitContent: OVERLAY_SIZE_VARIANTS.medium.fitContent,
        widthRatio: AI_OVERLAY_WIDTH_RATIO,
        maxHeightRatio: AI_OVERLAY_MAX_HEIGHT_RATIO,
        readingOriginalAspect: HPT_OVERLAY_ASPECT_RATIO,
      };
    case "AI":
      return {
        sizeVariant: "medium",
        surface: "glassDark",
        contentTypeScale: OVERLAY_CONTENT_TYPE_SCALE.AI,
        contentClassName: "modal-panel--user-ai",
        fitContent: OVERLAY_SIZE_VARIANTS.medium.fitContent,
        widthRatio: AI_OVERLAY_WIDTH_RATIO,
        maxHeightRatio: AI_OVERLAY_MAX_HEIGHT_RATIO,
        readingOriginalAspect: AI_OVERLAY_ASPECT_RATIO,
      };
    case "CALC":
      return {
        sizeVariant: "medium",
        surface: "glassDark",
        contentTypeScale: OVERLAY_CONTENT_TYPE_SCALE.AI,
        contentClassName: "modal-panel--user-calc",
        fitContent: OVERLAY_SIZE_VARIANTS.medium.fitContent,
        widthRatio: CALC_OVERLAY_WIDTH_RATIO,
        maxHeightRatio: CALC_OVERLAY_MAX_HEIGHT_RATIO,
        // readingOriginalAspect omitted — Reading keeps max-box aspect
      };
    case "SYS":
    case "SYSTEM_LESSON":
      return {
        sizeVariant: "large",
        surface: "strong",
        contentTypeScale: OVERLAY_CONTENT_TYPE_SCALE.SYS,
        contentClassName: "modal-panel--user-system-lesson",
        fitContent: OVERLAY_SIZE_VARIANTS.large.fitContent,
      };
    default:
      return {
        sizeVariant: "medium",
        surface: "normal",
        contentTypeScale: 1,
        contentClassName: "modal-panel--compact",
        fitContent: false,
      };
  }
}

export function computeOverlayLayoutMetrics(
  tableWidth: number,
  tableHeight: number,
  sizeVariant: OverlaySizeVariant,
  contentTypeScale = 1,
  ratioOverrides?: {
    widthRatio?: number;
    maxHeightRatio?: number;
    /** When true: maxH = tableH, typography × ReadingFontScale. */
    readingMode?: boolean;
    /**
     * Reading ON width aspect (width/height).
     * Set for AI/HPT. Omit for CALC → widthRatio/maxHeightRatio max-box aspect.
     */
    readingOriginalAspect?: number;
  }
) {
  const size = OVERLAY_SIZE_VARIANTS[sizeVariant];
  const widthRatio = ratioOverrides?.widthRatio ?? size.widthRatio;
  const maxHeightRatio = ratioOverrides?.maxHeightRatio ?? size.maxHeightRatio;
  const readingMode = ratioOverrides?.readingMode === true;
  const readingOriginalAspect = ratioOverrides?.readingOriginalAspect;
  const tw = Math.max(0, tableWidth);
  const th = Math.max(0, tableHeight);
  const shortSide = Math.min(tw, th) || 1;
  const insetPx = shortSide * OVERLAY_CLAMP_INSET_RATIO;

  const offWidthPx = tw * widthRatio;
  const offMaxHeightPx = th * maxHeightRatio;
  let widthPx = offWidthPx;
  let maxHeightPx = offMaxHeightPx;

  if (readingMode && th > 0) {
    maxHeightPx = th * READING_MODE_MAX_HEIGHT_RATIO;
    const maxWidthPx = Math.max(0, tw - insetPx * 2);
    const aspect =
      typeof readingOriginalAspect === "number" &&
      Number.isFinite(readingOriginalAspect) &&
      readingOriginalAspect > 0
        ? readingOriginalAspect
        : offMaxHeightPx > 0
          ? offWidthPx / offMaxHeightPx
          : 1;
    widthPx = Math.min(maxWidthPx, maxHeightPx * aspect);
  }

  const typeScale = readingMode
    ? contentTypeScale * READING_FONT_SCALE
    : contentTypeScale;
  const fontBase = th * OVERLAY_TYPOGRAPHY.fontBaseRatio;
  const effectiveFont = fontBase * typeScale;
  const scale =
    fontBase > 0 ? effectiveFont / OVERLAY_TYPOGRAPHY.legacyOverlayFontPx : 1;
  const radiusScale = Math.min(
    OVERLAY_TYPOGRAPHY.radiusScaleMax,
    Math.max(OVERLAY_TYPOGRAPHY.radiusScaleMin, scale)
  );

  return {
    widthPx,
    maxHeightPx,
    insetPx,
    readingMode,
    fontBasePx: effectiveFont,
    titlePx: effectiveFont * OVERLAY_TYPOGRAPHY.titleRatio,
    sectionPx: effectiveFont * OVERLAY_TYPOGRAPHY.sectionRatio,
    bodyPx: effectiveFont * OVERLAY_TYPOGRAPHY.bodyRatio,
    notePx: effectiveFont * OVERLAY_TYPOGRAPHY.noteRatio,
    metricPx: effectiveFont * OVERLAY_TYPOGRAPHY.metricRatio,
    padVPx: effectiveFont * OVERLAY_TYPOGRAPHY.outerPadVRatio,
    padHPx: effectiveFont * OVERLAY_TYPOGRAPHY.outerPadHRatio,
    gapPx: effectiveFont * OVERLAY_TYPOGRAPHY.gapRatio,
    radiusPx: OVERLAY_TYPOGRAPHY.radiusRefPx * radiusScale,
    lineHeight: OVERLAY_TYPOGRAPHY.lineHeight,
    contentScale: effectiveFont / OVERLAY_TYPOGRAPHY.legacyAiFontPx,
    overlayScale: effectiveFont / OVERLAY_TYPOGRAPHY.legacyOverlayFontPx,
    svgScale: Math.min(
      1.1,
      Math.max(
        0.5,
        (effectiveFont / OVERLAY_TYPOGRAPHY.legacyOverlayFontPx) * 0.95
      )
    ),
  };
}

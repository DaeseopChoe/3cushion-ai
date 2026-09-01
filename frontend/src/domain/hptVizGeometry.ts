/**
 * HP/T ball layout geometry SSOT — shared by ADMIN HptOverlay and USER HptBallReadOnlyViz.
 *
 * Semantic thickness (formatThickness / ImpactEngine parseLegacyT):
 *   + = 우측 두께, - = 좌측 두께, 8/8 = 정면
 *
 * Physical magnitude (do not invert):
 *   thicknessFraction = n/8
 *   centerDistance = (1 - n/8) * diameter   // complement, NOT thickness
 *   overlapFraction = n/8
 *
 * Billiard direction SSOT (ImpactEngine-aligned contact-face convention):
 *   The schematic is a lateral offset view. White Cue = impact/orbit position.
 *   +T (우측): White Cue center is screen-RIGHT of Red Target center.
 *              Cue contacts the Target's screen-right hemisphere.
 *   -T (좌측): White Cue center is screen-LEFT  of Red Target center.
 *              Cue contacts the Target's screen-left hemisphere.
 *   8/8: centers coincide (direction invariant).
 *
 * Magnitude is unchanged by sign; only horizontal placement mirrors.
 */

export const BALL_RADIUS = 120;
export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 300;
export const CENTER_Y = CANVAS_HEIGHT / 2;
export const CENTER_X = CANVAS_WIDTH / 2;
export const MAX_VALUE = 4;

/** Grep dist bundle for this string to verify shared ADMIN/USER geometry SSOT. */
export const HPT_VIZ_GEOMETRY_BUILD_MARKER =
  "3cushion-hpt-viz-geometry-ssot-wt-20260901";

export function parseThickness(tValue: string | null | undefined): number {
  if (!tValue) return 0;
  if (tValue === "8/8") return 8;
  const match = String(tValue).match(/^([+-]?)(\d+)\/8$/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * parseInt(match[2], 10);
}

export type HptVizGeometry = {
  thickness: number;
  isRightImpact: boolean;
  thicknessValue: number;
  thicknessFraction: number;
  centerDistance: number;
  impactX: number;
  targetX: number;
  limit60Radius: number;
  scale: number;
  markerX: number;
  markerY: number;
  markerRadius: number;
};

export function computeHptVizGeometry(
  T = "8/8",
  hitX = 0,
  hitY = 0
): HptVizGeometry {
  const thickness = parseThickness(T);
  const isRightImpact = thickness >= 0;
  const thicknessValue = T === "BANK" ? 8 : Math.abs(thickness);
  const thicknessFraction = thicknessValue / 8;
  const centerDistance = (1 - thicknessFraction) * (2 * BALL_RADIUS);

  let impactX: number;
  let targetX: number;
  if (isRightImpact) {
    // 우측 두께: White Cue (impact) screen-right
    impactX = CENTER_X + centerDistance / 2;
    targetX = CENTER_X - centerDistance / 2;
  } else {
    // 좌측 두께: White Cue (impact) screen-left
    impactX = CENTER_X - centerDistance / 2;
    targetX = CENTER_X + centerDistance / 2;
  }

  const limit60Radius = BALL_RADIUS * 0.6;
  const scale = limit60Radius / MAX_VALUE;
  const markerX = impactX + hitX * scale;
  const markerY = CENTER_Y - hitY * scale;
  const markerRadius = BALL_RADIUS / 12;

  return {
    thickness,
    isRightImpact,
    thicknessValue,
    thicknessFraction,
    centerDistance,
    impactX,
    targetX,
    limit60Radius,
    scale,
    markerX,
    markerY,
    markerRadius,
  };
}

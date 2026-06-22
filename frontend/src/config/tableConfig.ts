const RG_UNIT_MM = 35.55;
const CUSHION_MM = 45;
const FRAME_MM = 80;

export const TABLE_CONFIG = {
  SCALE: 10,
  TABLE_W_UNITS: 80,
  TABLE_H_UNITS: 40,
  TABLE_W: 80 * 10, // TABLE_W_UNITS * SCALE
  TABLE_H: 40 * 10, // TABLE_H_UNITS * SCALE
  PADDING: 30,
  CUSHION_RG: CUSHION_MM / RG_UNIT_MM,
  FRAME_RG: FRAME_MM / RG_UNIT_MM,
} as const;

/** System value rail/frame label base font size (SVG viewBox px). */
export const SYS_LABEL_BASE_FONT_SIZE = 10;

/** Phone landscape label scale — same MQ as Overlay Framework. */
export const SYS_LABEL_PHONE_LANDSCAPE_SCALE = 1.5;

export const MEDIA_PHONE_LANDSCAPE =
  "(orientation: landscape) and (max-height: 520px)";

export type TableLayout = {
  cushionW: number;
  frameW: number;
  railTop: number;
  railBottom: number;
  railLeft: number;
  railRight: number;
  frameInnerTop: number;
  frameInnerBottom: number;
  frameInnerLeft: number;
  frameInnerRight: number;
  cushionOuterTop: number;
  cushionOuterBottom: number;
  cushionOuterLeft: number;
  cushionOuterRight: number;
  frameOuterTop: number;
  frameOuterBottom: number;
  frameOuterLeft: number;
  frameOuterRight: number;
};

export function getTableLayout(scale: number, tableW: number, tableH: number, padding: number): TableLayout {
  const cushionW = TABLE_CONFIG.CUSHION_RG * scale;
  const frameW = TABLE_CONFIG.FRAME_RG * scale;
  const frameInnerTop = padding - cushionW;
  const frameInnerBottom = padding + tableH + cushionW;
  const frameInnerLeft = padding - cushionW;
  const frameInnerRight = padding + tableW + cushionW;
  return {
    cushionW,
    frameW,
    railTop: padding,
    railBottom: padding + tableH,
    railLeft: padding,
    railRight: padding + tableW,
    frameInnerTop,
    frameInnerBottom,
    frameInnerLeft,
    frameInnerRight,
    cushionOuterTop: frameInnerTop,
    cushionOuterBottom: frameInnerBottom,
    cushionOuterLeft: frameInnerLeft,
    cushionOuterRight: frameInnerRight,
    frameOuterTop: padding - cushionW - frameW,
    frameOuterBottom: padding + tableH + cushionW + frameW,
    frameOuterLeft: padding - cushionW - frameW,
    frameOuterRight: padding + tableW + cushionW + frameW,
  };
}

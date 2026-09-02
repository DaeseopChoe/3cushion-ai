export type JoystickCoordinateEditorLayoutTokens = {
  panelMinWidth: number;
  panelMaxWidthVw: number | null;
  panelPadding: number;
  panelPaddingBottom: number;
  panelBorderRadius: number;
  titleFontSize: number;
  titleMarginBottom: number;
  bodyFontSize: number;
  fieldFontSize: number;
  fieldPadding: string;
  fieldMinHeight: number;
  labelWidth: number;
  labelGap: number;
  fieldMarginBottom: number;
  yFieldMarginBottom: number;
  keypadGap: number;
  keypadMarginBottom: number;
  keypadButtonMinHeight: number;
  keypadButtonFontSize: number;
  keypadButtonPadding: string;
  keypadTouchTargetMinHeight: number;
  fineNudgeGap: number;
  fineNudgeMarginBottom: number;
  actionGap: number;
  actionButtonPadding: string;
  actionButtonMinHeight: number;
  actionTouchTargetMinHeight: number;
  touchTargetMinHeight: number;
  anchorOffsetX: number;
  anchorMaxWidth: number;
  anchorMaxHeight: number;
};

const DESKTOP_LAYOUT: JoystickCoordinateEditorLayoutTokens = {
  panelMinWidth: 336,
  panelMaxWidthVw: null,
  panelPadding: 16,
  panelPaddingBottom: 14,
  panelBorderRadius: 10,
  titleFontSize: 14,
  titleMarginBottom: 12,
  bodyFontSize: 16,
  fieldFontSize: 18,
  fieldPadding: "8px 10px",
  fieldMinHeight: 36,
  labelWidth: 18,
  labelGap: 10,
  fieldMarginBottom: 8,
  yFieldMarginBottom: 12,
  keypadGap: 8,
  keypadMarginBottom: 8,
  keypadButtonMinHeight: 44,
  keypadButtonFontSize: 18,
  keypadButtonPadding: "10px 0",
  keypadTouchTargetMinHeight: 44,
  fineNudgeGap: 8,
  fineNudgeMarginBottom: 12,
  actionGap: 10,
  actionButtonPadding: "8px 18px",
  actionButtonMinHeight: 44,
  actionTouchTargetMinHeight: 44,
  touchTargetMinHeight: 44,
  anchorOffsetX: 170,
  anchorMaxWidth: 360,
  anchorMaxHeight: 420,
};

/** Coarse-pointer layout — ~50% visual footprint vs prior compact (260×~417 on 360vw). */
const COMPACT_LAYOUT: JoystickCoordinateEditorLayoutTokens = {
  panelMinWidth: 180,
  panelMaxWidthVw: 50,
  panelPadding: 4,
  panelPaddingBottom: 4,
  panelBorderRadius: 6,
  titleFontSize: 9,
  titleMarginBottom: 3,
  bodyFontSize: 11,
  fieldFontSize: 11,
  fieldPadding: "3px 5px",
  fieldMinHeight: 22,
  labelWidth: 12,
  labelGap: 4,
  fieldMarginBottom: 3,
  yFieldMarginBottom: 4,
  keypadGap: 2,
  keypadMarginBottom: 3,
  keypadButtonMinHeight: 18,
  keypadButtonFontSize: 11,
  keypadButtonPadding: "0",
  keypadTouchTargetMinHeight: 32,
  fineNudgeGap: 2,
  fineNudgeMarginBottom: 3,
  actionGap: 3,
  actionButtonPadding: "3px 8px",
  actionButtonMinHeight: 22,
  actionTouchTargetMinHeight: 28,
  touchTargetMinHeight: 32,
  anchorOffsetX: 90,
  anchorMaxWidth: 180,
  anchorMaxHeight: 200,
};

/** Prior coarse compact tokens (pre 50% pass) — for footprint comparison in tests/docs. */
export const LEGACY_COMPACT_LAYOUT: JoystickCoordinateEditorLayoutTokens = {
  panelMinWidth: 260,
  panelMaxWidthVw: 88,
  panelPadding: 8,
  panelPaddingBottom: 8,
  panelBorderRadius: 8,
  titleFontSize: 11,
  titleMarginBottom: 6,
  bodyFontSize: 13,
  fieldFontSize: 14,
  fieldPadding: "6px 8px",
  fieldMinHeight: 32,
  labelWidth: 14,
  labelGap: 6,
  fieldMarginBottom: 6,
  yFieldMarginBottom: 8,
  keypadGap: 4,
  keypadMarginBottom: 6,
  keypadButtonMinHeight: 32,
  keypadButtonFontSize: 14,
  keypadButtonPadding: "6px 0",
  keypadTouchTargetMinHeight: 40,
  fineNudgeGap: 4,
  fineNudgeMarginBottom: 8,
  actionGap: 6,
  actionButtonPadding: "6px 12px",
  actionButtonMinHeight: 36,
  actionTouchTargetMinHeight: 36,
  touchTargetMinHeight: 40,
  anchorOffsetX: 120,
  anchorMaxWidth: 260,
  anchorMaxHeight: 260,
};

const KEYPAD_ROW_COUNT = 5;

export type JoystickCoordinateEditorFootprint = {
  panelWidth: number;
  panelHeight: number;
  area: number;
  keypadCellWidth: number;
  keypadCellHeight: number;
};

export function resolveJoystickCoordinateEditorLayout(
  isCoarsePointer: boolean
): JoystickCoordinateEditorLayoutTokens {
  return isCoarsePointer ? COMPACT_LAYOUT : DESKTOP_LAYOUT;
}

export function resolveJoystickCoordinateEditorPanelWidth(
  layout: JoystickCoordinateEditorLayoutTokens,
  containerWidth: number
): number {
  if (layout.panelMaxWidthVw == null) {
    return layout.panelMinWidth;
  }
  const vwWidth = (containerWidth * layout.panelMaxWidthVw) / 100;
  return Math.min(vwWidth, layout.panelMinWidth);
}

/** Deterministic coarse/fine editor footprint estimate for layout QA. */
export function estimateJoystickCoordinateEditorFootprint(
  layout: JoystickCoordinateEditorLayoutTokens,
  containerWidth: number
): JoystickCoordinateEditorFootprint {
  const panelWidth = resolveJoystickCoordinateEditorPanelWidth(
    layout,
    containerWidth
  );
  const innerWidth = panelWidth - layout.panelPadding * 2;
  const keypadCellWidth =
    (innerWidth - layout.keypadGap * 2) / 3;
  const keypadCellHeight = layout.keypadTouchTargetMinHeight;
  const keypadHeight =
    KEYPAD_ROW_COUNT * keypadCellHeight +
    (KEYPAD_ROW_COUNT - 1) * layout.keypadGap;

  const panelHeight =
    layout.panelPadding +
    layout.panelPaddingBottom +
    layout.titleFontSize +
    layout.titleMarginBottom +
    layout.fieldMinHeight +
    layout.fieldMarginBottom +
    layout.fieldMinHeight +
    layout.yFieldMarginBottom +
    keypadHeight +
    layout.keypadMarginBottom +
    layout.keypadTouchTargetMinHeight +
    layout.fineNudgeMarginBottom +
    layout.actionTouchTargetMinHeight;

  return {
    panelWidth,
    panelHeight,
    area: panelWidth * panelHeight,
    keypadCellWidth,
    keypadCellHeight,
  };
}

/** Returns true when keypad grid cells do not overlap (gap >= 0, cells fit inner width). */
export function verifyKeypadTouchGridNoOverlap(
  layout: JoystickCoordinateEditorLayoutTokens,
  containerWidth: number
): boolean {
  const { panelWidth, keypadCellWidth, keypadCellHeight } =
    estimateJoystickCoordinateEditorFootprint(layout, containerWidth);
  const innerWidth = panelWidth - layout.panelPadding * 2;
  const totalKeypadWidth =
    keypadCellWidth * 3 + layout.keypadGap * 2;
  return (
    keypadCellWidth > 0 &&
    keypadCellHeight >= layout.keypadButtonMinHeight &&
    totalKeypadWidth <= innerWidth + 0.01 &&
    layout.keypadGap >= 0
  );
}

export function computeJoystickCoordinateEditorAnchor(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  layout: JoystickCoordinateEditorLayoutTokens
): { left: number; top: number } {
  const panelWidth = resolveJoystickCoordinateEditorPanelWidth(
    layout,
    containerRect.width
  );
  const offsetX = layout.anchorOffsetX;
  const maxWidth = Math.max(layout.anchorMaxWidth, panelWidth);
  const maxHeight = layout.anchorMaxHeight;

  return {
    left: Math.min(
      Math.max(8, clientX - containerRect.left - offsetX),
      Math.max(8, containerRect.width - maxWidth)
    ),
    top: Math.min(
      Math.max(8, clientY - containerRect.top - 8),
      Math.max(8, containerRect.height - maxHeight)
    ),
  };
}

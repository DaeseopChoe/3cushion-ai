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
  fineNudgeGap: number;
  fineNudgeMarginBottom: number;
  actionGap: number;
  actionButtonPadding: string;
  actionButtonMinHeight: number;
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
  fineNudgeGap: 8,
  fineNudgeMarginBottom: 12,
  actionGap: 10,
  actionButtonPadding: "8px 18px",
  actionButtonMinHeight: 44,
  touchTargetMinHeight: 44,
  anchorOffsetX: 170,
  anchorMaxWidth: 360,
  anchorMaxHeight: 420,
};

const COMPACT_LAYOUT: JoystickCoordinateEditorLayoutTokens = {
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
  fineNudgeGap: 4,
  fineNudgeMarginBottom: 8,
  actionGap: 6,
  actionButtonPadding: "6px 12px",
  actionButtonMinHeight: 36,
  touchTargetMinHeight: 40,
  anchorOffsetX: 120,
  anchorMaxWidth: 260,
  anchorMaxHeight: 260,
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

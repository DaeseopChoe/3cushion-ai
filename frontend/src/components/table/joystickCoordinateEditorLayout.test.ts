import { describe, expect, it } from "vitest";
import {
  computeJoystickCoordinateEditorAnchor,
  estimateJoystickCoordinateEditorFootprint,
  LEGACY_COMPACT_LAYOUT,
  resolveJoystickCoordinateEditorLayout,
  resolveJoystickCoordinateEditorPanelWidth,
  verifyKeypadTouchGridNoOverlap,
} from "./joystickCoordinateEditorLayout";

const ANDROID_VIEWPORT_WIDTH = 360;

describe("joystickCoordinateEditorLayout", () => {
  it("keeps desktop layout dimensions unchanged", () => {
    const layout = resolveJoystickCoordinateEditorLayout(false);
    expect(layout.panelMinWidth).toBe(336);
    expect(layout.keypadButtonMinHeight).toBe(44);
    expect(layout.keypadTouchTargetMinHeight).toBe(44);
    expect(layout.anchorMaxWidth).toBe(360);
    expect(layout.anchorMaxHeight).toBe(420);
  });

  it("uses 50% compact layout for coarse pointer", () => {
    const layout = resolveJoystickCoordinateEditorLayout(true);
    expect(layout.panelMinWidth).toBe(180);
    expect(layout.panelMaxWidthVw).toBe(50);
    expect(layout.fieldMinHeight).toBe(22);
    expect(layout.keypadButtonMinHeight).toBe(18);
    expect(layout.keypadTouchTargetMinHeight).toBe(32);
    expect(layout.actionTouchTargetMinHeight).toBe(28);
    expect(layout.anchorMaxHeight).toBe(200);
  });

  it("reduces coarse footprint to roughly 50% vs legacy compact on 360vw", () => {
    const legacy = estimateJoystickCoordinateEditorFootprint(
      LEGACY_COMPACT_LAYOUT,
      ANDROID_VIEWPORT_WIDTH
    );
    const compact = estimateJoystickCoordinateEditorFootprint(
      resolveJoystickCoordinateEditorLayout(true),
      ANDROID_VIEWPORT_WIDTH
    );

    expect(legacy.panelWidth).toBe(260);
    expect(compact.panelWidth).toBe(180);
    expect(compact.panelHeight).toBeLessThan(legacy.panelHeight);
    expect(compact.area / legacy.area).toBeLessThanOrEqual(0.55);
    expect(compact.area / legacy.area).toBeGreaterThanOrEqual(0.45);
  });

  it("clamps compact anchor within viewport", () => {
    const layout = resolveJoystickCoordinateEditorLayout(true);
    const rect = {
      left: 0,
      top: 0,
      width: 360,
      height: 640,
    } as DOMRect;
    const anchor = computeJoystickCoordinateEditorAnchor(200, 300, rect, layout);
    expect(anchor.left).toBeGreaterThanOrEqual(8);
    expect(anchor.top).toBeGreaterThanOrEqual(8);
    expect(anchor.left).toBeLessThanOrEqual(rect.width - layout.anchorMaxWidth);
    expect(anchor.top).toBeLessThanOrEqual(rect.height - layout.anchorMaxHeight);
  });

  it("resolves compact panel width with vw cap", () => {
    const layout = resolveJoystickCoordinateEditorLayout(true);
    expect(resolveJoystickCoordinateEditorPanelWidth(layout, 400)).toBe(180);
    expect(resolveJoystickCoordinateEditorPanelWidth(layout, 360)).toBe(180);
    expect(resolveJoystickCoordinateEditorPanelWidth(layout, 200)).toBe(100);
  });

  it("keeps keypad touch cells non-overlapping on Android viewport", () => {
    const layout = resolveJoystickCoordinateEditorLayout(true);
    const footprint = estimateJoystickCoordinateEditorFootprint(
      layout,
      ANDROID_VIEWPORT_WIDTH
    );
    expect(verifyKeypadTouchGridNoOverlap(layout, ANDROID_VIEWPORT_WIDTH)).toBe(
      true
    );
    expect(footprint.keypadCellWidth).toBeGreaterThanOrEqual(32);
    expect(footprint.keypadCellHeight).toBe(32);
  });
});

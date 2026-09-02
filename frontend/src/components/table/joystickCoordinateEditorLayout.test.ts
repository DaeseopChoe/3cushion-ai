import { describe, expect, it } from "vitest";
import {
  computeJoystickCoordinateEditorAnchor,
  resolveJoystickCoordinateEditorLayout,
  resolveJoystickCoordinateEditorPanelWidth,
} from "./joystickCoordinateEditorLayout";

describe("joystickCoordinateEditorLayout", () => {
  it("keeps desktop layout dimensions unchanged", () => {
    const layout = resolveJoystickCoordinateEditorLayout(false);
    expect(layout.panelMinWidth).toBe(336);
    expect(layout.keypadButtonMinHeight).toBe(44);
    expect(layout.anchorMaxWidth).toBe(360);
    expect(layout.anchorMaxHeight).toBe(420);
  });

  it("uses compact layout for coarse pointer", () => {
    const layout = resolveJoystickCoordinateEditorLayout(true);
    expect(layout.panelMinWidth).toBe(260);
    expect(layout.panelMaxWidthVw).toBe(88);
    expect(layout.fieldMinHeight).toBe(32);
    expect(layout.touchTargetMinHeight).toBe(40);
    expect(layout.anchorMaxHeight).toBe(260);
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
    expect(resolveJoystickCoordinateEditorPanelWidth(layout, 400)).toBe(260);
    expect(resolveJoystickCoordinateEditorPanelWidth(layout, 200)).toBe(176);
  });
});

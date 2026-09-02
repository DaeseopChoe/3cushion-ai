import { describe, expect, it, vi, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import JoystickCoordinateEditor from "./JoystickCoordinateEditor";

function stubMatchMedia(matches) {
  vi.stubGlobal("window", {
    matchMedia: () => ({ matches }),
    innerWidth: 360,
  });
}

describe("JoystickCoordinateEditor layout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders desktop panel without compact class", () => {
    stubMatchMedia(false);
    const html = renderToStaticMarkup(
      React.createElement(JoystickCoordinateEditor, {
        mode: "ball",
        initialX: 60,
        initialY: 20,
        anchor: { left: 10, top: 10 },
        onApply: () => {},
        onCancel: () => {},
      })
    );
    expect(html).not.toContain("joystick-coordinate-editor--compact");
    expect(html).toContain("min-width:336px");
    expect(html).not.toContain("joystick-coordinate-editor__keypad-visual");
  });

  it("renders 50% compact panel for coarse pointer (guide mode)", () => {
    stubMatchMedia(true);
    const html = renderToStaticMarkup(
      React.createElement(JoystickCoordinateEditor, {
        mode: "guide",
        initialX: 60.1,
        initialY: 20.0,
        anchor: { left: 10, top: 10 },
        onApply: () => {},
        onCancel: () => {},
      })
    );
    expect(html).toContain("joystick-coordinate-editor--compact");
    expect(html).toContain("Guide (Rg)");
    expect(html).toContain("min-width:180px");
    expect(html).toContain("joystick-coordinate-editor__keypad-visual");
    expect(html).toContain("min-height:32px");
    expect(html).toContain("X −0.1");
    expect(html).toContain("Apply");
    expect(html).toContain("Cancel");
    expect(html).toContain("Clear");
    expect(html).toContain("⌫");
  });

  it("renders ball compact panel with same coarse policy", () => {
    stubMatchMedia(true);
    const html = renderToStaticMarkup(
      React.createElement(JoystickCoordinateEditor, {
        mode: "ball",
        initialX: 40,
        initialY: 15,
        anchor: { left: 10, top: 10 },
        onApply: () => {},
        onCancel: () => {},
      })
    );
    expect(html).toContain("Ball (Rg)");
    expect(html).toContain("min-width:180px");
    expect(html).toContain("joystick-coordinate-editor__keypad-visual");
  });
});

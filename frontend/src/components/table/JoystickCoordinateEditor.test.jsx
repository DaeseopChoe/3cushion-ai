import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
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
  });

  it("renders compact panel for coarse pointer", () => {
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
    expect(html).toContain("min-width:260px");
    expect(html).toContain("min-height:40px");
  });
});

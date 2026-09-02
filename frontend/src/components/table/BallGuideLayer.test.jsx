import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import BallGuideLayer from "./BallGuideLayer";
import { toPx } from "../../utils/geometry/coords";
import {
  BALL_GUIDE_TRIANGLE_OFFSET_RG,
  getBallGuideSnapAction,
  getBallGuideTriangleDescriptors,
} from "../../interaction/ballGuideInteractionPolicy";

function parseFirstPointX(points) {
  return Number(points.split(" ")[0].split(",")[0]);
}

describe("BallGuideLayer render", () => {
  it("TEST J: renders four fine-nudge triangles around the snap control", () => {
    const html = renderToStaticMarkup(
      React.createElement(BallGuideLayer, {
        active: true,
        ballId: "cue",
        horizontalY: 20.6,
        verticalX: 53.0,
        scale: 10,
        tableW: 800,
        tableH: 400,
        padding: 20,
      })
    );

    expect(html).toContain('data-ball-guide-snap-action="1"');
    expect(html.match(/data-ball-guide-triangle="/g)).toHaveLength(4);
    expect(html).toContain('data-ball-guide-triangle="up"');
    expect(html).toContain('data-ball-guide-triangle="down"');
    expect(html).toContain('data-ball-guide-triangle="left"');
    expect(html).toContain('data-ball-guide-triangle="right"');
  });

  it("TEST 9: horizontal triangles point outward from snap center", () => {
    const scale = 10;
    const tableW = 800;
    const tableH = 400;
    const padding = 20;
    const guide = {
      active: true,
      ballId: "cue",
      horizontalY: 20.0,
      verticalX: 60.0,
    };
    const snap = getBallGuideSnapAction(guide, tableW / scale, tableH / scale);
    expect(snap).not.toBeNull();

    const triangles = getBallGuideTriangleDescriptors(
      guide,
      tableW / scale,
      tableH / scale
    );
    const left = triangles.find((t) => t.direction === "left");
    const right = triangles.find((t) => t.direction === "right");
    expect(left).toBeDefined();
    expect(right).toBeDefined();

    expect(left.point.x).toBeLessThan(snap.point.x);
    expect(right.point.x).toBeGreaterThan(snap.point.x);
    expect(left.point.x).toBe(
      snap.point.x - BALL_GUIDE_TRIANGLE_OFFSET_RG
    );
    expect(right.point.x).toBe(
      snap.point.x + BALL_GUIDE_TRIANGLE_OFFSET_RG
    );

    const html = renderToStaticMarkup(
      React.createElement(BallGuideLayer, {
        active: true,
        ballId: "cue",
        horizontalY: 20.0,
        verticalX: 60.0,
        scale,
        tableW,
        tableH,
        padding,
      })
    );

    const leftMatch = html.match(/data-ball-guide-triangle="left"[^>]*points="([^"]+)"/);
    const rightMatch = html.match(/data-ball-guide-triangle="right"[^>]*points="([^"]+)"/);
    expect(leftMatch).not.toBeNull();
    expect(rightMatch).not.toBeNull();

    const leftPx = toPx(left.point, scale, tableH);
    const rightPx = toPx(right.point, scale, tableH);
    const snapPx = toPx(snap.point, scale, tableH);
    const leftCx = leftPx.x + padding;
    const rightCx = rightPx.x + padding;
    const snapCx = snapPx.x + padding;

    const leftTipX = parseFirstPointX(leftMatch[1]);
    const rightTipX = parseFirstPointX(rightMatch[1]);

    expect(leftTipX).toBeLessThan(leftCx);
    expect(leftTipX).toBeLessThan(snapCx);
    expect(rightTipX).toBeGreaterThan(rightCx);
    expect(rightTipX).toBeGreaterThan(snapCx);
  });
});

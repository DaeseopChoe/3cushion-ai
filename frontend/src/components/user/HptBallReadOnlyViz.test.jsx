import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HptBallReadOnlyViz, { BALL_RADIUS } from "./HptBallReadOnlyViz";
import UserHptPanel from "./UserHptPanel";
import { buildUserHptViewModel } from "../../domain/userHptViewModel";
import { CENTER_X } from "../../domain/hptVizGeometry";
import {
  actualOverlapFractionFromCircles,
  billiardDirectionMatchesT,
  expectedThicknessFractionFromT,
} from "../../domain/hptPhysicalOverlap.testHelpers";

function circleCxByTestId(html, testId) {
  const re = new RegExp(`data-testid="${testId}"[^>]*\\bcx="([^"]+)"`);
  const m = html.match(re);
  if (!m) {
    throw new Error(`circle data-testid="${testId}" not found in: ${html.slice(0, 200)}`);
  }
  return Number(m[1]);
}

function circleRByTestId(html, testId) {
  const re = new RegExp(`data-testid="${testId}"[^>]*\\br="([^"]+)"`);
  const m = html.match(re);
  if (!m) {
    throw new Error(`circle data-testid="${testId}" r not found in: ${html.slice(0, 200)}`);
  }
  return Number(m[1]);
}

function overlapFromRenderedSvg(T) {
  const html = renderToStaticMarkup(
    createElement(HptBallReadOnlyViz, { T, hitX: 0, hitY: 0 })
  );
  const targetCx = circleCxByTestId(html, "hpt-target-ball");
  const impactCx = circleCxByTestId(html, "hpt-impact-ball");
  const radius = circleRByTestId(html, "hpt-target-ball");
  return {
    html,
    targetCx,
    impactCx,
    radius,
    metrics: actualOverlapFractionFromCircles({ targetCx, impactCx, radius }),
  };
}

describe("HptBallReadOnlyViz — actual SVG render (TEST G ~ TEST I)", () => {
  it("TEST G — Right Thickness '+5/8' SVG matches SSOT geometry", () => {
    const rendered = overlapFromRenderedSvg("+5/8");

    expect(rendered.impactCx).toBeGreaterThan(CENTER_X);
    expect(rendered.targetCx).toBeLessThan(CENTER_X);
    expect(rendered.impactCx).toBeGreaterThan(rendered.targetCx);
    expect(rendered.metrics.overlapFraction).toBeCloseTo(5 / 8, 10);
    expect(rendered.metrics.distance).toBe(90);
    expect(rendered.metrics.overlap).toBe(150);
  });

  it("TEST H — Left Thickness '-5/8' SVG is mirror of +5/8", () => {
    const right = overlapFromRenderedSvg("+5/8");
    const left = overlapFromRenderedSvg("-5/8");

    expect(left.targetCx - CENTER_X).toBe(-(right.targetCx - CENTER_X));
    expect(left.impactCx - CENTER_X).toBe(-(right.impactCx - CENTER_X));
    expect(left.metrics.overlapFraction).toBeCloseTo(5 / 8, 10);
    expect(left.metrics.distance).toBe(right.metrics.distance);
  });

  it("TEST I — Full ball '8/8': red and white share cx", () => {
    const rendered = overlapFromRenderedSvg("8/8");

    expect(rendered.targetCx).toBe(CENTER_X);
    expect(rendered.impactCx).toBe(CENTER_X);
    expect(rendered.targetCx).toBe(rendered.impactCx);
    expect(rendered.metrics.overlapFraction).toBe(1);
    expect(rendered.metrics.overlap).toBe(2 * BALL_RADIUS);
  });

  it("UserHptPanel shows thickness text aligned with rendered geometry for +5/8", () => {
    const model = buildUserHptViewModel({
      hpt: { T: "+5/8", hit_point: { x: 0, y: 0 }, mode: "TIP" },
    });
    const panelHtml = renderToStaticMarkup(createElement(UserHptPanel, { model }));
    expect(panelHtml).toContain("두께 우측 5/8");

    expect(model.viz).not.toBeNull();
    const rendered = overlapFromRenderedSvg(model.viz.T);
    expect(rendered.impactCx).toBeGreaterThan(CENTER_X);
    expect(rendered.metrics.overlapFraction).toBeCloseTo(5 / 8, 10);
  });
});

describe("Physical Thickness SSOT — SVG circle overlap (P8)", () => {
  it("P8 — +5/8 rendered SVG: independent overlapFraction = 5/8", () => {
    const rendered = overlapFromRenderedSvg("+5/8");
    expect(rendered.radius).toBe(BALL_RADIUS);
    expect(rendered.metrics.overlapFraction).toBeCloseTo(
      expectedThicknessFractionFromT("+5/8"),
      10
    );
    expect(rendered.metrics.overlap).toBe(150);
    expect(rendered.metrics.distance).toBe(90);
    expect(billiardDirectionMatchesT("+5/8", rendered.targetCx, rendered.impactCx)).toBe(
      true
    );
  });

  it("P8 — +3/8 rendered SVG: independent overlapFraction = 3/8 (not complement)", () => {
    const rendered = overlapFromRenderedSvg("+3/8");
    expect(rendered.metrics.overlapFraction).toBeCloseTo(3 / 8, 10);
    expect(rendered.metrics.overlap).toBe(90);
    expect(rendered.metrics.distance).toBe(150);
    expect(billiardDirectionMatchesT("+3/8", rendered.targetCx, rendered.impactCx)).toBe(
      true
    );
  });

  it("P8 — +3/8 vs +5/8 rendered geometries differ", () => {
    const three = overlapFromRenderedSvg("+3/8");
    const five = overlapFromRenderedSvg("+5/8");
    expect(three.targetCx).not.toBe(five.targetCx);
    expect(three.metrics.distance).toBeGreaterThan(five.metrics.distance);
    expect(three.metrics.overlap).toBeLessThan(five.metrics.overlap);
  });
});

describe("Thickness Direction SSOT — SVG (D8)", () => {
  it.each([
    ["+1/8", 1 / 8],
    ["+3/8", 3 / 8],
    ["+5/8", 5 / 8],
    ["+7/8", 7 / 8],
  ])("D8 %s rendered direction + overlap", (T, fraction) => {
    const rendered = overlapFromRenderedSvg(T);
    expect(billiardDirectionMatchesT(T, rendered.targetCx, rendered.impactCx)).toBe(true);
    expect(rendered.metrics.overlapFraction).toBeCloseTo(fraction, 10);
  });

  it.each([1, 3, 5, 7])("D8 -%s/8 mirrors +%s/8 in rendered SVG", (n) => {
    const pos = overlapFromRenderedSvg(`+${n}/8`);
    const neg = overlapFromRenderedSvg(`-${n}/8`);
    expect(pos.metrics.overlapFraction).toBeCloseTo(n / 8, 10);
    expect(neg.metrics.overlapFraction).toBeCloseTo(n / 8, 10);
    expect(pos.metrics.distance).toBe(neg.metrics.distance);
    expect(pos.impactCx - CENTER_X).toBe(-(neg.impactCx - CENTER_X));
    expect(pos.targetCx - CENTER_X).toBe(-(neg.targetCx - CENTER_X));
    expect(billiardDirectionMatchesT(`+${n}/8`, pos.targetCx, pos.impactCx)).toBe(true);
    expect(billiardDirectionMatchesT(`-${n}/8`, neg.targetCx, neg.impactCx)).toBe(true);
  });

  it("D8 8/8 rendered full ball", () => {
    const rendered = overlapFromRenderedSvg("8/8");
    expect(rendered.targetCx).toBe(rendered.impactCx);
    expect(rendered.metrics.overlapFraction).toBe(1);
    expect(billiardDirectionMatchesT("8/8", rendered.targetCx, rendered.impactCx)).toBe(true);
  });
});

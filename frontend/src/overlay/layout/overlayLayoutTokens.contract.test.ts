/**
 * Phase 3C — USER AI 1.5× base width + HPT isolation (layout SSOT only).
 */
import { describe, expect, it } from "vitest";
import {
  AI_OVERLAY_WIDTH_RATIO,
  CALC_OVERLAY_WIDTH_RATIO,
  HPT_OVERLAY_WIDTH_RATIO,
  OVERLAY_CLAMP_INSET_RATIO,
  OVERLAY_CONTENT_TYPE_SCALE,
  READING_FONT_SCALE,
  computeOverlayLayoutMetrics,
  resolveUserOverlayLayout,
} from "./overlayLayoutTokens";

describe("Phase 3C USER AI width ratio isolation", () => {
  it("AI Reading OFF widthRatio is ~1.5× legacy (0.63)", () => {
    expect(AI_OVERLAY_WIDTH_RATIO).toBe(0.63);
    expect(resolveUserOverlayLayout("AI").widthRatio).toBe(0.63);
  });

  it("HPT Reading OFF keeps legacy 0.42", () => {
    expect(HPT_OVERLAY_WIDTH_RATIO).toBe(0.42);
    expect(resolveUserOverlayLayout("HPT").widthRatio).toBe(0.42);
  });

  it("AI and HPT width ratios are separated", () => {
    expect(AI_OVERLAY_WIDTH_RATIO).not.toBe(HPT_OVERLAY_WIDTH_RATIO);
    expect(resolveUserOverlayLayout("AI").widthRatio).not.toBe(
      resolveUserOverlayLayout("HPT").widthRatio
    );
  });

  it("CALC widthRatio unchanged at 0.62", () => {
    expect(CALC_OVERLAY_WIDTH_RATIO).toBe(0.62);
    expect(resolveUserOverlayLayout("CALC").widthRatio).toBe(0.62);
  });

  it("READING_FONT_SCALE unchanged", () => {
    expect(READING_FONT_SCALE).toBe(1.45);
  });
});

describe("Phase 3C Reading Mode clamp + font scale", () => {
  const tableW = 1000;
  const tableH = 500; // ~2:1 table

  it("AI Reading ON uses existing layout math and stays within table − inset", () => {
    const off = computeOverlayLayoutMetrics(
      tableW,
      tableH,
      "medium",
      OVERLAY_CONTENT_TYPE_SCALE.AI,
      {
        widthRatio: AI_OVERLAY_WIDTH_RATIO,
        maxHeightRatio: 0.85,
        readingMode: false,
      }
    );
    expect(off.widthPx).toBeCloseTo(tableW * 0.63, 5);

    const on = computeOverlayLayoutMetrics(
      tableW,
      tableH,
      "medium",
      OVERLAY_CONTENT_TYPE_SCALE.AI,
      {
        widthRatio: AI_OVERLAY_WIDTH_RATIO,
        maxHeightRatio: 0.85,
        readingMode: true,
        readingOriginalAspect: resolveUserOverlayLayout("AI").readingOriginalAspect,
      }
    );
    const shortSide = Math.min(tableW, tableH);
    const inset = shortSide * OVERLAY_CLAMP_INSET_RATIO;
    const maxWidth = tableW - inset * 2;
    expect(on.widthPx).toBeLessThanOrEqual(maxWidth + 1e-9);
    expect(on.widthPx).toBeGreaterThan(off.widthPx);
    expect(on.contentScale / off.contentScale).toBeCloseTo(READING_FONT_SCALE, 5);
  });

  it("HPT OFF width stays at 0.42 × tableW", () => {
    const hpt = computeOverlayLayoutMetrics(
      tableW,
      tableH,
      "medium",
      OVERLAY_CONTENT_TYPE_SCALE.AI,
      {
        widthRatio: HPT_OVERLAY_WIDTH_RATIO,
        maxHeightRatio: 0.85,
        readingMode: false,
      }
    );
    expect(hpt.widthPx).toBeCloseTo(tableW * 0.42, 5);
  });

  it("narrow mobile table: Reading AI width never exceeds table − inset", () => {
    const tw = 360;
    const th = 640;
    const on = computeOverlayLayoutMetrics(tw, th, "medium", OVERLAY_CONTENT_TYPE_SCALE.AI, {
      widthRatio: AI_OVERLAY_WIDTH_RATIO,
      maxHeightRatio: 0.85,
      readingMode: true,
      readingOriginalAspect: resolveUserOverlayLayout("AI").readingOriginalAspect,
    });
    const inset = Math.min(tw, th) * OVERLAY_CLAMP_INSET_RATIO;
    expect(on.widthPx).toBeLessThanOrEqual(tw - inset * 2 + 1e-9);
  });
});

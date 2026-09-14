import { SYS_LABEL_PHONE_LANDSCAPE_SCALE } from "../../config/tableConfig";

/** Mobile label readability: stroke/shadow when scaled above desktop baseline. */
export function isLabelReadabilityEnhanced(
  labelScale: number,
  threshold = SYS_LABEL_PHONE_LANDSCAPE_SCALE - 0.01
): boolean {
  return Number.isFinite(labelScale) && labelScale >= threshold;
}

export type SvgLabelReadabilityStyle = {
  pointerEvents: "none" | "all";
  userSelect: "none";
  paintOrder?: "stroke fill";
  stroke?: string;
  strokeWidth?: number;
  strokeLinejoin?: "round";
  filter?: string;
};

export function buildSvgLabelReadabilityStyle(
  enhanced: boolean,
  pointerEvents: "none" | "all" = "none"
): SvgLabelReadabilityStyle {
  if (!enhanced) {
    return { pointerEvents, userSelect: "none" };
  }
  return {
    pointerEvents,
    userSelect: "none",
    paintOrder: "stroke fill",
    stroke: "rgba(15, 23, 42, 0.88)",
    strokeWidth: 2,
    strokeLinejoin: "round",
    filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.35))",
  };
}

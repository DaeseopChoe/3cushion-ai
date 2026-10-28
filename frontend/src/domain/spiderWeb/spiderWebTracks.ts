/**
 * Spider Web (거미줄) — explicit track rail table (SSOT: 작업관리/SPIDER_WEB_SYSTEM_SSOT.md §1).
 * Rails are never inferred from B2T/T2B prefixes or generic corner detection.
 */

import type { Rail } from "../reflectionEngine";

export const SPIDER_WEB_SYSTEM_ID = "spider_web";

export const SPIDER_WEB_TRACK_IDS = ["RLTR_R", "LRTL_L", "RLBR_L", "LRBL_R"] as const;
export type SpiderWebTrackId = (typeof SPIDER_WEB_TRACK_IDS)[number];

export type SpiderSpinDirection = "L" | "R";

export type SpiderWebTrackSpec = {
  id: SpiderWebTrackId;
  co: Rail;
  c1: Rail;
  c2: Rail;
  /** C3 rail for 0 ≤ C3 ≤ 60. */
  c3Short: Rail;
  /** C3 rail for 60 < C3 ≤ 80. */
  c3Long: Rail;
  spin: SpiderSpinDirection;
};

export const SPIDER_WEB_TRACKS: Readonly<Record<SpiderWebTrackId, SpiderWebTrackSpec>> = {
  RLTR_R: { id: "RLTR_R", co: "RIGHT", c1: "LEFT", c2: "TOP", c3Short: "RIGHT", c3Long: "BOTTOM", spin: "R" },
  LRTL_L: { id: "LRTL_L", co: "LEFT", c1: "RIGHT", c2: "TOP", c3Short: "LEFT", c3Long: "BOTTOM", spin: "L" },
  RLBR_L: { id: "RLBR_L", co: "RIGHT", c1: "LEFT", c2: "BOTTOM", c3Short: "RIGHT", c3Long: "TOP", spin: "L" },
  LRBL_R: { id: "LRBL_R", co: "LEFT", c1: "RIGHT", c2: "BOTTOM", c3Short: "LEFT", c3Long: "TOP", spin: "R" },
};

export const SPIDER_DEFAULT_TRACK: SpiderWebTrackId = "RLTR_R";

/** C3 ≤ this stays on the short rail; anything above switches to the long rail. */
export const SPIDER_C3_SHORT_RAIL_MAX = 60;

export const SPIDER_VALUE_RANGES = {
  CO_f: [0, 40],
  C1_f: [0, 80],
  C3_f: [0, 80],
} as const;

export function isSpiderWebSystemId(systemId: string | null | undefined): boolean {
  return systemId === SPIDER_WEB_SYSTEM_ID;
}

export function isSpiderWebTrack(track: unknown): track is SpiderWebTrackId {
  return (
    typeof track === "string" &&
    (SPIDER_WEB_TRACK_IDS as readonly string[]).includes(track)
  );
}

export function spiderTrackSpec(track: unknown): SpiderWebTrackSpec | null {
  return isSpiderWebTrack(track) ? SPIDER_WEB_TRACKS[track] : null;
}

export type SpiderC3Branch = "short" | "long";

export function spiderC3Branch(c3: number): SpiderC3Branch {
  return c3 > SPIDER_C3_SHORT_RAIL_MAX ? "long" : "short";
}

export function spiderC3Rail(track: SpiderWebTrackId, c3: number): Rail {
  const spec = SPIDER_WEB_TRACKS[track];
  return spiderC3Branch(c3) === "long" ? spec.c3Long : spec.c3Short;
}

/**
 * SystemValueLabels 전용 최소 유틸.
 * anchor.coord는 SSOT로 유지하고, 렌더 시점 snap으로만 위치를 정렬한다.
 */

export const SPACE_EPS = 0.02;

export type Coord = { x: number; y: number };
export type CoordSpace = "FG" | "RG" | "MID";
export type Rail = "BOTTOM" | "TOP" | "LEFT" | "RIGHT";
export type RenderSnapOptions = {
  forceRg?: boolean;
  forceMid?: boolean;
  rail?: Rail | null;
};

const FG_EDGE = {
  left: -2.25,
  right: 82.25,
  bottom: -2.25,
  top: 42.25,
} as const;

const LAYER_SNAP = {
  FG: { left: -2.25, right: 82.25, bottom: -2.25, top: 42.25 },
  RG: { left: -0.5, right: 80.5, bottom: -0.5, top: 40.5 },
  MID: { left: -1.5, right: 81.5, bottom: -1.5, top: 41.5 },
} as const;

/** 좌표 기반 단일 결정 규칙: frame edge 값이면 FG, 그 외 RG */
export function getSpace(coord: Coord, eps = SPACE_EPS): CoordSpace {
  return (
    Math.abs(coord.x - FG_EDGE.left) <= eps ||
    Math.abs(coord.x - FG_EDGE.right) <= eps ||
    Math.abs(coord.y - FG_EDGE.bottom) <= eps ||
    Math.abs(coord.y - FG_EDGE.top) <= eps
  )
    ? "FG"
    : "RG";
}

function detectRail(coord: Coord, eps = SPACE_EPS): Rail | null {
  const { x, y } = coord;

  // FG
  if (Math.abs(x + 2.25) <= eps) return "LEFT";
  if (Math.abs(x - 82.25) <= eps) return "RIGHT";
  if (Math.abs(y + 2.25) <= eps) return "BOTTOM";
  if (Math.abs(y - 42.25) <= eps) return "TOP";

  // RG
  if (Math.abs(x - 0) <= eps) return "LEFT";
  if (Math.abs(x - 80) <= eps) return "RIGHT";
  if (Math.abs(y - 0) <= eps) return "BOTTOM";
  if (Math.abs(y - 40) <= eps) return "TOP";

  return null;
}

/** 레이어 기준 snap: rail 축 하나만 정렬한다. */
export function snapToLayer(
  coord: Coord,
  space: CoordSpace,
  eps = SPACE_EPS,
  options: RenderSnapOptions = {}
): Coord {
  if (
    space === "FG" &&
    !options?.forceRg &&
    !options?.forceMid
  ) {
    return coord;
  }
  const spaceKey = String(space).toUpperCase();
  if (spaceKey === "FG" && !options.forceRg && !options.forceMid) {
    return coord;
  }
  const rail = options.rail ?? detectRail(coord);
  console.log("[SNAP]", { coord, space, rail });
  if (!rail) {
    console.log("[SNAP_RESULT]", {
      input: coord,
      space,
      rail,
      output: coord,
    });
    // #region agent log
    fetch("http://127.0.0.1:7263/ingest/2d7c02db-24bd-4dad-8e7a-c7f7bce1b5b1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "75c16c",
      },
      body: JSON.stringify({
        sessionId: "75c16c",
        runId: "snap-debug-pre",
        hypothesisId: "H2",
        location: "systemLabelPlacement.ts:snapToLayer:no-rail",
        message: "snapToLayer bypassed because rail not detected",
        data: { coord, space, eps, rail: null },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    console.log("[SNAP_OUTPUT]", coord);
    return coord;
  }

  if (options.forceMid) {
    const forced =
      rail === "LEFT"
        ? { x: -1.5, y: coord.y }
        : rail === "RIGHT"
        ? { x: 81.5, y: coord.y }
        : rail === "BOTTOM"
        ? { x: coord.x, y: -1.5 }
        : { x: coord.x, y: 41.5 };
    console.log("[SNAP_RESULT]", {
      input: coord,
      space,
      rail,
      forceMid: true,
      output: forced,
    });
    console.log("[SNAP_OUTPUT]", forced);
    return forced;
  }

  if (options.forceRg) {
    const forced =
      rail === "LEFT"
        ? { x: -0.5, y: coord.y }
        : rail === "RIGHT"
        ? { x: 80.5, y: coord.y }
        : rail === "BOTTOM"
        ? { x: coord.x, y: -0.5 }
        : { x: coord.x, y: 40.5 };
    console.log("[SNAP_RESULT]", {
      input: coord,
      space,
      rail,
      forceRg: true,
      output: forced,
    });
    console.log("[SNAP_OUTPUT]", forced);
    return forced;
  }

  const next = { ...coord };

  if (space === "FG") {
    if (rail === "LEFT") next.x = -2.25;
    if (rail === "RIGHT") next.x = 82.25;
    if (rail === "BOTTOM") next.y = -2.25;
    if (rail === "TOP") next.y = 42.25;
  }

  if (space === "RG") {
    if (rail === "LEFT") next.x = -0.5;
    if (rail === "RIGHT") next.x = 80.5;
    if (rail === "BOTTOM") next.y = -0.5;
    if (rail === "TOP") next.y = 40.5;
  }

  if (space === "MID") {
    if (rail === "LEFT") next.x = -1.5;
    if (rail === "RIGHT") next.x = 81.5;
    if (rail === "BOTTOM") next.y = -1.5;
    if (rail === "TOP") next.y = 41.5;
  }
  console.log("[SNAP_RESULT]", {
    input: coord,
    space,
    rail,
    output: next,
  });
  console.log("[SNAP_OUTPUT]", next);

  // #region agent log
  fetch("http://127.0.0.1:7263/ingest/2d7c02db-24bd-4dad-8e7a-c7f7bce1b5b1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "75c16c",
    },
    body: JSON.stringify({
      sessionId: "75c16c",
      runId: "snap-debug-pre",
      hypothesisId: "H2",
      location: "systemLabelPlacement.ts:snapToLayer:snapped",
      message: "snapToLayer applied",
      data: { coord, space, eps, rail, snapped: next },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return next;
}

/** 렌더 직전 좌표를 레이어 기준으로 snap한다. */
export function toRenderRg(coord: Coord, space: CoordSpace, options: RenderSnapOptions = {}): Coord {
  if (space === "FG") {
    console.log("[FG_PROTECT]", { coord, options });
  }
  if (
    space === "FG" &&
    !options?.forceRg &&
    !options?.forceMid
  ) {
    return coord;
  }
  const spaceKey = String(space).toUpperCase();
  if (spaceKey === "FG" && !options.forceRg && !options.forceMid) {
    return coord;
  }
  console.log("[TO_RENDER_INPUT]", { coord, space, options });
  const result = snapToLayer(coord, space, SPACE_EPS, options);
  console.log("[TO_RENDER_OUTPUT]", result);
  if (coord?.x === 40 && coord?.y < 0) {
    console.log("TO_RENDER_OUTPUT_CO", result);
  }
  return result;
}

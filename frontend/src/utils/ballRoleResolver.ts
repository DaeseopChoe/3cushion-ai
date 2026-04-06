export type Ball = {
  x: number;
  y: number;
  color: "white" | "yellow" | "red";
};

export function resolveBalls(balls: Ball[], targetColor: "yellow" | "red") {
  const cue = balls.find((b) => b.color === "white");
  const target = balls.find((b) => b.color === targetColor);
  const second = balls.find(
    (b) => b.color !== "white" && b.color !== targetColor
  );

  return { cue, target, second };
}

/** Stage/App의 ui.balls → 역할 색 부여 (target_center = object, second = 나머지) */
export function uiBallsToBallArray(
  ui: {
    cue?: { x: number; y: number };
    target_center?: { x: number; y: number };
    second?: { x: number; y: number };
  },
  targetColor: "yellow" | "red" = "yellow"
): Ball[] {
  const out: Ball[] = [];
  if (ui.cue && typeof ui.cue.x === "number" && typeof ui.cue.y === "number") {
    out.push({ x: ui.cue.x, y: ui.cue.y, color: "white" });
  }
  if (targetColor === "yellow") {
    if (
      ui.target_center &&
      typeof ui.target_center.x === "number" &&
      typeof ui.target_center.y === "number"
    ) {
      out.push({
        x: ui.target_center.x,
        y: ui.target_center.y,
        color: "yellow",
      });
    }
    if (ui.second && typeof ui.second.x === "number" && typeof ui.second.y === "number") {
      out.push({ x: ui.second.x, y: ui.second.y, color: "red" });
    }
  } else {
    if (
      ui.target_center &&
      typeof ui.target_center.x === "number" &&
      typeof ui.target_center.y === "number"
    ) {
      out.push({ x: ui.target_center.x, y: ui.target_center.y, color: "red" });
    }
    if (ui.second && typeof ui.second.x === "number" && typeof ui.second.y === "number") {
      out.push({ x: ui.second.x, y: ui.second.y, color: "yellow" });
    }
  }
  return out;
}

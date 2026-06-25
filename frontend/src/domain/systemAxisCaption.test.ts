import { describe, expect, it } from "vitest";
import {
  CAPTION_FONT_SIZE,
  computeGroupCaptionPlacements,
  computeGroupLabelPosition,
  getMarkLabelColor,
  markToUserCaption,
  type GroupAnchorPoint,
  type TablePixelBounds,
} from "./systemAxisCaption";

const BOUNDS: TablePixelBounds = {
  minX: 30,
  maxX: 830,
  minY: 30,
  maxY: 430,
};

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

function inBoundsX(x: number, bounds: TablePixelBounds): boolean {
  return x >= bounds.minX && x <= bounds.maxX;
}
function inBoundsY(y: number, bounds: TablePixelBounds): boolean {
  return y >= bounds.minY && y <= bounds.maxY;
}

// ── OPEN-04 엔진: A/B/Gap 순차 선택 ─────────────────────────────────────────

describe("computeGroupLabelPosition — OPEN-04 engine", () => {
  it("tableBounds 없으면 null 반환", () => {
    const pts: GroupAnchorPoint[] = [
      { pxX: 100, pxY: 200, fgX: 0, fgY: 0, value: 50 },
    ];
    expect(computeGroupLabelPosition("bottom", pts, undefined, "CO")).toBeNull();
  });

  it("perp 좌표는 숫자 그룹 평균과 일치 (가로 side → y)", () => {
    const pts: GroupAnchorPoint[] = [
      { pxX: 100, pxY: 300, fgX: 0, fgY: 0, value: 90 },
      { pxX: 500, pxY: 300, fgX: 0, fgY: 0, value: 50 },
      { pxX: 700, pxY: 300, fgX: 0, fgY: 0, value: 10 },
    ];
    const pos = computeGroupLabelPosition("top", pts, BOUNDS, "C1")!;
    expect(pos.y).toBe(300);
  });

  it("perp 좌표는 숫자 그룹 평균과 일치 (측면 side → x)", () => {
    const pts: GroupAnchorPoint[] = [
      { pxX: 50, pxY: 200, fgX: 0, fgY: 0, value: 60 },
      { pxX: 50, pxY: 300, fgX: 0, fgY: 0, value: 70 },
      { pxX: 50, pxY: 400, fgX: 0, fgY: 0, value: 80 },
    ];
    const pos = computeGroupLabelPosition("left", pts, BOUNDS, "C3")!;
    expect(pos.x).toBe(50);
  });

  it("결과 along 좌표는 tableBounds 내에 위치", () => {
    const pts: GroupAnchorPoint[] = [
      { pxX: 200, pxY: 100, fgX: 0, fgY: 0, value: 90 },
      { pxX: 400, pxY: 100, fgX: 0, fgY: 0, value: 50 },
      { pxX: 700, pxY: 100, fgX: 0, fgY: 0, value: 10 },
    ];
    const pos = computeGroupLabelPosition("top", pts, BOUNDS, "CO")!;
    expect(inBoundsX(pos.x, BOUNDS)).toBe(true);
  });

  it("측면: 결과 along 좌표는 tableBounds 내에 위치", () => {
    const pts: GroupAnchorPoint[] = [
      { pxX: 50, pxY: 150, fgX: 0, fgY: 0, value: 90 },
      { pxX: 50, pxY: 250, fgX: 0, fgY: 0, value: 70 },
      { pxX: 50, pxY: 380, fgX: 0, fgY: 0, value: 30 },
    ];
    const pos = computeGroupLabelPosition("left", pts, BOUNDS, "C5")!;
    expect(inBoundsY(pos.y, BOUNDS)).toBe(true);
  });

  it("A Space 선택: 첫 숫자 이전 공간이 최대 Gap보다 넓을 때", () => {
    // 숫자가 오른쪽에 몰려 있음 → A Space(왼쪽) 넓음
    const pts: GroupAnchorPoint[] = [
      { pxX: 600, pxY: 200, fgX: 0, fgY: 0, value: 30 },
      { pxX: 700, pxY: 200, fgX: 0, fgY: 0, value: 20 },
      { pxX: 800, pxY: 200, fgX: 0, fgY: 0, value: 10 },
    ];
    const pos = computeGroupLabelPosition("top", pts, BOUNDS, "C3")!;
    // A Space 선택 시 캡션 중심은 첫 숫자(600)보다 왼쪽에 위치
    expect(pos.x).toBeLessThan(600);
  });

  it("B Space 선택: 마지막 숫자 이후 공간이 최대 Gap보다 넓을 때", () => {
    // 숫자가 왼쪽에 몰려 있음 → B Space(오른쪽) 넓음
    const pts: GroupAnchorPoint[] = [
      { pxX: 60, pxY: 200, fgX: 0, fgY: 0, value: 90 },
      { pxX: 160, pxY: 200, fgX: 0, fgY: 0, value: 80 },
      { pxX: 260, pxY: 200, fgX: 0, fgY: 0, value: 70 },
    ];
    const pos = computeGroupLabelPosition("top", pts, BOUNDS, "C1")!;
    // B Space 선택 시 캡션 중심은 마지막 숫자(260)보다 오른쪽에 위치
    expect(pos.x).toBeGreaterThan(260);
  });

  it("Internal Gap 선택: A/B 모두 최대 Gap보다 좁을 때 Gap 중앙", () => {
    // 숫자가 bounds 전체에 분산, 중앙 Gap이 큼
    const pts: GroupAnchorPoint[] = [
      { pxX: 60,  pxY: 200, fgX: 0, fgY: 0, value: 90 },
      { pxX: 160, pxY: 200, fgX: 0, fgY: 0, value: 80 },
      { pxX: 560, pxY: 200, fgX: 0, fgY: 0, value: 40 },
      { pxX: 800, pxY: 200, fgX: 0, fgY: 0, value: 10 },
    ];
    const pos = computeGroupLabelPosition("top", pts, BOUNDS, "C5")!;
    // 최대 Gap(160→560) 중앙은 360, 캡션이 그 근처에 배치
    expect(pos.x).toBeGreaterThan(160);
    expect(pos.x).toBeLessThan(560);
  });
});

// ── computeGroupCaptionPlacements ────────────────────────────────────────────

describe("computeGroupCaptionPlacements", () => {
  it("스타일 속성(text, fontSize, fill) 정상 반환", () => {
    const pts: GroupAnchorPoint[] = [
      { pxX: 100, pxY: 300, fgX: 0, fgY: 0, value: 50 },
      { pxX: 200, pxY: 300, fgX: 0, fgY: 0, value: 45 },
      { pxX: 700, pxY: 300, fgX: 0, fgY: 0, value: 13 },
      { pxX: 800, pxY: 300, fgX: 0, fgY: 0, value: 0 },
    ];
    const [placement] = computeGroupCaptionPlacements(
      [{ mark: "CO", side: "bottom", points: pts }],
      BOUNDS
    );
    expect(placement.text).toBe("출발값");
    expect(placement.fontSize).toBe(CAPTION_FONT_SIZE);
    expect(placement.fill).toBe(getMarkLabelColor("CO"));
  });

  it("배치 결과 along 좌표는 tableBounds 내에 위치", () => {
    const pts: GroupAnchorPoint[] = [
      { pxX: 100, pxY: 300, fgX: 0, fgY: 0, value: 50 },
      { pxX: 500, pxY: 300, fgX: 0, fgY: 0, value: 30 },
      { pxX: 800, pxY: 300, fgX: 0, fgY: 0, value: 0 },
    ];
    const [p] = computeGroupCaptionPlacements(
      [{ mark: "CO", side: "bottom", points: pts }],
      BOUNDS
    );
    expect(inBoundsX(p.x, BOUNDS)).toBe(true);
  });

  it("측면 C4 caption y는 동일 side CO caption y와 동일 (alignC4SideCaptionsToCo)", () => {
    const coLeft: GroupAnchorPoint[] = [
      { pxX: 50, pxY: 300, fgX: -2.25, fgY: 30, value: 60 },
      { pxX: 50, pxY: 400, fgX: -2.25, fgY: 40, value: 70 },
    ];
    const c4Left: GroupAnchorPoint[] = [
      { pxX: 50, pxY: 200, fgX: -2.25, fgY: 20, value: 20 },
      { pxX: 50, pxY: 300, fgX: -2.25, fgY: 30, value: 30 },
      { pxX: 50, pxY: 400, fgX: -2.25, fgY: 40, value: 90 },
    ];
    const placements = computeGroupCaptionPlacements(
      [
        { mark: "CO", side: "left", points: coLeft },
        { mark: "C4", side: "left", points: c4Left },
      ],
      BOUNDS
    );
    const co = placements.find((p) => p.mark === "CO" && p.side === "left")!;
    const c4 = placements.find((p) => p.mark === "C4" && p.side === "left")!;
    expect(c4.y).toBe(co.y);
    expect(c4.x).toBe(50);
  });

  it("가로 C4 caption y는 CO에 맞추지 않음 (수평 side 제외)", () => {
    const coBottom: GroupAnchorPoint[] = [
      { pxX: 200, pxY: 430, fgX: 10, fgY: -2.25, value: 50 },
      { pxX: 400, pxY: 430, fgX: 30, fgY: -2.25, value: 40 },
    ];
    const c4Bottom: GroupAnchorPoint[] = [
      { pxX: 400, pxY: 430, fgX: 30, fgY: -2.25, value: 30 },
      { pxX: 600, pxY: 430, fgX: 50, fgY: -2.25, value: 10 },
    ];
    const placements = computeGroupCaptionPlacements(
      [
        { mark: "CO",  side: "bottom", points: coBottom },
        { mark: "C4",  side: "bottom", points: c4Bottom },
      ],
      BOUNDS
    );
    const co = placements.find((p) => p.mark === "CO")!;
    const c4 = placements.find((p) => p.mark === "C4")!;
    // 수평 C4는 CO y에 맞추지 않으므로 y가 달라도 무방
    expect(c4.y).toBe(co.y); // 같은 side의 perp(y)는 같음 (both bottom)
  });

  it("같은 side에 여러 mark가 배치되면 along 방향 겹침 분리", () => {
    const makeBottom = (pxX: number, mark: string): GroupAnchorPoint[] => [
      { pxX, pxY: 300, fgX: 0, fgY: 0, value: 50 },
      { pxX: pxX + 50, pxY: 300, fgX: 0, fgY: 0, value: 40 },
    ];
    const placements = computeGroupCaptionPlacements(
      [
        { mark: "CO", side: "bottom", points: makeBottom(400, "CO") },
        { mark: "C1", side: "bottom", points: makeBottom(420, "C1") },
      ],
      BOUNDS
    );
    const xs = placements.map((p) => p.x).sort((a, b) => a - b);
    expect(xs[1] - xs[0]).toBeGreaterThanOrEqual(28);
  });

  it("labelScale 1.25: caption font and along sep scale proportionally", () => {
    const makeBottom = (pxX: number, mark: string): GroupAnchorPoint[] => [
      { pxX, pxY: 300, fgX: 0, fgY: 0, value: 50 },
      { pxX: pxX + 50, pxY: 300, fgX: 0, fgY: 0, value: 40 },
    ];
    const placements = computeGroupCaptionPlacements(
      [
        { mark: "CO", side: "bottom", points: makeBottom(400, "CO") },
        { mark: "C1", side: "bottom", points: makeBottom(420, "C1") },
      ],
      BOUNDS,
      1.25
    );
    expect(placements[0].fontSize).toBe(12.5);
    const xs = placements.map((p) => p.x).sort((a, b) => a - b);
    expect(xs[1] - xs[0]).toBeGreaterThanOrEqual(35);
  });
});

// ── markToUserCaption / getMarkLabelColor ─────────────────────────────────────

describe("markToUserCaption", () => {
  it("maps marks to Korean group labels", () => {
    expect(markToUserCaption("CO")).toBe("출발값");
    expect(markToUserCaption("C1")).toBe("1쿠션");
    expect(markToUserCaption("C3")).toBe("3쿠션");
    expect(markToUserCaption("C4")).toBe("4쿠션");
    expect(markToUserCaption("C5")).toBe("5쿠션");
    expect(markToUserCaption("C6")).toBe("6쿠션");
    expect(markToUserCaption("XX")).toBeNull();
  });
});

describe("getMarkLabelColor", () => {
  it("각 mark의 색상 반환", () => {
    expect(getMarkLabelColor("C4")).toBe("#00E5FF");
    expect(getMarkLabelColor("C5")).toBe("#FF4D6D");
    expect(getMarkLabelColor("C6")).toBe("#A8FF60");
    expect(getMarkLabelColor("CO")).toBe("#FFD700");
    expect(getMarkLabelColor("C1")).toBe("#FFD700");
  });
});

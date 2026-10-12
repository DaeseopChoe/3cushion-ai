/**
 * SYS 궤적 표시 범위 — 세컨드볼(balls.second)은 표시 종료 조건이 아니다 (Builder + Label 통합).
 *
 * 표시 끝 = min(노드 끊김, same-rail, 5&Half 물리 제한). 세컨드볼 위치·적중 여부와 무관.
 * 기준선 ON/OFF 모두 같은 정책 · 선의 끝 = 마지막 라벨.
 */

import { describe, expect, it } from "vitest";
import { buildTrajectoryRenderModel } from "../../renderer/trajectory/trajectoryRenderModel";
import { buildTrajectory, type TrajectoryBuildInput } from "./trajectoryBuilder";
import { PATH_NODE_MARKS } from "../trajectoryPathDisplayPolicy";

type P = { x: number; y: number };

/** CO bottom → C1 top → C2 left → C3 bottom → C4 right → C5 top → C6 left (Rg 80×40). */
const RAIL_ANCHORS: Record<string, P> = {
  CO: { x: 60, y: 0 },
  C1: { x: 40, y: 40 },
  C2: { x: 0, y: 20 },
  C3: { x: 20, y: 0 },
  C4: { x: 80, y: 30 },
  C5: { x: 60, y: 40 },
  C6: { x: 0, y: 10 },
};

const OFF_PATH_SECOND: P = { x: 40, y: 20 };
const ALL_MARKS = ["CO", "C1", "C2", "C3", "C4", "C5", "C6"];
const UP_TO_C4 = ["CO", "C1", "C2", "C3", "C4"];

function makeInput(
  overrides: Partial<TrajectoryBuildInput> & {
    second?: P | null;
    c4?: number;
    anchorsPatch?: Record<string, P | null>;
  } = {}
): TrajectoryBuildInput {
  const { second, c4 = 25, anchorsPatch, ...rest } = overrides;
  const anchors: Record<string, unknown> = { ...RAIL_ANCHORS, ...anchorsPatch };
  return {
    anchors,
    anchorsBase: { ...anchors },
    rawAnchors: anchors,
    resolveAnchorCtx: { track: "B2T_L", systemId: "5_half_system" },
    balls: {
      cue: { x: 70, y: 10 },
      target: { x: 66, y: 6 },
      second: second === undefined ? OFF_PATH_SECOND : second,
    },
    targetColor: "red",
    hitTolerance: 2,
    ballDiameterRg: 1.7,
    ballRadiusRg: 0.85,
    thicknessForCalc: "8/8",
    shotPattern: "뒤돌리기",
    baseSysValues: { C4_f: c4 },
    correctedSysValues: { C4_f: c4 },
    ...rest,
  };
}

function labels(
  result: ReturnType<typeof buildTrajectory>,
  baselineOn: boolean
): string[] {
  return buildTrajectoryRenderModel({
    labelStrategy: "five_half_reference",
    useBaselineLabelAnchors: baselineOn,
    cushionPathBaselineRg: result.baseline?.cushionPath ?? null,
    capBaseline: result.baseline?.cap ?? result.corrected.cap,
    capCorrected: result.corrected.cap,
  }).visibleKeysForLabels;
}

function midpoint(a: P | null | undefined, b: P | null | undefined): P {
  expect(a).toBeTruthy();
  expect(b).toBeTruthy();
  return { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
}

function last<T>(arr: T[]): T {
  return arr[arr.length - 1]!;
}

const nodesOf = (input: TrajectoryBuildInput) =>
  buildTrajectory(input).corrected.pathNodes;

/** 선은 pathNodes[0..endIndex] 그대로(공 위치 점 없음) · 마지막 라벨 = 선의 마지막 쿠션. */
function expectLineEndsAtLastLabel(
  branch: { pathNodes: (P | null)[]; cushionPath: P[]; cap: { endIndex: number } },
  visible: string[]
) {
  const end = branch.cap.endIndex;
  expect(branch.cushionPath).toEqual(branch.pathNodes.slice(0, end + 1));
  expect(last(branch.cushionPath)).toEqual(branch.pathNodes[end]);
  expect(last(visible)).toBe(PATH_NODE_MARKS[end]);
}

function expectFullC6(r: ReturnType<typeof buildTrajectory>) {
  expect(r.corrected.cap.endIndex).toBe(6);
  expect(r.corrected.cushionPath).toHaveLength(7);
  expect(r.baseline!.cap.endIndex).toBe(6);
  expect(r.baseline!.cushionPath).toHaveLength(7);
  expect(labels(r, true)).toEqual(ALL_MARKS);
  expect(labels(r, false)).toEqual(ALL_MARKS);
  expectLineEndsAtLastLabel(r.baseline!, labels(r, true));
  expectLineEndsAtLastLabel(r.corrected, labels(r, false));
}

describe("세컨드볼 위치와 무관하게 마지막 유효 쿠션까지 표시", () => {
  it("fixture sanity: corrected/baseline pathNodes C0–C6 모두 유효", () => {
    const r = buildTrajectory(makeInput());
    expect(r.corrected.pathNodes.filter(Boolean)).toHaveLength(7);
    expect(r.baseline?.pathNodes.filter(Boolean)).toHaveLength(7);
  });

  it("A: 세컨드볼 경로 밖 · C6까지 유효 → 기준선 ON/OFF 모두 C6 · C4~C6 라벨", () => {
    const r = buildTrajectory(makeInput());
    expectFullC6(r);
    expect(r.corrected.cap.reason).toBe("full_valid_path");
  });

  it("B: 세컨드볼 C3–C4 위 · C6까지 유효 → 공 위치에서 끊기지 않고 C6까지 · C4~C6 라벨", () => {
    const nodes = nodesOf(makeInput());
    const ball = midpoint(nodes[3], nodes[4]);
    const r = buildTrajectory(makeInput({ second: ball }));

    expectFullC6(r);
    expect(r.corrected.cap.reason).toBe("full_valid_path");
    expect(r.corrected.cushionPath).not.toContainEqual(ball);
    expect(r.baseline!.cushionPath).not.toContainEqual(ball);
    expect(last(r.corrected.cushionPathForRender)).toEqual(nodes[6]);
  });

  it("C: 세컨드볼 C5–C6 위 · C6까지 유효 → 공 위치에서 끊기지 않고 C6까지 · C6 라벨", () => {
    const nodes = nodesOf(makeInput());
    const ball = midpoint(nodes[5], nodes[6]);
    const r = buildTrajectory(makeInput({ second: ball }));

    expectFullC6(r);
    expect(r.corrected.cushionPath).not.toContainEqual(ball);
    expect(labels(r, true)).toContain("C6");
    expect(labels(r, false)).toContain("C6");
  });

  it("C-OFF: 기준선 데이터 없음(OFF) · 세컨드볼 C3–C4 위 → 보정 궤적 자체가 C6까지", () => {
    const nodes = nodesOf(makeInput());
    const ball = midpoint(nodes[3], nodes[4]);
    const r = buildTrajectory(makeInput({ second: ball, anchorsBase: null }));
    expect(r.baseline).toBeNull();
    expect(r.corrected.cap.endIndex).toBe(6);
    expect(labels(r, false)).toEqual(ALL_MARKS);
    expectLineEndsAtLastLabel(r.corrected, labels(r, false));
  });
});

describe("세컨드볼과 무관한 기존 표시 한계 유지", () => {
  it("D: C4까지만 유효 → 세컨드볼 위치와 무관하게 C4 종료 · C5/C6 없음", () => {
    const patch = { C5: null, C6: null };
    const nodes = nodesOf(makeInput({ anchorsPatch: patch }));
    const seconds: (P | null)[] = [
      OFF_PATH_SECOND,
      midpoint(nodes[3], nodes[4]),
      null,
    ];
    for (const second of seconds) {
      const r = buildTrajectory(makeInput({ anchorsPatch: patch, second }));
      expect(r.corrected.cap.endIndex).toBe(4);
      expect(r.corrected.cap.reason).toBe("missing_node");
      expect(r.baseline!.cap.endIndex).toBe(4);
      expect(labels(r, true)).toEqual(UP_TO_C4);
      expect(labels(r, false)).toEqual(UP_TO_C4);
      expectLineEndsAtLastLabel(r.corrected, labels(r, false));
      expectLineEndsAtLastLabel(r.baseline!, labels(r, true));
    }
  });

  it("E: 5&Half 물리 제한 C4(C4<20) → 세컨드볼 적중 여부와 무관하게 C4 종료 · C5/C6 없음", () => {
    const nodes = nodesOf(makeInput({ c4: 12 }));
    const seconds: (P | null)[] = [
      OFF_PATH_SECOND,
      midpoint(nodes[3], nodes[4]),
      midpoint(nodes[4], nodes[5]),
      midpoint(nodes[5], nodes[6]),
    ];
    for (const second of seconds) {
      const r = buildTrajectory(makeInput({ c4: 12, second }));
      expect(r.corrected.cap.endIndex).toBe(4);
      expect(r.corrected.cap.reason).toBe("physical_limit");
      expect(r.baseline!.cap.endIndex).toBe(4);
      expect(r.baseline!.cap.reason).toBe("baseline_physical");
      expect(labels(r, true)).toEqual(UP_TO_C4);
      expect(labels(r, false)).toEqual(UP_TO_C4);
      expectLineEndsAtLastLabel(r.corrected, labels(r, false));
      expectLineEndsAtLastLabel(r.baseline!, labels(r, true));
    }
  });

  it("E2: 보정·기준선은 각자 물리 제한 유지 — 보정 C4<20이어도 기준선(C4≥20)은 C6", () => {
    const r = buildTrajectory(
      makeInput({ baseSysValues: { C4_f: 25 }, correctedSysValues: { C4_f: 12 } })
    );
    expect(r.corrected.cap.endIndex).toBe(4);
    expect(r.baseline!.cap.endIndex).toBe(6);
    expect(labels(r, true)).toEqual(ALL_MARKS);
    expect(labels(r, false)).toEqual(UP_TO_C4);
  });

  it("E3: 보정 C4가 CO/C3로만 주어져도(22.5) C6까지 · C4 미확정이면 물리 제한 미적용", () => {
    const derived = buildTrajectory(
      makeInput({ correctedSysValues: { CO_f: 45, C3_r: 25, C1_f: 20 } })
    );
    expect(derived.corrected.cap.endIndex).toBe(6);
    const unknown = buildTrajectory(makeInput({ correctedSysValues: {} }));
    expect(unknown.corrected.cap.endIndex).toBe(6);
  });

  it("F: 노드 끊김 — 세컨드볼이 C3–C4에 적중해도 끊긴 지점(C4) 이후를 그리지 않음", () => {
    const patch = { C5: null, C6: null };
    const nodes = nodesOf(makeInput({ anchorsPatch: patch }));
    const ball = midpoint(nodes[3], nodes[4]);
    const r = buildTrajectory(makeInput({ anchorsPatch: patch, second: ball }));
    expect(r.corrected.cap.endIndex).toBe(4);
    expect(r.corrected.cap.reason).toBe("missing_node");
    expect(r.corrected.cushionPath).toHaveLength(5);
    expect(r.corrected.cushionPath).not.toContainEqual(ball);
  });
});

describe("공 역할 · 내부 데이터 회귀", () => {
  it("G: 세컨드볼 위치 · 공 색상 · targetBall 값이 표시 종료점을 바꾸지 않음", () => {
    const nodes = nodesOf(makeInput());
    const reference = buildTrajectory(makeInput());
    const variants = [
      makeInput({ second: midpoint(nodes[3], nodes[4]) }),
      makeInput({ second: midpoint(nodes[4], nodes[5]) }),
      makeInput({ second: midpoint(nodes[5], nodes[6]) }),
      makeInput({ second: null }),
      makeInput({ targetColor: "yellow" }),
      makeInput({ second: midpoint(nodes[3], nodes[4]), targetColor: "yellow" }),
      makeInput({
        balls: {
          cue: { x: 70, y: 10 },
          target: midpoint(nodes[3], nodes[4]),
          second: OFF_PATH_SECOND,
        },
      }),
    ];
    for (const input of variants) {
      const r = buildTrajectory(input);
      expect(r.corrected.cap).toEqual(reference.corrected.cap);
      expect(r.corrected.cushionPath).toEqual(reference.corrected.cushionPath);
      expect(r.baseline!.cap).toEqual(reference.baseline!.cap);
      expect(r.baseline!.cushionPath).toEqual(reference.baseline!.cushionPath);
      expect(labels(r, true)).toEqual(labels(reference, true));
      expect(labels(r, false)).toEqual(labels(reference, false));
    }
  });

  it("H: 세컨드볼 위치와 무관하게 내부 pathNodes(C4~C6) 동일 · 입력(저장 데이터) 비변경", () => {
    const miss = buildTrajectory(makeInput());
    const ball = midpoint(miss.corrected.pathNodes[3], miss.corrected.pathNodes[4]);
    const hitInput = makeInput({ second: ball });
    const before = structuredClone(hitInput);
    const hit = buildTrajectory(hitInput);

    expect(hitInput).toEqual(before);
    expect(hit.corrected.pathNodes).toEqual(miss.corrected.pathNodes);
    expect(hit.corrected.pathNodes.filter(Boolean)).toHaveLength(7);
    expect(hit.baseline!.pathNodes).toEqual(miss.baseline!.pathNodes);
    expect(hit.baseline!.pathNodes[5]).toBeTruthy();
    expect(hit.baseline!.pathNodes[6]).toBeTruthy();
  });
});

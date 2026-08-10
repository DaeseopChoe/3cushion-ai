/**
 * Cue / Target Geometry Gate.
 */

import type { Point } from "../positionSearchEngine";
import {
  angleDiffRad,
  dist,
  vecAngle,
} from "./geometryMath";
import {
  CUE_TARGET_ANGLE_TOLERANCE_DEG,
  CUE_TARGET_POS_TOLERANCE_RG,
  CUE_TARGET_SHAPE_TOLERANCE_RG,
  USE_ANGLE_TERM,
  ZERO_VECTOR_EPS_RG,
} from "./policy";
import type { GeometryFailReason } from "./types";

export type GeometryGateResult = {
  pass: boolean;
  reason?: GeometryFailReason;
  dCue: number;
  dTarget: number;
  eShape: number;
  angleDiffDeg?: number;
};

export function passesCueTargetGeometryGate(args: {
  queryCue: Point;
  queryTarget: Point;
  candidateCue: Point;
  candidateTarget: Point;
  posTol?: number;
  shapeTol?: number;
  useAngle?: boolean;
  angleTolDeg?: number;
}): GeometryGateResult {
  const posTol = args.posTol ?? CUE_TARGET_POS_TOLERANCE_RG;
  const shapeTol = args.shapeTol ?? CUE_TARGET_SHAPE_TOLERANCE_RG;
  const useAngle = args.useAngle ?? USE_ANGLE_TERM;
  const angleTolDeg = args.angleTolDeg ?? CUE_TARGET_ANGLE_TOLERANCE_DEG;

  const dCue = dist(args.queryCue, args.candidateCue);
  const dTarget = dist(args.queryTarget, args.candidateTarget);

  if (dCue > posTol) {
    return { pass: false, reason: "pos_cue", dCue, dTarget, eShape: 0 };
  }
  if (dTarget > posTol) {
    return { pass: false, reason: "pos_target", dCue, dTarget, eShape: 0 };
  }

  const vq = {
    x: args.queryTarget.x - args.queryCue.x,
    y: args.queryTarget.y - args.queryCue.y,
  };
  const vc = {
    x: args.candidateTarget.x - args.candidateCue.x,
    y: args.candidateTarget.y - args.candidateCue.y,
  };
  const lenQ = Math.hypot(vq.x, vq.y);
  const lenC = Math.hypot(vc.x, vc.y);
  if (lenQ < ZERO_VECTOR_EPS_RG || lenC < ZERO_VECTOR_EPS_RG) {
    return {
      pass: false,
      reason: "zero_vector",
      dCue,
      dTarget,
      eShape: Number.POSITIVE_INFINITY,
    };
  }

  const eShape = Math.hypot(vc.x - vq.x, vc.y - vq.y);
  if (eShape > shapeTol) {
    return { pass: false, reason: "shape", dCue, dTarget, eShape };
  }

  if (useAngle) {
    const angleDiffDeg =
      (angleDiffRad(vecAngle(vq), vecAngle(vc)) * 180) / Math.PI;
    if (angleDiffDeg > angleTolDeg) {
      return {
        pass: false,
        reason: "angle",
        dCue,
        dTarget,
        eShape,
        angleDiffDeg,
      };
    }
    return { pass: true, dCue, dTarget, eShape, angleDiffDeg };
  }

  return { pass: true, dCue, dTarget, eShape };
}

/**
 * PositionKDIndex - signatureKey별 KD-Tree 인덱스 매니저
 * 관리자 자동 추천용. 기존 positionSearchEngine과 병행 사용.
 */

import type { Ball3, PositionRecord } from "../positionSearchEngine";
import { makeSignatureKey } from "./signatureKey";
import {
  ballsToPoint6D,
  buildKDTree,
  nearest,
  type KDNode,
  type Point6D,
} from "./kdTree6d";

export type Top1Result = {
  position: PositionRecord;
  score: number; // dist2, 낮을수록 가까움
  signatureKey: string;
};

export type SearchOptions = {
  maxDist2?: number;
};

export class PositionKDIndex {
  private trees = new Map<string, KDNode | undefined>();
  private positionMap = new Map<string, PositionRecord>();

  constructor(dataset: PositionRecord[] = []) {
    this.rebuild(dataset);
  }

  rebuild(dataset: PositionRecord[]): void {
    this.trees.clear();
    this.positionMap.clear();

    for (const rec of dataset) {
      this.positionMap.set(rec.positionId, rec);
    }

    // signatureKey별로 (point, positionId) 수집
    const byKey = new Map<string, Array<{ point: Point6D; positionId: string }>>();

    for (const rec of dataset) {
      const seenKeys = new Set<string>();
      for (const entry of rec.strategies) {
        const key = makeSignatureKey(entry.signature);
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const point = ballsToPoint6D(rec.balls);
        const list = byKey.get(key) ?? [];
        list.push({ point, positionId: rec.positionId });
        byKey.set(key, list);
      }
    }

    for (const [key, items] of byKey) {
      this.trees.set(key, buildKDTree(items));
    }
  }

  searchTop1(
    signatureKey: string,
    balls: Ball3,
    opt?: SearchOptions
  ): Top1Result | null {
    const tree = this.trees.get(signatureKey);
    if (!tree) return null;

    const queryPoint = ballsToPoint6D(balls);
    const result = nearest(tree, queryPoint, opt?.maxDist2);
    if (!result) return null;

    const position = this.positionMap.get(result.positionId);
    if (!position) return null;

    console.log("[KD] signatureKey:", signatureKey);
    console.log("[KD] nearest positionId:", result.positionId, "dist2:", result.dist2);

    return {
      position,
      score: result.dist2,
      signatureKey,
    };
  }
}

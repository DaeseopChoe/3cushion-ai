/**
 * signatureKey - 전략 혼합 금지 게이트
 * KD-tree는 signatureKey별로 분리 관리
 */

import type { StrategySignature } from "../positionSearchEngine";

/**
 * StrategySignature → unique key
 * systemId, formulaHash, shotType만 사용 (save 로직과 일치)
 */
export function makeSignatureKey(sig: StrategySignature): string {
  return `${sig.systemId}__${sig.formulaHash}__${sig.shotType}`;
}

/**
 * signatureKey - 전략 혼합 금지 게이트
 * KD-tree는 signatureKey별로 분리 관리
 */

import type { StrategySignature } from "../positionSearchEngine";

/**
 * StrategySignature → persistence / Recall 검색용 고유 키.
 * UI 표현용 shotType은 객체에 보존되지만 키 문자열에는 포함하지 않음.
 */
export function makeSignatureKey(sig: StrategySignature): string {
  return `${sig.systemId}__${sig.formulaHash}`;
}

// frontend/src/domain/strategySignature.ts
import type { StrategySignature } from "./positionSearchEngine";

// formulaHash는 "expr 문자열 + logic 버전 + system_meta version" 등을 합쳐 해시/버전 문자열로 만드세요.
// 간단히는 profile.json의 version 필드가 있으면 그걸 쓰고, 없으면 expr을 해시.
export function makeSignature(args: {
  systemId: string;
  formulaHash: string;
  shotType: string;
}): StrategySignature {
  return {
    systemId: args.systemId,
    formulaHash: args.formulaHash,
    shotType: args.shotType,
  };
}

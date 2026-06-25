/**
 * 2-of-3 자동 풀이 (공식 문자열 + 세 키 튜플).
 * keys 순서는 공식 "C1 = CO - C3" 기준: [CO, C1, C3] 역할에 대응하는 실제 입력 키.
 */
export function solveTwoOfThree(
  inputs: Record<string, number>,
  keys: [string, string, string],
  formula: string
): Record<string, number> {
  const [k1, k2, k3] = keys;

  const v1 = inputs[k1];
  const v2 = inputs[k2];
  const v3 = inputs[k3];

  const has1 = Number.isFinite(v1);
  const has2 = Number.isFinite(v2);
  const has3 = Number.isFinite(v3);

  if ((has1 && has2) || (has1 && has3) || (has2 && has3)) {
    if (formula === "C1 = CO - C3") {
      if (!has2 && has1 && has3) {
        return { ...inputs, [k2]: v1 - v3 };
      }
      if (!has1 && has2 && has3) {
        return { ...inputs, [k1]: v2 + v3 };
      }
      if (!has3 && has1 && has2) {
        return { ...inputs, [k3]: v1 - v2 };
      }
    }
  }

  return inputs;
}

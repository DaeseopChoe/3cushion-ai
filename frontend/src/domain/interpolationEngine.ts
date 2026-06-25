// frontend/src/domain/interpolationEngine.ts
export function interpolateSysInputs(
  inputsList: Array<{ sysInputs: Record<string, number>; weight: number }>
): Record<string, number> {
  const out: Record<string, number> = {};
  const denom = inputsList.reduce((s, x) => s + x.weight, 0) || 1;

  // union keys
  const keys = new Set<string>();
  for (const x of inputsList)
    for (const k of Object.keys(x.sysInputs)) keys.add(k);

  for (const k of keys) {
    let num = 0;
    for (const x of inputsList) {
      const v = x.sysInputs[k] ?? 0;
      num += v * x.weight;
    }
    out[k] = num / denom;
  }
  return out;
}

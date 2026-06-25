export function applyEffectiveCorrection(
  baseValues: Record<string, number>,
  slide: number
): Record<string, number> {
  const co = Number(baseValues.CO);

  if (!Number.isFinite(co)) return baseValues;

  const coEff = co + (Number(slide) || 0);

  return {
    ...baseValues,
    CO_eff: coEff,
  };
}

export function computeSnPair(
  baseValues: Record<string, number>,
  effectiveValues: Record<string, number>
) {
  const co = Number(baseValues.CO);
  const c3 = Number(baseValues.C3);

  const coEff = Number(effectiveValues.CO_eff);
  const c3Eff = Number(effectiveValues.C3);

  if (
    !Number.isFinite(co) ||
    !Number.isFinite(c3) ||
    !Number.isFinite(coEff) ||
    !Number.isFinite(c3Eff)
  ) {
    return null;
  }

  const snBase = (co - 50) * 0.5;
  const c4Base = c3 + snBase;

  const snEff = (coEff - 50) * 0.5;
  const c4Eff = c3Eff + snEff;

  return {
    base: {
      Sn: snBase,
      C4: c4Base,
      C5: c4Base,
      C6: c4Base,
    },
    effective: {
      Sn: snEff,
      C4: c4Eff,
      C5: c4Eff,
      C6: c4Eff,
    },
  };
}

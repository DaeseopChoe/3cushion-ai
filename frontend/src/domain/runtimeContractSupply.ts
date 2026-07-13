/**
 * runtimeContractSupply.ts
 * Batch 6 STEP 6-5 — Domain Contract slice injection seam.
 *
 * App binds resolvers from Registry → SystemContract.
 * Domain never imports Runtime or data/systems (AD-B6-04 / AC-14).
 */

export type DomainAnchorsData = {
  trajectories?: Record<string, { anchors: { id: string }[] }>;
  meta?: Record<string, unknown>;
};

export type DomainContractSupply = {
  getFormulaExpr: (systemId: string) => string | null | undefined;
  getFormulaHash: (systemId: string) => string;
  getAnchorsData: (systemId: string) => DomainAnchorsData | undefined;
};

const DEFAULT_SUPPLY: DomainContractSupply = {
  getFormulaExpr: () => null,
  getFormulaHash: () => "v1",
  getAnchorsData: () => undefined,
};

let supply: DomainContractSupply = DEFAULT_SUPPLY;

/** App Orchestrator binds Contract-backed resolvers once (injection hub). */
export function bindDomainContractSupply(next: DomainContractSupply): void {
  supply = next;
}

export function resolveDomainFormulaExpr(
  systemId: string | null | undefined
): string | null {
  if (systemId == null || systemId === "") return null;
  const sid = systemId === "5_HALF" ? "5_half_system" : systemId;
  const expr = supply.getFormulaExpr(sid);
  return typeof expr === "string" && expr.trim() ? expr : null;
}

export function resolveDomainFormulaHash(
  systemId: string | null | undefined
): string {
  if (systemId == null || systemId === "") return "v1";
  const sid = systemId === "5_HALF" ? "5_half_system" : systemId;
  return supply.getFormulaHash(sid);
}

export function resolveDomainAnchorsData(
  systemId: string | null | undefined
): DomainAnchorsData | undefined {
  if (systemId == null || systemId === "") return undefined;
  const sid = systemId === "5_HALF" ? "5_half_system" : systemId;
  return supply.getAnchorsData(sid);
}

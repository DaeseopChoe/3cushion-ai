/**
 * STEP6-7B smoke — Catalog / Register load + Header validation.
 */
import { describe, expect, it } from "vitest";
import {
  HeaderValidationError,
  Ingress,
  ValidationEngine,
} from "./index";
import type { CatalogSource, RegisterSource } from "./models";

const catalogSource: CatalogSource = {
  header: {
    catalogVersion: "1.0",
    catalogRevision: "r1",
    compatibleSpsVersion: "SPS v1.0",
    compatibleFrameworkVersion: "v1.0",
    compatiblePipelineVersion: "v0.6",
    generatedFrom: "STEP6-4 Rule Catalog Design v0.2",
    lastUpdated: "2026-07-17",
  },
};

const registerSource: RegisterSource = {
  header: {
    catalogVersion: "1.0",
    catalogRevision: "r1",
    catalogPinId: "pin-1",
  },
  pin: {
    catalogPinId: "pin-1",
    catalogVersion: "1.0",
    catalogRevision: "r1",
    compatibleSpsVersion: "SPS v1.0",
    compatibleFrameworkVersion: "v1.0",
    compatiblePipelineVersion: "v0.6",
  },
  ruleRecords: [
    {
      ruleId: "RULE-DEMO-001",
      catalogVersion: "1.0",
      catalogRevision: "r1",
      registerState: "Active",
    },
  ],
};

describe("STEP6-7B Ingress Loader", () => {
  it("loads catalog/register and returns Planner payload on Header PASS", () => {
    const ingress = new Ingress();
    ingress.loadCatalog(catalogSource);
    ingress.loadRegister(registerSource);
    const payload = ingress.validateHeader();

    expect(payload).toMatchObject({
      kind: "ingress.validated",
      headerValidation: { status: "PASS" },
    });
    if (payload.kind !== "ingress.validated") throw new Error("unexpected");
    expect(payload.register.ruleRecords).toHaveLength(1);
    expect(payload.catalog.header.catalogVersion).toBe("1.0");
  });

  it("blocks on Framework version mismatch", () => {
    const ingress = new Ingress();
    ingress.loadCatalog({
      header: {
        ...catalogSource.header,
        compatibleFrameworkVersion: "v9.9",
      },
    });
    ingress.loadRegister(registerSource);
    expect(() => ingress.validateHeader()).toThrow(HeaderValidationError);
  });

  it("ValidationEngine delegates Loader methods", () => {
    const engine = new ValidationEngine();
    engine.loadCatalog(catalogSource);
    engine.loadRegister(registerSource);
    const payload = engine.validateHeader();
    expect(payload.kind).toBe("ingress.validated");
  });
});

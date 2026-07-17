/**
 * validation/engine/loaders/HeaderValidator.ts
 *
 * STEP6-7B — Header Metadata Validation (preflight).
 * Mismatch → BLOCKED (STEP6-6 §5.1 / §8.3). No Rule execution.
 */

import {
  ENGINE_COMPATIBILITY_BASELINE,
  type EngineCompatibilityBaseline,
} from "../baseline";
import { HeaderValidationError } from "../errors";
import type {
  CatalogView,
  HeaderValidationResult,
  IngressValidatedPayload,
  RegisterView,
} from "../models";

function versionsCompatible(declared: string, baseline: string): boolean {
  const a = declared.trim().toLowerCase();
  const b = baseline.trim().toLowerCase();
  if (a === b) return true;
  // Allow "SPS v1.0" vs embedded forms containing the baseline token.
  return a.includes(b) || b.includes(a);
}

export class HeaderValidator {
  constructor(
    private readonly baseline: EngineCompatibilityBaseline = ENGINE_COMPATIBILITY_BASELINE,
  ) {}

  /**
   * Validate Catalog Header · Register Header · Pin · compatibility.
   * On PASS returns Planner Ingress payload; on FAIL throws HeaderValidationError (BLOCKED).
   */
  validate(
    catalog: CatalogView,
    register: RegisterView,
  ): IngressValidatedPayload {
    const reasons: string[] = [];

    if (!catalog?.header) {
      reasons.push("Catalog Header does not exist");
    }
    if (!register?.header) {
      reasons.push("Register Header does not exist");
    }
    if (!register?.pin) {
      reasons.push("Catalog Pin information does not exist");
    }

    if (reasons.length > 0) {
      throw new HeaderValidationError(reasons);
    }

    const header = catalog.header;
    const regHeader = register.header;
    const pin = register.pin;

    // Header Metadata field presence (already loaded; re-check empty)
    const requiredHeaderFields: Array<keyof typeof header> = [
      "catalogVersion",
      "catalogRevision",
      "compatibleSpsVersion",
      "compatibleFrameworkVersion",
      "compatiblePipelineVersion",
      "generatedFrom",
      "lastUpdated",
    ];
    for (const field of requiredHeaderFields) {
      const value = header[field];
      if (value === undefined || value === null || value === "") {
        reasons.push(`Catalog Header Metadata invalid: ${field}`);
      }
    }

    // Revision confirmation
    if (!header.catalogRevision.trim()) {
      reasons.push("Catalog Revision is missing");
    }
    if (!regHeader.catalogRevision.trim()) {
      reasons.push("Register Header Catalog Revision is missing");
    }
    if (!pin.catalogRevision.trim()) {
      reasons.push("Pin Catalog Revision is missing");
    }

    // Pin information
    if (!pin.catalogPinId.trim()) {
      reasons.push("Pin catalogPinId is missing");
    }
    if (!regHeader.catalogPinId.trim()) {
      reasons.push("Register Header catalogPinId is missing");
    }
    if (
      pin.catalogPinId.trim() &&
      regHeader.catalogPinId.trim() &&
      pin.catalogPinId !== regHeader.catalogPinId
    ) {
      reasons.push(
        `Pin id mismatch: header.catalogPinId=${regHeader.catalogPinId} pin.catalogPinId=${pin.catalogPinId}`,
      );
    }

    // Version / Revision alignment: Catalog Header ↔ Register Header ↔ Pin
    if (header.catalogVersion !== regHeader.catalogVersion) {
      reasons.push(
        `Catalog Version mismatch: catalog=${header.catalogVersion} registerHeader=${regHeader.catalogVersion}`,
      );
    }
    if (header.catalogRevision !== regHeader.catalogRevision) {
      reasons.push(
        `Catalog Revision mismatch: catalog=${header.catalogRevision} registerHeader=${regHeader.catalogRevision}`,
      );
    }
    if (header.catalogVersion !== pin.catalogVersion) {
      reasons.push(
        `Catalog Version mismatch: catalog=${header.catalogVersion} pin=${pin.catalogVersion}`,
      );
    }
    if (header.catalogRevision !== pin.catalogRevision) {
      reasons.push(
        `Catalog Revision mismatch: catalog=${header.catalogRevision} pin=${pin.catalogRevision}`,
      );
    }

    // Compatible version preflight vs Engine baseline (STEP6-6 §8.3)
    if (
      !versionsCompatible(
        header.compatibleSpsVersion,
        this.baseline.compatibleSpsVersion,
      )
    ) {
      reasons.push(
        `Compatible SPS Version mismatch: catalog=${header.compatibleSpsVersion} engine=${this.baseline.compatibleSpsVersion}`,
      );
    }
    if (
      !versionsCompatible(
        header.compatibleFrameworkVersion,
        this.baseline.compatibleFrameworkVersion,
      )
    ) {
      reasons.push(
        `Compatible Framework Version mismatch: catalog=${header.compatibleFrameworkVersion} engine=${this.baseline.compatibleFrameworkVersion}`,
      );
    }
    if (
      !versionsCompatible(
        header.compatiblePipelineVersion,
        this.baseline.compatiblePipelineVersion,
      )
    ) {
      reasons.push(
        `Compatible Validation Pipeline Version mismatch: catalog=${header.compatiblePipelineVersion} engine=${this.baseline.compatiblePipelineVersion}`,
      );
    }

    // Pin must cite same compatibility set as Catalog Header (cite-only)
    if (pin.compatibleSpsVersion !== header.compatibleSpsVersion) {
      reasons.push(
        `Pin compatibleSpsVersion does not cite Catalog Header (${pin.compatibleSpsVersion} ≠ ${header.compatibleSpsVersion})`,
      );
    }
    if (pin.compatibleFrameworkVersion !== header.compatibleFrameworkVersion) {
      reasons.push(
        `Pin compatibleFrameworkVersion does not cite Catalog Header (${pin.compatibleFrameworkVersion} ≠ ${header.compatibleFrameworkVersion})`,
      );
    }
    if (pin.compatiblePipelineVersion !== header.compatiblePipelineVersion) {
      reasons.push(
        `Pin compatiblePipelineVersion does not cite Catalog Header (${pin.compatiblePipelineVersion} ≠ ${header.compatiblePipelineVersion})`,
      );
    }

    if (reasons.length > 0) {
      throw new HeaderValidationError(reasons);
    }

    const headerValidation: HeaderValidationResult = {
      status: "PASS",
      reasons: [],
    };

    return {
      kind: "ingress.validated",
      catalog,
      register,
      headerValidation,
    };
  }
}

/**
 * validation/engine/loaders/CatalogLoader.ts
 *
 * STEP6-7B — Catalog Loader (L-Ingress).
 * Reads Catalog Header Metadata; does not execute Rules.
 */

import { IngressLoadError } from "../errors";
import type { CatalogHeader, CatalogSource, CatalogView } from "../models";

function requireNonEmptyString(
  value: unknown,
  field: string,
  errors: string[],
): value is string {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`Catalog Header missing or empty: ${field}`);
    return false;
  }
  return true;
}

function requireGeneratedFrom(
  value: unknown,
  errors: string[],
): value is string | string[] {
  if (typeof value === "string" && value.trim() !== "") return true;
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((v) => typeof v === "string" && v.trim() !== "")
  ) {
    return true;
  }
  errors.push("Catalog Header missing or empty: generatedFrom");
  return false;
}

/** Validate required Catalog Header fields (STEP6-4 §9.5.1). */
export function readCatalogHeader(raw: unknown): CatalogHeader {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new IngressLoadError(
      "CATALOG_HEADER_MISSING",
      "Catalog Header does not exist",
    );
  }

  const h = raw as Record<string, unknown>;
  const errors: string[] = [];

  requireNonEmptyString(h.catalogVersion, "catalogVersion", errors);
  requireNonEmptyString(h.catalogRevision, "catalogRevision", errors);
  requireNonEmptyString(h.compatibleSpsVersion, "compatibleSpsVersion", errors);
  requireNonEmptyString(
    h.compatibleFrameworkVersion,
    "compatibleFrameworkVersion",
    errors,
  );
  requireNonEmptyString(
    h.compatiblePipelineVersion,
    "compatiblePipelineVersion",
    errors,
  );
  requireGeneratedFrom(h.generatedFrom, errors);
  requireNonEmptyString(h.lastUpdated, "lastUpdated", errors);

  if (errors.length > 0) {
    throw new IngressLoadError(
      "CATALOG_HEADER_INVALID",
      errors.join("; "),
    );
  }

  const header: CatalogHeader = {
    catalogVersion: String(h.catalogVersion).trim(),
    catalogRevision: String(h.catalogRevision).trim(),
    compatibleSpsVersion: String(h.compatibleSpsVersion).trim(),
    compatibleFrameworkVersion: String(h.compatibleFrameworkVersion).trim(),
    compatiblePipelineVersion: String(h.compatiblePipelineVersion).trim(),
    generatedFrom: h.generatedFrom as string | string[],
    lastUpdated: String(h.lastUpdated).trim(),
  };

  if (typeof h.status === "string") {
    header.status = h.status as CatalogHeader["status"];
  }
  if (typeof h.catalogPinId === "string" && h.catalogPinId.trim() !== "") {
    header.catalogPinId = h.catalogPinId.trim();
  }

  return header;
}

export class CatalogLoader {
  /**
   * Load Catalog snapshot (Consume Only).
   * Confirms Version · Revision · Compatible SPS/Framework/Pipeline fields are present.
   */
  load(source: CatalogSource): CatalogView {
    if (!source || typeof source !== "object") {
      throw new IngressLoadError(
        "CATALOG_SOURCE_MISSING",
        "Catalog source is required",
      );
    }

    const header = readCatalogHeader(source.header);

    return {
      header,
      body: source.body,
    };
  }
}

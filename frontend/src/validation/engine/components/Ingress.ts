/**
 * validation/engine/components/Ingress.ts
 *
 * STEP6-7B — Ingress (L-Ingress): Catalog / Register load + Header validation.
 * Passes validated payload to Planner. No Rule resolve / execute.
 */

import type { IIngress } from "../interfaces";
import {
  CatalogLoader,
  HeaderValidator,
  RegisterLoader,
} from "../loaders";
import type {
  CatalogSource,
  CatalogView,
  IngressValidatedPayload,
  RegisterSource,
  RegisterView,
} from "../models";
import type { EnginePayload } from "../types";
import { IngressLoadError } from "../errors";

function asCatalogView(payload: EnginePayload): CatalogView {
  if (
    payload !== null &&
    typeof payload === "object" &&
    "header" in payload &&
    (payload as CatalogView).header != null
  ) {
    return payload as CatalogView;
  }
  throw new IngressLoadError(
    "CATALOG_VIEW_EXPECTED",
    "validateHeader expects CatalogView from loadCatalog()",
  );
}

function asRegisterView(payload: EnginePayload): RegisterView {
  if (
    payload !== null &&
    typeof payload === "object" &&
    "header" in payload &&
    "pin" in payload &&
    "ruleRecords" in payload
  ) {
    return payload as RegisterView;
  }
  throw new IngressLoadError(
    "REGISTER_VIEW_EXPECTED",
    "validateHeader expects RegisterView from loadRegister()",
  );
}

export class Ingress implements IIngress {
  readonly catalogLoader: CatalogLoader;
  readonly registerLoader: RegisterLoader;
  readonly headerValidator: HeaderValidator;

  private catalogView: CatalogView | null = null;
  private registerView: RegisterView | null = null;
  private validatedPayload: IngressValidatedPayload | null = null;

  constructor(
    catalogLoader: CatalogLoader = new CatalogLoader(),
    registerLoader: RegisterLoader = new RegisterLoader(),
    headerValidator: HeaderValidator = new HeaderValidator(),
  ) {
    this.catalogLoader = catalogLoader;
    this.registerLoader = registerLoader;
    this.headerValidator = headerValidator;
  }

  /**
   * Catalog Loader — Header Version / Revision / Compatible * fields.
   * Source required (Consume Only snapshot).
   */
  loadCatalog(source?: CatalogSource): EnginePayload {
    if (!source) {
      throw new IngressLoadError(
        "CATALOG_SOURCE_REQUIRED",
        "loadCatalog requires CatalogSource (Consume Only)",
      );
    }
    this.catalogView = this.catalogLoader.load(source);
    this.validatedPayload = null;
    return this.catalogView;
  }

  /**
   * Register Loader — Header · metadata · Pin · Rule Record list · Register State.
   */
  loadRegister(source?: RegisterSource): EnginePayload {
    if (!source) {
      throw new IngressLoadError(
        "REGISTER_SOURCE_REQUIRED",
        "loadRegister requires RegisterSource (Consume Only)",
      );
    }
    this.registerView = this.registerLoader.load(source);
    this.validatedPayload = null;
    return this.registerView;
  }

  /**
   * Header Metadata Validation preflight.
   * Returns Planner-facing IngressValidatedPayload on PASS; throws BLOCKED on FAIL.
   */
  validateHeader(
    catalog?: EnginePayload,
    register?: EnginePayload,
  ): EnginePayload {
    const catalogView =
      catalog !== undefined ? asCatalogView(catalog) : this.catalogView;
    const registerView =
      register !== undefined ? asRegisterView(register) : this.registerView;

    if (!catalogView) {
      throw new IngressLoadError(
        "CATALOG_NOT_LOADED",
        "Catalog must be loaded before validateHeader",
      );
    }
    if (!registerView) {
      throw new IngressLoadError(
        "REGISTER_NOT_LOADED",
        "Register must be loaded before validateHeader",
      );
    }

    this.catalogView = catalogView;
    this.registerView = registerView;
    this.validatedPayload = this.headerValidator.validate(
      catalogView,
      registerView,
    );
    return this.validatedPayload;
  }

  /** Last validated Planner payload (null until successful validateHeader). */
  getValidatedPayload(): IngressValidatedPayload | null {
    return this.validatedPayload;
  }

  getCatalogView(): CatalogView | null {
    return this.catalogView;
  }

  getRegisterView(): RegisterView | null {
    return this.registerView;
  }
}

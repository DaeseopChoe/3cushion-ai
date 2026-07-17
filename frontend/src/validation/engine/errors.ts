/**
 * validation/engine/errors.ts
 *
 * STEP6-7B — Ingress / Header validation errors.
 */

export class IngressLoadError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "IngressLoadError";
    this.code = code;
  }
}

export class HeaderValidationError extends Error {
  readonly code = "HEADER_VALIDATION_BLOCKED";
  readonly reasons: string[];

  constructor(reasons: string[]) {
    super(`Header validation BLOCKED: ${reasons.join("; ")}`);
    this.name = "HeaderValidationError";
    this.reasons = reasons;
  }
}

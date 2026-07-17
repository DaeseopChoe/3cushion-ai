/**
 * validation/engine/plan/CoverageFilter.ts
 *
 * STEP6-7C — CoverageClass filter (STEP6-6 §9.1).
 * Required | Optional → In-Run; Deferred → Deferred path.
 */

import type { RuleRecordView } from "../models";
import type { CoverageClass } from "./planModels";

export interface CoverageFilterResult {
  inRun: RuleRecordView[];
  deferred: RuleRecordView[];
  /** Active rules with unknown / unsupported coverageClass. */
  unknown: RuleRecordView[];
}

function normalizeCoverageClass(raw: string | undefined): CoverageClass | null {
  if (raw === undefined || raw.trim() === "") {
    // Lean default: treat missing as Required (In-Run) until Catalog Freeze locks defaults.
    return "Required";
  }
  const v = raw.trim();
  if (v === "Required" || v === "Optional" || v === "Deferred") return v;
  const lower = v.toLowerCase();
  if (lower === "required") return "Required";
  if (lower === "optional") return "Optional";
  if (lower === "deferred") return "Deferred";
  return null;
}

export class CoverageFilter {
  /**
   * Split Active rules by CoverageClass.
   * Does not execute Rules; does not schedule.
   */
  filter(activeRules: readonly RuleRecordView[]): CoverageFilterResult {
    const inRun: RuleRecordView[] = [];
    const deferred: RuleRecordView[] = [];
    const unknown: RuleRecordView[] = [];

    for (const rule of activeRules) {
      const coverage = normalizeCoverageClass(rule.coverageClass);
      if (coverage === "Required" || coverage === "Optional") {
        inRun.push(rule);
      } else if (coverage === "Deferred") {
        deferred.push(rule);
      } else {
        unknown.push(rule);
      }
    }

    return { inRun, deferred, unknown };
  }
}

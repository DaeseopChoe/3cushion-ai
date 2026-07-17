/**
 * validation/engine/plan/ActiveRuleResolver.ts
 *
 * STEP6-7C — Select registerState=Active only (STEP6-6 §9.1).
 * Deprecated is NOT included by default (policy later).
 */

import type { RuleRecordView } from "../models";

export class ActiveRuleResolver {
  /**
   * Inventory → Active set.
   * Excludes Draft · Proposed · Approved · Deprecated · Archived.
   */
  resolve(ruleRecords: readonly RuleRecordView[]): RuleRecordView[] {
    return ruleRecords.filter((r) => r.registerState === "Active");
  }
}

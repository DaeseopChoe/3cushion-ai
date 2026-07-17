/**
 * validation/engine/plan/resolveDependencyIndex.ts
 *
 * STEP6-7C — Read Register Dependency Index / per-rule overrides (Consume Only).
 */

import type { RuleRecordView } from "../models";
import type { RuleDependencyOverride } from "./planModels";

function asOverride(raw: unknown): RuleDependencyOverride | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.ruleId !== "string" || o.ruleId.trim() === "") return null;

  const override: RuleDependencyOverride = { ruleId: o.ruleId.trim() };
  if (typeof o.inheritsLayerCascade === "boolean") {
    override.inheritsLayerCascade = o.inheritsLayerCascade;
  }
  if (Array.isArray(o.prerequisites)) {
    override.prerequisites = o.prerequisites.filter(
      (p): p is string => typeof p === "string" && p.trim() !== "",
    );
  }
  if (typeof o.skipWhen === "string") override.skipWhen = o.skipWhen;
  if (typeof o.blockingCandidate === "boolean") {
    override.blockingCandidate = o.blockingCandidate;
  }
  return override;
}

/**
 * Merge Dependency Index entries with optional fields embedded on RuleRecordView.
 */
export function resolveDependencyOverrides(
  rules: readonly RuleRecordView[],
  dependencyIndex: unknown,
): Map<string, RuleDependencyOverride> {
  const map = new Map<string, RuleDependencyOverride>();

  for (const rule of rules) {
    const embedded = rule as RuleRecordView & {
      inheritsLayerCascade?: boolean;
      prerequisites?: string[];
      skipWhen?: string;
      blockingCandidate?: boolean;
    };
    const base: RuleDependencyOverride = { ruleId: rule.ruleId };
    if (typeof embedded.inheritsLayerCascade === "boolean") {
      base.inheritsLayerCascade = embedded.inheritsLayerCascade;
    }
    if (Array.isArray(embedded.prerequisites)) {
      base.prerequisites = embedded.prerequisites.filter(
        (p): p is string => typeof p === "string" && p.trim() !== "",
      );
    }
    if (typeof embedded.skipWhen === "string") base.skipWhen = embedded.skipWhen;
    if (typeof embedded.blockingCandidate === "boolean") {
      base.blockingCandidate = embedded.blockingCandidate;
    }
    map.set(rule.ruleId, base);
  }

  const entries: unknown[] = Array.isArray(dependencyIndex)
    ? dependencyIndex
    : dependencyIndex !== null &&
        typeof dependencyIndex === "object" &&
        Array.isArray((dependencyIndex as { entries?: unknown }).entries)
      ? ((dependencyIndex as { entries: unknown[] }).entries)
      : [];

  for (const raw of entries) {
    const override = asOverride(raw);
    if (!override) continue;
    const prev = map.get(override.ruleId) ?? { ruleId: override.ruleId };
    map.set(override.ruleId, { ...prev, ...override, ruleId: override.ruleId });
  }

  return map;
}

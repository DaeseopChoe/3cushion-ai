/**
 * Canonical persist validation + sysInputs boundary audit (PR 2b).
 * Read-only inspection — does not change trajectory/render pipelines.
 */

import {
  CANONICAL_STRIP_EFFECTIVE_SYS_INPUT_KEYS,
  CANONICAL_STRIP_SYS_INPUT_KEYS,
  CANONICAL_STRIP_TOP_LEVEL_KEYS,
} from "./canonicalStrategy";

export const CANONICAL_REQUIRED_STRATEGY_KEYS = [
  "slot",
  "signature",
  "sysInputs",
  "corrections",
  "meta",
] as const;

export const CANONICAL_REQUIRED_RECORD_KEYS = [
  "positionId",
  "balls",
  "strategies",
  "schemaVersion",
] as const;

/** Keys that must never appear in persisted dataset (deep walk) */
export const CANONICAL_FORBIDDEN_KEYS = new Set([
  ...CANONICAL_STRIP_TOP_LEVEL_KEYS,
  "trajectory",
  "trajectorySamples",
  "render_cache",
  "renderCache",
  "outputs.result",
]);

/** Allowed on persisted StrategyEntry despite strip list (persist markers) */
const ALLOWED_PERSIST_KEYS = new Set(["correctionsStored"]);

const ALLOWED_STRATEGY_EXTRA_KEYS = new Set([
  "track",
  "hpT",
  "str",
  "ai",
  "correctionsStored",
]);

/** DEV: `window.__CANONICAL_DEBUG__ = true` for verbose SAVE/audit logs */
export function isCanonicalDebugVerbose(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    const w =
      typeof globalThis !== "undefined"
        ? (globalThis as { __CANONICAL_DEBUG__?: boolean })
        : undefined;
    if (w?.__CANONICAL_DEBUG__) return true;
    if (typeof window !== "undefined") {
      return !!(window as { __CANONICAL_DEBUG__?: boolean }).__CANONICAL_DEBUG__;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** Gated console.log for canonical SAVE boundary debugging */
export function canonicalDebugLog(...args: unknown[]): void {
  if (isCanonicalDebugVerbose()) {
    console.log(...args);
  }
}

export type ValidateStrategyResult = {
  ok: boolean;
  missing: string[];
  forbidden: string[];
};

export type ValidateDatasetResult = {
  ok: boolean;
  issues: Array<{ path: string; kind: "missing" | "forbidden" }>;
};

export type SysInputsBoundaryAudit = {
  onlyInAdmin: string[];
  onlyInApplied: string[];
  onlyInCanonical: string[];
  sharedKeys: string[];
  suspectedEffectiveKeys: string[];
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function sortedKeys(obj: Record<string, unknown> | null | undefined): string[] {
  if (!obj || typeof obj !== "object") return [];
  return Object.keys(obj).sort();
}

/** Deep walk; report paths where key matches forbidden set */
export function findForbiddenKeyPaths(
  value: unknown,
  path = "",
  out: string[] = []
): string[] {
  if (value == null) return out;
  if (Array.isArray(value)) {
    value.forEach((item, i) => findForbiddenKeyPaths(item, `${path}[${i}]`, out));
    return out;
  }
  if (!isPlainObject(value)) return out;

  for (const [k, v] of Object.entries(value)) {
    const p = path ? `${path}.${k}` : k;
    if (CANONICAL_FORBIDDEN_KEYS.has(k) && !ALLOWED_PERSIST_KEYS.has(k)) {
      if (k === "shotType" && path.endsWith("signature")) continue;
      if (k === "schemaVersion" && !path.includes(".strategies")) continue;
      out.push(p);
    }
    if (k === "outputs" && isPlainObject(v)) {
      for (const ok of Object.keys(v)) {
        const op = `${p}.${ok}`;
        if (CANONICAL_FORBIDDEN_KEYS.has(`outputs.${ok}`) || ok === "result" || ok === "debug") {
          out.push(op);
        }
      }
    }
    findForbiddenKeyPaths(v, p, out);
  }
  return out;
}

export function validateCanonicalStrategyEntry(entry: unknown): ValidateStrategyResult {
  const missing: string[] = [];
  const forbidden: string[] = [];

  if (!isPlainObject(entry)) {
    return { ok: false, missing: [...CANONICAL_REQUIRED_STRATEGY_KEYS], forbidden: [] };
  }

  for (const key of CANONICAL_REQUIRED_STRATEGY_KEYS) {
    if (!(key in entry)) missing.push(key);
  }

  const sig = entry.signature;
  if (!isPlainObject(sig)) {
    missing.push("signature.systemId");
    missing.push("signature.formulaHash");
    missing.push("signature.shotType");
  } else {
    if (typeof sig.systemId !== "string") missing.push("signature.systemId");
    if (typeof sig.formulaHash !== "string") missing.push("signature.formulaHash");
    if (typeof sig.shotType !== "string") missing.push("signature.shotType");
  }

  if (!("corrections" in entry)) {
    missing.push("corrections");
  }

  forbidden.push(...findForbiddenKeyPaths(entry));

  for (const k of Object.keys(entry)) {
    if (
      CANONICAL_REQUIRED_STRATEGY_KEYS.includes(k as (typeof CANONICAL_REQUIRED_STRATEGY_KEYS)[number]) ||
      ALLOWED_STRATEGY_EXTRA_KEYS.has(k)
    ) {
      continue;
    }
    if (!forbidden.some((f) => f === `strategy.${k}` || f.endsWith(`.${k}`))) {
      // unknown top-level keys are not auto-forbidden (hpT/str variants)
    }
  }

  return { ok: missing.length === 0 && forbidden.length === 0, missing, forbidden };
}

export function validateCanonicalDataset(dataset: unknown): ValidateDatasetResult {
  const issues: ValidateDatasetResult["issues"] = [];

  if (!Array.isArray(dataset)) {
    return { ok: false, issues: [{ path: "dataset", kind: "missing" }] };
  }

  dataset.forEach((rec, ri) => {
    const base = `records[${ri}]`;
    if (!isPlainObject(rec)) {
      issues.push({ path: base, kind: "missing" });
      return;
    }

    for (const key of CANONICAL_REQUIRED_RECORD_KEYS) {
      if (!(key in rec)) issues.push({ path: `${base}.${key}`, kind: "missing" });
    }

    for (const fp of findForbiddenKeyPaths(rec, base)) {
      issues.push({ path: fp, kind: "forbidden" });
    }

    const strategies = rec.strategies;
    if (isPlainObject(strategies)) {
      for (const [slotId, ent] of Object.entries(strategies)) {
        const v = validateCanonicalStrategyEntry(ent);
        for (const m of v.missing) {
          issues.push({ path: `${base}.strategies.${slotId}.${m}`, kind: "missing" });
        }
        for (const f of v.forbidden) {
          issues.push({
            path: `${base}.strategies.${slotId}${f ? `.${f}` : ""}`,
            kind: "forbidden",
          });
        }
      }
    }
  });

  return { ok: issues.length === 0, issues };
}

export function auditSysInputsBoundary(args: {
  adminInputs?: Record<string, unknown> | null;
  appliedInputs?: Record<string, unknown> | null;
  canonicalSysInputs?: Record<string, number> | null;
  adminCorrections?: unknown;
  systemValues?: Record<string, unknown> | null;
}): SysInputsBoundaryAudit {
  const admin = sortedKeys(args.adminInputs ?? undefined);
  const applied = sortedKeys(args.appliedInputs ?? undefined);
  const canonical = sortedKeys(
    (args.canonicalSysInputs ?? undefined) as Record<string, unknown> | undefined
  );

  const adminSet = new Set(admin);
  const appliedSet = new Set(applied);
  const canonicalSet = new Set(canonical);

  const onlyInAdmin = admin.filter((k) => !appliedSet.has(k) && !canonicalSet.has(k));
  const onlyInApplied = applied.filter((k) => !adminSet.has(k) && !canonicalSet.has(k));
  const onlyInCanonical = canonical.filter((k) => !adminSet.has(k) && !appliedSet.has(k));
  const sharedKeys = canonical.filter((k) => adminSet.has(k) || appliedSet.has(k));

  const suspectedEffectiveKeys = canonical.filter(
    (k) =>
      CANONICAL_STRIP_EFFECTIVE_SYS_INPUT_KEYS.has(k) ||
      CANONICAL_STRIP_SYS_INPUT_KEYS.has(k)
  );

  return {
    onlyInAdmin,
    onlyInApplied,
    onlyInCanonical,
    sharedKeys,
    suspectedEffectiveKeys,
  };
}

/** DEV: log persist validation + boundary audit for one save */
export function logCanonicalPersistAudit(args: {
  slotId: string;
  strategy: unknown;
  dataset: unknown;
  boundary: Parameters<typeof auditSysInputsBoundary>[0];
  effectiveRenderKeys?: string[];
}): void {
  if (!import.meta.env.DEV) return;

  const strategyValidation = validateCanonicalStrategyEntry(args.strategy);
  const datasetValidation = validateCanonicalDataset(args.dataset);
  const boundaryAudit = auditSysInputsBoundary(args.boundary);

  const stripCandidatesInCanonical = sortedKeys(
    args.boundary.canonicalSysInputs as Record<string, unknown> | undefined
  ).filter((k) => CANONICAL_STRIP_SYS_INPUT_KEYS.has(k));

  const hasIssue =
    !strategyValidation.ok ||
    !datasetValidation.ok ||
    boundaryAudit.suspectedEffectiveKeys.length > 0 ||
    stripCandidatesInCanonical.length > 0;

  if (!isCanonicalDebugVerbose()) {
    if (hasIssue) {
      console.warn("[CANONICAL_PAYLOAD_VALIDATE]", {
        slotId: args.slotId,
        strategyOk: strategyValidation.ok,
        datasetOk: datasetValidation.ok,
        strategyForbidden: strategyValidation.forbidden.slice(0, 10),
        strategyMissing: strategyValidation.missing,
        datasetIssueCount: datasetValidation.issues.length,
        suspectedEffectiveKeys: boundaryAudit.suspectedEffectiveKeys,
        stripCandidatesInCanonical,
      });
    }
    return;
  }

  console.log("[CANONICAL_PAYLOAD_VALIDATE]", {
    slotId: args.slotId,
    strategy: {
      ok: strategyValidation.ok,
      missing: strategyValidation.missing,
      forbidden: strategyValidation.forbidden,
    },
    dataset: {
      ok: datasetValidation.ok,
      issueCount: datasetValidation.issues.length,
      issues: datasetValidation.issues.slice(0, 5),
    },
  });

  console.log("[SYSINPUTS_AUDIT]", {
    suspectedEffectiveKeys: boundaryAudit.suspectedEffectiveKeys,
    onlyInAdmin: boundaryAudit.onlyInAdmin,
    onlyInApplied: boundaryAudit.onlyInApplied,
    onlyInCanonical: boundaryAudit.onlyInCanonical,
  });

  if (args.effectiveRenderKeys?.length) {
    console.log("[EFFECTIVE_RENDER_AUDIT]", {
      count: args.effectiveRenderKeys.length,
    });
  }

  if (stripCandidatesInCanonical.length > 0) {
    console.warn("[STRIP_CANDIDATES_IN_CANONICAL]", stripCandidatesInCanonical);
  }
}

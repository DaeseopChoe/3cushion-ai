/**
 * validation/engine/full/SystemPackageRuleJudge.ts
 *
 * STEP6-9 — RuleJudge bound to a real system package (Consume Only).
 * Evaluates STEP6-4 seed Rules against package files + system_meta.schema.
 * Does not mutate System JSON.
 */

import type { RuleJudge, RuleJudgeContext, RuleJudgeOutcome } from "../execution/RuleJudge";
import type { QueueItem } from "../schedule/scheduleModels";

export interface SystemPackageFiles {
  systemId: string;
  systemMeta: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
  logic: Record<string, unknown> | null;
  anchors: Record<string, unknown> | null;
  /** Required property names from system_meta.schema.json */
  metaRequiredFields: string[];
  /** Allowed family enum from system_meta.schema.json */
  metaFamilyEnum: string[];
}

function fail(
  message: string,
  severity: "BLOCKER" | "ERROR" | "WARNING" = "ERROR",
  evidence?: unknown,
): RuleJudgeOutcome {
  return {
    status: "FAILED",
    severity,
    evidence,
    error: { message, code: "SCHEMA_RULE_FAILED" },
  };
}

function pass(evidence?: unknown): RuleJudgeOutcome {
  return { status: "PASS", evidence };
}

/**
 * Maps Full Validation Rule IDs to package checks.
 * Unknown ruleIds → PASS with note (no invented semantics).
 */
export class SystemPackageRuleJudge implements RuleJudge {
  constructor(private readonly pkg: SystemPackageFiles) {}

  judge(item: QueueItem, _context: RuleJudgeContext): RuleJudgeOutcome {
    switch (item.ruleId) {
      case "SCH-FV-L1-PKG-PRESENCE":
        return this.judgePackagePresence();
      case "SCH-FV-L2-SYN-PARSE":
        return this.judgeSyntaxParse();
      case "SCH-FV-L3-STR-SHAPE":
        return this.judgeStructureShape();
      case "SCH-FV-L4-FLD-PRESENCE":
        return this.judgeFieldPresence();
      case "SCH-FV-L4-FLD-TYPING":
        return this.judgeFieldTyping();
      case "SCH-FV-L4-FLD-DOMAIN":
        return this.judgeFieldDomain();
      case "SCH-FV-L5-REF-RESOLVE":
        return this.judgeReferenceResolve();
      case "SCH-FV-L6-XFILE-CONS":
        return this.judgeCrossFileConsistency();
      default:
        return pass({
          judge: "SystemPackageRuleJudge",
          note: `No bound check for ${item.ruleId}`,
        });
    }
  }

  private judgePackagePresence(): RuleJudgeOutcome {
    const missing: string[] = [];
    if (!this.pkg.systemMeta) missing.push("system_meta.json");
    if (!this.pkg.profile) missing.push("profile.json");
    if (!this.pkg.logic) missing.push("logic.json");
    if (!this.pkg.anchors) missing.push("anchors.json");
    if (missing.length > 0) {
      return fail(
        `Package files missing: ${missing.join(", ")}`,
        "BLOCKER",
        { missing },
      );
    }
    return pass({ files: ["system_meta", "profile", "logic", "anchors"] });
  }

  private judgeSyntaxParse(): RuleJudgeOutcome {
    // Files already loaded as objects — parse success.
    const bad: string[] = [];
    for (const [name, value] of [
      ["system_meta", this.pkg.systemMeta],
      ["profile", this.pkg.profile],
      ["logic", this.pkg.logic],
      ["anchors", this.pkg.anchors],
    ] as const) {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        bad.push(name);
      }
    }
    if (bad.length > 0) {
      return fail(`JSON structure not object: ${bad.join(", ")}`, "BLOCKER", {
        bad,
      });
    }
    return pass({ parsed: true });
  }

  private judgeStructureShape(): RuleJudgeOutcome {
    const meta = this.pkg.systemMeta;
    if (!meta) {
      return fail("system_meta.json absent", "BLOCKER");
    }
    const keys = Object.keys(meta);
    if (keys.length === 0) {
      return fail("system_meta.json has no keys", "ERROR");
    }
    return pass({ keyCount: keys.length });
  }

  private judgeFieldPresence(): RuleJudgeOutcome {
    const meta = this.pkg.systemMeta;
    if (!meta) return fail("system_meta.json absent", "BLOCKER");
    const missing = this.pkg.metaRequiredFields.filter(
      (f) => meta[f] === undefined || meta[f] === null || meta[f] === "",
    );
    if (missing.length > 0) {
      return fail(
        `Required meta fields missing: ${missing.join(", ")}`,
        "ERROR",
        { missing },
      );
    }
    return pass({ required: this.pkg.metaRequiredFields });
  }

  private judgeFieldTyping(): RuleJudgeOutcome {
    const meta = this.pkg.systemMeta;
    if (!meta) return fail("system_meta.json absent", "BLOCKER");
    const issues: string[] = [];
    if (typeof meta.system_id !== "string") issues.push("system_id:string");
    if (typeof meta.family !== "string") issues.push("family:string");
    if (typeof meta.required_cushions !== "number") {
      issues.push("required_cushions:number");
    }
    if (typeof meta.canonical_track !== "string") {
      issues.push("canonical_track:string");
    }
    if (typeof meta.entry_rail !== "string") issues.push("entry_rail:string");
    if (typeof meta.exit_rail !== "string") issues.push("exit_rail:string");
    if (issues.length > 0) {
      return fail(`Type mismatches: ${issues.join(", ")}`, "ERROR", { issues });
    }
    return pass({ typed: true });
  }

  private judgeFieldDomain(): RuleJudgeOutcome {
    const meta = this.pkg.systemMeta;
    if (!meta) return fail("system_meta.json absent", "BLOCKER");
    const family = meta.family;
    if (typeof family !== "string") {
      return fail("family not a string", "ERROR");
    }
    if (!this.pkg.metaFamilyEnum.includes(family)) {
      return fail(
        `family "${family}" not in system_meta.schema enum`,
        "ERROR",
        {
          family,
          allowed: this.pkg.metaFamilyEnum,
          schema: "system_meta.schema.json",
        },
      );
    }
    return pass({ family });
  }

  private judgeReferenceResolve(): RuleJudgeOutcome {
    const meta = this.pkg.systemMeta;
    if (!meta) return fail("system_meta.json absent", "BLOCKER");
    const systemId = meta.system_id;
    if (typeof systemId !== "string" || systemId !== this.pkg.systemId) {
      return fail(
        `system_id "${String(systemId)}" does not match folder "${this.pkg.systemId}"`,
        "ERROR",
        { systemId, folder: this.pkg.systemId },
      );
    }
    return pass({ systemId });
  }

  private judgeCrossFileConsistency(): RuleJudgeOutcome {
    const meta = this.pkg.systemMeta;
    const profile = this.pkg.profile;
    if (!meta || !profile) {
      return fail("meta/profile absent for cross-file check", "ERROR");
    }
    const metaId = meta.system_id;
    const profileSystem = profile.system ?? profile.system_id;
    if (metaId !== profileSystem) {
      return fail(
        `Cross-file system id mismatch: meta=${String(metaId)} profile=${String(profileSystem)}`,
        "ERROR",
        { metaId, profileSystem },
      );
    }
    return pass({ metaId, profileSystem });
  }
}

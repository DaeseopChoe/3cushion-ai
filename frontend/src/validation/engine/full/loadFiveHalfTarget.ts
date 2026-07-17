/**
 * validation/engine/full/loadFiveHalfTarget.ts
 *
 * STEP6-9 — Load 5_half_system package + system_meta.schema (Consume Only).
 */

import anchors from "../../../data/systems/5_half_system/anchors.json";
import logic from "../../../data/systems/5_half_system/logic.json";
import profile from "../../../data/systems/5_half_system/profile.json";
import systemMeta from "../../../data/systems/5_half_system/system_meta.json";
import metaSchema from "../../../data/systems/schema/system_meta.schema.json";
import type { SystemPackageFiles } from "./SystemPackageRuleJudge";
import { FULL_TARGET_SYSTEM_ID } from "./fullDataset";

export function loadFiveHalfTarget(): SystemPackageFiles {
  const required = metaSchema.required ?? [];
  const familyEnum =
    (metaSchema.properties?.family as { enum?: string[] } | undefined)?.enum ??
    [];

  return {
    systemId: FULL_TARGET_SYSTEM_ID,
    systemMeta: systemMeta as Record<string, unknown>,
    profile: profile as Record<string, unknown>,
    logic: logic as Record<string, unknown>,
    anchors: anchors as Record<string, unknown>,
    metaRequiredFields: [...required],
    metaFamilyEnum: [...familyEnum],
  };
}

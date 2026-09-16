/**
 * Phase 2 — Published edit session identity (presentation/session only).
 * familyId is UPDATE ownership SSOT. Never uses coordinates / positionId.
 * Does not perform published leaf replacement (Phase 3).
 */

import {
  resolveExplicitFamilyIdentityForUpdate,
  type FamilyIdentitySource,
  type FamilySaveIntent,
} from "./familyIdentity";
import type { PositionRecord } from "../positionSearchEngine";

function trimId(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

/** Read familyId from a published/local record for the active slot (no invent). */
export function readFamilyIdFromRecordSlot(
  record: PositionRecord | null | undefined,
  slotId: string
): string | null {
  if (!record || !slotId) return null;
  const entry = record.strategies?.[slotId as "S1" | "S2" | "S3"];
  if (!entry) return null;
  const familyId = trimId(entry.familyId);
  return familyId || null;
}

/**
 * Resolve SAVE requestedIntent for published edit sessions.
 *
 * - No session family → null (defer to existing FamilySavePolicy / slot identity)
 * - Session + matching explicit AUTHORED identity → UPDATE
 * - Session + missing/mismatched identity → null (never invent UPDATE from coords)
 */
export function resolvePublishedEditSaveIntent(args: {
  editingPublishedFamilyId?: string | null;
  slotIdentity?: FamilyIdentitySource | null;
  authoringStrategyId?: string;
  positionId?: string;
}): FamilySaveIntent | null {
  const sessionFamilyId = trimId(args.editingPublishedFamilyId);
  if (!sessionFamilyId) return null;

  const explicit = resolveExplicitFamilyIdentityForUpdate(args.slotIdentity, {
    authoringStrategyId: args.authoringStrategyId,
    positionId: args.positionId,
  });
  if (!explicit?.familyId) return null;
  if (explicit.familyId !== sessionFamilyId) return null;
  return "UPDATE";
}

/** When starting a fresh CREATE session (reset / new input). */
export function clearEditingPublishedFamilyId(): null {
  return null;
}

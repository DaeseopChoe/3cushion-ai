/**
 * Phase 2 — Published edit session identity (presentation/session only).
 * familyId is OVERWRITE (UPDATE) ownership SSOT. Never uses coordinates / positionId.
 *
 * Save Intent Split (2026-09-20):
 * - Recalling Published data sets editingPublishedFamilyId for OVERWRITE eligibility.
 * - SAVE never auto-UPDATEs from this session.
 * - OVERWRITE requires a trusted published session source family.
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
 * Whether OVERWRITE may run: trusted Published Search session ownership only.
 * Draft.familyId alone is never enough (Local DB must not unlock OVERWRITE).
 */
export function canOverwritePublishedSourceFamily(args: {
  editingPublishedFamilyId?: string | null;
}): boolean {
  return Boolean(trimId(args.editingPublishedFamilyId));
}

/**
 * Resolve OVERWRITE → UPDATE intent.
 *
 * - No session family → null (caller must block)
 * - Session + matching explicit identity (AUTHORED or Derived→source remap) → UPDATE
 * - Session + missing/mismatched identity → null
 *
 * Never used by SAVE. SAVE always forces CREATE.
 */
export function resolveOverwriteSaveIntent(args: {
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

/**
 * @deprecated Save Intent Split — SAVE must not call this.
 * Kept as alias of resolveOverwriteSaveIntent for older imports during transition.
 */
export function resolvePublishedEditSaveIntent(args: {
  editingPublishedFamilyId?: string | null;
  slotIdentity?: FamilyIdentitySource | null;
  authoringStrategyId?: string;
  positionId?: string;
}): FamilySaveIntent | null {
  return resolveOverwriteSaveIntent(args);
}

/** When starting a fresh CREATE session (reset / new input). */
export function clearEditingPublishedFamilyId(): null {
  return null;
}

/** User-facing copy when OVERWRITE lacks a trusted source family. */
export const OVERWRITE_MISSING_SOURCE_USER_MESSAGE =
  "수정할 기존 공략을 확인할 수 없습니다.\nSearch에서 기존 공략을 불러온 뒤 다시 시도하세요.\n새 공략으로 저장하려면 SAVE를 사용하세요.";

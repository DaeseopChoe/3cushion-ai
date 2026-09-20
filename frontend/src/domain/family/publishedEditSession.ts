/**
 * Edit-session source ownership (presentation/session only).
 * familyId is OVERWRITE (UPDATE) ownership SSOT. Never uses coordinates / positionId.
 *
 * Save Intent Split + Local Overwrite (2026-09-20):
 * - SAVE always CREATE (source kind never switches SAVE → UPDATE).
 * - OVERWRITE updates the trusted recall source Family only.
 * - LOCAL UPDATE ≠ PUBLISHED UPDATE (PublishOperation must not leak Local UPDATE).
 *
 * Source kinds are mutually exclusive:
 *   NONE | LOCAL | PUBLISHED
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

export type EditSourceKind = "NONE" | "LOCAL" | "PUBLISHED";

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
 * Resolve trusted edit source kind.
 * Dual ownership (both set) → NONE (fail closed; callers must keep mutual exclusion).
 */
export function resolveEditSourceKind(args: {
  editingPublishedFamilyId?: string | null;
  editingLocalFamilyId?: string | null;
}): EditSourceKind {
  const published = trimId(args.editingPublishedFamilyId);
  const local = trimId(args.editingLocalFamilyId);
  if (published && local) return "NONE";
  if (published) return "PUBLISHED";
  if (local) return "LOCAL";
  return "NONE";
}

/** Trusted source familyId for OVERWRITE, or null when NONE. */
export function resolveTrustedOverwriteSourceFamilyId(args: {
  editingPublishedFamilyId?: string | null;
  editingLocalFamilyId?: string | null;
}): string | null {
  const kind = resolveEditSourceKind(args);
  if (kind === "PUBLISHED") return trimId(args.editingPublishedFamilyId) || null;
  if (kind === "LOCAL") return trimId(args.editingLocalFamilyId) || null;
  return null;
}

/**
 * Whether OVERWRITE may run: trusted LOCAL or PUBLISHED session ownership.
 * Draft.familyId alone is never enough.
 */
export function canOverwriteTrustedSourceFamily(args: {
  editingPublishedFamilyId?: string | null;
  editingLocalFamilyId?: string | null;
}): boolean {
  return resolveTrustedOverwriteSourceFamilyId(args) != null;
}

/**
 * @deprecated Prefer canOverwriteTrustedSourceFamily (LOCAL | PUBLISHED).
 * Kept for older imports — Published-only check.
 */
export function canOverwritePublishedSourceFamily(args: {
  editingPublishedFamilyId?: string | null;
}): boolean {
  return Boolean(trimId(args.editingPublishedFamilyId));
}

/**
 * Resolve OVERWRITE → UPDATE intent against trusted source family.
 *
 * - No trusted session → null (caller must block)
 * - Session + matching explicit identity (AUTHORED or Derived→source remap) → UPDATE
 * - Session + missing/mismatched identity → null
 *
 * Never used by SAVE. SAVE always forces CREATE.
 */
export function resolveOverwriteSaveIntent(args: {
  editingPublishedFamilyId?: string | null;
  editingLocalFamilyId?: string | null;
  /** @deprecated Prefer editingPublishedFamilyId + editingLocalFamilyId */
  trustedSourceFamilyId?: string | null;
  slotIdentity?: FamilyIdentitySource | null;
  authoringStrategyId?: string;
  positionId?: string;
}): FamilySaveIntent | null {
  const sessionFamilyId =
    trimId(args.trustedSourceFamilyId) ||
    resolveTrustedOverwriteSourceFamilyId({
      editingPublishedFamilyId: args.editingPublishedFamilyId,
      editingLocalFamilyId: args.editingLocalFamilyId,
    }) ||
    "";
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
 * Alias of resolveOverwriteSaveIntent.
 */
export function resolvePublishedEditSaveIntent(args: {
  editingPublishedFamilyId?: string | null;
  editingLocalFamilyId?: string | null;
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

/**
 * User-facing copy when OVERWRITE lacks a trusted source (LOCAL or PUBLISHED).
 */
export const OVERWRITE_MISSING_SOURCE_USER_MESSAGE =
  "덮어쓸 기존 작업을 확인할 수 없습니다.\n기존 작업을 먼저 불러오거나 새 공략은 SAVE로 저장하세요.";

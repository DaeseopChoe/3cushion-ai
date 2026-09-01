/**
 * Display Runtime HPT → coaching / system-controller T resolution.
 * Pure helpers for modal ↔ table impact parity tests.
 */

import { displayThicknessToLegacyT } from "../utils/physics/ImpactEngine";

/** Grep dist bundle or read `window.__3CUSHION_BUILD_MARKERS__` on Mobile. */
export const DISPLAY_RUNTIME_HPT_SSOT_BUILD_MARKER =
  "3cushion-display-runtime-hpt-ssot-20260901";

export const USER_TABLE_DISPLAY_HPT_BUILD_MARKER =
  "3cushion-user-table-display-hpt-wt-20260901";

/** Unique diagnostic build id — not a production UI label. */
export const DISPLAY_HPT_DIAGNOSTIC_BUILD_ID =
  "3cushion-display-hpt-diag-20260901-v1";

type SlotHptSlice = {
  draft?: { displayHpt?: { T?: string }; hpt?: { T?: string } };
  applied?: { displayHpt?: { T?: string }; hpt?: { T?: string } };
};

function readSlotDisplayThicknessT(
  slot: SlotHptSlice | undefined
): string | undefined {
  const displayT =
    slot?.draft?.displayHpt?.T ?? slot?.applied?.displayHpt?.T;
  if (typeof displayT === "string" && displayT.trim()) return displayT;
  const runtimeT = slot?.draft?.hpt?.T ?? slot?.applied?.hpt?.T;
  if (typeof runtimeT === "string" && runtimeT.trim()) return runtimeT;
  return undefined;
}

export function resolveLegacyTFromViewUi(args: {
  viewUiHptT?: string;
  viewDisplayThickness?: string;
  sideHint?: 1 | -1;
}): string {
  const currentT = args.viewUiHptT;
  if (currentT && currentT.trim()) return currentT;
  if (args.viewDisplayThickness && args.viewDisplayThickness.trim()) {
    return displayThicknessToLegacyT(
      args.viewDisplayThickness,
      args.sideHint ?? 1
    );
  }
  return "8/8";
}

/**
 * Coaching / impact-ball T SSOT.
 * USER: recalled display HPT first; static view.ui only when no slot display HPT.
 * ADMIN: physics runtime adminState.hpt.T (display matches runtime today).
 */
export function resolveCoachingThicknessT(args: {
  canEdit: boolean;
  adminStateHptT?: string;
  displayHptT?: string;
  viewUiHptT?: string;
  viewDisplayThickness?: string;
}): string {
  if (args.canEdit) {
    return resolveLegacyTFromViewUi({
      viewUiHptT: args.adminStateHptT,
    });
  }
  if (args.displayHptT && args.displayHptT.trim()) {
    return args.displayHptT;
  }
  return resolveLegacyTFromViewUi({
    viewUiHptT: args.viewUiHptT,
    viewDisplayThickness: args.viewDisplayThickness,
  });
}

/**
 * USER table trajectory / impact display thickness SSOT.
 * Uses userTableDisplaySlotId — never editor activeSlot — to avoid slot mixing.
 */
export function resolveUserTableDisplayThicknessT(args: {
  userDisplayHptT?: string;
  userTableDisplaySlotId?: string | null;
  slots?: Record<string, SlotHptSlice | undefined>;
  viewUiHptT?: string;
  viewDisplayThickness?: string;
}): string {
  if (args.userDisplayHptT?.trim()) {
    return args.userDisplayHptT;
  }
  const slotId = args.userTableDisplaySlotId;
  if (slotId && args.slots) {
    const fromDisplaySlot = readSlotDisplayThicknessT(args.slots[slotId]);
    if (fromDisplaySlot) return fromDisplaySlot;
  }
  return resolveCoachingThicknessT({
    canEdit: false,
    displayHptT: undefined,
    viewUiHptT: args.viewUiHptT,
    viewDisplayThickness: args.viewDisplayThickness,
  });
}

/** ADMIN table trajectory thickness — physics/runtime path unchanged. */
export function resolveAdminThicknessForCalc(args: {
  adminStateHptT?: string;
  activeSlot?: string;
  slots?: Record<string, SlotHptSlice | undefined>;
  viewDisplayThickness?: string;
}): string {
  if (args.adminStateHptT?.trim()) {
    return args.adminStateHptT;
  }
  const slotId = args.activeSlot;
  if (slotId && args.slots) {
    const draftT = args.slots[slotId]?.draft?.hpt?.T;
    if (typeof draftT === "string" && draftT.trim()) return draftT;
    const appliedT = args.slots[slotId]?.applied?.hpt?.T;
    if (typeof appliedT === "string" && appliedT.trim()) return appliedT;
  }
  if (args.viewDisplayThickness?.trim()) {
    return args.viewDisplayThickness;
  }
  return "0";
}

export type UserDisplayHptTrace = {
  positionId: string | null;
  track: string | null;
  authoredTrack: string | null;
  persistedT: string | null;
  runtimeT: string | null;
  displayT: string | null;
  userDisplayT: string | null;
  thicknessForCalc: string | null;
  displayImpactContactThicknessT: string | null;
  impactRaw: { x: number; y: number } | null;
  target: { x: number; y: number } | null;
  impactSide: number | null;
};

/** Read-only diagnostic payload for `[USER_DISPLAY_HPT_TRACE]` console log. */
export function buildUserDisplayHptTrace(args: {
  positionId?: string | null;
  track?: string | null;
  authoredTrack?: string | null;
  persistedT?: string | null;
  runtimeT?: string | null;
  displayT?: string | null;
  userDisplayT?: string | null;
  thicknessForCalc?: string | null;
  displayImpactContactThicknessT?: string | null;
  impactRaw?: { x: number; y: number } | null;
  target?: { x: number; y: number } | null;
}): UserDisplayHptTrace {
  const target = args.target ?? null;
  const impactRaw = args.impactRaw ?? null;
  let impactSide: number | null = null;
  if (
    target &&
    impactRaw &&
    Number.isFinite(target.x) &&
    Number.isFinite(impactRaw.x)
  ) {
    const dx = impactRaw.x - target.x;
    impactSide = Math.abs(dx) < 1e-9 ? 0 : Math.sign(dx);
  }
  return {
    positionId: args.positionId ?? null,
    track: args.track ?? null,
    authoredTrack: args.authoredTrack ?? null,
    persistedT: args.persistedT ?? null,
    runtimeT: args.runtimeT ?? null,
    displayT: args.displayT ?? null,
    userDisplayT: args.userDisplayT ?? null,
    thicknessForCalc: args.thicknessForCalc ?? null,
    displayImpactContactThicknessT: args.displayImpactContactThicknessT ?? null,
    impactRaw,
    target,
    impactSide,
  };
}

/**
 * domain/system/slotSysViewModel.ts
 *
 * AAS v2.0 Batch 4 — MISC-004 Render SSOT ViewModel.
 * App.jsx resolvedSlotSys 파생 → Domain ViewModel.
 */

import {
  resolveSlotSysForRender,
  type SlotDraftSys,
  type SlotDraftSysSlice,
} from "../slotSysResolve";

export type ResolveSlotSysParams = {
  appMode: "ADMIN" | "USER";
  userTableDisplaySlotId: string | null;
  adminTableLayersVisible: boolean;
  slots: Record<string, SlotDraftSysSlice | undefined>;
  activeSlot: string;
};

/**
 * 궤적/앵커 렌더 SSOT: 활성 슬롯의 sys만 사용 (adminState.sys / view.ui.system 혼합 금지).
 */
export function resolveSlotSys(params: ResolveSlotSysParams): SlotDraftSys | null {
  const {
    appMode,
    userTableDisplaySlotId,
    adminTableLayersVisible,
    slots,
    activeSlot,
  } = params;

  if (appMode === "USER") {
    if (!userTableDisplaySlotId) return null;
    const slot = slots[userTableDisplaySlotId];
    return resolveSlotSysForRender(slot) ?? null;
  }
  if (appMode === "ADMIN" && !adminTableLayersVisible) return null;
  const slot = slots[activeSlot];
  return resolveSlotSysForRender(slot) ?? null;
}

import { useEffect } from "react";

interface AdminOverlayLifecycleArgs {
  appMode: string;
  isAdminInputSessionActive: boolean;
  isTargetSelected: boolean;
  targetColor: unknown;
  overlayOpen: boolean;
  overlayType: string | null;
  onFuncOverlayClose?: () => void;
  setOverlayState: (state: { open: false; type: null; anchorKey: null }) => void;
  isAdminTargetReady: () => boolean;
}

export function useAdminOverlayLifecycle({
  appMode,
  isAdminInputSessionActive,
  isTargetSelected,
  targetColor,
  overlayOpen,
  overlayType,
  onFuncOverlayClose,
  setOverlayState,
  isAdminTargetReady,
}: AdminOverlayLifecycleArgs) {
  useEffect(() => {
    if (appMode !== "ADMIN") return;
    if (isAdminInputSessionActive && isAdminTargetReady()) return;
    if (!overlayOpen) return;
    const t = overlayType;
    if (!t || !["SYS", "HPT", "STR", "AI"].includes(t)) return;
    onFuncOverlayClose?.();
    setOverlayState({ open: false, type: null, anchorKey: null });
  }, [
    appMode,
    isAdminInputSessionActive,
    isTargetSelected,
    targetColor,
    overlayOpen,
    overlayType,
    onFuncOverlayClose,
    setOverlayState,
    isAdminTargetReady,
  ]);
}

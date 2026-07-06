import { useCallback } from "react";

interface UserOverlayRouterArgs {
  appMode: string;
  setOverlayContent: (content: null) => void;
  onFuncOverlayClose?: () => void;
}

export function useUserOverlayRouter({
  appMode,
  setOverlayContent,
  onFuncOverlayClose,
}: UserOverlayRouterArgs) {
  /** 모달만 닫기 (기준값 레벨 유지 — BASELINE 순환 시 사용) */
  const handleDismissUserInfoOverlayPanel = useCallback(() => {
    if (appMode !== "USER") return;
    setOverlayContent(null);
  }, [appMode, setOverlayContent]);

  /** Overlay 닫기 + Stage rail 선택 복귀 + 기준값 L1 리셋 */
  const handleCloseUserInfoOverlay = useCallback(() => {
    if (appMode !== "USER") return;
    setOverlayContent(null);
    onFuncOverlayClose?.();
  }, [appMode, setOverlayContent, onFuncOverlayClose]);

  return { handleDismissUserInfoOverlayPanel, handleCloseUserInfoOverlay };
}

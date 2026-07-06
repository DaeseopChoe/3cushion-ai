import { useCallback } from "react";

interface DragState {
  dragging: boolean;
  joystickVisible?: boolean;
  [key: string]: unknown;
}

interface OverlayState {
  open: boolean;
  type: string | null;
  anchorKey?: string | null;
}

interface AdminOverlayRouterArgs {
  dragState: DragState;
  handlePointerUp: (e: { pointerId: null }) => void;
  setDragState: (updater: (prev: DragState) => DragState) => void;
  setOverlayState: (state: OverlayState) => void;
}

export function useAdminOverlayRouter({
  dragState,
  handlePointerUp,
  setDragState,
  setOverlayState,
}: AdminOverlayRouterArgs) {
  const openOverlay = useCallback(
    (type: string) => {
      if (dragState.dragging) {
        handlePointerUp({ pointerId: null });
      }
      setDragState((prev) => ({ ...prev, joystickVisible: false }));
      setOverlayState({ open: true, type });
    },
    [dragState.dragging, handlePointerUp, setDragState, setOverlayState]
  );

  const openAnchorEdit = useCallback(
    (anchorKey: string) => {
      setOverlayState({ open: true, type: "ANCHOR_EDIT", anchorKey });
    },
    [setOverlayState]
  );

  return { openOverlay, openAnchorEdit };
}

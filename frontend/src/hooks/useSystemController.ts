import { useMemo } from "react";
import {
  displayThicknessToLegacyT,
} from "../utils/physics/ImpactEngine";

function resolveT(
  currentT: string | undefined,
  displayThickness: string | undefined,
  sideHint: 1 | -1 = 1
): string {
  if (currentT && currentT.trim()) return currentT;
  if (displayThickness && displayThickness.trim()) {
    return displayThicknessToLegacyT(displayThickness, sideHint);
  }
  return "8/8";
}

type Params = {
  view: { ui?: { hpt?: { T?: string }; display_options?: { thickness?: string }; system?: { values?: Record<string, unknown>; human_readable?: Record<string, unknown> } } } | null;
  adminState: { hpt?: { T?: string } };
  canEdit: boolean;
  setAdminState: React.Dispatch<React.SetStateAction<unknown>>;
};

export function useSystemController({ view, adminState, canEdit, setAdminState }: Params) {
  const T = useMemo(() => {
    const hptT = canEdit ? adminState?.hpt?.T : view?.ui?.hpt?.T;
    const thicknessFromDisplay = view?.ui?.display_options?.thickness;
    return resolveT(hptT, thicknessFromDisplay, 1);
  }, [canEdit, adminState?.hpt?.T, view?.ui?.hpt?.T, view?.ui?.display_options?.thickness]);

  const system = useMemo(() => {
    return view?.ui?.system ?? { values: {}, human_readable: {} };
  }, [view?.ui?.system]);

  const onChangeT = useMemo(() => {
    return (nextT: string) => {
      if (!canEdit) return;
      setAdminState((prev: unknown) => {
        const p = prev as Record<string, unknown>;
        return {
          ...p,
          hpt: {
            ...(p?.hpt as Record<string, unknown> || {}),
            T: nextT,
          },
        };
      });
    };
  }, [canEdit, setAdminState]);

  const onChangeThickness = useMemo(() => {
    return (displayThickness: string) => {
      if (!canEdit) return;
      setAdminState((prev: unknown) => {
        const p = prev as Record<string, unknown>;
        const hpt = (p?.hpt as Record<string, unknown>) || {};
        return {
          ...p,
          hpt: { ...hpt, displayThickness },
        };
      });
    };
  }, [canEdit, setAdminState]);

  return { T, system, onChangeT, onChangeThickness };
}

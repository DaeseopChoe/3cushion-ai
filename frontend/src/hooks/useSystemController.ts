import { useMemo } from "react";
import { resolveCoachingThicknessT } from "../domain/displayHptCoaching";

type Params = {
  view: { ui?: { hpt?: { T?: string }; display_options?: { thickness?: string }; system?: { values?: Record<string, unknown>; human_readable?: Record<string, unknown> } } } | null;
  adminState: { hpt?: { T?: string } };
  canEdit: boolean;
  /** USER recalled slot Display Runtime HPT — takes priority over static view.ui. */
  displayHptT?: string;
  setAdminState: React.Dispatch<React.SetStateAction<unknown>>;
};

export function useSystemController({ view, adminState, canEdit, displayHptT, setAdminState }: Params) {
  const T = useMemo(() => {
    return resolveCoachingThicknessT({
      canEdit,
      adminStateHptT: adminState?.hpt?.T,
      displayHptT,
      viewUiHptT: view?.ui?.hpt?.T,
      viewDisplayThickness: view?.ui?.display_options?.thickness,
    });
  }, [canEdit, adminState?.hpt?.T, displayHptT, view?.ui?.hpt?.T, view?.ui?.display_options?.thickness]);

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

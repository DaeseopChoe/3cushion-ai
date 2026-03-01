import { useMemo } from "react";

type Params = {
  view: { ui?: { hpt?: { T?: string }; system?: { values?: Record<string, unknown>; human_readable?: Record<string, unknown> } } } | null;
  adminState: { hpt?: { T?: string } };
  canEdit: boolean;
  setAdminState: React.Dispatch<React.SetStateAction<unknown>>;
};

export function useSystemController({ view, adminState, canEdit, setAdminState }: Params) {
  const T = useMemo(() => {
    return canEdit ? (adminState?.hpt?.T ?? "8/8") : (view?.ui?.hpt?.T ?? "8/8");
  }, [canEdit, adminState?.hpt?.T, view?.ui?.hpt?.T]);

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

  return { T, system, onChangeT };
}

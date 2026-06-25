import { useMemo } from "react";

type Params = {
  ui: { anchors?: Record<string, unknown>; display_options?: Record<string, unknown>; strategy?: unknown[] } | undefined;
};

export function useDisplayController({ ui }: Params) {
  const anchors = useMemo(() => ui?.anchors ?? {}, [ui?.anchors]);
  const displayOptions = useMemo(() => ui?.display_options ?? {}, [ui?.display_options]);
  const strategy = useMemo(() => ui?.strategy ?? [], [ui?.strategy]);

  return { anchors, displayOptions, strategy };
}

import { useState, useEffect } from "react";
import {
  MEDIA_USER_MOBILE_TABLE,
  SYS_LABEL_PHONE_LANDSCAPE_SCALE,
} from "../../config/tableConfig";

export function resolveSysLabelScale(matchesUserMobileTable: boolean): number {
  return matchesUserMobileTable ? SYS_LABEL_PHONE_LANDSCAPE_SCALE : 1;
}

export function shouldEnableUserTableMagnifier(
  appMode: string | undefined,
  matchesUserMobileTable: boolean
): boolean {
  return appMode === "USER" && matchesUserMobileTable;
}

export function useUserMobileTableMatch(): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }
    const mq = window.matchMedia(MEDIA_USER_MOBILE_TABLE);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return matches;
}

export function useSysLabelScale(): number {
  const matches = useUserMobileTableMatch();
  return resolveSysLabelScale(matches);
}

import { useState, useEffect } from "react";
import { MEDIA_PHONE_LANDSCAPE, SYS_LABEL_PHONE_LANDSCAPE_SCALE } from "../../config/tableConfig";

export function useSysLabelScale(): number {
  const [sysLabelScale, setSysLabelScale] = useState(1);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }
    const mq = window.matchMedia(MEDIA_PHONE_LANDSCAPE);
    const sync = () => {
      setSysLabelScale(mq.matches ? SYS_LABEL_PHONE_LANDSCAPE_SCALE : 1);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return sysLabelScale;
}

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_DURATION_MS = 3000;

/**
 * Non-blocking USER toast — auto-dismiss after durationMs.
 * variant: "default" (bottom pill) | "center" (search no-match overlay)
 */
export function useUserToast(defaultDurationMs = DEFAULT_DURATION_MS) {
  const [message, setMessage] = useState(null);
  const [variant, setVariant] = useState("default");
  const timerRef = useRef(null);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMessage(null);
    setVariant("default");
  }, []);

  const show = useCallback(
    (text, options = defaultDurationMs) => {
      hide();
      if (!text) return;

      let durationMs = defaultDurationMs;
      let nextVariant = "default";
      if (typeof options === "number") {
        durationMs = options;
      } else if (options && typeof options === "object") {
        durationMs = options.durationMs ?? defaultDurationMs;
        nextVariant = options.variant ?? "default";
      }

      setMessage(String(text));
      setVariant(nextVariant);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setMessage(null);
        setVariant("default");
      }, durationMs);
    },
    [defaultDurationMs, hide]
  );

  useEffect(() => () => hide(), [hide]);

  return {
    message,
    variant,
    show,
    hide,
    visible: message != null && message !== "",
  };
}

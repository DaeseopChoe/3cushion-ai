/**
 * Phase 3E-2 — remove #app-shell only after real USER table SVG is in the DOM.
 * Must not run on createRoot alone (avoids blank gap before first paint).
 */

export const APP_SHELL_ID = "app-shell";
export const APP_SHELL_READY_SELECTOR = ".table-svg";

/**
 * Wait until `.table-svg` exists under `#root`, then remove shell after paint frames.
 * If the table never appears (boot failure), leave the shell in place (fail-safe).
 */
export function scheduleAppShellRemoval(options = {}) {
  if (typeof document === "undefined") return;

  const shellId = options.shellId ?? APP_SHELL_ID;
  const readySelector = options.readySelector ?? APP_SHELL_READY_SELECTOR;
  const root =
    options.root ??
    (typeof document !== "undefined" ? document.getElementById("root") : null);

  const shell = document.getElementById(shellId);
  if (!shell) return;

  const removeAfterPaint = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(shellId);
        if (el) el.remove();
      });
    });
  };

  if (document.querySelector(readySelector)) {
    removeAfterPaint();
    return;
  }

  if (!root || typeof MutationObserver === "undefined") {
    return;
  }

  const observer = new MutationObserver(() => {
    if (!document.querySelector(readySelector)) return;
    observer.disconnect();
    removeAfterPaint();
  });

  observer.observe(root, { childList: true, subtree: true });
}

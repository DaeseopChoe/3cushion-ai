/**
 * Browser UI mode preference (USER | ADMIN) — isolated from work-session state.
 * Survives F5; does not persist balls/slots/sys/trajectory.
 */

export const APP_UI_MODE_STORAGE_KEY = "app_ui_mode_v1";

export type AppUiMode = "USER" | "ADMIN";

function isAppUiMode(value: unknown): value is AppUiMode {
  return value === "USER" || value === "ADMIN";
}

/** Safe read: missing / invalid / storage error → USER. */
export function readUiModePreference(): AppUiMode {
  try {
    if (typeof localStorage === "undefined") return "USER";
    const raw = localStorage.getItem(APP_UI_MODE_STORAGE_KEY);
    if (isAppUiMode(raw)) return raw;
    return "USER";
  } catch {
    return "USER";
  }
}

/** Write only on explicit USER↔ADMIN toggle. Invalid mode → no-op. */
export function writeUiModePreference(mode: AppUiMode): void {
  if (!isAppUiMode(mode)) return;
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(APP_UI_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore quota / privacy mode
  }
}

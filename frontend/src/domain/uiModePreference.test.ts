/**
 * UI mode preference contracts (F5 keeps USER|ADMIN only).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  APP_UI_MODE_STORAGE_KEY,
  readUiModePreference,
  writeUiModePreference,
} from "./uiModePreference";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, "..");

function readSrc(rel: string): string {
  return readFileSync(join(srcRoot, rel), "utf8");
}

function createMemoryLocalStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(String(key), String(value));
    },
    removeItem(key: string) {
      map.delete(key);
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryLocalStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("uiModePreference", () => {
  it("T1: missing key → USER", () => {
    localStorage.removeItem(APP_UI_MODE_STORAGE_KEY);
    expect(readUiModePreference()).toBe("USER");
  });

  it("T2: storage ADMIN → ADMIN", () => {
    localStorage.setItem(APP_UI_MODE_STORAGE_KEY, "ADMIN");
    expect(readUiModePreference()).toBe("ADMIN");
  });

  it("T3: storage USER → USER", () => {
    localStorage.setItem(APP_UI_MODE_STORAGE_KEY, "USER");
    expect(readUiModePreference()).toBe("USER");
  });

  it("T4: invalid → USER", () => {
    localStorage.setItem(APP_UI_MODE_STORAGE_KEY, "admin");
    expect(readUiModePreference()).toBe("USER");
    localStorage.setItem(APP_UI_MODE_STORAGE_KEY, "true");
    expect(readUiModePreference()).toBe("USER");
  });

  it("T5/T6: write USER↔ADMIN", () => {
    writeUiModePreference("ADMIN");
    expect(localStorage.getItem(APP_UI_MODE_STORAGE_KEY)).toBe("ADMIN");
    writeUiModePreference("USER");
    expect(localStorage.getItem(APP_UI_MODE_STORAGE_KEY)).toBe("USER");
  });

  it("T7: ADMIN then remount-equivalent read → ADMIN", () => {
    writeUiModePreference("ADMIN");
    expect(readUiModePreference()).toBe("ADMIN");
  });

  it("T9: USER then remount-equivalent read → USER", () => {
    writeUiModePreference("USER");
    expect(readUiModePreference()).toBe("USER");
  });

  it("storage error on read → USER", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {},
      removeItem: () => {},
    });
    expect(readUiModePreference()).toBe("USER");
  });
});

describe("uiModePreference wiring (source contracts)", () => {
  it("T14: App and Stage both init from readUiModePreference", () => {
    const app = readSrc("App.jsx");
    const stage = readSrc("components/Stage.jsx");
    expect(app).toMatch(/readUiModePreference/);
    expect(app).toMatch(/writeUiModePreference/);
    expect(app).toMatch(/useState\(\(\)\s*=>\s*readUiModePreference\(\)/);
    expect(stage).toMatch(/readUiModePreference/);
    expect(stage).toMatch(/useState\(\(\)\s*=>\s*readUiModePreference\(\)/);
  });

  it("T5/T6: handleToggleAdminMode writes nextMode preference", () => {
    const app = readSrc("App.jsx");
    const start = app.indexOf("function handleToggleAdminMode");
    const end = app.indexOf("// SAVE 핸들러", start);
    expect(start).toBeGreaterThan(-1);
    const body = app.slice(start, end);
    expect(body).toMatch(/const nextMode\s*=/);
    expect(body).toMatch(/writeUiModePreference\(nextMode\)/);
    expect(body).toMatch(/setAppMode\(nextMode\)/);
  });

  it("T8: F5 work runtime stays initial (balls not hydrated from uiMode storage)", () => {
    const app = readSrc("App.jsx");
    expect(app).toMatch(
      /useState\(\(\)\s*=>\s*\(\{\s*\.\.\.INITIAL_BALLS_RG\s*\}\)\)/
    );
    expect(app).toMatch(/useState\(\(\)\s*=>\s*readUiModePreference\(\)/);
    const pref = readSrc("domain/uiModePreference.ts");
    expect(pref).toMatch(/APP_UI_MODE_STORAGE_KEY\s*=\s*"app_ui_mode_v1"/);
    expect(pref).not.toMatch(/\bballsState\b|\bshotEditor\b|positions_dataset/);
    expect(pref).toMatch(/getItem\(APP_UI_MODE_STORAGE_KEY\)/);
    expect(pref).toMatch(/setItem\(APP_UI_MODE_STORAGE_KEY,/);
  });

  it("T10: Reset does not write uiMode", () => {
    const app = readSrc("App.jsx");
    const start = app.indexOf("const handleAdminWorkReset");
    const end = app.indexOf("}, [appMode, actions, targetColor", start);
    const body = app.slice(start, end);
    expect(body).not.toMatch(/writeUiModePreference/);
    expect(body).not.toMatch(/app_ui_mode_v1/);
  });

  it("T11: History load does not write uiMode", () => {
    const settings = readSrc("hooks/useSettings.js");
    const loadBody = settings.slice(
      settings.indexOf("handleLoadWorkspaceSnapshot"),
      settings.indexOf("clearEditSourceContext")
    );
    expect(loadBody).not.toMatch(/writeUiModePreference|app_ui_mode_v1/);
  });

  it("T12/T13: Search/LocalDB and positions_dataset keys untouched by uiMode module", () => {
    const pref = readSrc("domain/uiModePreference.ts");
    expect(pref).toMatch(/app_ui_mode_v1/);
    expect(pref).not.toMatch(/positions_dataset|workspace_history/);
    const search = readSrc("application/flows/adminSearchFlow.ts");
    const localDb = readSrc("application/flows/adminLocalDbFlow.ts");
    expect(search).not.toMatch(/writeUiModePreference|app_ui_mode_v1/);
    expect(localDb).not.toMatch(/writeUiModePreference|app_ui_mode_v1/);
  });
});

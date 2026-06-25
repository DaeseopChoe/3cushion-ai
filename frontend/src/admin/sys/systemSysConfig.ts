export type SysInputKey = "CO" | "C1" | "C2" | "C3" | "C4" | "HP";

export type SysAutoSolveConfig =
  | {
      type: "two_of_three";
      formula: string; // 예: "C1 = CO - C3"
      keys: ["CO", "C1", "C3"];
    }
  | null;

export type SysCorrectionConfig = {
  useSlide: boolean;
  useSn: boolean;
};

export type SysDisplayConfig = {
  showBaseLine: boolean;
  showEffectiveLine: boolean;
  showSn: boolean;
};

export type SysSystemConfig = {
  id: string;
  inputs: SysInputKey[];
  autoSolve: SysAutoSolveConfig;
  corrections: SysCorrectionConfig;
  display: SysDisplayConfig;
};

export const SYSTEM_SYS_CONFIG: Record<string, SysSystemConfig> = {
  "5_half_system": {
    id: "5_half_system",

    inputs: ["CO", "C1", "C3"],

    autoSolve: {
      type: "two_of_three",
      formula: "C1 = CO - C3",
      keys: ["CO", "C1", "C3"],
    },

    corrections: {
      useSlide: true,
      useSn: true,
    },

    display: {
      showBaseLine: true,
      showEffectiveLine: true,
      showSn: true,
    },
  },
};

export function getSystemSysConfig(systemId: string): SysSystemConfig | null {
  return SYSTEM_SYS_CONFIG[systemId] ?? null;
}

type SystemProfile = {
  id?: string;
  name?: string;
  description?: string;
  [key: string]: any;
};

const modules = import.meta.glob("./*/profile.json", { eager: true });

export const SYSTEM_PROFILES: Record<string, SystemProfile> =
  Object.fromEntries(
    Object.entries(modules).map(([path, module]) => {
      // path 예시: "./5_half_system/profile.json"
      const parts = path.split("/");
      const systemKey = parts[1]; // 폴더명 추출

      return [systemKey, (module as any).default];
    })
  );

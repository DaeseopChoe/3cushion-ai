/**
 * domain/system/systemIdentity.ts
 *
 * AAS v2.0 Batch 1 — SYS-004 / SYS-005 (System Identity)
 * Migration Map: App_Migration_Map.md Part A (SYS-004, SYS-005)
 * Design: Runtime Refactoring/Batch01/Batch1_Design.md (v1.2)
 *
 * systemId 정규화 / mode·useSn 판정 (System Domain).
 *
 * SYS_SYSTEM_CONFIG는 Batch 1 한정 임시 데이터 공급원이다.
 * Batch 6(Runtime Contract)에서 공급원만 system_meta.json → Registry →
 * Loader → Runtime Contract 경로로 교체된다. 이 파일의 Canonical API
 * 시그니처는 Batch 6에서도 변경하지 않는다. (API Stable / Implementation Replace)
 */

type SystemMode = "derived" | "full_input";

interface SysSystemConfigEntry {
  mode: SystemMode;
  useSn: boolean;
}

/** 시스템별 SYS 입력 유도·Sn 사용 (신규 시스템은 이 테이블에만 등록) */
const SYS_SYSTEM_CONFIG: Record<string, SysSystemConfigEntry> = {
  five_half: { mode: "derived", useSn: true },
  "5_half_system": { mode: "derived", useSn: true },
  "5_HALF": { mode: "derived", useSn: true },
  sunrise_sunset: { mode: "full_input", useSn: false },
  sunset: { mode: "full_input", useSn: false },
};

// ── Canonical API (Migration Map 명칭, SSOT) ──────────────────────────

export function canonicalSystemId(systemId: string | null | undefined): string {
  if (systemId == null || systemId === "") return "5_half_system";
  return systemId === "5_HALF" ? "5_half_system" : systemId;
}

export function getSystemMode(systemId: string | null | undefined): SystemMode {
  const sid = canonicalSystemId(systemId);
  return SYS_SYSTEM_CONFIG[sid]?.mode ?? "full_input";
}

export function getUseSn(systemId: string | null | undefined): boolean {
  const sid = canonicalSystemId(systemId);
  return SYS_SYSTEM_CONFIG[sid]?.useSn ?? false;
}

export function isFiveHalf(systemId: string | null | undefined): boolean {
  const s = systemId == null ? "" : String(systemId);
  return s === "5_half_system" || s === "5_HALF" || s === "five_half";
}

// ── Legacy Wrapper (App.jsx 기존 호출부 호환) ─────────────────────────
// Migration Debt D-001. Soft Gate: Batch 4 Validation 이후 잔존 호출 재확인.
// Hard Deadline: Batch 6 착수 전 제거.

/** @deprecated Batch 2 이후 canonicalSystemId()로 전환 후 제거 예정 (Migration Debt D-001) */
export function canonicalSystemIdForConfig(systemId: string | null | undefined): string {
  return canonicalSystemId(systemId);
}

/** @deprecated Batch 2 이후 getSystemMode()로 전환 후 제거 예정 (Migration Debt D-001) */
export function getSysSystemMode(systemId: string | null | undefined): SystemMode {
  return getSystemMode(systemId);
}

/** @deprecated Batch 2 이후 getUseSn()로 전환 후 제거 예정 (Migration Debt D-001) */
export function getSysUseSn(systemId: string | null | undefined): boolean {
  return getUseSn(systemId);
}

/** @deprecated Batch 2 이후 isFiveHalf()로 전환 후 제거 예정 (Migration Debt D-001) */
export function isFiveHalfSystemId(systemId: string | null | undefined): boolean {
  return isFiveHalf(systemId);
}

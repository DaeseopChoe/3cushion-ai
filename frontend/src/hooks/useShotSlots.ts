import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { TrajectoryPhase } from './useTrajectoryState';
import { SYSTEM_PROFILES } from '../data/systems';
import { calculateByProfileExpr } from '../utils/systemCalculator';
import { buildTrajectorySamples } from '../utils/trajectorySampleBuilder';
import type { PositionRecord, StrategyEntry } from '../domain/positionSearchEngine';
import {
  draftRuntimeFieldsFromStrategyEntry,
  strategyEntryToSlotDraftSys,
} from '../domain/slotDraftFromEntry';
import type { StrategySysCorrections, TargetBall } from '../domain/positionSearchEngine';
import { normalizeSlotTargetBall } from '../domain/slotRuntimeHydrate';
import {
  hasRenderableOutputsResult,
  resolveSlotSysForRender,
} from '../domain/slotSysResolve';

export { resolveSlotSysForRender, hasRenderableOutputsResult };

// ==========================================
// Types (중복 없이 정리)
// ==========================================

export type SlotId = 'S1' | 'S2' | 'S3';

export interface DraftState {
  sys?: any;
  hpt?: any;
  str?: any;
  ai?: any;
  meta?: { recommendedFrom?: { positionId: string; score: number } };
  /** Per-slot runtime (PHASE 2) — not shared across slots */
  corrections?: StrategySysCorrections;
  shotType?: string;
  system_values?: Record<string, number>;
  targetBall?: TargetBall | null;
}

export interface SlotState {
  // SlotState는 draft와 applied 모두 DraftState | null
  draft: DraftState | null;
  applied: DraftState | null;
  /** Position LOCK 시 테이블 좌표 스냅샷 (S1/S2/S3 동일) */
  balls?: Record<string, { x: number; y: number } | undefined> | null;
}

export interface ShotEditorState {
  activeSlot: SlotId;
  slots: {
    S1: SlotState;
    S2: SlotState;
    S3: SlotState;
  };
}

export type UseShotSlotsOptions = {
  setBallsState?: (arg: any) => void;
  setAdminState?: (updater: (prev: any) => any) => void;
};

// ==========================================
// Hook
// ==========================================

/** draft ≠ applied 여부 (dirty = 아직 확정 안 됨) */
function isSlotDirty(slot: SlotState | null | undefined): boolean {
  if (!slot) return false;
  const d = slot.draft;
  const a = slot.applied;
  if (d === null && a === null) return false;
  if (d === null || a === null) return true;
  try {
    const norm = (x: DraftState) => ({ sys: x?.sys, hpt: x?.hpt, str: x?.str, ai: x?.ai });
    return JSON.stringify(norm(d)) !== JSON.stringify(norm(a));
  } catch {
    return true;
  }
}

/** PositionRecord → slot별 draft 맵 생성 (applyPositionRecall 단일 트랜잭션용) */
function buildDraftsFromRecord(record: PositionRecord): Record<string, DraftState> {
  const map: Record<string, DraftState> = {};
  for (const slotId of ["S1", "S2", "S3"] as const) {
    const entry = record.strategies[slotId];
    if (!entry) continue;

    const runtime = draftRuntimeFieldsFromStrategyEntry(entry);
    const recordTarget = normalizeSlotTargetBall(record.targetBall);
    map[slotId] = {
      sys: strategyEntryToSlotDraftSys(entry),
      hpt: entry.hpT,
      str: entry.str,
      ai: entry.ai,
      meta: { recommendedFrom: { positionId: record.positionId, score: 0 } },
      corrections: runtime.corrections,
      shotType: runtime.shotType,
      system_values: runtime.system_values,
      targetBall: recordTarget,
    };
  }
  return map;
}

/** 기존 slots에 nextDrafts merge 적용 (ADMIN recall 등). applied 유지. */
function applyDraftsToSlots(
  slots: ShotEditorState["slots"],
  nextDrafts: Record<string, DraftState>
): ShotEditorState["slots"] {
  return Object.fromEntries(
    (Object.entries(slots) as Array<[keyof ShotEditorState["slots"], SlotState]>).map(
      ([slotId, slot]) => {
        const nextDraft = nextDrafts[slotId];
        if (!nextDraft) return [slotId, slot];
        return [
          slotId,
          {
            ...slot,
            draft: {
              ...(slot.draft ?? {}),
              ...nextDraft,
            },
          },
        ];
      }
    )
  ) as ShotEditorState["slots"];
}

/** USER Search: record 슬롯은 draft full replace, 미포함 슬롯은 Search draft 제거 */
function applyDraftsFromSearchRecord(
  slots: ShotEditorState["slots"],
  nextDrafts: Record<string, DraftState>
): ShotEditorState["slots"] {
  return Object.fromEntries(
    (Object.entries(slots) as Array<[keyof ShotEditorState["slots"], SlotState]>).map(
      ([slotId, slot]) => {
        const nextDraft = nextDrafts[slotId];
        if (nextDraft) {
          return [slotId, { ...slot, draft: nextDraft }];
        }
        if (slot.draft?.meta?.recommendedFrom) {
          return [slotId, { ...slot, draft: null }];
        }
        return [slotId, slot];
      }
    )
  ) as ShotEditorState["slots"];
}

function clearSearchDraftFromSlot(slot: SlotState): SlotState {
  if (!slot.draft?.meta?.recommendedFrom) return slot;
  return { ...slot, draft: null };
}

/**
 * ADMIN 로컬DB/Search 직전 — recall display draft 제거 (USER clearSearchSlotDrafts와 분리).
 * - recommendedFrom 태그 draft
 * - renderable draft.sys (조회 hydrate) — SAVE applied.sys 없을 때만
 * targetBall stub만 유지 (명시 targetColor patch 보존).
 */
function clearAdminSearchDisplayFromSlot(slot: SlotState): SlotState {
  try {
    const d = slot?.draft;
    if (!d) return slot;
    const recallTagged = !!d.meta?.recommendedFrom;
    const hasDisplaySys = hasRenderableOutputsResult(d.sys);
    const appliedReady = hasRenderableOutputsResult(slot.applied?.sys);
    if (!recallTagged && !(hasDisplaySys && !appliedReady)) {
      return slot;
    }
    const keepTarget =
      d.targetBall === "red" || d.targetBall === "yellow" ? d.targetBall : null;
    return {
      ...slot,
      draft: keepTarget ? { targetBall: keepTarget } : null,
    };
  } catch (err) {
    console.warn("[clearAdminSearchDisplayFromSlot] skipped", err);
    return slot;
  }
}

function validateDraftState(
  draft: DraftState | null | undefined
): { ok: true } | { ok: false; reason: string } {
  if (!draft) {
    return { ok: false, reason: "Draft 데이터가 없습니다." };
  }
  const result = draft.sys?.outputs?.result;
  if (!result || typeof result !== "object") {
    return { ok: false, reason: "draft.sys.outputs.result가 없습니다." };
  }
  const firstVal = Object.values(result)[0];
  if (typeof firstVal !== "number" || Number.isNaN(firstVal)) {
    return { ok: false, reason: "계산 결과값이 숫자가 아닙니다." };
  }
  return { ok: true };
}

/**
 * slot + 입력 델타로 draft 전체(DraftState)를 계산 (setState 밖에서도 동일 결과를 얻기 위해 분리)
 */
function buildSlotDraftWithUpdatedSys(
  slot: SlotState,
  slotId: SlotId,
  nextSystemId: string,
  inputDelta: any,
  opts?: { track?: string }
): DraftState {
  const prevDraftSys = slot.draft?.sys ?? {};
  const prevInputs = prevDraftSys.inputs ?? {};
  const prevSystemId = prevDraftSys.systemId;
  const nextTrack = opts?.track ?? prevDraftSys.track ?? "B2T_L";

  const candidateInputs = {
    ...prevInputs,
    ...inputDelta,
  };

  let baseThreeC: number;
  let baseOneC: number;
  if (prevSystemId !== nextSystemId) {
    baseThreeC = typeof candidateInputs.C3 === "number" ? candidateInputs.C3 : 0;
    baseOneC = typeof candidateInputs.CO === "number" ? candidateInputs.CO : 0;
  } else {
    baseThreeC =
      typeof prevInputs.baseThreeC === "number"
        ? prevInputs.baseThreeC
        : typeof prevInputs.C3 === "number"
          ? prevInputs.C3
          : 0;
    baseOneC =
      typeof prevInputs.baseOneC === "number"
        ? prevInputs.baseOneC
        : typeof prevInputs.CO === "number"
          ? prevInputs.CO
          : 0;
  }

  const nextInputs = {
    ...candidateInputs,
    baseThreeC,
    baseOneC,
  };

  const C3_r_input = (nextInputs as { C3_r?: number }).C3_r;
  if (C3_r_input == null) {
    if (import.meta.env.DEV) {
      console.warn("[C3_r MISSING]", slotId, nextInputs);
    }
  }

  const profile = SYSTEM_PROFILES[nextSystemId];
  const exprInputs: Record<string, number> = { ...nextInputs } as Record<string, number>;

  let calcResult: Record<string, number> = {};
  if (profile?.formula?.expr) {
    calcResult = calculateByProfileExpr(profile.formula.expr, exprInputs);
  }

  console.log("[STEP6-A]", "system:", nextSystemId, "expr:", profile?.formula?.expr, "result:", calcResult);

  const prevOutputs = slot.draft?.sys?.outputs || {};
  const prevResult = prevOutputs.result || {};
  const prevDebug = prevOutputs.debug || {};

  let nextResult: Record<string, number> = {
    ...prevResult,
    ...calcResult,
  };

  if (C3_r_input != null) {
    nextResult.C3_r = C3_r_input;
  }

  if (nextSystemId === "5_half_system" || nextSystemId === "5_HALF") {
    const CO_f = nextResult.CO_f ?? (nextInputs as { CO_f?: number }).CO_f ?? 0;
    const C3_r = nextResult.C3_r;
    if (C3_r == null) {
      if (import.meta.env.DEV) {
        console.error("[C3_r NOT RESOLVED]", slotId, nextResult);
      }
    } else {
      const Sn = (CO_f - 50) * 0.5;
      const C4_f = C3_r + Sn;
      nextResult = {
        ...nextResult,
        Sn,
        C4_f,
        C5_f: C4_f,
        C6_f: C4_f,
      };
    }
  }

  if (import.meta.env.DEV) {
    console.group(`[SYS TRACE] ${slotId}`);
    console.log("[UPDATE_INPUTS]", slotId, nextInputs, prevResult);
    console.log("[NEXT_RESULT]", slotId, nextResult);
    console.groupEnd();
  }

  return {
    ...(slot.draft || {}),
    sys: {
      systemId: nextSystemId,
      track: nextTrack,
      inputs: nextInputs,
      outputs: {
        result: nextResult,
        debug: {
          ...prevDebug,
          expr: profile?.formula?.expr ?? null,
          exprInputs,
        },
      },
    },
  };
}

export function useShotSlots(options?: UseShotSlotsOptions) {
  const { setBallsState, setAdminState } = options ?? {};
  const [shotEditor, setShotEditor] = useState<ShotEditorState>({
    activeSlot: 'S1',
    slots: {
      S1: { draft: null, applied: null },
      S2: { draft: null, applied: null },
      S3: { draft: null, applied: null }
    }
  });
  const shotEditorRef = useRef(shotEditor);
  shotEditorRef.current = shotEditor;

  // ==========================================
  // Actions
  // ==========================================

  /**
   * 현재 슬롯에 APPLIED trajectory 저장
   * APPLIED 상태만 저장 가능
   * (기존 trajectory 관리형 SlotState 인터페이스와 DraftState 기반 구조가 다르니 실제 draft/applied 단위 저장이 아니라면 필요없음)
   * 이 예시에서는 적용하지 않음
   */
  
  /**
   * 슬롯 전환(activeSlot만 변경)
   */
  const switchSlot = (slotId: SlotId) => {
    setShotEditor(prev => ({
      ...prev,
      activeSlot: slotId
    }));
  };

  /**
   * 슬롯 복제
   * Draft와 applied를 모두 deep copy
   */
  const duplicateSlot = (sourceSlotId: SlotId, targetSlotId: SlotId) => {
    const sourceSlot = shotEditor.slots[sourceSlotId];
    if (!sourceSlot) return;

    setShotEditor(s => ({
      ...s,
      slots: {
        ...s.slots,
        [targetSlotId]: {
          draft: sourceSlot.draft ? structuredClone(sourceSlot.draft) : null,
          applied: sourceSlot.applied ? structuredClone(sourceSlot.applied) : null,
          balls: sourceSlot.balls ? structuredClone(sourceSlot.balls) : null,
        }
      }
    }));
  };

  // ==========================================
  // Draft 계산 로직 (핵심) - 시스템 독립성, base 값 고정, 이중 구조 적용
  // ==========================================
  /**
   * Draft(임시) sys 갱신 및 result/debug outputs 계산
   * - 시스템 전환 또는 입력 변화 시 즉시 실행
   * - APPLIED 데이터는 절대 수정 X
   */
  const updateDraftSys = (
    slotId: SlotId,
    nextSystemId: string,
    inputDelta: any,
    opts?: { track?: string }
  ) => {
    setShotEditor((s) => {
      const slot = s.slots[slotId];
      const nextDraft = buildSlotDraftWithUpdatedSys(slot, slotId, nextSystemId, inputDelta, opts);
      return {
        ...s,
        slots: {
          ...s.slots,
          [slotId]: {
            ...slot,
            draft: nextDraft,
          },
        },
      };
    });
  };

  /**
   * SYS 오버레이 "적용" 등: draft 갱신과 applied 반영을 한 번의 setState로 처리
   * (연속 updateDraftSys + applyDraftSys 호출 시 첫 갱신이 반영되기 전 stale draft를 apply 하는 버그 방지)
   */
  const commitDraftSys = (
    slotId: SlotId,
    nextSystemId: string,
    inputDelta: any,
    opts?: { track?: string }
  ):
    | { ok: true; appliedSys: NonNullable<DraftState["sys"]> }
    | { ok: false; reason: string } => {
    let committedSys: NonNullable<DraftState["sys"]> | null = null;
    let failReason = "";

    try {
      flushSync(() => {
        setShotEditor((s) => {
          const fresh = s.slots[slotId];
          const nextDraft = buildSlotDraftWithUpdatedSys(
            fresh,
            slotId,
            nextSystemId,
            inputDelta,
            opts
          );
          const v = validateDraftState(nextDraft);
          if (!v.ok) {
            failReason = v.reason;
            return s;
          }
          const prevApplied = fresh.applied ?? {};
          let clonedSys: NonNullable<DraftState["sys"]>;
          try {
            clonedSys = structuredClone(nextDraft.sys);
          } catch (e) {
            failReason = "structuredClone 실패: " + String(e);
            return s;
          }
          committedSys = clonedSys;
          return {
            ...s,
            slots: {
              ...s.slots,
              [slotId]: {
                ...fresh,
                draft: nextDraft,
                applied: { ...prevApplied, sys: clonedSys },
              },
            },
          };
        });
      });
    } catch (e) {
      return { ok: false, reason: "commitDraftSys flush 실패: " + String(e) };
    }

    if (!committedSys) {
      return { ok: false, reason: failReason || "SYS 적용 실패" };
    }
    return { ok: true, appliedSys: committedSys };
  };

  /*
    [전략 스냅샷 적용 전 요약]
    - 깊은 복사 방식: 최신 표준 structuredClone(slot.draft) 사용 (JSON 방식 불가).
    - 검증 기준: draft.sys.outputs.result.oneC가 반드시 숫자인지 확인. 아니면 적용 불가 및 사유 반환.
    - FORMULAS 등 재계산 없이 draft 내용을 있는 그대로 applied에 복사, draft와 applied는 서로 독립적으로 유지.
    - hook 반환 객체에 actions.applyDraft 등록.
    (유의: structuredClone은 최신 브라우저/런타임 표준입니다.)
  */

  // Draft 검증 함수 (expr/output 기반, 하드코딩 키 미사용)
  const validateDraft = (slotId: SlotId): { ok: true } | { ok: false; reason: string } => {
    const slot = shotEditor.slots[slotId];
    return validateDraftState(slot.draft);
  };

  // Draft.hpt/str/ai -> Applied.hpt/str/ai 확정 (오버레이 "적용" 시 호출)
  const applyHptToSlot = (slotId: SlotId, data: DraftState['hpt']) => {
    if (data == null) return;
    setShotEditor((s) => {
      const slot = s.slots[slotId];
      const prevApplied = slot.applied ?? {};
      const cloned = structuredClone(data);
      return {
        ...s,
        slots: {
          ...s.slots,
          [slotId]: {
            ...slot,
            draft: { ...(slot.draft ?? {}), hpt: cloned },
            applied: { ...prevApplied, hpt: cloned },
          },
        },
      };
    });
  };

  const applyStrToSlot = (slotId: SlotId, data: DraftState['str']) => {
    if (data == null) return;
    setShotEditor((s) => {
      const slot = s.slots[slotId];
      const prevApplied = slot.applied ?? {};
      const cloned = structuredClone(data);
      return {
        ...s,
        slots: {
          ...s.slots,
          [slotId]: {
            ...slot,
            draft: { ...(slot.draft ?? {}), str: cloned },
            applied: { ...prevApplied, str: cloned },
          },
        },
      };
    });
  };

  const applyAiToSlot = (slotId: SlotId, data: DraftState['ai']) => {
    if (data == null) return;
    setShotEditor((s) => {
      const slot = s.slots[slotId];
      const prevApplied = slot.applied ?? {};
      const cloned = structuredClone(data);
      return {
        ...s,
        slots: {
          ...s.slots,
          [slotId]: {
            ...slot,
            draft: { ...(slot.draft ?? {}), ai: cloned },
            applied: { ...prevApplied, ai: cloned },
          },
        },
      };
    });
  };

  // Draft.sys -> Applied.sys 확정 함수
  const applyDraftSys = (slotId: SlotId): { ok: true } | { ok: false; reason: string } => {
    const slot = shotEditor.slots[slotId];
    const draftSys = slot?.draft?.sys;

    // draft.sys 가 없으면 아무 작업도 하지 않음
    if (!draftSys) {
      return { ok: false, reason: "draft.sys가 존재하지 않습니다." };
    }

    let clonedSys: typeof draftSys;
    try {
      clonedSys = structuredClone(draftSys);
    } catch (err) {
      return { ok: false, reason: "structuredClone 실패: " + String(err) };
    }

    setShotEditor((s) => {
      const currentSlot = s.slots[slotId];
      const prevApplied = currentSlot.applied;

      // applied 가 null 이면 새 객체 생성, 존재하면 sys 만 교체
      const nextApplied: DraftState = prevApplied
        ? { ...prevApplied, sys: clonedSys }
        : { sys: clonedSys };

      return {
        ...s,
        slots: {
          ...s.slots,
          [slotId]: {
            ...currentSlot,
            applied: nextApplied,
          },
        },
      };
    });

    return { ok: true };
  };

  // ==========================================
  // [Save 로직 v1.4] applied 데이터만 저장 + 궤적 파생 + 시뮬레이션 저장
  // ==========================================
  /**
   * shot_record와 trajectory_samples 생성 후 저장 (localStorage or 서버 전송)
   * - applied 상태가 하나도 없으면 실행하지 않음
   * - draft는 절대 저장/계산에 사용하지 않음
   * - 저장/전송 뒤 알림 반환(성공/실패)
   */
  const saveShot = () => {
    // Step 1. applied 데이터만 취합 (Draft 배제)
    const appliedSlots = Object.entries(shotEditor.slots).filter(
      ([, slot]) => slot.applied != null
    );

    if (appliedSlots.length === 0) {
      alert("적용된(APPLIED) 전략이 없는 슬롯입니다.");
      return { ok: false, reason: "No applied slot" };
    }

    // shotRecord 구조 v1.4: meta, slots(S1/S2/S3: applied or null)
    const shotRecord = {
      meta: {
        createdAt: Date.now(),
        version: "v1.4",
      },
      slots: {
        S1: shotEditor.slots.S1.applied ? structuredClone(shotEditor.slots.S1.applied) : null,
        S2: shotEditor.slots.S2.applied ? structuredClone(shotEditor.slots.S2.applied) : null,
        S3: shotEditor.slots.S3.applied ? structuredClone(shotEditor.slots.S3.applied) : null,
      }
    };

    // Step 2. trajectory_samples 생성 유틸 호출
    let trajectorySamples;
    try {
      const slotList = (
        ["S1", "S2", "S3"] as const
      ).flatMap((id) => (shotEditor.slots[id].applied ? [shotEditor.slots[id]] : []));
      trajectorySamples = buildTrajectorySamples(
        slotList,
        `pos_${shotRecord.meta.createdAt}`,
        slotList[0]?.applied?.sys?.systemId ?? "5_half_system"
      );
    } catch (e) {
      alert("trajectory_samples 생성 오류: " + String(e));
      return { ok: false, reason: "trajectory_samples error" };
    }

    // Step 3. payload 및 고유 키명, 저장 & 최근 키 기록
    const payload = {
      shotRecord,
      trajectorySamples,
      savedAt: new Date().toISOString()
    };
    const shotKey = `shot_${shotRecord.meta.createdAt}`;
    try {
      localStorage.setItem(shotKey, JSON.stringify(payload));
      localStorage.setItem("lastSavedShotId", shotKey);
      alert("샷이 성공적으로 저장되었습니다. (로컬)");
      if (console.table) {
        console.group("[SaveShot] 저장된 Payload");
        console.table([
          { key: "shotKey", value: shotKey },
          { key: "savedAt", value: payload.savedAt },
          { key: "version", value: shotRecord.meta.version }
        ]);
        console.log("shotRecord:", shotRecord);
        console.log("trajectorySamples:", trajectorySamples);
        console.groupEnd();
      }
      return { ok: true, shotKey };
    } catch (err) {
      alert("저장 실패: " + String(err));
      return { ok: false, reason: "localStorage error" };
    }
  };

  /**
   * PositionRecord의 strategies를 모든 slot draft에 일괄 적용 (단일 setShotEditor)
   * applied 절대 수정 안 함. entry가 없는 slot은 skip.
   */
  const loadDraftsFromPositionRecord = (record: PositionRecord) => {
    setShotEditor((s) => {
      const nextSlots = { ...s.slots };
      for (const slotId of ["S1", "S2", "S3"] as const) {
        const entry = record.strategies[slotId];
        if (!entry) continue;
        const slot = nextSlots[slotId];
        if (!slot) continue;
        nextSlots[slotId] = {
          ...slot,
          draft: {
            sys: strategyEntryToSlotDraftSys(entry),
            hpt: entry.hpT,
            str: entry.str,
            ai: entry.ai,
            meta: { recommendedFrom: { positionId: record.positionId, score: 0 } },
          },
        };
      }
      return { ...s, slots: nextSlots };
    });
  };

  /**
   * StrategyEntry를 draft에만 로딩 (applied 절대 수정 안 함)
   * 관리자 자동 추천용
   */
  const loadDraftFromStrategyEntry = (
    slotId: SlotId,
    entry: StrategyEntry | null,
    meta?: { positionId: string; score: number }
  ) => {
    if (!entry) return;
    setShotEditor((s) => {
      const slot = s.slots[slotId];
      return {
        ...s,
        slots: {
          ...s.slots,
          [slotId]: {
            ...slot,
            draft: {
              sys: strategyEntryToSlotDraftSys(entry),
              hpt: entry.hpT,
              str: entry.str,
              ai: entry.ai,
              meta: meta ? { recommendedFrom: meta } : undefined,
              ...draftRuntimeFieldsFromStrategyEntry(entry),
            },
          },
        },
      };
    });
  };

  /**
   * SYS Apply 등: per-slot corrections / shotType / system_values를 draft+applied에 저장
   */
  const patchSlotRuntimeMeta = (
    slotId: SlotId,
    meta: {
      corrections?: StrategySysCorrections;
      shotType?: string;
      system_values?: Record<string, number>;
      targetBall?: TargetBall | null;
    }
  ) => {
    setShotEditor((s) => {
      const slot = s.slots[slotId];
      const patch = {
        ...(meta.corrections != null ? { corrections: meta.corrections } : {}),
        ...(meta.shotType != null ? { shotType: meta.shotType } : {}),
        ...(meta.system_values != null
          ? { system_values: { ...meta.system_values } }
          : {}),
        ...(meta.targetBall !== undefined ? { targetBall: meta.targetBall } : {}),
      };
      const hasTargetBallPatch = meta.targetBall !== undefined;
      const targetOnlyStub = hasTargetBallPatch
        ? { targetBall: meta.targetBall }
        : null;
      return {
        ...s,
        slots: {
          ...s.slots,
          [slotId]: {
            ...slot,
            draft: slot.draft
              ? { ...slot.draft, ...patch }
              : targetOnlyStub,
            applied: slot.applied
              ? { ...slot.applied, ...patch }
              : targetOnlyStub,
          },
        },
      };
    });
  };

  /**
   * 슬롯 삭제 (draft/applied 모두 null로)
   */
  const deleteSlot = (slotId: SlotId) => {
    setShotEditor(s => ({
      ...s,
      slots: {
        ...s.slots,
        [slotId]: { draft: null, applied: null }
      }
    }));
  };

  /**
   * 현재 활성 슬롯 가져오기
   */
  const getActiveSlot = (): SlotState => {
    return shotEditor.slots[shotEditor.activeSlot];
  };

  /**
   * 모든 슬롯 가져오기
   */
  const getAllSlots = (): SlotState[] => {
    return Object.values(shotEditor.slots);
  };

  /**
   * APPLIED 슬롯만 가져오기 (Save용)
   */
  const getAppliedSlots = (): SlotState[] => {
    return Object.values(shotEditor.slots).filter(
      slot => slot.applied != null
    );
  };

  /** draft ≠ applied인 슬롯 ID 목록 */
  const getDirtySlotIds = (): SlotId[] => {
    return (["S1", "S2", "S3"] as const).filter(
      (id) => isSlotDirty(shotEditor.slots[id])
    );
  };

  /** 모든 슬롯 확정 여부 (dirty 없음) */
  const isAnySlotDirty = (): boolean => getDirtySlotIds().length > 0;

  /**
   * Position Recall 결과를 UI 상태에 적용 (옵션 B: 전략만 적용)
   * - balls / adminState.balls 절대 변경 안 함
   * - draft만 갱신 (applied 유지)
   */
  const applyPositionRecall = (record: PositionRecord) => {
    const nextDrafts = buildDraftsFromRecord(record);
    setShotEditor((prev) => ({
      ...prev,
      slots: applyDraftsToSlots(prev.slots, nextDrafts),
    }));
  };

  /** USER Search — draft full replace + 이전 Search 잔존 제거 */
  const applyUserSearchRecall = (record: PositionRecord) => {
    const nextDrafts = buildDraftsFromRecord(record);
    setShotEditor((prev) => ({
      ...prev,
      slots: applyDraftsFromSearchRecord(prev.slots, nextDrafts),
    }));
  };

  const clearSearchSlotDrafts = () => {
    setShotEditor((prev) => ({
      ...prev,
      slots: {
        S1: clearSearchDraftFromSlot(prev.slots.S1),
        S2: clearSearchDraftFromSlot(prev.slots.S2),
        S3: clearSearchDraftFromSlot(prev.slots.S3),
      },
    }));
  };

  /** ADMIN Search/로컬DB pre-clear — recall display draft.sys.outputs 등 제거 (동기 flush) */
  const clearAdminSearchDisplaySlotDrafts = () => {
    flushSync(() => {
      setShotEditor((prev) => ({
        ...prev,
        slots: {
          S1: clearAdminSearchDisplayFromSlot(prev.slots.S1),
          S2: clearAdminSearchDisplayFromSlot(prev.slots.S2),
          S3: clearAdminSearchDisplayFromSlot(prev.slots.S3),
        },
      }));
    });
  };

  // ==========================================
  // Return
  // ==========================================

  /** Workspace History 복원용: shotEditor 전체 overwrite */
  const restoreShotEditor = (next: ShotEditorState) => {
    setShotEditor(next);
  };

  /** 현재 테이블 좌표를 S1/S2/S3에 동일하게 저장 (Position LOCK 시) */
  const syncBallsToAllSlots = (
    balls: Record<string, { x: number; y: number } | undefined> | null | undefined
  ) => {
    if (!balls) return;
    const snapshot = JSON.parse(JSON.stringify(balls)) as Record<
      string,
      { x: number; y: number } | undefined
    >;
    setShotEditor((prev) => ({
      ...prev,
      slots: {
        S1: { ...prev.slots.S1, balls: snapshot },
        S2: { ...prev.slots.S2, balls: snapshot },
        S3: { ...prev.slots.S3, balls: snapshot },
      },
    }));
  };

  const clearBallsSnapshotsFromSlots = () => {
    setShotEditor((prev) => ({
      ...prev,
      slots: {
        S1: { ...prev.slots.S1, balls: null },
        S2: { ...prev.slots.S2, balls: null },
        S3: { ...prev.slots.S3, balls: null },
      },
    }));
  };

  return {
    shotEditor,
    actions: {
      switchSlot,
      duplicateSlot,
      updateDraftSys,
      commitDraftSys,
      validateDraft,
      applyDraftSys,
      applyHptToSlot,
      applyStrToSlot,
      applyAiToSlot,
      loadDraftFromStrategyEntry,
      patchSlotRuntimeMeta,
      loadDraftsFromPositionRecord,
      applyPositionRecall,
      applyUserSearchRecall,
      clearSearchSlotDrafts,
      clearAdminSearchDisplaySlotDrafts,
      saveShot,
      deleteSlot,
      getActiveSlot,
      getAllSlots,
      getAppliedSlots,
      getDirtySlotIds,
      isAnySlotDirty,
      restoreShotEditor,
      syncBallsToAllSlots,
      clearBallsSnapshotsFromSlots,
    }
  };
}

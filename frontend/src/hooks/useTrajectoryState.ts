import { useState } from 'react';

// --- 인터페이스 정의 ---
export enum TrajectoryPhase {
  IDLE = 'IDLE',
  ADJUSTING = 'ADJUSTING',
  APPLIED = 'APPLIED'
}

export interface SysValues {
  oneC: number;
  threeC: number;
  long?: number;
}

export interface TrajectoryData {
  sys: SysValues;
  hp?: { h: number; p: number };
}

interface State {
  phase: TrajectoryPhase;
  base: TrajectoryData | null;
  adjusted: TrajectoryData | null;
  derived: { track: string } | null;
}

// --- Hook 구현 ---
export const useTrajectoryState = () => {
  const [state, setState] = useState<State>({
    phase: TrajectoryPhase.IDLE,
    base: null,
    adjusted: null,
    derived: null,
  });

  const setAdjusting = (data: TrajectoryData) => {
    setState({
      phase: TrajectoryPhase.ADJUSTING,
      base: data,
      adjusted: data,
      derived: null,
    });
  };
  const updateAdjusted = (sys: Partial<SysValues>) => {
    setState(s => {
      if (!s.adjusted) return s;
      return {
        ...s,
        adjusted: {
          ...s.adjusted,
          sys: { ...s.adjusted.sys, ...sys }
        }
      };
    });
  };
 
  const applySysResult = (result: any | null | undefined) => {
    console.log('[STEP7] applySysResult called', result);

    if (!result) return;
 
    const next: Partial<SysValues> = {};
 
    if (typeof result.oneC === 'number' && !Number.isNaN(result.oneC)) {
      next.oneC = result.oneC;
    }
 
    if (typeof result.threeC === 'number' && !Number.isNaN(result.threeC)) {
      next.threeC = result.threeC;
    }
 
    if (typeof result.long === 'number' && !Number.isNaN(result.long)) {
      next.long = result.long;
    }
 
    if (Object.keys(next).length === 0) return;
 
    updateAdjusted(next);
  };

  const applyTrajectory = () => {
    setState(s => ({
      ...s,
      phase: TrajectoryPhase.APPLIED,
      derived: { track: 'B2T_R' } // 실제 물리 엔진 연동 지점
    }));
  };

  return {
    state,
    setAdjusting,
    updateAdjusted,
    applyTrajectory,
    applySysResult
  };
};
import { SlotState } from '../hooks/useShotSlots';
import { TrajectoryState, Point, TrajectoryPoints } from '../hooks/useTrajectoryState';

// ==========================================
// Types (trajectory_samples.schema.json v1.1)
// ==========================================

export interface BallPosition {
  x: number;
  y: number;
}

export interface TrajectorySampleAnchor {
  anchor_id: string;
  t: number;
  ui: {
    ball: BallPosition;
  };
  sys_context: {
    CO: number;
    one_c: number;
    three_c: number;
    target: number;
  };
  segment_meta?: {
    division?: number;
    percentage?: number;
  };
}

export interface TrajectorySampleSegment {
  segment_id: 'co_to_impact' | 'cushion_to_second';
  space: 'Fg';
  sampling_rule: {
    method: 'linear';
    parameter: 't';
    range: [number, number];
  };
  anchors: TrajectorySampleAnchor[];
  anchor_meta: {
    anchor_count: number;
    description?: string;
    source?: string;
  };
}

export interface TrajectorySample {
  position_id: string;
  strategy_id: 'S1' | 'S2' | 'S3';
  system_id: string;
  track: 'B2T_L' | 'B2T_R' | 'T2B_L' | 'T2B_R';
  trajectory: {
    context: {
      hpt: {
        T: string;
        hit_point: {
          x: number;
          y: number;
        };
      };
    };
    segments: {
      co_to_impact: TrajectorySampleSegment;
      cushion_to_second: TrajectorySampleSegment;
    };
  };
  meta: {
    version: 'trajectory_samples_v1.1';
    created_at: string;
    shot_type?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    curator?: string;
  };
}

// ==========================================
// Helpers
// ==========================================

/**
 * TrajectoryPoints → Anchors 변환
 * TODO: 실제 샘플링 로직 구현 필요
 */
function pointsToAnchors(points: TrajectoryPoints, segmentId: 'co_to_impact' | 'cushion_to_second'): TrajectorySampleAnchor[] {
  // 현재는 기본 2개 anchor만 생성 (CO, C1 또는 C1, C3)
  if (segmentId === 'co_to_impact') {
    return [
      {
        anchor_id: 'A0',
        t: 0.0,
        ui: {
          ball: { x: points.CO.x, y: points.CO.y }
        },
        sys_context: {
          CO: 0, // TODO: 실제 값
          one_c: 0,
          three_c: 0,
          target: 0
        }
      },
      {
        anchor_id: 'A1',
        t: 1.0,
        ui: {
          ball: { x: points.oneC.x, y: points.oneC.y }
        },
        sys_context: {
          CO: 0,
          one_c: 0,
          three_c: 0,
          target: 0
        }
      }
    ];
  } else {
    return [
      {
        anchor_id: 'SB0',
        t: 0.0,
        ui: {
          ball: { x: points.oneC.x, y: points.oneC.y }
        },
        sys_context: {
          CO: 0,
          one_c: 0,
          three_c: 0,
          target: 0
        }
      },
      {
        anchor_id: 'SB1',
        t: 1.0,
        ui: {
          ball: { x: points.threeC.x, y: points.threeC.y }
        },
        sys_context: {
          CO: 0,
          one_c: 0,
          three_c: 0,
          target: 0
        }
      }
    ];
  }
}

/**
 * C2 override 적용
 * TODO: 실제 궤적 재계산 로직
 */
function applyTwoCOverride(points: TrajectoryPoints, override: { point: Point }): TrajectoryPoints {
  return {
    ...points,
    twoC: override.point
  };
}

// ==========================================
// Main Builder
// ==========================================

/**
 * SlotState → TrajectorySample 변환
 * trajectory_samples.schema.json v1.1 준수
 */
export function buildTrajectorySample(
  slot: SlotState,
  positionId: string,
  systemId: string,
  meta?: {
    shot_type?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    curator?: string;
  }
): TrajectorySample | null {
  const trajectory = slot.trajectory;

  if (!trajectory || !trajectory.base || !trajectory.adjusted || !trajectory.derived) {
    console.warn('buildTrajectorySample: incomplete trajectory');
    return null;
  }

  // 최종 points (override 적용)
  const finalPoints = trajectory.overrides?.twoC
    ? applyTwoCOverride(trajectory.adjusted.points, trajectory.overrides.twoC)
    : trajectory.adjusted.points;

  return {
    position_id: positionId,
    strategy_id: slot.slotId,
    system_id: systemId,
    track: trajectory.derived.track || 'B2T_R',

    trajectory: {
      context: {
        hpt: {
          T: '+5/8', // TODO: 실제 HP/T 데이터 연결
          hit_point: {
            x: 0,
            y: 0
          }
        }
      },
      segments: {
        co_to_impact: {
          segment_id: 'co_to_impact',
          space: 'Fg',
          sampling_rule: {
            method: 'linear',
            parameter: 't',
            range: [0.0, 1.0]
          },
          anchors: pointsToAnchors(finalPoints, 'co_to_impact'),
          anchor_meta: {
            anchor_count: 2,
            description: 'CO에서 Impact까지의 기준 샘플'
          }
        },
        cushion_to_second: {
          segment_id: 'cushion_to_second',
          space: 'Fg',
          sampling_rule: {
            method: 'linear',
            parameter: 't',
            range: [0.0, 1.0]
          },
          anchors: pointsToAnchors(finalPoints, 'cushion_to_second'),
          anchor_meta: {
            anchor_count: 2,
            description: 'Cushion에서 Second까지의 기준 샘플'
          }
        }
      }
    },

    meta: {
      version: 'trajectory_samples_v1.1',
      created_at: new Date().toISOString(),
      ...meta
    }
  };
}

/**
 * 여러 슬롯 → JSON 배열 생성
 */
export function buildTrajectorySamples(
  slots: SlotState[],
  positionId: string,
  systemId: string,
  meta?: {
    shot_type?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    curator?: string;
  }
): TrajectorySample[] {
  return slots
    .map(slot => buildTrajectorySample(slot, positionId, systemId, meta))
    .filter((sample): sample is TrajectorySample => sample !== null);
}

/**
 * JSON 문자열 생성 (Save용)
 */
export function trajectorySamplesToJSON(samples: TrajectorySample[]): string {
  return JSON.stringify(samples, null, 2);
}

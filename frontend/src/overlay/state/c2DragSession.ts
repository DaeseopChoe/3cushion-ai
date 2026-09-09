/**
 * Pure C2 rail-handle drag session — click-only must not mutate override.
 * Mutation starts only when pointer move yields an override different from seed.
 */

import type { Rail } from "../../domain/reflectionEngine";
import {
  reflectionOverrideFromPoint,
  resolveRailForC2Handle,
  snapPointerToReflectionOverride,
  type ReflectionOverride,
  type RgPoint,
} from "../../domain/trajectory/c2ReflectionOverride";

export type C2DragSession = {
  rail: Rail;
  seedOverride: ReflectionOverride;
  hasMutated: boolean;
};

export function reflectionOverridesEqual(
  a: ReflectionOverride | null | undefined,
  b: ReflectionOverride | null | undefined
): boolean {
  if (a == null || b == null) return a === b;
  return a.rail === b.rail && a.t === b.t;
}

/** Capture rail + seed override from current handle Rg (active C2; no geometry write). */
export function beginC2DragSession(input: {
  handleRg: RgPoint;
  existingOverride: ReflectionOverride | null | undefined;
}): C2DragSession {
  const rail = resolveRailForC2Handle(
    input.handleRg,
    input.existingOverride?.rail ?? null
  );
  const seedOverride =
    input.existingOverride ??
    reflectionOverrideFromPoint(input.handleRg, rail) ?? {
      rail,
      t: 0.5,
    };
  return {
    rail,
    seedOverride,
    hasMutated: false,
  };
}

/**
 * Advance session on pointer move.
 * nextOverride is null until the snapped override differs from seed (no click-only mutate).
 */
export function advanceC2DragSession(
  session: C2DragSession,
  pointerRg: RgPoint
): { session: C2DragSession; nextOverride: ReflectionOverride | null } {
  const next = snapPointerToReflectionOverride(pointerRg, session.rail);
  if (!session.hasMutated) {
    if (reflectionOverridesEqual(next, session.seedOverride)) {
      return { session, nextOverride: null };
    }
    return {
      session: { ...session, hasMutated: true },
      nextOverride: next,
    };
  }
  return { session, nextOverride: next };
}

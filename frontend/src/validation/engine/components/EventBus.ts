/**
 * validation/engine/components/EventBus.ts
 *
 * STEP6-7E — Accept-only Event Bus sink (Event ≠ Finding).
 * Fan-out / persistence not implemented — Executor may call emit().
 */

import type { IEventBus } from "../interfaces";
import type { EngineEvent } from "../execution/executionModels";
import type { EnginePayload } from "../types";

function isEngineEvent(event: EnginePayload): event is EngineEvent {
  return (
    event !== null &&
    typeof event === "object" &&
    "kind" in event &&
    (event as EngineEvent).kind === "engine.event"
  );
}

export class EventBus implements IEventBus {
  private readonly events: EngineEvent[] = [];

  /** Accept progress/meta events. No fan-out implementation. */
  emit(event: EnginePayload): void {
    if (isEngineEvent(event)) {
      this.events.push(event);
    }
  }

  getEvents(): readonly EngineEvent[] {
    return this.events;
  }

  clear(): void {
    this.events.length = 0;
  }
}

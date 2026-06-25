import { describe, expect, it } from "vitest";
import {
  adminSysFromResolvedSlotSys,
  adminSysShallowEqual,
  createEmptyAdminSysSnapshot,
} from "./adminSysFromSlot";

describe("adminSysFromSlot", () => {
  it("maps renderable slot sys with per-slot meta (not prev corrections)", () => {
    const slotSys = {
      systemId: "5_half_system",
      track: "B2T_L",
      inputs: { CO_f: 30 },
      outputs: { result: { CO_f: 33, C3_r: 20 } },
    };
    const next = adminSysFromResolvedSlotSys(slotSys, {
      corrections: { slide: 2, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
      shotType: "옆돌리기",
      system_values: { CO_f: 33 },
    });
    expect(next?.corrections?.slide).toBe(2);
    expect(next?.shotType).toBe("옆돌리기");
    expect(next?.inputs?.CO_f).toBe(33);
  });

  it("empty snapshot has zero corrections and empty shotType", () => {
    const empty = createEmptyAdminSysSnapshot();
    expect(empty.inputs).toEqual({});
    expect(empty.shotType).toBe("");
    expect(empty.corrections?.slide).toBe(0);
  });

  it("shallow equal detects identical sys snapshots", () => {
    const a = {
      systemId: "5_half_system",
      inputs: { CO_f: 1 },
      system_values: { CO_f: 1 },
      corrections: { slide: 0, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
    };
    const b = { ...a, corrections: { ...a.corrections } };
    expect(adminSysShallowEqual(a, b)).toBe(true);
  });
});

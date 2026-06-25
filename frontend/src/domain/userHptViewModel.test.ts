import { describe, expect, it } from "vitest";
import {
  buildUserHptViewModel,
  hasHptHitPoint,
} from "./userHptViewModel";

describe("hasHptHitPoint", () => {
  it("false when hpt null", () => {
    expect(hasHptHitPoint(null)).toBe(false);
  });

  it("false when only T without hit_point", () => {
    expect(hasHptHitPoint({ T: "BANK" })).toBe(false);
    expect(hasHptHitPoint({ T: "+3/8" })).toBe(false);
  });

  it("true when hit_point exists (BANK allowed)", () => {
    expect(hasHptHitPoint({ T: "BANK", hit_point: { x: 1, y: 0.5 } })).toBe(true);
  });
});

describe("buildUserHptViewModel", () => {
  it("Case 1 TIP: thickness, tip, clock — no rotation/follow", () => {
    const vm = buildUserHptViewModel({
      hpt: { T: "-3/8", hit_point: { x: 2, y: 1 }, mode: "TIP" },
    });
    expect(vm.isEmpty).toBe(false);
    expect(vm.displayMode).toBe("tip_clock");
    expect(vm.thicknessLabel).toContain("좌측");
    expect(vm.thicknessLabel).toContain("3/8");
    expect(vm.tipLabel).toBeTruthy();
    expect(vm.clockLabel).toBeTruthy();
    expect(vm.rotationLabel).toBeUndefined();
    expect(vm.followLabel).toBeUndefined();
    expect(vm.viz).toEqual({ T: "-3/8", hitX: 2, hitY: 1 });
  });

  it("Case 2 SPIN: thickness, rotation, follow — no tip/clock", () => {
    const vm = buildUserHptViewModel({
      hpt: { T: "-3/8", hit_point: { x: 2.4, y: 1.5 }, mode: "SPIN" },
    });
    expect(vm.displayMode).toBe("spin_follow");
    expect(vm.rotationLabel).toContain("우측");
    expect(vm.followLabel).toContain("상단");
    expect(vm.tipLabel).toBeUndefined();
    expect(vm.clockLabel).toBeUndefined();
  });

  it("BANK with hit_point shows BANK thickness label", () => {
    const vm = buildUserHptViewModel({
      hpt: { T: "BANK", hit_point: { x: 1, y: 0 }, mode: "TIP" },
    });
    expect(vm.thicknessLabel).toBe("BANK");
    expect(vm.isEmpty).toBe(false);
  });

  it("BANK SPIN shows rotation/follow without numeric thickness", () => {
    const vm = buildUserHptViewModel({
      hpt: { T: "BANK", hit_point: { x: 2, y: 1 }, mode: "SPIN" },
    });
    expect(vm.thicknessLabel).toBe("BANK");
    expect(vm.displayMode).toBe("spin_follow");
    expect(vm.rotationLabel).toContain("우측");
    expect(vm.followLabel).toContain("상단");
  });

  it("legacy mode undefined defaults to TIP", () => {
    const vm = buildUserHptViewModel({
      hpt: { T: "8/8", hit_point: { x: 0, y: 0 } },
    });
    expect(vm.displayMode).toBe("tip_clock");
    expect(vm.tipLabel).toBeTruthy();
  });

  it("empty when no strategy selected flag", () => {
    const vm = buildUserHptViewModel({
      hpt: { T: "8/8", hit_point: { x: 1, y: 0 } },
      noStrategySelected: true,
    });
    expect(vm.isEmpty).toBe(true);
    expect(vm.viz).toBeNull();
  });

  it("empty when hpt null", () => {
    const vm = buildUserHptViewModel({ hpt: null });
    expect(vm.emptyMessage).toBe("HP/T 설정 없음");
  });
});

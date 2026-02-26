# 단일 clamp 책임 재정렬 완료 보고서

## 변경된 파일 목록

| 파일 | 변경 요약 |
|------|------------|
| `frontend/src/admin/hpt/useHptController.ts` | clampHpToRadius, applyHpLocal/AndSync, 모든 경로 단일화 |
| `frontend/src/App.jsx` | controllerValue/onControllerChange에 clamp 적용 |
| `frontend/docs/CLAMP_SSOT_REFACTOR_REPORT.md` | 본 보고서 |

---

## 핵심 변경 Diff

### useHptController.ts (~60줄 변경)

```diff
+/** 원형 clamp (반경 rMax) - SSOT */
+export function clampHpToRadius(x: number, y: number, rMax: number): { x: number; y: number } {
+  const r = Math.hypot(x, y);
+  if (r === 0 || r <= rMax) return { x, y };
+  const ratio = rMax / r;
+  return { x: x * ratio, y: y * ratio };
+}
+
  // 단일 clamp 진입점
+ const applyHpLocal = useCallback((x: number, y: number) => {
+   const clamped = clampHpToRadius(x, y, MAX_TIP);
+   setHpX(clamped.x);
+   setHpY(clamped.y);
+ }, []);
+
+ const applyHpAndSync = useCallback((x: number, y: number, nextMode: HptMode) => {
+   const clamped = clampHpToRadius(x, y, MAX_TIP);
+   setMode(nextMode);
+   setHpX(clamped.x);
+   setHpY(clamped.y);
+   sync(clamped.x, clamped.y);
+ }, [sync]);

  // useEffect: applyHpLocal만 사용 (루프 방지)
  useEffect(() => {
    const x = hpt.hp.x ?? 0;
    const y = hpt.hp.y ?? 0;
-   setHpX(x);
-   setHpY(y);
+   applyHpLocal(x, y);
  }, [hpt.hp.x, hpt.hp.y, applyHpLocal]);

  // setHpFromSystem: applyHpAndSync로 통일
  // setJoystick: applyHpAndSync만 호출
  // setRotationTip/setVerticalTip: applyHpAndSync만 호출 (반경 clamp 로직 제거)
```

### App.jsx (~15줄 변경)

```diff
-import { useHptController, RG_TO_TIP_SCALE } from "./admin/hpt/useHptController";
+import { useHptController, RG_TO_TIP_SCALE, clampHpToRadius } from "./admin/hpt/useHptController";

  const hpRawX = isRgScale ? rawX * RG_TO_TIP_SCALE : rawX;
  const hpRawY = isRgScale ? rawY * RG_TO_TIP_SCALE : rawY;
+ const hpClamped = clampHpToRadius(hpRawX, hpRawY, 4);
  const controllerValue = {
    T: tempData.T ?? "8/8",
-   hp: { x: hpX, y: hpY },
+   hp: { x: hpClamped.x, y: hpClamped.y },
  };
  const onControllerChange = (next) => {
-   setTempData((prev) => ({ ...prev, T: next.T, hit_point: next.hp }));
+   const c = clampHpToRadius(next.hp?.x ?? 0, next.hp?.y ?? 0, 4);
+   setTempData((prev) => ({ ...prev, T: next.T, hit_point: { x: c.x, y: c.y } }));
  };
```

---

## hp 세팅 경로 → applyHp 단일화 체크리스트

| 경로 | 적용 함수 | clamp |
|------|-----------|-------|
| 조이스틱 드래그 | setJoystick → applyHpAndSync | ✅ |
| 회전 입력 | setRotationTip → applyHpAndSync | ✅ |
| 당점 입력 | setVerticalTip → applyHpAndSync | ✅ |
| 시스템 타점 | setHpFromSystem → applyHpAndSync | ✅ |
| ball 드래그 / direct | setHp → setJoystick → applyHpAndSync | ✅ |
| 부모 역주입 | useEffect → applyHpLocal | ✅ |

---

## 수동 테스트 결과

- **빌드**: `npm run build` 통과
- **검증 항목**:
  1. 조이스틱 아무리 바깥으로 드래그해도 hp 반경 4 초과 없음
  2. TIP ↔ SPIN 전환 시 점이 한계선 밖으로 튀지 않음
  3. controllerValue에 4 초과값이 있어도 clamp 후 전달

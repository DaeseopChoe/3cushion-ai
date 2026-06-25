# C2 Reflection 미반영 원인 분석 보고서

## 1. 현상 요약

- **궤적선**: 여전히 CO → 3C 직선 점프 (C2 미표시)
- **HP/T 반영**: T(두께)만 반영되고, HP(타점/팁)는 반영되지 않음

---

## 2. 원인 분석

### 2-1. computeReflectionC2()가 null을 반환하는 경우

C2가 표시되지 않는다는 것은 `reflected?.c2`가 항상 `null`이라는 뜻이다.  
즉, `computeReflectionC2()`가 호출되더라도 결과를 `null`로 반환하는 상황으로 추정된다.

**가능한 실패 지점**

| 지점 | 조건 | 설명 |
|------|------|------|
| **detectRail 실패** | `c1Rail` 또는 `c3Rail`이 `null` | C1, C3가 레일 위로 인식되지 않음 |
| **findFirstValidC2 실패** | C1에서 나간 광선이 4개 레일 모두와 교점 없음 | `thetaOutDeg` 방향이 잘못되었거나 교점 계산 오류 |

### 2-2. computeRailPoints와 좌표계 불일치

**현재 구조**

```
rawAnchorsCalibrated (RG 또는 FG 혼재 가능)
    ↓
CO_fg, C1_fg = rawAnchorsCalibrated.CO, rawAnchorsCalibrated["1C"]
    ↓
computeRailPoints(CO_fg, C1_fg)
```

`computeRailPoints`는 **FG 좌표**를 가정하고 아래 상수로 레일을 판별한다.

- `FG_BOTTOM_Y = -2.25`
- `FG_TOP_Y = 42.25`

하지만 `rawAnchorsCalibrated`는 `getAnchorsForRendering`에서 **RG 좌표**(0–80, 0–40)로 나올 수 있다.

그 경우:

- `CO_fg.y`, `C1_fg.y`는 0–40 범위
- `Math.abs(CO_fg.y - (-2.25)) < 0.5` 같은 조건이 절대 만족되지 않음
- `computeRailPoints`는 레일 교점을 계산하지 못하고, **입력 좌표를 그대로** CO_rail, C1_rail로 반환
- 좌표는 RG일 수 있으나, FG 기준 로직과 섞여 일관성이 없음

### 2-3. Short rail 미지원

`rail.ts`의 `computeRailPoints`는 **long rail만** 처리한다.

- CO: BOTTOM(y=-2.25) 또는 TOP(y=42.25)
- C1: TOP 또는 BOTTOM

이미지에서 “CO 20”이 **우측 레일**(x=80)에 있다면, CO는 **short rail** 위에 있다.  
이 경우 `computeRailPoints`는 short rail을 고려하지 않아 CO_rail을 제대로 계산하지 못한다.

### 2-4. HP/T 데이터 흐름 — HP가 trajectory에 반영되지 않는 이유

**HP/T 오버레이 저장 흐름**

```
HptOverlay (tempData) 
    → onSave 클릭 
    → setAdminState({ hpt: newData }) 
    → actions.applyHptToSlot(...)
```

- 오버레이가 **열려 있는 동안**의 편집은 `tempData`에만 존재
- `adminState.hpt`는 **저장 버튼 클릭 시**에만 갱신됨
- 메인 렌더링/궤적 계산은 항상 `adminState.hpt`만 사용

**currentTip 추출 로직**

```javascript
const hp = adminState?.hpt?.hit_point ?? adminState?.hpt?.hp;
```

- `hit_point` 또는 `hp`가 없으면 `currentTip`은 `null`
- 저장 전이거나, 슬롯 데이터에 `hit_point`가 없으면 `{ count: 0, side: "R" }` 수준으로만 사용되거나 `null`이 됨

**T는 어디서 사용되는지**

| 사용처 | 데이터 소스 | 용도 |
|--------|-------------|------|
| `calcImpactBall` | `adminState.hpt.T` (systemCtrl.T) | impact 위치 |
| `calibrateTrajectory` | `opts.thickness` (view.ui.display_options) | CO, C1 보정 |
| 기타 표시/계산 | `adminState.hpt.T` | 두께 관련 표시 |

T는 `adminState.hpt.T`와 `opts.thickness` 등 여러 경로에서 사용되므로, 변경이 눈에 띄게 반영된다.

**HP(hit_point)의 사용처**

| 사용처 | 용도 |
|--------|------|
| `computeReflectionC2`의 `tip` 인자 | spin 각도 보정 (thetaOutDeg 계산) |

HP는 사실상 **computeReflectionC2의 tip으로만** trajectory에 영향을 준다.

- `computeReflectionC2`가 `null`을 반환하면 → C2 미생성 → 궤적에 HP 영향 없음
- 그래서 **T만 반영되고, HP는 반영되지 않는** 현상이 발생함

---

## 3. 조치 제안 (우선순위)

### 3-1. 즉시: 디버그 로깅 추가

`computeReflectionC2` 호출 전후와 실패 원인을 확인할 수 있게 로그를 넣는다.

```javascript
// App.jsx - reflection fallback 블록
if (!anchors["2C"] && CO_rail && C1_rail && c3Anchor) {
  const result = computeReflectionC2({ ... });
  if (result) {
    console.log("🔷 C2 reflection OK:", result.diagnostics);
  } else {
    console.warn("🔷 C2 reflection FAIL:", {
      c1Rail: detectRail(C1_rail),
      c3Rail: detectRail(c3Anchor),
      c3InRgBounds,
    });
  }
}
```

브라우저 콘솔에서 `c1Rail`, `c3Rail`, `c3InRgBounds` 등으로 실패 조건을 확인한다.

### 3-2. detectRail 실패 시: C3 좌표 검증

- C3가 anchors 보간으로 인해 레일에서 살짝 떨어져 있을 수 있다.
- `EPS_RAIL_ANCHOR = 5`로 넓혀도 감지되지 않는다면,  
  C3가 실제로 어느 레일에 가까운지(가장 가까운 레일 추정) 추가하는 로직을 검토한다.

### 3-3. computeRailPoints 입력 검토

- `CO_fg`, `C1_fg`가 실제로 FG인지 RG인지 명확히 하고,
- RG라면 `computeRailPoints`를 RG 전용으로 분리하거나, FG/RG 플래그를 두어 분기 처리하는 것이 안전하다.

### 3-4. HP/T 실시간 반영 (장기)

- HP/T 오버레이가 열려 있을 때 `tempData`를 상위로 올려,
- `adminState` 대신 **편집 중인 값**으로 `currentTip`을 계산하도록 한다.
- 또는 `onControllerChange` 시점에 `adminState`를 즉시 갱신하는 방식을 검토한다.

---

## 4. 결론

| 항목 | 내용 |
|------|------|
| **C2 점프 유지** | `computeReflectionC2`가 `null`을 반환해 C2가 생성되지 않음 |
| **T만 반영** | T는 여러 경로에서 사용되고, HP는 reflection tip으로만 사용되어, reflection 실패 시 HP 영향 없음 |
| **추정 원인** | detectRail 실패(특히 C3), computeRailPoints의 FG/RG 혼용, short rail 미지원 |
| **우선 조치** | 디버그 로깅으로 실패 원인 파악 후, detectRail/좌표계/rail 지원 범위 순으로 수정 |

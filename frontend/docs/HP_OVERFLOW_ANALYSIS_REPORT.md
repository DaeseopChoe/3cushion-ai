# hpX/hpY ±4 초과 원인 추적 보고서

## 1) 기준 정의

**내부 hpX/hpY**: 중심 → 타점 한계선(공 반지름 3/5)까지를 반경 4로 정규화한 좌표계.

- **필수 불변식**: `sqrt(hpX² + hpY²) <= 4`
- **위반 시**: 조이스틱 바깥 튐, 점이 한계선 밖으로 표시됨

---

## 2) hp 세팅 경로 목록

| 경로명 | 파일 | 함수/위치 | 입력 단위 | clamp 여부 | parent 전달 |
|--------|------|-----------|-----------|------------|-------------|
| **A. setHpFromSystem** | useHptController.ts | setHpFromSystem | tip 0~4 (각도→좌표) | ✅ radius=4 고정 | sync(rx,ry) |
| **B. setJoystick** | useHptController.ts | setJoystick | hp (Rg×scale 후) | ✅ 축+반경 clamp | sync(outX,outY) |
| **C. setRotationTip** | useHptController.ts | setRotationTip | hp (회전 입력) | ✅ 반경 clamp 후 setJoystick | 경유 |
| **D. setVerticalTip** | useHptController.ts | setVerticalTip | hp (당점 입력) | ✅ 반경 clamp 후 setJoystick | 경유 |
| **E. setHp** | useHptController.ts | setHp | hp (ball drag/direct) | ✅ setJoystick 경유 | 경유 |
| **F. controllerValue** | App.jsx | controllerValue 구성 | Rg 또는 hp (tempData) | ❌ **없음** | - |
| **G. useEffect 역주입** | useHptController.ts | useEffect | hpt.hp (parent) | ❌ **없음** | - |
| **H. onControllerChange** | App.jsx | onControllerChange | next.hp (controller sync) | ❌ **없음** | setTempData |

---

## 3) 초과값(>4) 발생 위치

### A) useHptController.ts

| 지점 | clamp | 비고 |
|------|-------|------|
| setJoystick in | - | 호출부가 넘기는 값 |
| setJoystick out | ✅ 반경 4 | clamp 이후 sync 호출 |
| sync(outX, outY) | - | 항상 clamp 이후 값 전달 |
| **useEffect** | ❌ **없음** | `setHpX(hpt.hp.x)`, `setHpY(hpt.hp.y)` 그대로 적용 |

**결론**: `hpt.hp`가 이미 >4이면 useEffect에서 clamp 없이 `setHpX`/`setHpY`로 적재됨.

### B) App.jsx / 부모 상태

```
tempData.hit_point → controllerValue.hp → useHptController(hpt) → useEffect → setHpX/setHpY
```

**controllerValue 구성 (App.jsx L1100-1109)**:
```js
const hpX = isRgScale ? rawX * RG_TO_TIP_SCALE : rawX;  // clamp 없음
const hpY = isRgScale ? rawY * RG_TO_TIP_SCALE : rawY;
const controllerValue = { hp: { x: hpX, y: hpY } };
```

- **isRgScale = (mag > 0 && mag < 2)**  
  - Rg: mag < 2 → scale 적용.  
  - mag ≥ 2: **raw를 그대로** 사용 → **clamp 없음**
- **isRgScale인 경우**: raw가 0.858을 넘으면 `raw * RG_TO_TIP_SCALE` > 4 가능.

**루프**: sync → onControllerChange → setTempData(hit_point) → controllerValue → hpt → useEffect 역주입.

### C) HptOverlay.tsx (HpJoystick)

| 단계 | clamp | 비고 |
|------|-------|------|
| pixelToRg | ✅ 0.858 | Rg 한계 |
| handleJoystickChange | - | rg × RG_TO_TIP_SCALE 후 setJoystick 호출 |
| setJoystick | ✅ 반경 4 | Controller 내부 clamp |

점 표시: `hpRg = hpt.hp * TIP_TO_RG_SCALE` → 단일 출처 `hpt.hp`.

---

## 4) 초과 발생 경로 정리

### 경로 1: controllerValue 우회 (clamp 없음)

```
tempData.hit_point (저장/외부 등) 
  → rawX, rawY (mag ≥ 2 시)
  → hpX=rawX, hpY=rawY (그대로)
  → controllerValue = { hp: { hpX, hpY } }
  → useHptController(hpt)
  → useEffect: setHpX(hpt.hp.x), setHpY(hpt.hp.y)
  → UI에 >4 표시
```

예: `hit_point: {6, 4.66}` → mag≈7.5 > 2 → `hpX=6`, `hpY=4.66` → **clamp 없이** controller로 전달.

### 경로 2: Rg 스케일 후 초과

```
tempData.hit_point (Rg, mag<2)
  → hpX = rawX * RG_TO_TIP_SCALE
  → raw > 0.858 이면 hp > 4
  → controllerValue = { hp: { hpX, hpY } }
  → useEffect 역주입
  → UI에 >4 표시
```

예: `raw={0.9, 0.9}`, mag≈1.27 → scale 후 ≈(4.19, 4.19) > 4.

---

## 5) 로깅을 통한 확정

다음 로그가 추가되어 있음:

- `[setJoystick in]` / `[setJoystick out]`: Controller 내부 입출력
- `[sync→parent onChange hp]`: Controller → parent 전달
- `[parent onChange hp] 초과`: parent가 r>4 수신 시
- `[useEffect 역주입] hpt.hp 초과`: parent → Controller 역주입 시 r>4

**해석**:

- setJoystick out ≤4 인데 parent에서 >4 → sync/onChange 경로 문제 (현재 설계상 해당 없음)
- **useEffect 로그에서 >4** → controllerValue가 이미 >4로 들어옴
- **parent onChange 로그 없이 useEffect에서 >4** → controllerValue 우회 경로로 초기값/저장값이 주입됨

---

## 6) 결론 (1줄)

**controllerValue 구성과 useEffect 역주입에 clamp가 없어, tempData.hit_point가 Rg 또는 hp 기준으로 4를 넘을 때 그대로 controller에 들어가고 UI에 표시된다.**

---

## 7) 수정 방향 (단일 clamp 책임)

1. **SSOT**: `useHptController`의 `useEffect`에서 parent로부터 받은 값을 **역주입 직전에** 반경 4로 clamp하여, 모든 외부 입력을 한 곳에서 정규화.
2. **controllerValue (App.jsx)**: Rg 스케일 후 및 `isRgScale=false`일 때도, `controllerValue.hp`를 만들기 전에 반경 4 clamp 적용. (중복 방어)
3. **로그**: 원인 확정 후 위 디버그 로그 제거.

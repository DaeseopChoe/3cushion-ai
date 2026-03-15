# CURRENT_RENDER_PATH_ANALYSIS.md

## 개요

관리자 화면의 trajectory line, 노드 좌표, 시스템값 텍스트, HP/T 반영 경로를 코드 추적한 결과입니다.

---

## A. Trajectory 렌더링 경로

### 시작점: App.jsx

```
App.jsx (render)
  → rawAnchors 결정
  → anchors (convertCanonicalAnchors 또는 rawAnchorsCalibrated)
  → computeRailPoints(CO_fg, C1_fg) → CO_rail, C1_rail
  → computeReflectionC2 (fallback) → C2
  → buildCushionPath(C1_rail, C2, C3, lastAnchor) → cushionPath
  → ImpactLines { CO_line, C1_line, cushionPath, cushionPathAttr }
```

### ImpactLines로 전달되는 값

| Prop | 데이터 소스 | 파생 경로 |
|------|-------------|-----------|
| **CO_line** | CO_rail | computeRailPoints(CO_fg, C1_fg).CO_rail |
| **C1_line** | C1_rail | computeRailPoints(CO_fg, C1_fg).C1_rail |
| **cushionPath** | [C1_rail, C2, C3, lastAnchor] | buildCushionPath(...) |
| **cushionPathAttr** | cushionPath를 px 변환한 "x,y x,y ..." | toPx 맵핑 |

### buildCushionPath 입력값 소스

| 입력 | 소스 | 경로 |
|------|------|------|
| **C1_rail** | computeRailPoints | rawAnchorsCalibrated.CO, ["1C"] → 교점 계산 |
| **C2** | anchors["2C"] \|\| reflected?.c2 | anchors 또는 computeReflectionC2 fallback |
| **C3** | anchors["3C"] | anchors |
| **lastAnchor** | C4/C5/C6 | view.last_cushion에 따라 anchors["4C"] 등 |

### CO_line, C1_line, C2, C3, lastAnchor의 데이터 소스

| 변수 | canEdit=true | canEdit=false |
|------|--------------|---------------|
| **CO_fg, C1_fg** | rawAnchorsCalibrated (getAnchorsForRendering 기반) | rawAnchorsCalibrated (display.anchors = view.ui.anchors) |
| **CO_rail, C1_rail** | computeRailPoints(CO_fg, C1_fg) | 동일 |
| **C2** | anchors["2C"] \|\| computeReflectionC2(...) | anchors["2C"] |
| **C3, C4, C5, C6** | anchors (convertCanonicalAnchors 또는 rawAnchorsCalibrated) | anchors |
| **lastAnchor** | view.last_cushion에 따라 C4/C5/C6 | 동일 |

### rawAnchors 소스

- **canEdit**: getAnchorsForRendering(systemId, trackForAnchors, sysValues, anchorsData, fallback)
  - sysValues = adminState.sys.systemValues + adminState.sys.inputs + slot.applied.sys.inputs/result
  - 실패 시 display.anchors (view.ui.anchors)
- **!canEdit**: display.anchors = view.ui.anchors (로드된 샘플)

---

## B. 시스템값 텍스트 렌더링 경로

### 경로

```
App.jsx
  → allAnchors = { CO: {coord: CO_rail}, "1C": {coord: C1_rail}, ... }
  → SystemValueLabels { anchors: allAnchors, systemValues: system.values }
  → AnchorPoint { label, systemValue: systemValues[label] }
```

### 텍스트 표시용 값

**SystemValueLabels** (L3449):
```javascript
systemValues={system.values}
```

- **system** = systemCtrl.system = **view?.ui?.system**
- **system.values** = 로드된 JSON의 `ui.system.values` (예: CO: 40, 1C: 20, 3C: 20, 4C: 15)

### 문제점

**시스템값 텍스트는 view.ui.system.values만 사용하며, adminState.sys와 연결되지 않음.**

- SYS 오버레이에서 수정 → adminState.sys, slot.applied 갱신
- view는 fetch 시에만 setView(data)로 갱신됨
- **SystemValueLabels는 항상 view.ui.system.values 참조 → 초기 샘플 데이터 고정**

---

## C. HP/T 반영 경로 및 "T만 반영" 이유

### HP/T 입력 UI 상태

- **HptOverlay**: tempData (useState)
- 저장 시: onSave(tempData) → setAdminState({ hpt: newData }), applyHptToSlot
- 열려 있는 동안: tempData만 변경, adminState.hpt는 갱신 안 됨

### HP(hit_point) 사용처

| 사용처 | 함수/위치 | 용도 |
|--------|-----------|------|
| computeReflectionC2 | App.jsx L3316 | currentTip = { count, side } → spin 각도 보정 |

- currentTip = adminState.hpt.hit_point (또는 hp)에서 유도
- **computeReflectionC2가 null을 반환하면 HP는 궤적에 전혀 반영되지 않음**

### T(thickness) 사용처

| 사용처 | 데이터 소스 | 용도 |
|--------|-------------|------|
| calibrateTrajectory | opts.thickness | CO_corrected, C1_corrected 계산 |
| calculateImpact | opts.thickness | impact 계산 |
| calcImpactBall | adminState.hpt.T (systemCtrl.T) | coaching, createCaptureCandidate |
| SYS 팝업 표시 | opts.thickness | "두께: 3/8" 등 |

### T만 반영되는 이유 (코드 경로)

1. **calibrateTrajectory**  
   - `opts.thickness` 사용 = **view.ui.display_options.thickness** (샘플 데이터)  
   - adminState.hpt.T가 아님

2. **T의 영향**  
   - 표시, calcImpactBall, createCaptureCandidate 등 여러 경로에서 사용  
   - opts.thickness는 샘플에 포함된 값이라, 로드 시점에 이미 반영됨

3. **HP의 영향**  
   - computeReflectionC2의 tip 인자로만 사용  
   - reflection이 null이면 HP는 궤적에 아무 영향 없음

4. **데이터 불일치**  
   - calibration: opts.thickness (view)  
   - HP/T 편집: adminState.hpt  
   - **저장 전에는 adminState 변경이 calibration/reflection에 제대로 반영되지 않는 구조**

---

## D. 중복 렌더링 / 중복 데이터 소스

### 1. trajectory 렌더링

- **단일 경로**: App.jsx → ImpactLines
- 별도의 trajectory builder 컴포넌트 없음

### 2. 데이터 소스 분리

| 용도 | 데이터 소스 | 갱신 시점 |
|------|-------------|-----------|
| **노드 좌표** (allAnchors.coord) | anchors (rawAnchors 기반) | getAnchorsForRendering 또는 view.ui.anchors |
| **시스템값 텍스트** (CO_20 등) | system.values | **항상 view.ui.system** (샘플) |

→ **좌표는 편집값/샘플에 따라 달라지지만, 텍스트는 항상 샘플 값 사용**

### 3. "입력값 기반" vs "초기 샘플"

- **입력값 기반**: rawAnchors (canEdit 시 getAnchorsForRendering), adminState.sys
- **초기 샘플**: view.ui (anchors, system, display_options)
- **동시 사용**:
  - canEdit: rawAnchors는 adminState 기반, system.values는 view 기반
  - calibration thickness: view.ui.display_options.thickness
  - HP/T: adminState.hpt (저장 전에는 화면에만 반영, 궤적/calibration에는 제한적)

---

## E. 샘플/레거시 데이터 흔적

### 검색 결과 요약

| 키워드 | 위치 | 용도 |
|--------|------|------|
| **sample** | basePath `/samples/5_half_system`, createMobileContract `sample_id` | 샘플 JSON 로드 경로 |
| **tempData** | HptOverlay, StrOverlay | 저장 전 로컬 편집 상태 |
| **default** | defaultHpt, defaultStr, getDefaultSystemValues | 슬롯/시스템 초기값 |
| **initial** | SysOverlay initialState, StrOverlay initial | 오버레이 초기 state |
| **legacy** | ImpactEngine legacyT, stop legacy repeat mode | 두께 포맷 등 레거시 규약 |

### 구조적 특징

1. **view (샘플)**: fetch → setView(data) 후 변경 없음
2. **adminState/slot**: SYS/HP/T/STR/AI 저장 시 갱신
3. **tempData**: 오버레이 열린 동안만 사용, 저장 시 adminState로 전달
4. **데이터 흐름 끊김**: view와 adminState가 동기화되지 않음

---

## 가장 먼저 고쳐야 할 단일 원인 1개

### 원인: **시스템값 텍스트용 systemValues가 view.ui.system에 고정되어 있음**

**증상**

- SYS에서 CO, C1, 3C 등 수정해도 노드 옆 숫자(CO_20, 3C_20 등)가 샘플 값 그대로 유지됨
- trajectory 좌표는 adminState 기반으로 갱신되지만, 라벨 숫자는 샘플 값

**원인**

- SystemValueLabels에 `systemValues={system.values}` 전달
- system = view?.ui?.system (로드된 JSON)
- adminState.sys.systemValues와 연결되지 않음

**수정 방향**

- **canEdit 시**: SystemValueLabels에 `systemValues={adminState.sys.systemValues ?? adminState.sys.inputs ?? slot.applied.sys}` 기반 값 전달
- **!canEdit 시**: system.values (view) 유지

이 한 곳을 수정하면, "편집한 시스템값이 라벨에 반영되지 않는" 문제를 해결할 수 있습니다.

---

## 요약 테이블

| 화면 요소 | 현재 데이터 소스 | 편집 반영 |
|-----------|-----------------|-----------|
| 빨간 trajectory line | anchors, computeRailPoints, buildCushionPath | ○ (canEdit 시 adminState 기반) |
| 노드 좌표 (위치) | allAnchors (anchors 기반) | ○ |
| 시스템값 텍스트 (CO_20 등) | system.values = view.ui.system | ✗ (샘플 고정) |
| HP/T - T | opts.thickness, adminState.hpt.T (경로별로 상이) | △ (경로에 따라 다름) |
| HP/T - HP | computeReflectionC2 tip (reflection 실패 시 미반영) | ✗ (reflection null 시) |
| calibration thickness | opts.thickness = view.ui.display_options | ✗ (샘플 고정) |

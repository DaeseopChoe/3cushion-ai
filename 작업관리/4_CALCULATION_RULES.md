본 문서는 3Cushion AI의 계산 엔진 공식 규칙 문서이다.
expr 평가 방식, 보정 규칙, Admin/App 모드 차이, 상태 반영 파이프라인을 정의한다.

1️⃣ 현재 계산 관련 파일 구조
frontend/src/
 ├── admin/sys/useSysCalculation.ts
 ├── domain/anchorLookupEngine.ts
 ├── domain/anchorCoordinateEngine.ts
 ├── utils/geometry/anchorResolve.ts
 ├── utils/systemCalculator.ts
 ├── utils/trajectorySampleBuilder.ts
 ├── hooks/useShotSlots.ts
 ├── hooks/useTrajectoryState.ts
 └── data/systems/<systemId>/
        ├── profile.json
        ├── anchors.json
        ├── logic.json
        └── system_meta.json

2️⃣ 계산 엔진 계층 정의

계산은 다음 엔진 계층으로 이루어진다.

[System Engine / expr]
   ↓
[AnchorCoordinateEngine + anchorLookupEngine → anchors.json SSOT]
   ↓
[Geometry: resolveAnchorPoint, rail 교점, 2C reflection]
   ↓
[Trajectory / sample / Physics]

3️⃣ 표기 규칙 (Naming Convention)
3.1 시스템 값 표기
허용	금지
C1, C2, C3 ... C6	1C, 2C
3.2 좌표 기준 표기

_f → Frame Grid

_r → Rail Grid

예:

C1_f
C3_r

4️⃣ profile.formula.expr 규칙
4.1 기본 형식
"LHS = RHS"


예:

C1_f = CO_f - C3_r

4.2 평가 절차

문자열 분리 (LHS / RHS)

RHS 토큰화

입력 변수 매핑

new Function 생성

RHS 실행

LHS 결과 반환

5️⃣ RHS 허용/금지 규칙
허용

변수명

숫자

/ ( )

Math 객체

금지

외부 객체 접근

anchors 직접 참조

window / document 접근

6️⃣ Admin 계산 규칙

파일:

admin/sys/useSysCalculation.ts


특징:

anchors 비의존

expr 기반 직접 계산

system_values에서 RHS 변수만 사용

미입력 값은 0 처리

Admin은 실험/디버깅 모드이며,
물리 보정은 적용하지 않는다.

7️⃣ App 계산 규칙

**Admin vs App (좌표):**

- **Admin / expr:** `profile.formula.expr` + `calculateByProfileExpr` → **시스템 스칼라** (C1_f, C3_r 등). anchors.json을 직접 읽지 않는다.
- **App 렌더·궤적:** 동일 스칼라를 **sysValues**로 모아 `getAnchorsForRendering` → **anchorLookupEngine**이 `anchors.json`에서 **coord + valueSpace**를 보간한다. **“좌표는 계산하지 않고 anchors에서 꺼낸다.”**

관련 파일: `App.jsx`, `domain/anchorCoordinateEngine.ts`, `domain/anchorLookupEngine.ts`, `utils/geometry/anchorResolve.ts`, `lib/convertCanonicalAnchors.js`, `utils/systemCalculator.ts`, `utils/trajectorySampleBuilder.ts`.

App 계산은 다음 단계를 따른다:

profile 로드

value_domains 검증

space_rule 검증

calculateByProfileExpr 실행 → **draft.sys.outputs.result** (UI·렌더가 이 result를 sysValues에 병합해 사용)

anchors.json SSOT lookup + (선택) canonical 변환

geometry: resolveAnchorPoint, computeRailImpactPoint(C1), 조건부 CO_rail

trajectorySampleBuilder 호출 (파생 샘플 등)

8️⃣ Draft / Applied 반영 규칙

계산 결과는 다음 순서로 상태에 반영된다.

calculateByProfileExpr()
   ↓
draft.sys.outputs.result
   ↓
applyDraftSys()
   ↓
applied.sys
   ↓
useTrajectoryState.applySysResult()

**Recall:** `buildDraftsFromRecord`가 저장된 `sysInputs`로 **다시 `calculateByProfileExpr`를 실행**해 `draft.sys.outputs.result`를 채운다. result가 비면 `getAnchorsForRendering`이 1C 등을 만들지 못해 **rawAnchors 비어 궤적이 사라지는 문제**가 있었음 → 위 보강으로 해소.

✔ Draft는 실시간 계산
✔ Applied만 확정

9️⃣ 전략 → 궤적 → 물리 연결 구조
expr 계산 (스칼라)
   ↓
outputs.result + inputs → sysValues
   ↓
getAnchorsForRendering (anchors.json → coord + valueSpace)
   ↓
resolveAnchorPoint (Fg: snap 금지) / computeRailImpactPoint (C1_rail SSOT) / CO_rail 조건부
   ↓
2C reflection (필요 시) / cushion path
   ↓
Physics (Impact 계산)
   ↓
Stage 렌더

※ `calibrationEngine.calibrateTrajectory`는 모듈로 존재하나 **현 App 메인 경로에서 호출하지 않음**.

9️⃣-1 Trajectory Reference Model

시스템 궤적 기준: CO → C1 → C2 → C3 → C4 → C5 → C6

- baseline trajectory: C3 = C4 = C5 = C6 (기준 계산)
- corrected trajectory: C4 = C5 = C6 (보정 적용)

9️⃣-2 Anchor Coordinate Rule

sys → anchors.json → coordinate interpolation
anchors.json id 형식: CO_(82.25,10)_60 → mark, x, y, sys 파싱

9️⃣-3 FG / RG 의미 공간 (valueSpace)

**coord:** lookup·저장된 표현 좌표.

**valueSpace `Fg`:** 프레임 부근 **의미·방향점** (예: C1_f → 상단 프레임 y=42.25 근처). **`snapToRail` 대상이 아님** — `resolveAnchorPoint`는 좌표를 바꾸지 않는다.

**valueSpace `Rg`:** 레일 맞음 좌표로 쓰는 표현.

**역할 분리:**

- **C1_f / rawAnchors["1C"]:** lookup된 **방향점(Fg)**.
- **C1_rail:** CO–1C 직선과 첫 쿠션 레일의 **실제 충돌점** (`computeRailImpactPoint`, mark `"1C"`).
- **C3_r:** 입력·lookup 모두 **레일 계열 값**; 앵커 좌표는 SSOT에서 사용.

9️⃣-4 Calibration Rule (모듈)

`calibrationEngine.ts`: impact pivot 기준 CO→C1 보정 **가능**. **현재 App.jsx 궤적 조립에서는 사용하지 않음.**

🔟 5_half_system 특수 보정 규칙

**앵커 기하 (B2T_R):** CO_f=50은 코너 `(-2.25,-2.25)`. CO_f>50은 **LEFT 레일**에서 y 증가하는 구간. CO_rail은 하단 교점을 **조건부**만 사용 (App `isBottomCO`).

공식 (expr / logic):

Sn = (CO_f - 50) * 0.5
C4_f = C3_r + Sn
C5_f = C4_f
C6_f = C4_f

적용 위치: logic.json, expr 평가

1️⃣1️⃣ value_domains 규칙

각 profile.json에는 입력 허용 범위가 정의된다.

검증 실패 시:

계산 중단

Draft에 반영하지 않음

1️⃣2️⃣ 안전 규칙 (Safety Rules)

계산은 순수 함수로 유지

useEffect에서 재계산 금지

계산 결과는 상태 외부에서 변형 금지

Draft/Applied 직접 변경 금지

1️⃣3️⃣ trajectorySampleBuilder 규칙

입력:

applied.sys

systemId

출력:

trajectorySamples (파생 데이터)

⚠ Draft는 절대 사용하지 않는다.

1️⃣4️⃣ impact/final 계산 엔진 (2026-03 추가)

- evaluateStrategy.ts: balls + sysInputs → userImpact, userFinal
- userImpact: calcImpactBall(cue, target, T)
- userFinal: finalCoordinateEngine.computeFinalCoord (C1 보간, 5_half_system / n_across_short)
- adminSaveEngine.buildStrategyMeta에서 evaluateStrategy 호출 → StrategyMeta 생성

1️⃣4️⃣-1 StrategyMeta (StrategyEntry 저장 시)

**계산 위치:** buildStrategyMeta() [adminSaveEngine], evaluateStrategy [domain]

**입력:** balls, sysInputs, signature, slot

**출력 (StrategyMeta):**
- impact (Point): userImpact
- final (Point): userFinal
- angle_ci: cue → impact 방향 (atan2)
- angle_fs: final → second 방향 (atan2)

1️⃣5️⃣ App.jsx 현재 상태 반영

현재 Phase 1에서는:

Physics 계산이 App.jsx 내부에 존재

expr 계산과 물리 계산이 완전 분리되어 있지 않음

TrajectoryEngine과 PhysicsEngine의 경계가 명확하지 않음

Phase 2 목표:

PhysicsEngine 순수 함수화

Strategy → Trajectory → Physics 파이프라인 명확화

1️⃣6️⃣ 새 시스템 추가 절차 (공식 프로토콜)

profile.json 작성

anchors.json 작성

logic.json 작성

value_domains 정의

formula.expr 정의

Admin 계산 검증

App 시뮬레이션 검증

trajectory 저장 테스트

1️⃣6️⃣-1 Reflection 계산 규칙

1. 입사각 정의
- 기존: angleDeg(co, c1)
- 변경: angleDeg(c1, c3)
→ 입사 방향을 CO 기준이 아닌 실제 진행 방향 기준으로 수정

2. 레일 법선 기반 반사
- reflectAngle(thetaInDeg, rail) = 2 * normalDeg - thetaInDeg

3. 레일 법선 각도
- TOP: 90°
- BOTTOM: -90°
- LEFT: 180°
- RIGHT: 0°

4. 최종 출사각
- thetaOutDeg = reflectAngle(thetaInDeg, c1Rail) + spinAdjustDeg + 180

5. 중요
- +180 보정은 ray 방향 반전 문제 해결을 위한 필수 요소

1️⃣6️⃣-2 Spin 적용 공식

thetaOutDeg = thetaReflectDeg + spinAdjustDeg + 180

spinAdjustDeg = sign × Δθ

Δθ (`reflectionEngine.ts` 내 `TIP_TO_DELTA_DEG`, 구조 변경 없이 값만 튜닝):

- 1팁 = 5°
- 2팁 = 10°
- 3팁 = **13°** (과보정 완화)
- 4팁 = **18°** (과보정 완화)

1️⃣6️⃣-3 Joystick Spin 처리

1. spin → tipEquivalent 변환 (SPIN_TO_TIP_EQUIV 선형 보간)
2. tipEquivalent → Δθ 선형 보간 (TIP_TO_DELTA_DEG)

결론:
- spin은 직접 각도가 아니라 tip 기반 보정값으로 적용됨

1️⃣6️⃣-4 Trajectory rendering rule (2026-03)

궤적(Trajectory) 표시는 다음이 **모두 충족될 때만** 수행하는 것을 원칙으로 한다.

- **`sys.system_id`** 가 유효하다 (시스템이 선택·식별 가능하고 파이프라인과 일치).
- 해당 시스템·프로파일이 요구하는 **입력·출력(CO, C1, C3 등)** 이 현재 계산 패스에서 **완전**하다.
- **계산이 확정(finalized)** 된 상태이다 (중간 partial 상태만으로는 확정으로 보지 않음).

### Warning

- **partial `sys` 상태**만으로는 궤적 렌더를 트리거하지 않는다. 슬롯 전환·`useEffect` 병합 직후 등 **덮어쓰기/타이밍 레이스**로 인한 중간 상태는 렌더 조건에서 제외하는 것이 안전하다.
- 렌더는 가능한 한 **`adminState` / 확정된 슬롯 전략** 같은 **안정된 소스**를 기준으로 한다.

⚠ 구현상 `App.jsx`의 조건·타이밍이 위 원칙과 어긋나면 플리커·롤백 현상이 발생할 수 있다. 알려진 이슈는 `5_PROJECT_MASTER_STATE_CURRENT.md` 참고.

📌 최종 선언

이 문서는 3Cushion AI 계산 엔진의 공식 규칙이다.
모든 계산 변경은 본 문서 대비 변경점으로 기록한다.

---

# 🆕 SPIN + TRAJECTORY CORRECTION RULE

## 적용 위치

- pathNodes 생성 이후
- 앵커 계산 이후 단계

---

## 1. Progress 계산

progress = 누적 거리 / 전체 거리

---

## 2. Spin Decay

if progress >= 0.85:

- spin = spin × 0.5

---

## 3. Direction 판별

cross = (B − A) × (C − B)

- cross ≥ 0 → forward
- cross < 0 → reverse

---

## 4. Spin 적용

r_final = rotate(r, spin × k)

- k ≈ 0.015
- forward → +
- reverse → −

---

## 5. 적용 구간

- C3 이후 (C4 ~ C6)
- C7 확장 시 자동 적용

---

## 6. 금지 사항

- anchor 계산 수정 금지
- epsilon / HIT_TOLERANCE 변경 금지
- sys 계산 로직 변경 금지

---

## [UPDATE 2026-04-01] C3~C6 거리 정책 및 BETA 도입

### 1. 기본 상수 (FG 기준)

`CUSHION_RG = 45 / RG_UNIT_MM` (≈ 45 / 35.55 → 약 **1.266** FG)

| 상수 | 정의 | 값 (약) |
|------|------|---------|
| CUSHION_HALF | `CUSHION_RG / 2` | ≈ 0.63 |
| MID_RANGE | `CUSHION_RG * 0.75` | ≈ 0.95 |

### 2. C4 거리

- **기존:** `CUSHION_HALF + ALPHA`
- **현재:** `CUSHION_HALF` (C3와 동일 기준 — 쿠션 중앙)

### 3. C5 / C6 거리 정책

- **기존:** `MID_RANGE` 만 적용.
- **문제:** 시각적으로 쿠션 쪽으로 치우쳐 보임 (프레임–쿠션 mid보다 안쪽).

### 4. 해결: BETA 도입

```ts
// C5, C6만 (SystemGrid.jsx)
distance = MID_RANGE + MID_RANGE_BETA;
```

- **초기값:** `MID_RANGE_BETA = 1.0` (FG 단위)

### 5. 튜닝 가이드

| BETA (FG) | 결과 (시각적) |
|-----------|----------------|
| 0.5 | 여전히 다소 쿠션 쪽 |
| 1.0 | 기본 권장 |
| 1.5 | 다소 프레임 쪽 (과할 수 있음) |

### 6. 적용 범위

- **C5, C6만** `MID_RANGE + BETA`.
- C3, C4, FRAME 거리·오프셋 로직에는 영향 없음 (별도 상수/분기).

### 7. 설계 의도

- “쿠션 ↔ 프레임 사이 **시각적 mid + 약간 외향**”
- 모든 레일에서 **동일 FG 이동량** (outward 방향으로 `distance`만 가산)
- **normal 변경 없이** distance만으로 C5/C6 미세 조정

---
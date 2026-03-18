# Session Summary - C2 Reflection Stabilization & Calibration

3Cushion AI — 세션 작업 요약 (2026-03 C2 Reflection)

> 새 채팅에 붙여넣기용 컨텍스트 문서

---

## 주요 해결 사항

1. reflection C2 생성 안정화
2. rail 선택 및 방향 문제 해결
3. HP/T 입력 구조 버그 수정
4. spin 과대 적용 문제 해결
5. joystick spin 보간 도입
6. anchor 직접 수정 시스템 도입

---

## 핵심 버그

### HP/T count 오류

**원인:**
- r 기반 계산: `count = Math.round(Math.hypot(hp.x, hp.y))`
- UI는 항상 반지름 4로 좌표 생성 → r ≈ 4
- 결과: 모든 tip이 count=4로 처리됨

**결과:**
- 1팁, 2팁, 3팁, 4팁 모두 동일하게 spinAdjustDeg 최대값 적용
- 2C 위치가 과도하게 벌어짐

**해결:**
- tipCount를 UI에서 직접 전달
- r 기반 count 계산 제거
- useHptController: setHpFromSystem 시 tipCount 전달
- App.jsx currentTip: adminState.hpt.tipCount 사용

---

## Calibration 개선

### TIP_TO_DELTA_DEG 현실값 적용

**기존:** 1: 7.125, 2: 14.036, 3: 20.556, 4: 26.565 (과대 적용)

**현재:** 1: 5, 2: 10, 3: 14, 4: 20

### Joystick → Tip Equivalent 보간 추가

- SPIN_TO_TIP_EQUIV: spin(0~4) → tip equivalent 선형 보간
- 1.4 → 0.9, 2.8 → 1.9, 3.6 → 3.0, 4.0 → 4.0
- tip은 기준, joystick은 보조값

### 미세 오차

- 1.4/2.8 구간 과다 반영 → SPIN_TO_TIP_EQUIV 미세 보정
- 추가 오차는 anchor 수동 수정으로 해결

---

## Anchor Direct Edit System

**기능:**
- CO, 1C, 2C, 3C 등 모든 anchor 더블클릭
- X/Y 좌표 직접 입력
- anchorsOverride에 저장
- localStorage 유지 (ANCHORS_OVERRIDE_V1)
- 좌표 소수점 1자리 제한

**구조:**
- anchors = { ...baseAnchors, ...anchorsOverride }
- adminState.anchorsOverride

---

## 현재 상태

- C2 정상
- spin 정상 (discrete tip + joystick)
- tip/joystick 일관성 확보
- anchor 보정 가능

---

## 다음 단계

1. 저장 구조 정리
2. JSON export 설계
3. USER 적용 구조 확정 (ADMIN → JSON → USER)

---

## 수정된 파일 (이번 세션)

| 파일 | 변경 내용 |
|------|----------|
| reflectionEngine.ts | TIP_TO_DELTA_DEG, SPIN_TO_TIP_EQUIV, mapSpinToTip, getDeltaFromSpin, resolveSignedSpinDeg |
| useHptController.ts | tipCount, setHpFromSystem tipCount 전달 |
| App.jsx | currentTip (tipCount/hp 분기), anchorsOverride, AnchorEditOverlay, openAnchorEdit |
| AnchorPoint.jsx | onDoubleClick |
| SystemValueLabels.jsx | onAnchorDoubleClick |

---

## 수정 금지 파일

- reflectAngle, railNormalAngle, intersectRayWithRail
- branch 선택 로직, track 관련 로직
- anchorCoordinateEngine, calibrationEngine

---

*최종 업데이트: 2026-03*

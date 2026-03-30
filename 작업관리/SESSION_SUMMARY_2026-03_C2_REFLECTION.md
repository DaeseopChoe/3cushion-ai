# Session Summary - C2 Reflection Stabilization & Calibration

3Cushion AI — 세션 작업 요약 (2026-03 C2 Reflection + 후속 튜닝)

> 새 채팅에 붙여넣기용 컨텍스트 문서

---

## 주요 해결 사항

1. reflection C2 생성 안정화
2. rail 선택 및 방향 문제 해결
3. HP/T 입력 구조 버그 수정
4. spin 과대 적용 문제 완화 (TIP 단계적 튜닝)
5. joystick spin 보간 도입
6. anchor 직접 수정 시스템 도입
7. **(2026-03-28)** 렌더 좌표 anchors SSOT·CO 조건부 교점·Recall `outputs.result` 정합 (`3_SYSTEM_ARCHITECTURE.md` 등 참조)

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

## Calibration / TIP_TO_DELTA_DEG

**파일:** `domain/reflectionEngine.ts` 내 상수 테이블 (구조 변경 없음, **값만** 조정)

**역사:**
- 더 이전: 1: 7.125, 2: 14.036, 3: 20.556, 4: 26.565 (과대)
- 중간: 1: 5, 2: 10, 3: 14, 4: 20
- **현재 (2026-03-28):** 1: **5**, 2: **10**, 3: **13**, 4: **18**

**의도:** 실전 감각상 **3·4팁 과보정 완화** (4팁을 20°→18°, 3팁을 14°→13°).

### Joystick → Tip Equivalent 보간

- SPIN_TO_TIP_EQUIV: spin(0~4) → tip equivalent 선형 보간
- tip은 기준, joystick은 보조값

### 미세 오차

- SPIN_TO_TIP_EQUIV 구간 보정은 별도 유지
- 추가 미세 조정은 **실전 샘플 샷** 기준으로 이어갈 것

---

## Anchor Direct Edit System

**기능:**
- CO, 1C, 2C, 3C 등 모든 anchor 더블클릭 → X/Y 입력
- anchorsOverride에 저장, localStorage (ANCHORS_OVERRIDE_V1)
- 좌표 소수점 1자리 제한

**렌더 SSOT:** 앵커 **기본 좌표**는 `anchors.json` lookup; override는 그 위 덮어쓰기. **1C 라벨**은 궤적과 맞추기 위해 **`C1_rail`**과 정합 (`App.jsx` allAnchors).

---

## 현재 상태

- C2·spin 파이프라인 안정
- discrete tip + joystick 일관성 확보
- TIP_TO_DELTA_DEG: **5 / 10 / 13 / 18**
- anchor 보정 가능 (더블클릭)

---

## 다음 단계 (TODO)

1. **2C reflection:** 실전 샷·영상 기준 **추가 미세 보정** (TIP 테이블 또는 SPIN 보간)
2. 저장/Export·USER 배포 구조 (별도 설계 문서)
3. `computeRailImpactPoint` fallback 일원화 검토 (CO는 App에서 가드 완료)

---

## 수정된 파일 (누적)

| 파일 | 변경 내용 |
|------|----------|
| reflectionEngine.ts | TIP_TO_DELTA_DEG, SPIN_TO_TIP_EQUIV, mapSpinToTip, getDeltaFromSpin, resolveSignedSpinDeg |
| useHptController.ts | tipCount, setHpFromSystem tipCount 전달 |
| App.jsx | currentTip, CO_rail 조건부, allAnchors["1C"]=C1_rail, … |
| useShotSlots.ts | buildDraftsFromRecord → outputs.result (Recall) |
| AnchorPoint.jsx | onDoubleClick |
| SystemValueLabels.jsx | onAnchorDoubleClick |
| anchorResolve.ts | resolveAnchorPoint (Fg snap 없음), computeRailImpactPoint |

---

## 수정 금지 (역사적 메모)

- reflectAngle, railNormalAngle, intersectRayWithRail — 구조 변경 시 별도 프로토콜
- 회귀 분석 시: CO는 **조건부 교점**, C1은 **교점 SSOT**

---

*최종 업데이트: 2026-03-28*

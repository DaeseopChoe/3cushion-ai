# PROJECT LOG – 2026-03

Version: v1.0  
Created: 2026-03-01  
Scope: App Slim화 + 구조 안정화 세션

---

# 📌 1. 세션 개요

2026-03 세션의 목적은 다음과 같았다:

- 거대한 App.jsx 구조 슬림화
- 도메인/물리/렌더/컨트롤러 레이어 분리
- 구조를 “확장 가능한 상태”로 전환
- 문서와 실제 코드 구조 동기화

이번 세션은 기능 추가가 아닌 **구조 재정렬(Refactor Phase 1)**에 해당한다.

---

# 🧱 2. 주요 작업 내역

## 2.1 Geometry 분리

### 변경
- App.jsx 내부 좌표 변환 로직 분리
- utils/geometry/coords.ts 생성

### 원칙
- SCALE, TABLE_H, PADDING 등 상수는 파일 내부 정의 금지
- 모든 값은 호출부(App)에서 인자로 주입
- 순수 함수 유지

### 목적
App가 계산기를 가지지 않도록 하기 위함.

---

## 2.2 Physics 분리

### 변경
- utils/physics/impact.ts
- utils/physics/systemLine.ts
- utils/physics/index.ts

### 핵심
- calculateImpact는 BALL_DIAMETER_RG / BALL_RADIUS_RG를 인자로 받도록 수정
- 상수 내부 선언 금지
- 기존 App 계산 로직 그대로 이동

### 목적
App에서 물리 계산 책임 제거.

---

## 2.3 Rendering 컴포넌트 분리

components/table/ 생성:

- AnchorPoint.jsx
- SystemValueLabels.jsx
- ImpactLines.jsx
- CoachingOverlay.jsx

### 설계 기준
- 계산은 App/Hook에서
- 컴포넌트는 순수 렌더링만 수행
- Geometry import 최소화

### 결과
SVG 블록이 App에서 제거됨.

---

## 2.4 Controller Hook 도입

추가:

- useCoachingController.ts
- useSystemController.ts
- useDisplayController.ts

### 핵심 원칙

1. Hook은 반드시 early return 이전에 호출
2. Hook 내부는 데이터만 반환 (JSX 없음)
3. 단일 책임 유지

### 해결한 문제

- “Rendered more hooks than during the previous render” 에러 해결
- Hook 호출 순서 안정화

---

## 2.5 tableConfig 단일 출처화

config/tableConfig.ts 생성

### 목적
- SCALE, TABLE_W, TABLE_H, PADDING 중앙 관리
- 하드코딩 제거
- 단일 출처 원칙 확정

---

## 2.6 Domain 전략 엔진 분리

domain/ 생성:

- railEngine.ts
- strategyEngine.ts
- index.ts

### 변경
- groupSystemValuesByRail App에서 제거
- runStrategyEngine 도입

### 파이프라인 확정

Strategy  
→ domain/runStrategyEngine  
→ utils/physics  
→ hooks  
→ components/table  
→ App 조립

---

## 2.7 문서 동기화

갱신된 문서:

- 5_PROJECT_MASTER_STATE_CURRENT.md (v2.0)
- 6_CURRENT_CODE_SNAPSHOT_SUMMARY.md
- 2_FRONTEND_ARCHITECTURE_BASELINE_v1.md
- 3_SYSTEM_ARCHITECTURE.md
- 1_PROJECT_MASTER_INDEX.md

구조와 문서 간 모순 제거 완료.

---

# 🧠 3. 설계 의도

이번 세션의 핵심 방향:

1. App는 Orchestrator로 제한
2. 계산은 외부 레이어로 이동
3. Config는 단일 출처
4. Hook 호출 순서는 항상 고정
5. 도메인 로직은 React 의존 금지

목표는:

“확장 가능한 안정 구조” 확보

---

# ⚠ 4. 현재 남은 리스크

1. Pointer/Drag 관련 로직 일부 App 내부 존재
2. Ball 렌더링 일부 App 직접 제어
3. 전략 엔진 테스트 미구현
4. 타입 안정성 일부 약함
5. Interaction Controller 미분리

현재 위험도: 낮음  
구조 붕괴 위험: 낮음  

---

# 🚀 5. 다음 단계 계획 (예정)

1. Interaction Controller 분리
2. Strategy Engine 고도화
3. 저장 구조 설계 (Persistence)
4. AI 전략 생성 로직 고도화
5. 단위 테스트 도입

---

# 📊 6. 세션 평가

Before:
- App.jsx 약 3800줄
- 계산/물리/렌더 혼재

After:
- App.jsx 약 3400줄
- 구조적 분리 완료
- 레이어 경계 명확화

이번 세션은:

Refactor Phase 1 완료

---

Status: Active (2026-03 진행 중)

---

# 2026-03 — Admin Save & Final Coordinate Engine Integrated

- Implemented finalCoordinateEngine for sys→final coordinate mapping
- Added evaluateStrategy domain wrapper
- Connected "전체 적용" button to dataset persistence
- Introduced StrategyMeta (impact, final, angles)
- Dataset now stored in localStorage
- Slot structure stabilized (S1/S2/S3 separated from function buttons)
- Identified need for Position merge strategy
- Next milestone: Admin Auto-Recommended Loading Logic

---

# 2026-03 — Position Merge & KD-Tree & Admin Auto-Recommend

- Position merge engine implemented (positionMergeEngine.ts)
- appendPositionToDataset replaced with upsertPositionRecord
- localStorage dataset storage stabilized
- Circular JSON serialization bug fixed (strategy sanitize)
- SYS overlay apply logic fixed (slot.applied.sys 동기화)
- Admin auto recommendation (slotAutoRecommend) added
- KD-tree index structure introduced (kdTree6d, positionKDIndex, signatureKey)
- SAVE 버튼 → handleSaveStrategy 연결
- 전략 혼합 금지 원칙 확정 (signatureKey별 분리)

---

# 2026-03-05 — StrategyEngine Refactor

- strategyEngine.ts redesigned as recommendation engine
- Added recommendForAdmin()
- Added recommendForUser()
- Added recommendWithInterpolation() placeholder

Code responsibilities separated:

- strategyEngine → strategy recommendation
- railEngine → rail grouping + system value application
- positionSearchEngine → KD-tree search

---

# 2026-03 — Impact Engine Unification & Auto Capture System

이번 세션에서는 Impact 계산 구조를 완전히 재정리하였다.

## 주요 목표

- Impact 계산 기준 통합
- drag 기반 두께 계산
- dataset 자동 캡처 기반 구축

## 주요 작업

### ImpactEngine 도입

Impact 계산을 단일 엔진으로 통합.

**지원 기능**

- Legacy T → Impact
- Display Thickness → Impact
- Impact → Thickness
- Orbit Snap
- Contact Snap

ImpactBall 계산 기준은 **cue → impact → target**으로 통일되었다.

### Impact Drag UX 도입

ImpactBall을 직접 드래그하여 두께를 설정할 수 있다.

**drag 시**

- Impact → thickness 역산
- → SYS T 자동 업데이트

**CONTACT 모드에서는**

- targetBall orbit 위에서 이동

**FREE 모드에서는**

- impact 자유 이동

### Contact Snap 시스템

ImpactBall은 targetBall과 정확히 접촉하도록 자동 보정된다.

이 기능은 다음 문제를 해결하기 위해 도입되었다.

- visual gap
- physics inconsistency

### Strategy Auto Capture Engine

새로운 dataset 생성 보조 엔진 추가.

**기능**

- 볼 상태 안정 감지 (1초)
- → dataset candidate 생성

이 엔진은 향후 다음에 사용된다.

- Admin dataset builder
- AI training dataset

---

# 2026-03 Anchor Coordinate Pipeline Debug

- SYS 변경 시 anchor rendering 오류 발생
- S1 슬롯이 이전 SYS 데이터를 유지하는 문제 발견
- sysValues 생성 과정에서 adminState.sys contamination 확인
- getAnchorsForRendering fallback 구조 확인
- convertCanonicalAnchors 실행 조건 문제 발견
- offset_fg2rg 전달 누락 확인

Reflection C2 실패는
좌표 엔진 문제라기보다
rawAnchors 입력 오염 문제로 판정됨.

---

# 2026-03 — Reflection C2 Engine Debug & Fix (Critical)

이번 세션에서 C2 reflection 실패의 실제 원인을 확정하고 수정하였다.

## 문제 현상

- SYS 변경 시 C2가 생성되지 않거나
- 생성되더라도 C3와 겹침
- reflection 경로(C1 → C2 → C3)가 형성되지 않음

## 초기 가설

- rawAnchors 입력 오염
- canonical offset 누락
- rail ordering 문제
- intersection 조건 문제

## 최종 원인 (확정)

Reflection ray 방향이 반대로 계산되고 있었음

### 로그 근거

- thetaOutDeg ≈ 141°
- 모든 rail에서 intersection = null
- rayDirection = "REVERSED"
- primaryCause = "Ray 방향 반대"

## 구조적 문제

기존 구현:

- thetaInDeg = angleDeg(co, c1)
- → CO → C1 방향 기반

이 방식은 실제 반사 물리와 맞지 않음

또한 reflectAngle 적용 이후에도
ray 방향이 반전되지 않아 교차가 발생하지 않음

## 해결 방법

다음 3단계 수정으로 해결:

1. 입사 방향 변경

- angleDeg(co, c1)
→ angleDeg(c1, c3)

2. 레일 법선 기반 반사 도입

- reflectAngle(theta, rail) = 2 * normal - theta

3. 방향 보정

- thetaOutDeg = reflect + spin + 180

(+180은 ray 방향 반전 보정)

## 결과

- C2 정상 생성
- rail intersection 정상 발생
- C1 → C2 → C3 궤적 복원

## 현재 상태

- reflection 로직 정상 동작
- C2 위치는 추가 튜닝 필요

## 교훈

1. reflection 문제는 입력보다 방향이 더 중요
2. rayDirection 로그는 핵심 진단 지표
3. "교차 없음"은 대부분 방향 문제
4. 물리 기반(normal reflection)을 적용해야 안정적

## 상태

Reflection Engine 안정화 완료 (v1)

---

# [2026-03-23] Recall UX 및 Draft/Applied 구조 확정

### 1. Recall 정책 변경 (중요)

- Recall은 balls를 변경하지 않는다.
- Recall은 dataset의 전략을 draft 상태로만 적용한다.
- Recall 실행 시 SAVE 자동 실행은 수행하지 않는다.

**정의:** Recall = "전략 템플릿 불러오기 (draft only)"

---

### 2. Draft / Applied 구조 확정

- **draft:** UI 표시 및 사용자 수정 상태
- **applied:** 확정 상태 (SAVE 시 dataset에 반영)

**변경 사항:**
- 모든 입력 UI는 applied가 아닌 draft를 기준으로 표시하도록 수정
- adminState 동기화 시 draft 우선 적용 구조로 변경

```
sys: draft?.sys ?? applied?.sys ?? prev.sys
hpt: draft?.hpt ?? applied?.hpt ?? defaultHpt
str: draft?.str ?? applied?.str ?? defaultStr
ai: draft?.ai ?? applied?.ai ?? defaultAi
```

### 3. Recall draft 적용 흐름 변경

**기존:** Recall → balls 변경 + draft 적용

**변경:** Recall → draft만 적용 (balls 유지)

### 4. UX 정책 변경

**(1) 경고 및 confirm 제거**
- SAVE 시 confirm 제거
- "Recall 적용됨 — 아직 확정되지 않음" 메시지 제거

**(2) 유사도 메시지 단순화**
- 기존: "유사도 낮음 (참고용)"
- 변경: "유사도 낮음"

**(3) 슬롯 표시 (S1 ●) 의미 확정**
- **ADMIN 모드:** ● = draft ≠ applied (적용 필요 상태)
- **USER 모드:** ● = 해당 포지션에서 사용 가능한 전략 존재

### 5. 상태 동기화 구조 변경

- shotEditor.slots 변경 시 adminState가 자동 동기화되도록 dependency 확장
- systemValuesForLabels, thicknessForCalc, AiOverlay 등도 draft 우선 적용

### 6. 결과

- Recall 결과가 UI에 즉시 반영됨
- 사용자 작업 흐름 단순화
- dataset 오염 방지 (balls 고정)

---

# [2026-03-28] Recall outputs.result · anchors SSOT 정합 · CO regression · geometry · 2C Δθ

## 1. Recall → rawAnchors 비어 궤적 소실

| 항목 | 내용 |
|------|------|
| **이슈** | `buildDraftsFromRecord`가 `inputs`만 넣고 `outputs.result`를 비워 둠 → `getAnchorsForRendering`이 C1 등 lookup 키 부족 → `rawAnchors["1C"]` 공백 → C1_rail/2C 단절 |
| **원인** | Recall 경로에서 `calculateByProfileExpr` 미실행 |
| **수정** | `useShotSlots.ts` `buildDraftsFromRecord` 내 `expr` 존재 시 `calculateByProfileExpr(expr, exprInputs)` → `draft.sys.outputs.result` 할당 |
| **결과** | Recall 후에도 CO–1C–2C–3C 궤적 복원 |

## 2. 1C 라벨 vs 꺾임점 불일치 (override)

| 항목 | 내용 |
|------|------|
| **이슈** | `allAnchors["1C"]`가 `override["1C"]` 등으로 잡혀 라벨이 C1_rail과 어긋남 |
| **수정** | `App.jsx` `allAnchors["1C"]`를 **`C1_rail` 고정** (주석: 궤적 꺾임점과 일치) |
| **결과** | 라벨·경로 정합 |

## 3. Fg/Rg 의미 · resolveAnchorPoint

| 항목 | 내용 |
|------|------|
| **이슈** | Fg 점에 `snapToRail` 성격 처리 시 C1_f (50,42.25) 등이 (50,40)으로 붕괴 |
| **원칙** | Fg는 방향·의미점, Rg는 레일 표현; **좌표는 anchors lookup SSOT** |
| **수정** | `resolveAnchorPoint`는 coord를 그대로 반환 (Fg snap 제거 유지) |
| **역할** | C1_rail = `computeRailImpactPoint(..., mark:"1C")` 가 실제 첫 쿠션 충돌점 SSOT |

## 4. anchors SSOT · 엔진 역할

| 항목 | 내용 |
|------|------|
| **정리** | `profile`/expr = **스칼라** 규칙; **렌더 좌표** = `anchors.json` + `anchorLookupEngine` + `anchorCoordinateEngine` |
| **구조** | sys → lookup → `{ coord, valueSpace }` |

## 5. CO regression (5_half CO_f > 50)

| 항목 | 내용 |
|------|------|
| **이슈** | `CO_rail = computeRailImpactPoint(..., mark:"CO")` 단독 사용 시 B2T에서 항상 BOTTOM 교점 시도 → CO가 LEFT에만 있을 때 교점 실패 → 내부 fallback으로 튐 |
| **원인** | 5_half B2T_R: CO_50 코너, CO>50은 LEFT 상승 — **하단 조건 없이** 교점만 보던 회귀 |
| **수정** | `App.jsx`: `isBottomCO` (`|y+2.25|<0.5`)일 때만 CO 교점 시도, 성공 시만 덮어씀; 아니면 `CO_prep` 유지 |
| **결과** | CO_60/70 LEFT 유지, 2C reflection 입력 정상화 |

## 6. 2C reflection Δθ 1차 튜닝

| 항목 | 내용 |
|------|------|
| **이슈** | 3·4팁 구간 과보정 체감 |
| **수정** | `reflectionEngine.ts` `TIP_TO_DELTA_DEG`: 3팁 **13°**, 4팁 **18°** (0/1/2는 0/5/10 유지) |
| **범위** | lookup 테이블 숫자만; 분기/함수 구조 변경 없음 |
| **다음** | 실전 샷 기준 미세 보정 |

## 7. 설계 논의 (기록)

교점 불가 시 **fallback**을 점 우선 vs 직선 우선으로 둘 수 있으나, **1C(SSOT)**는 직선–레일 **교점**을 채택. **CO**는 교점 실패 시 의미점 유선이라 App에서 조건부 호출로 정리.

---

# [2026-03-30] Slot 구조 정립 + SSOT 확정 + SYS/Trajectory 불안정 발생

## 1. 구조 확정

- S1/S2/S3 = 동일 테이블 + 다른 전략
- Position(balls)은 공유
- 전략(sys/hpt/str/ai)은 슬롯별 독립

---

## 2. SSOT 구조 확정

- ballsState → 테이블 렌더 SSOT
- shotEditor.slots → 슬롯별 상태 저장
- adminState → UI 및 계산용 상태

---

## 3. 핵심 변경

- currentId 제거 → view reload 제거
- 슬롯 전환 시 ballsState 유지
- Position LOCK 시 balls만 전 슬롯 동기화

---

## 4. adminState 동기화 변경

- prev.sys 기반 merge 구조 적용
- system_id / track / inputs 정규화
- draft/applied → adminState 연결 유지

---

## 5. 발생 문제 (Critical)

### (1) SYS 값 롤백
- Apply 직후 반영 → 이후 이전값으로 복귀

### (2) 궤적 사라짐
- SAVE 이후 S1 궤적 소실
- 일부 구간(C3/C4 이후) 미표시

### (3) 렌더 타이밍 불일치
- 계산 완료 시점 ≠ 렌더 트리거 시점

---

## 6. 원인 후보

- adminState ↔ slot.draft ↔ applied 불일치
- SAVE 시 applied overwrite
- trajectory 계산 트리거 누락

---

## 7. 상태

- 구조 설계 완료
- SSOT 정리 완료
- ⚠ SYS / trajectory 불안정 상태

---

## 8. 다음 작업

- SYS rollback 원인 단일화
- trajectory 렌더 트리거 정리
- adminState / slot / applied 흐름 정합성 확보

---

# 🔥 2026-03-30 — Trajectory Engine Upgrade (SSOT + Spin Correction)

## 1. Rendering 구조 개선

### SSOT 확정

- 기존: adminState + slot 혼합
- 변경: 단일 소스

resolvedSlotSys = slot.draft.sys ?? slot.applied.sys

- adminState.sys는 렌더링에서 제외
- 모든 궤적 계산은 resolvedSlotSysValues 기반으로 통일

---

## 2. Trajectory Pipeline 확정

anchors  
→ pathNodesRaw  
→ adjustedNodes (NEW)  
→ pathNodes  

- anchor / sys / epsilon 로직은 유지
- path 단계에서만 보정 수행

---

## 3. Spin Correction Layer 도입 (핵심)

### 적용 위치

- pathNodes 생성 이후
- C3 이후 구간 (C4 ~ C6)

---

### (1) Progress 기반 감쇠

progress = 누적거리 / 전체거리

- progress ≥ 0.85 → spin 50%

---

### (2) Direction 판별

cross = (B-A) × (C-B)

- forward: cross ≥ 0
- reverse: cross < 0

---

### (3) Spin 적용

r_final = rotate(r, spin * k)

- k ≈ 0.015
- forward → +
- reverse → -

---

## 4. 현재 한계

- 누적 보정 방식 (오차 누적 가능)
- 충돌 물리 (두께 / 회전 증가) 미반영
- C7 앵커 없음 (reflection 기반 확장 예정)

---

## 5. Position 저장 구조 개편

### positionId

- Ball3 기반 deterministic id
- round(v * 10) → pad → concat

---

### 구조

PositionRecord
- positionId
- balls
- strategies:
  - S1
  - S2
  - S3

---

### 규칙

- 슬롯당 전략 1개
- 동일 positionId → merge
- family 단위 저장

---

## 6. Recall 구조

- nearest 1 family만 사용
- exact match 우선
- fallback: 거리 합 최소

epsilon = 2.0

---

## 7. 주요 안정화 성과

- S1 trajectory flicker 문제 해결
- C4~C6 anchor 누락 문제 해결
- C3 fallback 구조 안정화
- sys overwrite 구조 제거

---

## 8. 다음 단계 (예정)

- spin 누적 오차 제거 (non-accumulative 옵션)
- STR → 실제 spin 매핑 정교화
- C7 reflection 확장
- collision physics (장기)

---
PROJECT_LOG_2026-04.md (완성본)
# PROJECT LOG – 2026-04

Version: v1.0  
Created: 2026-04-XX  
Scope: Cushion Geometry · Rail Normal · Vector Placement 정립

---

# 📌 1. 세션 개요

2026-04 세션의 목적:

- 쿠션 기준 좌표계(FG)에서의 **법선(normal) 정의 통일**
- C3 ~ C6 벡터 마크의 **배치 규칙 정리**
- SystemGrid 렌더링 위치의 **시각적 불일치 해결**
- distance 기반 시각 튜닝 체계 확립 (BETA 도입)

이번 세션은:

**Geometry & Rendering Stabilization Phase**

---

# 🧱 2. 핵심 구조 변경

## 2.1 Rail 기반 Normal SSOT 도입

신규:


getRailOutwardUnitNormalFG(railLine)


### 정의 (FG 기준)

| Rail | Normal |
|------|--------|
| TOP | (0, +1) |
| BOTTOM | (0, -1) |
| LEFT | (-1, 0) |
| RIGHT | (+1, 0) |

### 특징

- 좌표(x,y) 기반 계산 제거
- railLine → normal 직접 매핑
- symmetry 적용 가능 구조 확보

---

## 2.2 computeNormalFromPosition 제거

기존:

- 좌표 기반 최근접 쿠션 탐색
- 방향 불안정 / 유지보수 어려움

변경:

- ❌ 완전 제거
- ✅ rail 기반 단일 normal 구조로 통합

---

## 2.3 Vector Mark Placement 파이프라인 확정

공통 구조:


railLine = getRailLineFromPosition(x, y)
normal = getRailOutwardUnitNormalFG(railLine)
targetFG = baseFG + normal * distance


### 의미

- 방향 = normal
- 위치 = baseFG + distance

👉 역할 분리 완성

---

# 🎯 3. Mark별 배치 정책 확정

## 3.1 C3

- baseFG: rail snap
- normal: outward + 수직 레일에서만 x 반전
- distance: CUSHION_HALF

👉 기존 레거시 유지

---

## 3.2 C4

- baseFG: rail snap
- normal: pure outward
- distance: CUSHION_HALF

### 변경 사항

기존:
- CUSHION_HALF + ALPHA

현재:
- CUSHION_HALF (C3와 동일)

👉 쿠션 중앙 기준 정렬 완료

---

## 3.3 C5 / C6

- baseFG: anchor (스냅 없음)
- normal: pure outward (반전 없음)
- distance: MID_RANGE + BETA

---

# 📐 4. 거리 체계 재정의

## 4.1 기본 상수 (FG)

| 항목 | 값 |
|------|----|
| CUSHION_RG | ≈ 1.266 |
| CUSHION_HALF | ≈ 0.63 |
| MID_RANGE | ≈ 0.95 |

---

## 4.2 문제

C5/C6가:

- 쿠션 쪽으로 붙어 보임
- “mid” 의미 불충분

---

## 4.3 해결: BETA 도입


distance = MID_RANGE + BETA


### 초기값


BETA = 1.0 (FG)


---

## 4.4 튜닝 결과

| BETA | 결과 |
|------|------|
| 0.5 | 부족 (쿠션 쪽) |
| 1.0 | ✅ 최적 |
| 1.5 | 과함 (프레임 쪽) |

---

## 4.5 설계 의도

- 프레임 ↔ 쿠션 사이 체감 mid + 약간 외향
- 모든 레일에서 동일 거리 이동
- normal 변경 없이 distance만으로 조정

---

# 🧠 5. FRAME (CO / C1) 정리

- railLine 기반 normal 사용
- applyLayerOffset는 outward 기준으로 재정의

👉 기존 시각 유지 + 내부 구조 개선

---

# ⚠ 6. 해결된 문제

### 6.1 C4 위치 불일치

- 상단/좌측 쿠션에서 서로 다른 위치
→ distance 통일로 해결

---

### 6.2 C5/C6 inward 문제

- 레일에 따라 방향 뒤집힘
→ pure outward로 해결

---

### 6.3 좌표 기반 normal 불안정

→ rail 기반으로 완전 해결

---

# 🔄 7. 설계 원칙 (확정)

1. normal은 반드시 railLine 기준
2. 좌표 기반 방향 계산 금지
3. 위치는 baseFG + distance로만 결정
4. distance는 시각 튜닝 레이어
5. symmetry 적용 가능한 구조 유지

---

# 📊 8. 현재 상태

| 항목 | 상태 |
|------|------|
| C3 | 안정 |
| C4 | 안정 |
| C5 | 안정 |
| C6 | 안정 |
| FRAME | 안정 |
| SystemGrid | 안정 |

---

# 🚀 9. 다음 단계

1. Symmetry (H / V / RPI) 완전 적용
2. rail enum 구조 도입 검토
3. distance 스케일링 자동화
4. vector label 정렬 최적화
5. geometry unit 테스트 추가

---

# 📌 10. 세션 평가

Before:

- normal 정의 혼재
- C4/C5/C6 방향 불일치
- 시각적 불안정

After:

- normal SSOT 확립
- C3~C6 정책 명확화
- distance 기반 튜닝 구조 확립
- 전체 렌더링 안정화

---

Status: Stable (2026-04 완료)

---

# 🔥 핵심 요약

- normal = rail 기준으로 완전 통일
- C4 = 쿠션 중앙
- C5/C6 = mid + BETA
- geometry 구조 = symmetry 대응 가능 상태

Status: Stable (2026-04-08 완료)
---

# 📌 11. Label System Stabilization Phase (NEW)

## 11.1 세션 목적

- SystemValueLabels의 **좌표 기반 표시 안정화**
- 시스템별 라벨 위치 불일치 문제 해결
- 5&half 기준 시스템 확보 및 공통 전략 정의
- 충돌 기반 배치 로직 제거 및 구조 단순화

---

## 🧠 11.2 핵심 설계 방향

### A. 기준 시스템 (Reference System)

**5&half system**

- 가장 높은 사용 빈도 (실전 기준 약 70%)
- C4 / C5 / C6까지 포함하는 유일한 복합 시스템
- 현재 UX 기준으로 **가장 이상적인 라벨 배치 상태**

👉 결론:

- **절대 수정 금지**
- 모든 변경 작업은 5&half에 영향을 주면 안 됨

---

### B. 전략 구조 도입

라벨 시스템은 Strategy Pattern으로 확장

초기 전략:

- `five_half_reference` (기준 시스템)
- `anchor_ssot` (공통 시스템)

---

### C. 공통 전략 (anchor_ssot)

기본 원칙:

1. `anchor.coord` = SSOT (절대 변경 금지)
2. FG = 프레임
3. RG = 쿠션
4. 렌더 직전 FG → RG 변환 1회만 허용
5. 좌표 의미 유지가 최우선

---

## ⚠ 11.3 기존 문제의 본질

초기 문제는 "겹침"으로 보였으나 실제 원인은:

- FG / RG 혼용
- 과도한 충돌 판정
- connected component 기반 그룹핑
- MID를 중심 방향으로 이동시키는 오류
- FG↔RG 승격/강등 로직

👉 결과:

- 좌표 의미 붕괴
- 시스템별 표시 불일치 발생

---

## 🔥 11.4 MID 정의 재정립 (중요)

기존 (오류):

- 중심 방향 이동 (applyMidInsetRg)

현재 (확정):


MID = FG ↔ RG 중간 좌표


### 수식:

- BOTTOM: y = -1.125
- TOP: y = 41.125
- LEFT: x = -1.125
- RIGHT: x = 81.125

👉 MID는 이동이 아니라 **고정 좌표**

---

## ❌ 11.5 제거된 구조

다음 로직은 전면 제거 대상:

- distance 기반 충돌 판정
- connected component 그룹핑
- pairwise 충돌 처리
- inward / normal 기반 이동
- applyMidInsetRg
- FG↔RG 자동 승격/강등
- MID 자동 분배

👉 이유:

- 좌표 신뢰성 훼손
- 시스템 간 일관성 붕괴

---

## ✅ 11.6 유지 구조

- anchor.coord (SSOT)
- fgToRg (렌더 직전 1회)
- toPx
- 좌표 기반 판단

---

## 🎯 11.7 현재 확정 규칙

### 충돌 처리 방향

👉 "충돌 해결"이 아니라 **좌표 정의로 해결**

- 좌표 이동 최소화
- 레이어 개념 단순화
- MID는 필요 시만 사용

---

## 🚧 11.8 현재 상태

| 항목 | 상태 |
|------|------|
| 5&half | 안정 (기준 유지) |
| anchor_ssot | 정리 진행 중 |
| 충돌 로직 | 제거 진행 |
| MID | 재정의 완료 |
| SystemValueLabels | 재구성 단계 |

---

## 🚀 11.9 다음 단계

1. **5&half 보호 규칙 코드 레벨 적용**
2. **anchor_ssot에서 충돌/MID 로직 제거**
3. **전략 완전 분리 (renderer 단위 분리)**

---

## 💡 11.10 핵심 설계 원칙 (NEW)

1. anchor.coord는 절대 수정하지 않는다
2. 위치 문제는 "이동"이 아니라 "좌표 정의"로 해결한다
3. MID는 offset이 아니라 고정된 중간 좌표다
4. 5&half는 기준 시스템으로 보호한다
5. 공통 규칙 → 적용 → 안 맞는 것만 전략 분리

---

## 🔥 핵심 요약

- 5&half = 기준 시스템 (절대 보호)
- anchor = SSOT
- 충돌 로직 = 제거
- MID = FG/RG 중간 좌표
- 구조 = Strategy 기반으로 확장

---

Status: In Progress (Label System Stabilization)

---

# 📌 12. 2026-04-17 작업 업데이트 (Raw Label Rendering Fix)

## 12.1 오늘 해결한 핵심 문제

### 문제 A) raw anchor 숫자(0, 13, 20, 25...)가 화면에 보이지 않음

- 원인:
  - `SystemValueLabels`에 `labelAnchors` prop이 전달되지 않음
  - 전달 데이터 형태가 raw 렌더 요구 구조와 불일치
- 조치:
  - 상위(`App.jsx`)에서 `labelAnchors` 전달 경로 연결
  - `labelAnchors`를 **mark별 배열 구조**로 정리
    - 예: `C1: [{ coord, value }]`
- 결과:
  - raw 숫자 렌더 경로가 실제로 실행되는 상태로 복구

---

### 문제 B) raw 숫자 value가 누락되거나 값-좌표 매칭이 부정확함

- 원인:
  - 표시용 데이터에 `value`가 없는 좌표 객체만 전달됨
  - 거리 기반 최근접 매칭은 오차/왜곡 가능성 존재
- 조치:
  - `anchors.json`의 `id`를 직접 파싱해 `label / coord / value`를 생성
  - 거리 기반 nearest 로직 제거
- 결과:
  - raw value가 anchor 정의값을 직접 사용하도록 정합성 개선

---

### 문제 C) C4/C5/C6 raw 라벨 겹침

- 조치:
  - `renderRawLabelAnchors`에서 **label 기준 고정 좌표 이동** 적용
  - C4 / C5 / C6만 축 이동, CO/C1/C2/C3은 기존 유지
- 결과:
  - 상위 쿠션/프레임 인접 구간 겹침 완화

---

### 문제 D) 시인성 이슈 (색상)

- 조치:
  - 시스템 계산값 텍스트: `#FFFFFF`로 변경
  - raw 라벨 색상:
    - 기본 `#FFD700`
    - C4 `#00E5FF`, C5 `#FF4D6D`, C6 `#A8FF60`
  - 프레임 점: `#fff` → `#111`
- 결과:
  - 라벨/프레임 요소 간 대비 개선, 가독성 향상

---

## 12.2 오늘 확정된 데이터/렌더 원칙

1. raw 라벨은 `anchors.json id` 파싱 값(`coord`, `value`)을 우선 SSOT로 사용
2. raw 라벨 입력 구조는 `label -> array of nodes`를 기본으로 유지
3. 시스템 계산값 텍스트와 raw 라벨 텍스트는 공존 가능해야 함
4. 겹침 해소는 일반 충돌 엔진이 아닌, 현재 단계에서는 label 고정 규칙으로 처리

---

## 12.3 상태

- Raw label 파이프라인: 연결 완료
- Value 파싱 정합성: 개선 완료
- C4/C5/C6 겹침 대응: 1차 완료 (고정 이동)
- 시각 가독성: 개선 완료

---

# 📌 13. 2026-04-17 작업 업데이트 (궤적 · toward · 디버그)

## 13.1 원칙 정리 (노란점 vs 궤적)

- **노란점(라벨):** `anchor.coord` / `resolveAnchorPoint` 기반 의미 좌표 유지 (FG·RG 의미 보존, FG→RG 강제 변환 없음).
- **궤적(빨간 polyline):** 이전 레일 교점 → 다음 의미점 방향의 첫 레일 교점까지 (`firstRailHitTowardTarget` → `lineToRailIntersections` 세그먼트 기준).

## 13.2 C3와 동일한 toward 체인 (C4 ~ C6)

- `C4_anchor` ~ `C6_anchor`에 대해 `C3`와 동일하게 `*_prep` / `*_point` / `c*Sem = C*_point ?? anchorSemanticForPath(*_anchor)` 구조 적용.
- **참고:** `normalize`가 성공하는 일반 앵커에서는 `C*_point`와 `anchorSemanticForPath`가 같은 값이 되어 **수치상 변화가 없을 수 있음** (엣지 케이스에서만 차이).

## 13.3 polyline이 C3까지만 보이던 원인과 디버그 조치

- **원인:** `pathEndIndex` 기본값 + 2번째 공 맞춤 로직으로 **C4 이후가 잘리는 경우**가 많음.
- **디버그:** `pathEndIndex = pathNodes.length - 1` 로 전 구간 표시. 기존 second-ball 클리핑 블록은 **주석으로 보존** (복구용).

## 13.4 스핀 보정과 C4 ~ C6 좌표

- `adjustedNodes` 초기값은 `pathNodesRaw` 복사와 동일.
- **스핀 루프** (`i = 3 ..`): `adjustedNodes[i+1]` 갱신으로 **인덱스 4, 5, 6 (C4 ~ C6 궤적 점)이 덮어써짐** → 순수 교점만 검증하기 어려움.
- **디버그:** 해당 **스핀 `for` 루프 전체를 주석 처리**하고, `pathNodesRaw` 기준 궤적을 그대로 `pathNodes` → `cushionPath`로 렌더 (주석 해제 시 스핀 복구).

## 13.5 시도 후 롤백·보류된 항목 (기록)

- `extendRay` / `directionalSnap` 기반 `firstRailHitTowardTarget` 보정은 C2→C3 구간 이상 유발 → **제거·원복**.
- `lineToRailIntersections` / `computeRailImpactPoint` / reflection 본체는 유지.

## 13.6 상태 (궤적 디버그)

- 전체 궤적 표시(`pathEndIndex`) 및 스핀 비활성화: **디버그 목적**, 추후 제품 동작에 맞게 주석 해제/복구 필요.
- toward/C4~C6 미세 오차는 **별도 단계**에서 재검토 가능.

---

Status: Updated (2026-04-17) — §12 Raw Label + §13 Trajectory/Debug

---

# 📌 14. 2026-04-18 작업 업데이트 (초기 UX · Raw 라벨 · 시스템 라벨 가시성)

## 14.1 초기 사용자 화면 (App.jsx)

### 목표

- 앱 최초 진입 시 **당구대 + 공 3개 + 좌측 UI** 위주로 보이도록 정리
- 시스템 계산 전에는 **시스템 라벨·CO 값**이 나오지 않도록 함

### 상수 및 공 좌표 (Rg)

- `INITIAL_BALLS_RG`: 큐 `(20, 16)`, 타깃 `target_center (20, 20)`, 2구 `(60, 20)`
- `adminState.balls` 초기값과 `ballsState` 초기값을 위와 정렬

### canonical.json 로드 시 (기본 샷)

- `balls`: `INITIAL_BALLS_RG`만 사용
- `system`: `{ values: {}, human_readable: {} }` — **계산값 숨김용**
- `anchors`: `data.ui?.anchors || {}` — **앵커 데이터는 JSON 유지** (raw / 궤적 입력 소스)
- `strategy`: `[]`

### App.jsx 정리

- 레일별 겹침 클러스터(`forceRgByLabel` / `forceMidByLabel` 등) 계산 블록 제거 (미사용·설계 방향과 부합)
- `labelStrategy`: `5_half_system` → `five_half_reference`, 그 외 → `anchor_ssot` (후속 §14.3·14.4와 연계)

---

## 14.2 Raw 라벨 파이프라인 복구

- `labelAnchorsForRaw`: `trackAnchorItems` 기준 **항상** 생성 (USER + 빈 `system.values`에서도 차단 제거)
- canonical에서 `anchors` 비우지 않음으로 **raw / 앵커 데이터 정상 공급**

---

## 14.3 C4 / C5 / C6 raw 축 이동 보정 (SystemValueLabels.jsx)

### 문제

- `applyCushionNudges = (labelStrategy === "anchor_ssot")` 때문에 `five_half_reference`(5&half)일 때 보정이 꺼짐

### 조치

- `renderRawLabelAnchors` 내부: `const applyCushionNudges = true;`
- `labelStrategy` prop 및 `applyRawLabelFrameNudges` 본문은 **유지** (전략 값은 그대로 전달·보정은 항상 적용)

### 결과

- 초기 / 사용자 / 관리자 모드에서 raw C4·C5·C6 **프레임 인접 축 보정**이 동일하게 적용

---

## 14.4 시스템 라벨 전체 가시성 — `outputs.result` 게이트

### 목표

- `outputs.result`가 없을 때(계산 미수행) **SystemValueLabels 전체 미렌더**
- 계산·값 입력 후에는 기존처럼 표시

### 조치

- `SystemValueLabels.jsx`: 컴포넌트 본문 상단에 `if (!outputs?.result) return null;`
- `outputs` prop 추가
- `App.jsx` `<SystemValueLabels />`에 `outputs` 전달:
  - **ADMIN**: `resolvedSlotSys?.outputs`
  - **USER**: `system?.outputs` 우선, 없으면 `system.values`에 키가 있을 때만 `{ result: system.values }`, 그 외 `undefined`

### 비고

- raw 전용 보정 로직과 분리: **컴포넌트 단위**로 꺼지므로 초기에는 시스템 마크 라벨·값이 보이지 않음

---

## 14.5 디버그 로그 (기록용)

- 원인 추적을 위해 `App.jsx` / `SystemValueLabels.jsx`에 STEP1~STEP6 수준의 `console`·ingest 로그가 삽입된 적 있음 (커밋 시점에 포함 여부는 저장소 기준).

---

## 14.6 상태 (2026-04-18)

| 항목 | 상태 |
|------|------|
| 초기 화면 (공·테이블·좌측 UI) | 정리 반영 |
| canonical: 앵커·raw 데이터 | 유지 |
| canonical: 시스템 값 표시 | 비어 있음으로 숨김 |
| Raw C4/C5/C6 축 보정 | 항상 적용 |
| 시스템 라벨 렌더 | `outputs.result` 있을 때만 |

---

Status: Updated (2026-04-18) — §14 초기 UX · Raw 보정 · outputs 게이트

---

# 📌 15. 2026-04-19 작업 업데이트 (렌더 기준: base → effective)

## 15.1 해결한 문제 (What we fixed)

### 문제

- **저장·계산 파이프라인**에서는 base `system_values`와 별도 CV가 맞게 분리되어 있었으나, **테이블 렌더 SSOT**인 `resolvedSlotSysValues`가 `draft.sys.inputs` + `outputs.result` **병합(base 중심)**만 사용하고 있었다.
- 그 결과 SYS 오버레이에서 보이는 **effective**(예: slide 보정 후 CO·C3)와 달리, **라벨(CO, C3 등)·앵커·쿠션 궤적 polyline**이 **base 숫자** 기준으로 그려졌다.
- 사용자 검증 예시: base CO 29.5 / C3 26에 CV 반영 시 UI·궤적은 CO 35.5 / C3 32를 기대하지만, 화면은 29.5 / 26에 머무는 현상.

### 조치 (코드 요약)

- `App.jsx`에 **`parseSysFormulaExpr`**(기존 SysOverlay 내부 파서와 동일 역할)를 모듈 스코프로 올리고, SysOverlay는 이를 재사용하도록 정리.
- **`buildSlotEffectiveRenderSysValues(merged, resolvedSlotSys, adminSys)`** 추가:
  - 슬롯 병합 맵을 숫자 payload로 만든 뒤 `normalizeToFormulaInputsApp`까지 SysOverlay와 동일 규약으로 처리.
  - **`adminState.sys.corrections`** + **`input_basis`** + **`spaceSel`**으로 adjusted → **SysOverlay와 동일한 `effDisplayMap` 규칙** 및 5½일 때 **Sn / C4_f~C6_f** 재계산.
- **`resolvedSlotSysValues`** `useMemo`에서 위 결과를 `{ ...merged, ...effectiveNums }`로 병합하고, 의존성에 **`adminState?.sys`**를 포함해 CV·기준 변경 시 재렌더되도록 함.
- **저장 로직·normalize 본문·`useShotSlots` 커밋**은 변경하지 않음(요청 범위: **렌더만**).

### 결과

- ADMIN에서 활성 슬롯의 **라벨·앵커·쿠션 경로**가 **effective 표시값**과 정렬되는 방향으로 수정됨.
- 빌드(`npm run build`) 통과 확인.

---

## 15.2 아직 해결하지 않은 것 / 다음 단계 (Next Step)

1. **슬롯별 CV·`input_basis` SSOT**  
   - 현재 effective 렌더는 **`adminState.sys`**의 corrections / basis / spaceSel을 참조한다.  
   - **슬롯 S1/S2/S3마다 다른 CV**를 저장·복원해야 하면, 해당 메타를 **슬롯 `sys` 또는 전략 레코드**에 두고 `buildSlotEffectiveRenderSysValues` 입력을 슬롯 단위로 바꾸는 작업이 필요하다(미구현).

2. **`trajectory.state`(oneC / threeC)와의 완전 동기**  
   - 쿠션 polyline은 앵커·`resolvedSlotSysValues` 기반이라 이번 수정과 함께 맞춰지는 경향이 있으나, **`applySysResult`가 쓰는 `outputs.result.oneC` / `threeC`**는 여전히 **커밋 시점 base 계산**에 묶일 수 있다.  
   - effective 1·3쿠션 수치를 궤적 조정 UI와 **완전히 동일 SSOT**로 맞출지는 별도 결정·구현이 필요하다.

3. **USER 모드·JSON 뷰**  
   - 이번 변경은 **ADMIN + `adminState.sys`가 채워진 맥락**에 최적화되어 있다. USER 뷰에서 동일한 effective를 보여야 하면 **뷰/저장 JSON에 basis·CV 스냅샷**이 있어야 하며 미연결이다.

4. **공식 RHS 미충족 시**  
   - RHS 입력이 부족하면 effective 빌더가 빈 객체를 반환하고 **base 병합만** 사용한다. 초안 슬롯·불완전 데이터에서의 UX(안내/placeholder)는 추가 검토 여지가 있다.

5. **회귀·수동 검증**  
   - 실제 테이블에서 **여러 basis(CO_C3_C1 / CO_C1_C3 / C1_C3_CO)**·트랙 조합에 대한 스냅 검증은 자동화 테스트 없이 **수동 확인 권장** 상태다.

---

## 15.3 상태 요약

| 항목 | 상태 |
|------|------|
| 렌더 SSOT (`resolvedSlotSysValues`) | effective 병합 반영 (2026-04-19) |
| SysOverlay 계산 규약 | 파서 공유로 정합 유지 |
| 저장·normalize·슬롯 커밋 | 변경 없음 (의도적) |
| 슬롯별 CV / trajectory oneC·threeC / USER 동기 | **다음 단계** |

---

Status: Updated (2026-04-19) — §15 Render base → effective (`effDisplayMap` 규약 정렬)

---

# 📌 16. 2026-04-19 작업 업데이트 (5½ SYS 표시 · base 2-of-3 · 보정 방식 UI)

## 16.1 해결한 문제 (What we fixed)

### 문제 A) 5&Half “기준 계산값 / 보정된 계산값” 표시 오류

- **증상:** 좌변이 C1이 아닌 경우, `C3 = CO − C1`처럼 공식 방향이 뒤집힌 표기, 또는 base와 effective 숫자가 한 줄에 섞임.
- **원칙:** 표시는 항상 **`C1 = CO − C3`** (좌변 C1). base는 **base 값만**, effective는 **`CO_eff = CO + CV`** 및 동일 C1 기준.
- **조치:** `App.jsx`에서 5&Half 전용 표시 줄(`fiveHalfBaseDisplayLine`, `fiveHalfEffectiveDisplayLine`)을 `normalizedBasePayload` / `adjustedInputs` 기준으로 분리 생성. 보정 줄의 C3는 공식 정합을 위해 표시용으로 **`CO_eff − C1`** 사용(저장·`effDisplayMap`·엔진 계산 경로는 요청 범위 내에서 변경하지 않음).
- **결과:** 검증 예시(CO 29.5, CV 6, C1 3.5 등)에서 기준/보정 문자열이 의도한 방향으로 정렬.

---

### 문제 B) 기준(base) 2-of-3 계산에 CV(밀림)가 섞이던 문제

- **증상:** C3 등을 입력할 때 기준 C1이 **`CO + CV − C3`**처럼 계산되어, **기준 계산값**이 CV에 오열됨.
- **원칙:** base에서는 **CV 미사용**; effective에서만 `CO_eff` 반영.
- **조치:** `solveFiveHalfTwoOfThree`에서 `coEff`·`slide` 인자 제거, 모든 분기 **`co`(CO_base)만** 사용 (`C1+C3 → CO`는 **`CO = C1 + C3`**로 `C1 = CO − C3`와 정합). `normalizedBasePayload` / `hasAllInputs`의 `useMemo`에서 **`formData.corrections?.slide` 의존성 제거**. `buildSlotEffectiveRenderSysValues` 내 동일 호출 정리.
- **결과:** 예) CO=29.5, C3=26, CV=6 → 기준 C1은 **항상 3.5**(CV 무관); 보정은 기존 경로로 `CO_eff` 등 반영.

---

### 문제 C) SYS 설정 UI의 “보정 방식” 블록

- **증상:** “CV 직접 입력” / “목표 도착값 입력 (자동 보정) — 준비 중” 라디오가 있으나 실질 분기 없음·혼란 유발.
- **조치:** `App.jsx` SysOverlay 구간에서 해당 **UI 전체 삭제**. 상태 **`cvEntryMode` / `setCvEntryMode`** 및 복원 시 `setCvEntryMode`, 저장 payload의 **`cv_entry_mode`** 제거.
- **고정 동작:** CV는 **`formData.corrections.slide`(밀림)** 만 사용 — 별도 모드 선택 없음.
- **참고:** 코드상 이름은 요구서의 `correctionMode`가 아니라 **`cvEntryMode`**였음.

---

## 16.2 범위 및 비고

- **Sn 로직, 일반 계산식 엔진, 다른 시스템 전용 로직:** 이번 세션 요청 범위에서 **의도적으로 미변경**(표시·base solve·UI 제거에 한정).
- **`npm run build`:** 위 변경 후 프론트엔드 빌드 성공 확인.

---

## 16.3 다음 단계 (Next Step) — 아직 해결하지 않은 것

1. **`frontend/src/admin/sys/SysOverlay.tsx`와의 이중 UI**  
   - `App.jsx`의 “보정 방식”은 제거했으나, **관리자용 TSX `SysOverlay.tsx`**에는 동종 `cvEntryMode` 라디오·상태가 **남아 있을 수 있음**. 앱이 해당 컴포넌트를 쓰는 경로가 있으면 **동일 정리(제거 또는 단일 SSOT)**가 필요하다.

2. **§15에서 기록한 항목 (변경 없음·계속 미완)**  
   - 슬롯별 CV·`input_basis` SSOT, `trajectory.state`의 oneC/threeC와 effective 완전 동기, USER 모드·JSON 뷰 연동, 불완전 RHS 시 UX 등은 **별도 작업**으로 남음.

3. **§13 궤적 디버그 상태**  
   - `pathEndIndex` 전구간·스핀 루프 주석 등 **디버그용 설정**의 제품 기본값 복구 여부는 **미결정**.

4. **“목표 도착값 입력 (자동 보정)” 기능 자체**  
   - UI만 제거된 상태이며, **역산으로 CV를 채우는 로직·기획**은 구현·검증되지 않았다. 필요 시 새 스펙으로 재설계.

5. **저장 JSON 호환**  
   - `cv_entry_mode` 필드를 저장에서 뺐다. 외부 도구·구버전이 해당 키를 기대하면 **마이그레이션 또는 기본값 문서화**가 필요할 수 있다.

---

## 16.4 상태 요약

| 항목 | 상태 |
|------|------|
| 5&Half 표시 (C1=CO−C3, base/effective 분리) | 반영 (`App.jsx`) |
| 5&Half base 2-of-3 (CV 비포함) | 반영 (`solveFiveHalfTwoOfThree`) |
| SYS “보정 방식” UI·`cvEntryMode` state | 제거 (`App.jsx`) |
| admin `SysOverlay.tsx` 동종 UI | **다음 단계** |
| §15·§13 미결 과제 | **다음 단계** (기존 로그 유지) |

---

Status: Updated (2026-04-19) — §16 5½ 표시/base 분리 + 보정 방식 UI 제거 (`App.jsx`)

---

# 📌 17. 2026-04-28 (Base Line 시스템 구현 & 렌더 개선)

## 17.1 문제 배경

- 기존에는 **보정이 반영된 trajectory(빨간 polyline)** 만 표시되는 경우가 많았고, **같은 슬롯 입력에 대한 “보정 전” 기준 궤적**을 한 화면에서 비교하기 어려움.
- 사용자 입장에서 **왜 slide·끌림·스핀·곡구 보정이 필요한지** 직관적으로 설명하기 어렵다는 피드백.

---

## 17.2 핵심 개선 사항

### 17.2.1 Base Line 개념

- **Base** = 현재 슬롯의 시스템 입력을 유지한 채, **물리 보정만 제거한 상태**에서 계산한 표시/앵커용 값.
- 보정 제거 대상(렌더 분기에서 `0`으로 덮어씀):
  - `slide`, `draw`(pull), `spin`, `curve_ratio`(UI 상 곡구 / 스펙상 english에 해당)
- **유지:** `departure`(출발값 보정) — Sn 관련 파이프라인과 혼동 방지 및 기존 §15 effective 규약과 정렬.
- 5½ 경로에서 Sn·C4~C6는 여전히 **`buildSlotEffectiveRenderSysValues` → `computeSnPair`** 경로에서 도출되며, Base 분기에서는 위 보정만 빠진 입력으로 동일 함수를 한 번 더 호출한다.

👉 요약: **Base ≈ 순수 시스템 계산 + 출발값 보정(departure) 유지 + Sn 자동 계산 유지**, slide/draw/spin/curve_ratio만 제거.

---

### 17.2.2 데이터 파이프라인 (effective와 분리)

**기존 시도·문서에서 언급되던 `baseTrajectorySlotSysValues` / `buildBaseTrajectorySysValues` 는 도입하지 않고 제거됨.**  
대신 **동일 함수 두 번 호출**으로 일관성 유지:

| 구분 | 호출 | `adminSys` |
|------|------|------------|
| Effective (빨간 궤적·라벨 SSOT) | `buildSlotEffectiveRenderSysValues(merged, slotSys, adminState.sys)` | 실제 corrections |
| Base (기준선용 값) | 동일 함수 | `adminSysNoCorrections`: `{ ...adminState.sys, corrections: { ...기존, slide:0, draw:0, spin:0, curve_ratio:0 } }` |

- 병합 결과: `resolvedSlotSysValues`(effective), `resolvedSlotBaseSysValues`(`buildSlotEffectiveRenderSysValues` 출력을 `merged`와 직접 병합). ~~`slotTrajectoryBaseSnPair`~~ 는 반환 구조에 없어 사용하지 않음(§17.15).
- **앵커:** `rawAnchorsBase` / `anchorsBase` = `getAnchorsForRendering`에 **base 병합 맵**을 넣어 계산. effective `rawAnchors`와 분리.

---

### 17.2.3 궤적 기하: Base 앞구간을 effective와 혼용하지 않음

- 문제: Base polyline의 **CO→C1→C2**를 effective 레일 교점과 섞으면, 뒤쪽만 base일 때 **앞 선분이 안 보이거나** 의도와 다른 형태가 됨.
- 조치 (`App.jsx`): **`anchorsBase` 전용**으로 `CO_path0_base`, `C1_rail_base`, `C2_path_base`를 계산(`coStartForCushionPath`, `computeRailImpactPoint`, `firstRailHitTowardTarget`, 필요 시 `computeReflectionC2`). C3 이후는 base 앵커 기준 레일 체인으로 연결.
- `cushionPathAttrBase`는 위 점들을 **픽셀 문자열**로 합친 뒤 `ImpactLines`에 전달 (`toPx`·테이블 설정은 기존과 동일).

---

### 17.2.4 C3→C4 구간: 테이블 경계 클리핑 (Rg)

- 목적: C4 의미점이 놀이구역 밖이어도 **선이 화면 밖으로 무한 연장되지 않도록** 표시만 제한.
- 위치: `ImpactLines.jsx` — **`toPx 이전 Rg`**에서 선분 `C3–C4`를 축 정렬 직사각형 **`[0,80]×[0,40]`** 에 맞게 잘라 **경계상의 끝점**만 사용 후 `toPx` 적용.
- 구현: 이분 탐색으로 “`p1`에서 `p2` 방향으로 마지막으로 안쪽에 남는 점” 근사 (`intersectWithTableBounds`).

---

### 17.2.5 스타일 & 토글 UI

- Base Line polyline: **`stroke="#FFD700"`**, **`strokeWidth={0.5}`**, **`strokeDasharray="none"`(실선)**, **`opacity={0.9}`**.
- **`showBaseLine` / `setShowBaseLine`** 상태 복구. 우측 패널 **Base Line 버튼은 `slotTrajectorySnPair?.base` 등으로 숨기지 않고 항상 표시**(ADMIN `canEdit` 영역), 클릭으로 on/off.
- `ImpactLines`: **`showBaseLine && 유효한 base polyline points`** 일 때만 기준선 렌더.

---

### 17.2.6 디버깅·검증 로그 (DEV)

- `ImpactLines`: `BASE_EXTENDED`, `BASE_CHAIN_CHECK`, `BASE_CLIP_RG`, `BASE_CUSHION_SEGS` 등 (앵커 키 존재·Rg 클립·세그먼트 수 확인).
- `App.jsx`: `BASE_DEBUG`에 base 레일 접두 좌표 등(개발 모드).

---

## 17.3 관련 파일 (요약)

| 파일 | 역할 |
|------|------|
| `frontend/src/App.jsx` | `adminSysNoCorrections`, `resolvedSlotBaseSysValues`, `rawAnchorsBase`, base 레일 접두 + `cushionPathAttrBase`, `showBaseLine` 상태·버튼 |
| `frontend/src/components/table/ImpactLines.jsx` | Base polyline, Rg 클리핑, 스타일, `showBaseLine` 게이트 |
| `frontend/src/admin/sys/sysCorrection.ts` | `computeSnPair`(호출 구조 유지; Base는 입력 corrections만 다름) |

---

## 17.4 설계상 주의 (기록)

- **`toPx` / 좌표계 변환 함수 본문 수정 없이** “연결 순서·입력 소스”만 조정하는 방향으로 진행함.
- Base 버튼 가시성은 **데이터 유무와 분리** — 경로 데이터가 없으면 polyline만 그려지지 않고, 버튼은 항상 노출.

---

### 17.5 Sn(departure) 유지 (재확인)

- **`departure`(출발값 보정)는 Base 분기에서 제거하지 않음.** Slide·draw·spin·curve_ratio만 0으로 두어 “물리 보정”만 분리하고, Sn 관련 출발값 보정 경로는 유지한다.

---

### 17.6 렌더 구조 개선 (`ImpactLines.jsx`)

- **보정선:** 빨간색 polyline — effective cushion 경로 (`cushionPathAttr` 등 기존 경로).
- **기준선:** 노란색 polyline — Base 전용 `cushionPathAttrBase` (+ 조건 시 앵커 보조).
- 두 레이어를 **별도 `<polyline>`** 로 두어 **동시 렌더** 가능 (서로 덮어쓰지 않음).

---

### 17.7 Base Line 스타일 정의

| 항목 | 값 |
|------|-----|
| 색상 | `#FFD700` (노란색) |
| 선 종류 | 실선 (`strokeDasharray` 비점선 처리) |
| 두께 | 기존 대비 약 절반 수준 (`strokeWidth={0.5}`) |
| 투명도 | `opacity={0.9}` |

**목적:** 큐볼–목적구 구간 등 **점선/다른 색 궤적**과 시각적으로 구분.

---

### 17.8 C4까지 기준선 확장 & 레일 바깥 방지

- **기존:** 경로 기본 종료가 C3 근처로 보이는 경우가 많아 기준선이 짧게 끊겨 보임.
- **변경:** Base 표시를 **C4 방향까지 연장**. 구현상 `cushionPathAttrBase`에 C4 픽셀을 덧붙이거나, 앵커 폴백 체인에서 C4를 포함.
- **레일/테이블 바깥 이탈 방지:** Rg에서 선분 **C3→C4**를 놀이구역 **`[0,80]×[0,40]`** 에 **클립**한 끝점만 사용 후 `toPx` — 무한 연장 방지 (§17.2.4와 동일 주제).

---

### 17.9 Base Line 토글 기능

- **상태:** `const [showBaseLine, setShowBaseLine] = useState(false);`
- **버튼:** 우측 패널에 **항상 표시** — `slotTrajectorySnPair?.base` 등 **base 존재 여부 조건 제거**.
- **동작:** 클릭 시 `setShowBaseLine(v => !v)` 로 토글.
- **ON:** 버튼을 노란색 계열 **활성 스타일**로 강조; **OFF:** 회색 계열 비활성 느낌.

---

## 17.10 주요 버그 및 해결

### [버그 1] Base Line 버튼이 사라짐

- **원인:** 버튼 렌더가 **`slotTrajectorySnPair?.base`** 에 묶여 있었으나, 리팩터 후 해당 값이 그 조건에서 채워지지 않음 → 조건 false → 버튼 미렌더.
- **해결:** 조건 제거 → **항상 렌더** (토글만 제어).

### [버그 2] 기준선 일부만 표시 (C3→C4만 보임 등)

- **현상:** 앞선 **CO→C1→C2** 가 빠지고 뒷구간만 보이는 경우.
- **원인:** Base polyline 앞구간을 effective 레일 점과 혼용하거나, 경로 노드 구성 순서 문제.
- **해결:** **`anchorsBase` 전용** 레일 접두(`CO_path0_base`, `C1_rail_base`, `C2_path_base`)로 전체 경로 재구성 후 `cushionPathAttrBase` 생성.

### [버그 3] 레일 밖으로 선 이탈

- **해결:** Rg 선분 클리핑 (`intersectWithTableBounds` 등)으로 테이블 경계에서 끊김.

---

## 17.11 UI 개선

- **Base Line 버튼:** 활성/비활성 시 **색·테두리·그림자** 대비 강화 (노란 강조 vs 회색).
- **C4 표시:** 시스템 값 라벨에서 **소수점 1자리**로 표시 정리 (`SystemValueLabels.jsx` — C4 전용 `toFixed(1)` 표시 경로).

---

## 17.12 최종 결과

- **기준선(Base Line) + 보정선(빨간선)** 을 **동시에** 시각화할 수 있음.
- 사용자에게 **보정이 왜 필요한지** 비교로 전달 가능.
- 시스템·궤적 **이해도** 향상.

---

## 17.13 현재 상태

| 항목 | 상태 |
|------|------|
| Base Line 렌더 | ✅ 정상 |
| 토글 | ✅ 정상 |
| Sn 유지 구조 (`departure` 미제거) | ✅ 정상 |
| C4까지 표시 + 경계 클립 | ✅ 반영 |

---

## 17.14 향후 고려 사항

1. **Base Line ON 기본값** — 최초 진입 시 `showBaseLine` 기본 `true` 여부 UX 검토.
2. **색상 테마** — 기준선/보정선 색 사용자 옵션화.
3. **trajectory 비교 모드** — 두 궤적 차이(각도·길이) 강조 등 고급 모드.

---

## 17.15 App.jsx — Base 세그먼트 경로 복구 (2026-04-28, 커밋·푸시 반영)

**배경:** 기준선이 앵커 좌표를 직접 이은 폴백으로 그려지며 CO–C1이 테이블 밖으로 나가거나 C1–C2 레일 구간이 빠지는 현상이 있었음. 원인은 **`cushionPathAttrBase`가 비어 `ImpactLines`가 앵커 체인으로 대체**한 경우였음.

**원인 정리**

1. **`resolvedSlotBaseSysValues` 병합 오류:** `buildSlotEffectiveRenderSysValues`는 **평탄한 숫자 맵**을 반환하는데, 코드가 존재하지 않는 **`built.values`**만 병합하려 해서 effective 계산 결과가 base 맵에 반영되지 않는 경우가 있었음.
2. **잘못된 게이트 `slotTrajectoryBaseSnPair?.base`:** `buildSlotEffectiveRenderSysValues`는 **`snPair`를 반환하지 않음**. 따라서 해당 조건은 항상 거짓이었고, **`CO_path0_base` / `C1_rail_base` / `C2_path_base` 레일 접두 계산 블록이 사실상 실행되지 않음** → 세그먼트 기반 `cushionPathAttrBase` 미생성.

**조치 (`frontend/src/App.jsx`만)**

- **`resolvedSlotBaseSysValues`:** `buildSlotEffectiveRenderSysValues`의 반환값이 비어 있지 않으면 **`{ ...merged, ...built }`** 로 병합. **`slotTrajectoryBaseSnPair` 의존 제거**(미사용).
- **Base 레일 접두:** `anchorsBase`만 있으면 **`coStartForCushionPath` · `computeRailImpactPoint` · `firstRailHitTowardTarget` · (필요 시) `computeReflectionC2`** 로 앞구간 세그먼트 계산 (`snPair?.base` 조건 삭제).
- **`cushionPathAttrBase`:** 빨간 보정선과 동일한 노드 조립(CO→C1→C2→…) 후 픽셀 문자열 생성. 게이트는 **`anchorsBase && CO_path0_base && C1_rail_base`** — **`C2_path_base`는 필수 아님**(null이면 기존 cushion 루프와 같이 앞에서 끊김).

**금지 준수:** `ImpactLines.jsx`, anchor/projection 핵심 엔진, 계산식 본문 변경 없음.

**기대 결과:** 기준선이 **레일 세그먼트 체인**으로 생성되어 CO–C1이 레일 내부에서 시작하고 C1–C2 구간이 보정선과 같은 구조로 표시됨.

---

## 17.16 한 줄 정리

👉 **Base Line은 “보정(slide·draw·spin·curve_ratio) 제거된 기준 궤적”이며, Sn(departure)은 유지한다.**

---

Status: Updated (2026-04-28) — §17 Base Line 전체 + §17.15 세그먼트 파이프라인 수정(커밋·푸시)

---

# 📌 18. 2026-04-28 작업 업데이트 (ImpactLines · 궤적 필터 · Base 복구 · 핸드오프)

## 18.1 이번 구간에서 완료한 작업 (ImpactLines.jsx 중심)

### A) 잘못된 / 퇴화된 빨간 궤적 완화

- **문제:** 쿠션→임팩트 구간이 **수직 일직선**처럼 보이는 등, 곡구 의도와 무관한 **직선 polyline**이 그려지는 경우.
- **조치:** `cushionPath`를 Rg 점열로 풀어 **`isStraightLine(rgPoints)`** 로 판별(끝점 직선 대비 최대 편차 `eps ≈ 0.02`). 직선에 가깝면 **빨간 polyline 미렌더**.
- **SVG 규약:** `points` prop에는 **객체 배열이 아니라** `toPx`로 만든 **픽셀 문자열**(`usedEffectivePolylinePoints`)만 사용 — 스펙 예시의 `points={cushionPath}`는 유효하지 않아 적용하지 않음.

### B) 관리자/베이스 쪽 “불필요한 추가 polyline” 정리 후 Base 복구

- 한때 **금색 base polyline**만 제거·`cushionPath`만 남기는 방향이 있었으나, **Base Line 비교 UX**를 위해 **복구**.
- **렌더 순서 (아래 → 위):** 오렌지/화이트 `line` → (조건부) Base → 빨간 `cushionPath` polyline.

### C) Base Line 데이터 소스 (현재 구조)

| 조건 | 렌더 |
|------|------|
| `showBaseLine` + 유효한 **`guideLineNode`** (`x1,y1,x2,y2` 픽셀) | 노란 **점선 `<line>`** (`#FFD400`, `strokeDasharray="4 4"`, `strokeWidth={1.25}`, `opacity={0.8}`) |
| `showBaseLine` + `guideLineNode` 없음 + 유효한 base points | **기존과 동일:** `cushionPathAttrBase` 또는 `anchorsBase` 체인 → `toPx` 합성 **금색 `<polyline>`** (`#FFD700`, 실선, 얇은 stroke) + Rg **`intersectWithTableBounds`** 로 C3→C4 클립 |
| 선택 prop **`baseLinePoints`** (픽셀 `points` 문자열) | `guideLineNode` 없을 때 앵커 기반 문자열보다 **우선** (base를 `cushionPath`로 합치지 않음) |

- **`App.jsx`는 이 핸드오프 시점에서 `guideLineNode`를 `ImpactLines`에 넘기지 않음** — 코칭용 흰 점선은 `CoachingOverlay` 쪽에 남아 있을 수 있음. Base 토글 시 **금 polyline** 경로가 실사용.

### D) 빨간 보정 궤적 (`cushionPath`)

- **조건:** `Array.isArray(cushionPath) && cushionPath.length > 2` **그리고** `!isStraightLine(...)`.
- **스타일:** `stroke="#ff4444"`, `strokeWidth={2}`, `fill="none"`.

### E) 디버그 로그

- 개발 모드에서 **`[DRAW BASELINE]`** (`guideLineNode` 값), **`[DRAW CURVE]`** (`cushionPath?.length`) 출력.

---

## 18.2 동일 시점 워킹트리에 포함될 수 있는 기타 변경 (브랜치 기준)

아래는 **같은 체크포인트 커밋에 포함될 수 있는** 수정으로, 곡구·디버그·앵커와 연관된 작업이 섞여 있을 수 있음(정확한 diff는 `git show`로 확인).

| 영역 | 파일 예시 |
|------|-------------|
| 곡구/렌더 경로 병합 | `frontend/src/App.jsx` (`useCurveDeform`, `cushionPathForImpactLines`, 코칭 `guideLine` 등) |
| 디버그 ingest | `frontend/vite.config.js` |
| SYS/앵커 | `SysOverlay.tsx`, `SystemValueLabels.jsx`, `anchorCoordinateEngine.ts` |

---

## 18.3 앞으로 새 창(GPT)에서 이어가야 할 과제 (우선순위)

### P0 — 곡구(curve)가 **렌더·기하**에 일관되게 반영되는지

- **`frontend/src/utils/trajectory/curveTrajectory.ts`** (또는 동등 모듈): `getMergePoint`, `getControlPoint`, `createCurveSegment`, 베지어 샘플링·클램프.
- **`App.jsx`:** `pathNodes[0]` + curve segment + `cushionPath.slice(1)` 병합, **`useCurveDeform`** 기본/강제 여부, `cushionPathForImpactLines` SSOT.
- **검증:** 직선 퇴화 케이스와 실제 곡선 케이스 모두에서 빨간선이 **의도한 호**인지; `isStraightLine`과의 상호작용(곡선인데 필터에 걸리지 않는지).

### P1 — Base / 코칭 라인 **단일 진실원** 정리

- `ImpactLines`에 **`guideLineNode={coaching.guideLineNode}`** 를 넘길지(픽셀 좌표계 일치 전제) 결정 후 `App.jsx` 연결 — 이번 핸드오프에서는 로그에만 “미연결”로 기록.
- `showBaseLine` 기본값·버튼 복사 UI(`SysOverlay` 등)와 **중복 없이** 정리(§16 참고).

### P2 — 디버그·운영 분리

- NDJSON / `__debug/ingest` / 콘솔 대량 로그를 **DEV 전용** 또는 플래그로 묶기.
- §13 **궤적 디버그**(`pathEndIndex`, 스핀 루프 주석) **제품 기본값 복구** 여부 결정.

### P3 — 회귀 테스트

- Base vs Effective, 여러 `input_basis`·슬롯 조합에서 **수동 스냅** 권장(§15·§17과 연계).

---

## 18.4 상태 요약 (핸드오프 시점)

| 항목 | 상태 |
|------|------|
| ImpactLines 빨간선 | `length > 2` + 비직선일 때만 |
| ImpactLines Base | `showBaseLine` + `guideLineNode` **또는** 앵커/`cushionPathAttrBase` 금 polyline |
| `guideLineNode` → ImpactLines | **미연결** (선택 과제) |
| 곡구 렌더 파이프라인 | **새 세션에서 P0로 계속** |

---

Status: Updated (2026-04-28) — §18 ImpactLines 필터·Base 복구·핸드오프 (곡구는 다음 세션)
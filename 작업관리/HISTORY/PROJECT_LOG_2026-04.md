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
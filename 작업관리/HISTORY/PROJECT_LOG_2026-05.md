# PROJECT LOG – 2026-05

Version: v1.0  
Created: 2026-05-03  
Scope: Trajectory · 테이블 UX · SYS 설정 UI · Reflection L-track · Modal overlay · 5&Half shotType sign  

이전 월 로그: `PROJECT_LOG_2026-04.md`

---

## 1. 세션 개요

2026-05 세션은 **곡선 궤적 안정화**, **코칭/조작 UX**, **관리자 SYS 폼 표시**를 중심으로 진행했다.

주제별로 보면:

- **Trajectory**: 베이스라인·쿠션 경로 렌더 분리, 단조 곡선·effect-line 구속 후 Curve A/B 단순화 및 prebend 튜닝
- **UX**: 큐→임팩트 흰색 점선 가이드 복구, 볼 드래그 정밀 모드(Ctrl/Shift)
- **SYS UI**: 물리 보정 라벨·표시 순서 정리
- **Storage canonical persist (PR 2a–2d)**: `positions_dataset` SAVE 경계·`corrections` persist·effective strip·hydrate SSOT·Guard 회귀 복구 (§9–§14)
- **Workspace Cleanup Manager**: ADMIN 우측 패널 LocalStorage 정리 UI (§11)
- **Reflection (L-track)**: C1→C2 spin reflection 부호 — `isLeftHandedTrack` / `handedSpinAdjustDeg` (§17)
- **Modal / SYS UX**: draggable overlay `left/top`·viewport clamp·SYS info box typography (§18)
- **5&Half SYS**: 공략 유형(shotType) effective sign — `unifiedSlideFromCorrections` 연동 (§19)
- **PHASE 2 (Slot runtime · Render SSOT · Position UX)**: slot hydrate/targetBall 분리, `slotRenderSys` render SSOT, Position lock UX (§21)
- **Admin UX Refactoring Phase 1 (§23)**: Search/Reset 상태머신, Target 더블클릭, 입력 세션 모델, targetBall·Recall SSOT 동기화

---

## 2. Git 커밋 요약 (월별)


| 날짜          | 커밋         | 요약                                                                                                          |
| ----------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| 2026-05-01  | `00b627c`  | Base Line 렌더 복구, cushionPath 렌더 분리, 의도치 않은 polyline 제거, 곡선 디버깅 준비                                           |
| 2026-05-03  | `a234fb9`  | 단조(monotonic) 곡선 궤적 및 effect-line confinement 안정화                                                           |
| (Recall v1) | *(권장 메시지)* | `refactor: stabilize recall v1 canonical matching` — 관리자 Recall canonical 안정화(§8). 실제 해시는 로컬 `git log`로 확인. |
| 2026-05-20 | *(로컬 확인)* | `fix(reflection): correct left-track C1-C2 spin reflection direction` — L-track C1-C2 spin 반사 방향 (§17) |
| 2026-05-20 | *(로컬 확인)* | `feat(modal): improve draggable overlay and typography readability` — ModalShell·SYS 가독성 (§18) |
| 2026-05-20 | *(로컬 확인)* | `feat(sys): apply shot-type-aware correction sign in 5&Half` — shotType 보정 부호 (§19) |


*(로컬에서 커밋되지 않은 후속 수정은 아래 세션별 항목에만 적었음. §17–§19 커밋 해시는 `git log --oneline`으로 확인.)*

---

## 3. 궤적·렌더링 (Trajectory / ImpactLines)

### 3.1 Base Line · Cushion 경로 (`00b627c`)

- CO→C1→… 베이스라인 표시 경로 정리 및 클리핑·누락 세그먼트 수정 방향의 작업을 포함한다.
- 표시용 cushion path와 다른 오버레이를 분리해 디버그·머지 과정에서 생기던 중복 polyline을 줄였다.

### 3.2 단조 곡선 · Effect-line (`a234fb9`)

- 곡선이 의도치 않게 되돌아가거나 effective line 밖으로 새는 문제를 줄이기 위한 안정화 작업이다.
- `ImpactLines` 등에서 빨간 궤적은 **직선만 있는 경우** 등 조건에서 polyline을 그리지 않는 등의 기준이 함께 다듬어졌다.

### 3.3 Curve A / Curve B 반복 튜닝 (세션 내)

**목표**: Curve A와 Curve B 연결부(merge 근처) 꺾임·부자연스러운 S형 완화.

**시도했던 방향**

- Curve B 시작 접선을 Curve A 종료 접선과 맞추고, chord 분할·이중 quadratic·reflection으로 내부 C1를 맞추는 구성.

**최종 방향 (단순화)**

- 사용자 피드백에 따라 **Curve B는 단일 quadratic**, `**tangentB = dirTB`(peak→merge 단위 방향)** 로 되돌림.
- `**applyEffectLineBlendToControl`** 은 유지.
- Curve A만 `**CURVE_A_PREBEND_RATIO**` 를 `0.12` → `**0.15**` 로 소폭 상향하여 merge 전 방향을 자연스럽게 맞추는 쪽으로 조정.

**코어 파일**: `frontend/src/utils/trajectory/curveTrajectory.ts`

### 3.4 주황색 보조선(CO_sys→C1 머지 가이드) 굵기

- 렌더 위치: `frontend/src/components/table/ImpactLines.jsx` 의 주황 `#fb923c` `<line>` (CO_line ↔ C1_line).
- 보정 가이드용으로 `**strokeWidth`를 약하게**(예: `2` → `1`) 조정하여 궤적과 시각적 위계를 맞추는 변경이 포함되었다.

### 3.5 Bezier → Hermite 곡선 재설계 (세션 후반, 안정 baseline 확정)

**배경**: 기존 Bezier(A·B 하이브리드) 구조에서 draw/slide 시 **S자 곡선**, **초반 역방향 튐**, **A↔B 꺾임**이 반복적으로 보고됨. 시각·물리 양쪽에서 만족스러운 단일-방향 곡선을 만들지 못해 곡선 모델 자체를 재설계.

#### 해결한 문제 (Done)

1. **곡선 모델 교체**: Bezier 양 control point 튜닝의 한계 인식 → **Hermite 기반 Segment A** 도입.
  - 신규 유틸: `cubicHermite()`, `sampleHermiteCurve()`, `smoothPolyline()` (`curveTrajectory.ts` 상단 유틸 영역).
2. **곡선 형성 메커니즘 정립** (Hermite A 기준):
  - 끝점 강제: `pHermite1 = snappedJoin` → A→C 점프 제거.
  - **chord-수직 성분 도입**: `t0Dir = normalize(dirToJoin + bendNormal * 1.2)` — 양 끝 tangent가 chord와 평행해 직선이 되던 핵심 원인 해결.
  - **bendNormal inward 정렬**: 기존 `Math.sign(slide)` 의존을 제거하고 `inwardNormal`과 dot 정렬해 “항상 보정선 쪽”으로 휨 보장.
  - 끝 tangent 정렬: `tMidDir = normalize(correctionDir * 0.5 + toC1Dir_local * 0.5)` (균등 블렌드) + 안전 클램프(C 방향과 음수 dot이면 강제 정렬).
  - magnitude: `tHermite0 = t0Dir * chordSnapped * 0.4`, `tMid = tMidDir * chordSnapped * 1.0`.
3. **단조성/원뿔 제약 유지**:
  - s 단조 증가 가드(보정선 진행 방향 기준 역행 방지).
  - cone constraint(`t1Dir`이 `correctionDir`/`toC1Dir` 범위를 벗어나지 않도록).
4. **렌더 품질 개선** (geometry 사실상 보존):
  - Hermite 샘플 수 1.5배: `hermiteSamples = max(12, floor(hermiteCutIdx * 1.5))`.
  - `smoothPolyline(curvePoints, 0.15)` 후처리 (양 끝점 고정 Laplacian 1패스).

#### 시도했다가 롤백한 실험들 (Discarded)

baseline 안정성 보호를 위해 모두 제거된 상태(현재 코드에 잔존하지 않음).

- `**curveMode: "offsetDecay"**` — base + normal*offset 모델, 좌표계 정렬 문제로 시각 변화 미미.
- `**curveMode: "tangentCurve"**` — 3구간 tangent 적분, 매개변수 민감도 과다.
- **A↔C 사이 짧은 Hermite 스무딩 구간 삽입** (`smoothToC1Dir`/`smoothLen`/`pSmoothEnd`/`smoothPoints`) — 구조 복잡도 증가, 효과 한계.
- `**extendedC1`(C를 c1 너머 2배 연장)** — App.jsx 결합부에서 `cushionPath.slice(1)[0]=c1`과 충돌하여 “뒤로 접힘” 발생.
- `**cStart`(C 시작점을 impact 쪽 50% 당김)** — `tMidDir` 블렌드와의 정합성 문제.

#### 안정 baseline 스냅샷 (`createCurveSegment` else 분기, 활성 경로)

- 분기 조건: `effectLen >= 1e-9` && `chordSnapped >= 1e-9`.
- A: Hermite (`p0` → `snappedJoin`, `earlyRatio = 0.75`, `hermiteSamples = max(12, floor(hermiteCutIdx*1.5))`).
- C: 직선 `sampleLineSegment(snappedJoin, c1, stepsB)`.
- 결합: `[...segmentAWithHermite, ...linePoints.slice(1)]` → `smoothPolyline(_, 0.15)`.
- App.jsx 결합부: `cushionPathForRender = [...curveSegment, ...cushionPath.slice(1)]` (c1로 정확히 종료되어 결합 정합).
- ImpactLines: 단일 `redPolyline`(`stroke="#ff4444"`)이 위 합성 경로 전체를 그림.

#### 아직 해결하지 못한 문제 (Open)

- **기울기(slope/tilt) 값의 곡선 반영 미연결**: SYS UI에서 “기울기” 라벨/입력은 정리되었으나(§5), 실제 `createCurveSegment` 또는 pathNodes 보정 단계에 입력값이 곡선 형태로 전달되는 경로가 미확인 상태.
- **스핀(spin) 값의 곡선 반영 미연결**: `App.jsx`의 spin path 보정 블록(현재 일부 주석 처리된 영역 존재 가능)과 곡선 모델의 결합부가 정의되지 않음. 곡선의 곡률/방향에 영향을 줘야 하는지, pathNodes 단계에서만 처리되어야 하는지 분리 필요.
- **물리 입력 → 곡선 파라미터 매핑 부재**: 현재 `unifiedSlideForCurve`만이 `bendNormal` 부호 정렬에 영향. 기울기/스핀이 추가될 경우 `t0Dir`/`tMid`/곡률 강도 등에 어떻게 매핑할지 사양 미정.

---

## 4. 테이블·코칭 UX (`App.jsx` 등)

### 4.1 에임 가이드(흰색 점선) 복구

- 디버그 정리 과정에서 꺼져 있던 **큐볼 중심 → 임팩트(컨택) 유령 공** 방향의 흰색 점선을 복구했다.
- 구현: `CoachingOverlay`의 `guideLine`에 `coaching.guideLineNode` 기반 `<line>` 전달 (`strokeDasharray`, `pointerEvents="none"` 등).
- 궤적(`curveTrajectory`) 계산 로직과는 분리된 보조선이다.

### 4.2 볼 드래그 정밀 이동

- Position 모드에서 포인터 이동량을 **delta 기반**으로 유지하면서:
  - **Ctrl**: 이동 스케일 약 **0.2**
  - **Shift**: 약 **1.5**
- 테이블 SVG 드래그와 조이패드 드래그 모두 동일 스케일을 적용할 수 있도록 맞춤.
- 클램프·임팩트 FREE 모드 스냅 등 기존 규칙은 유지.

---

## 5. SYS 설정 UI

### 5.1 물리 보정 필드 (`App.jsx`)

- 라벨 **「곡구」→「기울기」** (`curve_ratio` 키 유지).
- 표시 순서: **밀림 → 끌림 → 기울기 → 스핀 → 출발값 보정**.
- 상태 키 이름·계산 로직은 변경하지 않고 UI 순서·문구만 조정.

### 5.2 Sys 오버레이 (`SysOverlay.tsx`)

- 동일 계열 라벨을 **Slide (밀림) → Draw (끌림) → Curve (기울기) → Departure (출발값 보정)** 순으로 맞춤.
- 이 패널에는 스핀 입력 행이 없어 웹 메인 폼과 필드 개수는 다를 수 있다.

### 5.3 SYS Overlay 교육형 UI 재구성 (2026-05 후반)

#### 문제 원인 분석 (실제 렌더 경로)

- `frontend/src/admin/sys/SysOverlay.tsx`를 수정했지만 메인 앱 SYS 모달 화면에는 반영되지 않는 현상을 확인.
- 디버그/렌더 경로 점검 결과, 메인 앱은 `main.jsx -> App.jsx` 트리를 사용.
- 실제 SYS 설정 모달은 `App.jsx` 내부의 로컬 `function SysOverlay(...)`가 렌더됨.
- 프로젝트 내 `SysOverlay` 이름의 이중 구현 구조를 확인.
- 현재 메인 렌더 트리에서는 `admin/sys/SysOverlay.tsx`가 사용되지 않음.

#### 구조 안정화 메모

- 유지보수 혼선을 줄이기 위해 `frontend/src/App.jsx` 상단에 IMPORTANT 주석 추가.
- 주석에 "메인 앱 SYS UI는 App.jsx 내부 SysOverlay를 수정해야 함"을 명시.
- 오버레이 분리(모듈화/리팩터링)는 시스템 안정화 이후 단계에서 진행 예정.
- 현재 단계의 SYS UI 유지·수정 기준 파일은 `frontend/src/App.jsx`.

#### 교육형 UI 개편 내용 (App.jsx 기준)

- 렌더 순서를 교육형 구조로 정리:
  - 입력 필드
  - 계산 공식
  - `[용어 설명]`
  - 기준 계산값
  - (조건부) 보정 문장
  - (조건부) 보정 계산값
  - 4쿠션 도착값
- 사용자 노출 문구를 교육형 한국어 중심으로 재작성:
  - `[용어 설명]`
  - `출발값 보정 : CO_f_a + 밀림 b = CO_f_c`
  - `3쿠션값 보정 : C3_r_a + 기울기/스핀 b = C3_r_c`
  - `4쿠션 도착값 : ...`
- 내부/엔진 중심 용어의 직접 노출은 제거:
  - `Sn`
  - `eff`
  - `CO_eff`
  - `C4_f = C5_f = C6_f`

#### 조건부 렌더 기준

- 보정 표시 분기를 `hasStartCorrection`, `hasRailCorrection`, `hasAnyCorrection` 기준으로 관리.
- 보정값이 없는 경우 보정 관련 블록은 표시하지 않도록 정리.

#### 레이아웃/UX 방향

- 교육형 UX 중심으로 문구·카드 순서를 재배치.
- 세로 스크롤을 줄이기 위해 compact 2열 구조 유지.
- inline 설명 비중을 높여 읽기 흐름을 단순화.
- 관리자 스타일 톤은 유지하고 문구 가독성만 강화.

#### 실제 수정 파일

- `frontend/src/App.jsx` (SYS Overlay UI 재구성 + 상단 IMPORTANT 주석 추가)

---

## 6. 참고·보류

- **디버그 ingest 로그**: 개발 중 `curveTrajectory.ts`, `ImpactLines.jsx` 등에 세션별 디버그 POST가 남아 있을 수 있다. 배포 전 정리 여부는 별도 판단.
- **문서**: `frontend/docs/` 아래 분석·핸드오프 초안 파일들은 워킹 트리에 따라 존재할 수 있으며, 본 로그에는 파일 단위로 고정하지 않았다.

---

## 7. 다음 단계 (Next Step)

### 7.1 [최우선] 기울기 · 스핀 값의 곡선 반영

**상태**: 미해결 (다음 작업 세션에서 착수)

**해야 할 일**

1. **입력 출처 식별** (수정 금지, 분석만)
  - SYS 폼의 기울기(`curve_ratio`)/스핀 입력이 어떤 상태 키로 저장되는지: `adminState.str.spin`, `corrections.slope`, `unifiedSlideForCurve` 등의 실제 흐름 추적.
  - `App.jsx` 내부에서 현재 “스핀 path 보정” 블록의 활성/주석 상태 확인 (스핀이 pathNodes 단계에서 적용되는지, 또는 비활성 상태인지).
2. **적용 위치 분리 결정**
  - **(A) 곡선 단계 적용**: `createCurveSegment(...)`에 추가 인자로 전달하여 `t0Dir`/`tMid`의 magnitude·방향을 변조.
  - **(B) pathNodes 단계 적용**: 곡선 직전 단계에서 노드 좌표를 보정(`spinPathApplySpin` 등) → 곡선은 보정된 노드를 그대로 받음.
  - 두 방식의 적용 영역이 **중복되지 않도록** 명확히 분리.
3. **물리 입력 → 곡선 파라미터 매핑 사양 정의**
  - 기울기: 곡률 강도(`t0Dir의 bendNormal 계수 1.2`), magnitude 스케일에 매핑할지 검토.
  - 스핀: 곡선 방향 반전/세기, 또는 후속 쿠션 반사각 보정 어디에 매핑할지 검토.
4. **검증**
  - 안정 baseline 곡선이 기울기=0, 스핀=0일 때 현재와 동일하게 유지되는지(회귀 방지).
  - 양·음 값에서 시각적으로 의도대로 변하는지.

**보호 규약** (next-step 진행 시)

- 본 월(2026-05)에 확정한 **Hermite A + 직선 C + smoothPolyline baseline**(§3.5)은 변경 금지.
- 변경이 필요하면 별도 옵션 인자/플래그 경로로 추가하고, 기본 경로는 그대로 둔다.

### 7.2 부수 작업

- Curve A/B (현 Hermite A + 직선 C) 시각 결과를 **여러 트랙·두께·draw/slide 조합**에서 회귀 스크린 검증.
- 디버그 ingest/`console.log` 제거 또는 단일 플래그(`DEBUG_TRAJ`)로 일원화 — 현재 `curveTrajectory.ts`/`App.jsx`/`ImpactLines.jsx`에 잔존.
- `PROJECT_LOG_2026-06.md` 분리 시 본 파일은 수정하지 않고 링크만 추가하는 방식 유지 권장.

---

## 8. Recall v1 canonical 안정화 (관리자 Authoring 전용)

**상태**: 완료 (2026-05 세션 내 Recall 연쇄 작업: Step 제거/격리 → Manhattan coarse → Top1 단일 반환까지 반영)

본 절은 단순 변경 이력이 아니라, **향후 “사용자 추천 엔진”과 “관리자 Recall”을 코드·정책·제품 언어에서 분리**하기 위한 **아키텍처 기준 문서**로 기록한다.

### 8.1 완료 요약 (Recall v1 canonical)

- **signature 기반 Recall 제거**: `filterRecordsBySignature` / `signature-not-found` / `formulaHash`를 Recall 경로에서 사용하지 않음. (스키마의 `signature` 필드는 dataset 호환을 위해 유지.)
- **Ball3 위치 기반 canonical recall 구조 확정**: 현재 공 `cue` / `target` / `second`만으로 후보 탐색·선택.
- **설명 가능한(strict) tolerance 정책 채택**: 볼별 Manhattan 한계; 아래 §8.2.

### 8.2 Recall 정책 확정 (현재 canonical)

**후보(coarse) 조건**

- **cue / target / second 각각** 독립 검사(AND).
- 각 볼에 대해: `abs(dx) + abs(dy) <= 6` (볼 중심 좌표 기준).
- 세 볼 모두 통과해야 후보 인정(strict AND).

**선택(랭킹)**

- coarse 통과 후보에 대해 `**ball3L1Sum**`(세 볼에 걸친 Manhattan 합, 동등 가중)을 계산하고 **최소값인 `PositionRecord` 1건만** 반환(Top1).
- **동률** 시 `positionId`의 `**localeCompare`**로 안정적으로 1건 결정.

**의도적으로 제거·미사용**

- **weighted** 개념 제거(Recall 경로에서 `weightedBallDistance` 미사용·제거).
- **hard / soft / Infinity threshold**를 Recall 엔진 판정에서 제거(UI의 “유사도 낮음” 등 별도 안내는 `applyPositionRecall` 바깥에서 유지 가능).
- **Top3 / `hits` / `RecallNearestHit`** 제거 — 반환은 `{ kind: "match", record, distance }`만.

### 8.3 Recall 목적 정의 (매우 중요)

**관리자 Recall의 목적**

- **기존 dataset 레코드 수정**(저장된 포지션·전략 편집).
- **근사 포지션을 호출한 뒤** 신규 데이터 **authoring** 보조.

**특징(의도)**

- **deterministic**: 동일 입력·동일 dataset이면 동일 선택(동률 규칙 포함).
- **explainable**: “볼별 Manhattan ≤6 AND + 전역 L1 합 최소”로 설명 가능.
- **strict tolerance 기반**: 느슨한 확률 모델이 아닌 명시적 기하 한계.
- **interpolation 없음**(Recall 경로에 블렌드·보간 추천 없음).

### 8.4 사용자 추천 엔진과의 구조적 분리 (반드시 구분)

**관리자 Recall ≠ 사용자 추천 엔진**


| 구분            | 관리자 Recall (현재 v1 canonical)       | 사용자 추천 엔진(향후)                                                  |
| ------------- | ---------------------------------- | -------------------------------------------------------------- |
| 역할            | **Dataset authoring / editing** 도구 | **Runtime inference**, nearest recommendation, 다양한 랭킹·혼합 정책 가능 |
| 정책            | 위 §8.2 고정                          | **별도 정의** — 본 Recall 정책을 그대로 확장·복붙하지 않는다                       |
| interpolation | 없음                                 | **가능**(blended recommendation 등 설계 여지)                         |


**원칙**: 현재 Recall v1 canonical 정책을 **사용자 추천 엔진으로 자동 승격·확장하지 않는다.** 추천 엔진은 요구사항이 확정되면 **독립 사양**으로 추가한다.

### 8.5 후보·선택 알고리즘 요약

- **signature / formulaHash** 기준 Recall 비교 제거.
- **Ball3 위치만**으로 탐색(`filterRecordsByTargetBall` 버킷 후 coarse).
- coarse 통과 후 `**ball3L1Sum` 최소 1개** 선택.
- 동률 시 `**positionId` `localeCompare`**.

### 8.6 제거된 구조·분기 (기록)

다음은 Recall canonical 정리 과정에서 **엔진/타입에서 제거**되었거나 **더 이상 Recall 성공 조건으로 사용되지 않음**을 의미한다.

- `signature-not-found` 분기
- `formulaHash` 기반 recall compare(시그니처 키 필터)
- `weightedBallDistance`(Recall 랭킹)
- hard / soft threshold(Recall 엔진)
- Recall **Top3 / `hits`**
- `RecallNearestHit` 타입

### 8.7 변경하지 않은 영역 (영향 없음)

아래는 본 Recall 작업에서 **의도적으로 수정하지 않음**(회귀·책임 분리).

- trajectory 계산
- SYS 계산
- overlay
- SAVE / history
- `applyPositionRecall` 시그니처·책임(호출은 여전히 단일 `record`)
- dataset schema
- strategy schema
- KD index 구조(Recall 경로에서 미사용 유지)

### 8.8 Git 기록

- **권장 커밋 메시지**: `refactor: stabilize recall v1 canonical matching`
- 실제 커밋 해시는 로컬 저장소에서 확인.

---

**선언 (Recall vs 추천 엔진)**  
Recall v1 canonical은 관리자(authoring) 전용 정책이며, 사용자 추천 엔진 정책은 향후 별도 정의한다.

---

## 9. Canonical Persist Boundary 구축 (PR 2a / PR 2b)

### 9.1 작업 목적

- `**PositionRecord` / `StrategyEntry` canonical 저장 경계 확정**: `positions_dataset`에 넣을 필드와 넣지 않을 필드를 코드 경계에서 분리.
- `**corrections`를 canonical strategy 일부로 승격**: 보정값을 “부가 옵션”이 아니라 전략 레코드의 필수 구성으로 저장.
- **runtime/derived 데이터의 dataset persist 유입 차단**: `outputs`, trajectory, render cache 등이 localStorage dataset에 섞이지 않도록 strip·검증.
- **trajectory는 runtime derive 원칙 유지**: 궤적 계산식·렌더 파이프라인은 본 작업에서 수정하지 않음.
- `**sysInputs`(base) vs effective(render) 경계 감사**: PR 2b에서 audit 로그·validator로 오염 후보 경로를 기록 (완전 분리는 PR 2c).

### 9.2 PR 2a — canonical normalize 저장 파이프라인

**핵심 흐름 (코드 기준):**

```text
slot.applied + adminState.sys
  → toCanonicalStrategyEntry
  → normalizeCanonicalSaveDraft
  → createStrategyEntry
  → attachCanonicalFieldsToStrategyEntry
  → upsertPositionRecord
  → applySchemaVersionToDatasetRecord
  → localStorage positions_dataset / export
```

**주요 파일**

- `frontend/src/domain/canonicalStrategy.ts` — `toCanonicalStrategyEntry`, strip, attach
- `frontend/src/domain/adminSaveEngine.ts` — `createStrategyEntry` (meta 계산)
- `frontend/src/domain/positionMergeEngine.ts` — `upsertPositionRecord`, read-time normalize
- `frontend/src/App.jsx` — `handleSaveStrategy`

**추가·변경 요약**

- `**corrections` canonical persist** + `**correctionsStored: true`** (JSON에 `corrections` 키 존재 표시)
- `**schemaVersion: 1**` — `PositionRecord` 단위 (upsert 직후 부여)
- `**signature.shotType**` ← `adminState.sys.shotType` (기존 `"default"` 하드코딩 제거)
- `**stripRuntimeSysInputs` / `CANONICAL_STRIP_***` — runtime 전용 키 제거
- `**outputs` / `system_values` / trajectory 계열** — dataset에 저장하지 않음 (`createStrategyEntry`도 원래 `outputs` 미포함)

**canonical 저장 구조 요약**


| 레벨               | 필드                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `PositionRecord` | `positionId`, `balls`, `targetBall`, `schemaVersion`, `strategies`                                                           |
| `StrategyEntry`  | `slot`, `signature` (`systemId`, `formulaHash`, `shotType`), `track`, `sysInputs`, `corrections`, `hpT`, `str`, `ai`, `meta` |


**Phase 1 선행 (본 세션, SAVE 이전)**

- read-time `normalizeCanonicalStrategyEntry`, `mergeCorrectionsForRecallHydrate`
- Recall / Position LOCK / History restore → Position 진입 시 `corrections` hydrate 안정화
- legacy dataset(`corrections` 없음)은 메모리 hydrate + `prevSys` fallback; localStorage 자동 rewrite 없음

### 9.3 PR 2b — canonical persist validation + audit

**신규 파일**

- `frontend/src/domain/canonicalPersistAudit.ts`
- `frontend/src/domain/canonicalPersistAudit.test.ts`

**검증 기능**

- `**validateCanonicalStrategyEntry` / `validateCanonicalDataset`** — 필수 필드·금지 키 검사
- `**findForbiddenKeyPaths**` — dataset JSON deep walk
- `**auditSysInputsBoundary**` — `admin.inputs` vs `applied.inputs` vs canonical `sysInputs` diff, `suspectedEffectiveKeys`
- `**logCanonicalPersistAudit**` — DEV 전용, `handleSaveStrategy`에서 `localStorage.setItem` 직전

**DEV persist audit 로그 태그**

- `[CANONICAL_SAVE]` — canonical draft (PR 2a와 연계)
- `[CANONICAL_PAYLOAD]` — persist 직전 strategy 객체
- `[CANONICAL_PAYLOAD_VALIDATE]` — strategy/dataset validate 결과
- `[SYSINPUTS_AUDIT]` — boundary diff
- `[EFFECTIVE_RENDER_AUDIT]` — `resolvedSlotSysValues` 키 목록만 (계산 로직 변경 없음)
- `[STRIP_CANDIDATES_IN_CANONICAL]` — strip 목록에 걸린 키가 canonical에 남을 때 warn

**의도적 미변경 (PR 2b)**

- `buildSlotEffectiveRenderSysValues`, trajectory 계산, `useTrajectoryState`, Grid, Labels, anchors
- `saveShot` 구조, `workspace_history` 구조

### 9.4 corrections 저장 정책 확정

- **기준값(`sysInputs`) + 보정값(`corrections`)은 하나의 전략(strategy) 묶음**으로 저장한다.
- **Recall / Position LOCK / refresh** 이후에도 동일 trajectory를 유지하려면 dataset에 `corrections`가 있어야 하며, `correctionsStored` + `mergeCorrectionsForRecallHydrate`로 legacy·세션 경계를 처리한다.
- **trajectory는 저장하지 않고** runtime에서 `sysInputs` + `corrections` + 기존 derive 파이프라인으로 재생성한다.

**기준선과 보정선은 분리된 기능이 아니라 하나의 전략(strategy)의 base/effective 표현이다.**

### 9.5 저장 금지 (runtime / derived)

`positions_dataset` / export JSON에 **넣지 않는** 대상 (PR 2a strip + PR 2b validator):

- `outputs`, `outputs.result`
- `system_values`
- `trajectory`, `trajectorySamples`
- `resolvedSlotSysValues`
- `rawAnchors`
- `renderCache` / `render_cache`
- `debug`, `calculated`, `adjustedInputs`
- `display`

*(런타임 `slot.applied.sys.outputs`, `adminState.sys`, trajectory state는 세션·History 스냅샷에서만 유지.)*

### 9.6 테스트 및 안정성


| 항목                              | 결과                                                      |
| ------------------------------- | ------------------------------------------------------- |
| `npm run build`                 | 성공                                                      |
| `canonicalPersistAudit.test.ts` | 통과 (`npx tsx src/domain/canonicalPersistAudit.test.ts`) |
| SAVE → refresh → Recall         | 구현·회귀 경로 정상 (수동 확인 권장)                                  |
| SAVE → refresh → Position LOCK  | 동일                                                      |
| History restore → Position      | Phase 1 hydrate + PR 2a persist                         |
| corrections trajectory 유지       | SAVE 후 entry `corrections` 기반 Recall                    |


### 9.7 현재 완료 상태 / 다음 단계

**완료**

- Phase 1 — corrections hydrate 안정화
- PR 2a — canonical normalize 저장 경계 구축
- PR 2b — canonical persist validation + audit 구축

**다음 단계 (미구현 · §15–§16 참고)**

- Phase 3b (optional) — hydrate read-strip 명시화
- Phase 4 / History v2 — dataset 중복 제거·경량 스냅샷·export 중심 구조
- Git canonical dataset workflow — `positions_dataset.json` export/import 표준화 최종화

**PR 2b audit에서 확인된 sysInputs 오염 후보 → PR 2c–2d에서 대부분 해소 (§10)**

1. ~~`toCanonicalStrategyEntry`: `admin.inputs` + `applied.inputs` merge~~ → `system_values` / `normalizedPayload` / `applied.sys.inputs` cascade + strip (PR 2c)
2. ~~`mergeSysOverlayPayloadToNumericInputs`~~ → `system_values` only 또는 `inputs` only (PR 2c)
3. ~~`adminSysFromRecallStrategyEntry`~~ → UI hydrate 분리; SAVE는 `getPersistableBaseSysInputs` (PR 2c + Guard-1)

### 9.8 설계 결론

- **dataset = canonical only**
- **trajectory = runtime derive**
- **corrections = canonical strategy 일부**

**trajectory 자체는 저장 대상이 아니라, canonical strategy(`sysInputs` + `corrections`)로부터 재생성되는 결과물**이다. PR 2a SAVE normalize와 PR 2b persist audit으로, 이 SSOT 원칙이 코드 레벨에서 enforce되기 시작했다. PR 2c–2d·Phase 3a에서 persist/hydrate 경로가 추가로 정리되었다 (§10–§14).

---

## 10. PR 2d 완료 — 회귀 안정화 + cleanup

**상태**: 완료 (2026-05 세션 후반)

### 10.1 작업 목적

- canonical persist **안정화 마무리** (PR 2c 이후 회귀·DEV noise 정리)
- effective `sysInputs` strip **저장 경로 고정**
- Recall → 공 이동 → SAVE 등 **authoring 회귀 복구**
- `applied` / `draft` / `admin` 역할 분리 **명확화**

### 10.2 PR 2c 연계 (effective / base 분리)

- `CANONICAL_STRIP_EFFECTIVE_SYS_INPUT_KEYS` SSOT 확정 (`Sn`, `C4_f`, `oneC`, `threeC`, `arrival`, `C1_f`…`C4_r` 등)
- `toCanonicalStrategyEntry`: `admin.system_values` → `normalizedPayload` → `applied.sys.inputs` cascade (**`admin.inputs` merge 제거**)
- `mergeSysOverlayPayloadToNumericInputs`: `system_values` only, else `inputs` only
- `adminSysFromRecallStrategyEntry`: base `inputs` / `system_values` 분리, `outputs`는 UI·render 전용

### 10.3 PR 2d-A — 테스트

- `frontend/src/domain/canonicalStrategy.test.ts` 신규
  - `stripRuntimeSysInputs`, `extractBaseSysInputs`, `getPersistableBaseSysInputs`, `toCanonicalStrategyEntry`
- `canonicalPersistAudit.test.ts` — 기존 통과 유지

### 10.4 PR 2d-B — DEV cleanup

- `canonicalPersistAudit.ts`: `canonicalDebugLog()` — `window.__CANONICAL_DEBUG__` 또는 이슈 시에만 상세 로그
- `App.jsx`: `[SAVE]` 로그 게이트, debug ingest fetch 제거

### 10.5 PR 2d-Guard-1 — `handleSaveStrategy` guard

- `getPersistableBaseSysInputs(adminState.sys, appliedForSave.sys)` 도입
- `appliedForSave` = `applied` + `draft` fallback (`sys` / `hpt` / `str` / `ai`) — **draft → applied commit 없음**
- early return: `missing-applied-sys-inputs` → `**missing-persistable-base-sys-inputs**`
- Recall 직후 `applied.sys`가 비어 있어도 `adminState.sys.system_values` 또는 `draft.sys`로 SAVE 가능

### 10.6 핵심 결과


| 항목 | 결과 |
| ---- | ---- |
| Recall → SAVE (SYS Apply 없이) | 가능 |
| Recall → 공 이동 → LOCK → SAVE | 가능 (`balls` dataset 반영) |
| `sysInputs` effective key persist | 차단 유지 |
| trajectory / labels / corrections | 회귀 없음 (수동 확인 권장) |
| `npm run build` + canonical 테스트 | 통과 |


**주요 파일**: `canonicalStrategy.ts`, `canonicalPersistAudit.ts`, `App.jsx` (`handleSaveStrategy`), `canonicalStrategy.test.ts`

---

## 11. Workspace Cleanup Manager 추가

**상태**: 완료

### 11.1 UI 위치

- **ADMIN 모드** → 우측 패널(`right-panel`) 하단 — Target / Position 버튼 아래

### 11.2 기능

- **Data 정리** 버튼 (기존 문구 `LocalStorage 정리`에서 변경)
- **2-step expand/collapse UI**
  - collapsed: `[ Data 정리 ]` 버튼만 표시
  - expanded: radio 2종 + `[ 실행 ]`
- **positions_dataset 제외 삭제** (기본): `localStorage` key 순회, `positions_dataset`만 유지 후 `removeItem`
- **전체 삭제**: confirm 후 `localStorage.clear()`

### 11.3 정책

- `**positions_dataset**` = Recall canonical SSOT → **기본 삭제 모드에서 항상 유지**
- `workspace_history`, `workspace_current`, `shot_*`, `lastSavedShotId`, `ANCHORS_OVERRIDE_V1`, `ONE_POINT_LESSON_LIBRARY_V1` 등 **workspace / history / debug / shot cache** 제거 가능
- cleanup 완료 후 `**window.location.reload()**` (workspace 초기화)

### 11.4 UI 변경 (PR UI Cleanup)

- 기존 **상시 노출** radio + 실행 버튼 제거
- **펼침형 2-step**으로 변경 — ADMIN 패널 시각 부담 감소
- `control-button` 계열과 동일 폭·높이(52px)로 정렬

### 11.5 구현 파일

- `frontend/src/hooks/useSettings.js` — `runWorkspaceLocalStorageCleanup`, `listLocalStorageKeysExcept`, 상수 export
- `frontend/src/App.jsx` — UI + `handleWorkspaceLocalStorageCleanup` (로직은 useSettings 위임)

### 11.6 주의 (회귀 이력)

- cleanup UI 작업 중 `App.jsx` **git 복구(merge)** 과정에서 PR 2d-Guard-1 `handleSaveStrategy` guard가 **일시 회귀**함 → §12에서 복구 완료.

---

## 12. PR 2d-Guard-1 회귀 복구

**상태**: 완료

### 12.1 원인

- Workspace Cleanup UI 수정 후 `App.jsx`를 git에서 복구하는 과정에서 **`handleSaveStrategy` guard 변경이 누락**됨.
- 증상: `slot.applied.sys.inputs`만 요구하는 구 guard(`missing-applied-sys-inputs`)가 다시 살아남 → Recall → 공 이동 → LOCK → SAVE 실패.

### 12.2 복구 내용

- `getPersistableBaseSysInputs` import·적용 재도입
- `appliedForSave` fallback (`applied` + `draft`, commit 없음) 복구
- `missing-persistable-base-sys-inputs` guard 복구
- `applied.sys.inputs` **단독 의존 제거**
- `adminState.sys.system_values` cascade fallback 유지
- `toCanonicalStrategyEntry({ applied: appliedForSave, ... })` 복구

### 12.3 결과


| 검증 | 결과 |
| ---- | ---- |
| Recall → 공 이동 → LOCK → SAVE | 정상 복구 |
| `positions_dataset` `balls` 저장 | 정상 |
| Recall → SYS Apply → SAVE | 기존 동작 유지 |
| `npm run build` | 성공 |


**변경 범위**: `handleSaveStrategy` guard 복구만 (cleanup UI·cleanup 로직 미변경).

---

## 13. Phase 3a 완료 — Hydrate builder SSOT 통합

**상태**: 완료

### 13.1 신규 helper

- `**hydrateSysFromStrategyEntry(entry)**` — `frontend/src/domain/strategyHydrate.ts`
- 구현 분리: `strategyHydrateCore.ts` (Vite `import.meta.glob` 없이 `tsx` 단위 테스트 가능)

### 13.2 통합 경로 (단일 hydrate 파이프라인)

다음 경로가 **동일 helper**를 사용하도록 통합:

- `useShotSlots.ts` — `buildDraftsFromRecord`
- `App.jsx` — `buildSlotSysSnapshotFromStrategyEntry`
- `App.jsx` — `adminSysFromRecallStrategyEntry` (snap 생성부)

**파이프라인 요약**

```text
entry.sysInputs
  → stripRuntimeSysInputs (base inputs / system_values)
  → buildExprInputsFromBase + calculateByProfileExpr
  → outputs.result (derive only)
  → mergeCorrections(entry.corrections)
```

### 13.3 정책

- **hydrate source SSOT** = dataset `StrategyEntry` (`entry.sysInputs` + `corrections`)
- **runtime effective** = render-only (`buildSlotEffectiveRenderSysValues` 등 — 본 단계 미변경)
- `**outputs.result`** = expr derive 결과, **persist source 아님**
- effective/runtime key는 `inputs` / `system_values`에 **포함 금지**

### 13.4 검증


| 항목 | 결과 |
| ---- | ---- |
| `strategyHydrate.test.ts` | 신규, 통과 |
| effective key strip on hydrate | 검증 |
| `outputs.result` derive | 유지 |
| `corrections` | 유지 |
| `npm run build` | 성공 |


### 13.5 의도적 미변경

- trajectory / Hermite / `createCurveSegment`
- SYS expr / `calculateByProfileExpr` 본문 의미
- `buildSlotEffectiveRenderSysValues`
- `toCanonicalStrategyEntry` persist 구조
- dirty detection, Position LOCK 정책

---

## 14. 현재 저장 아키텍처 상태 요약

### 14.1 저장 흐름 (2026-05 확정)

```text
볼 이동 / SYS 수정
  → draft / adminState 갱신
  → SAVE (handleSaveStrategy)
  → getPersistableBaseSysInputs guard
  → toCanonicalStrategyEntry (appliedForSave + adminSys)
  → normalizeCanonicalSaveDraft
  → createStrategyEntry + attachCanonicalFieldsToStrategyEntry
  → upsertPositionRecord
  → localStorage.positions_dataset
  → (우측 SAVE 시) Workspace History append
```

### 14.2 Recall / hydrate 흐름

```text
Recall
  → buildDraftsFromRecord (hydrateSysFromStrategyEntry)
  → slot.draft 갱신 (applied unchanged)
  → adminSysFromRecallStrategyEntry (SYS 모달 UI)
  → trajectory/labels = draft + render derive
```

### 14.3 현재 단계 평가

- **저장 안정화 완료 단계**에 진입
- Recall / SAVE 회귀 **안정**
- Hydrate SSOT **정리 완료** (Phase 3a)
- effective / runtime **분리 안정화 완료** (PR 2c–2d)

### 14.4 남은 대형 단계


| 단계 | 내용 |
| ---- | ---- |
| Phase 3b (optional) | hydrate read-strip 명시화 |
| Phase 4 | History 경량화 + export 중심 구조 |
| multi-system rollout | UI/UX·dataset version 관리 전 단계 |


---

## 15. 현재 결정된 운영 정책

### 15.1 저장소 역할


| 저장소 | 역할 |
| ------ | ---- |
| `localStorage` (일반) | 임시 작업 공간 — shot cache, anchors override, one-point library 등 |
| `localStorage.positions_dataset` | **canonical persist** · **Recall source** |
| `workspace_history` | 작업 기록 / UI snapshot (export 후보 관리) |
| Export (파일) | curated dataset 보존 · **향후 GitHub commit 대상** · dataset version 관리 기준(예정) |


### 15.2 Cleanup 정책 (Workspace Cleanup Manager)

- **positions_dataset 유지 삭제**: Recall 데이터 보존, 나머지 cache 제거 + reload
- **전체 삭제**: confirm 필수, `localStorage.clear()` + reload
- cleanup은 **dataset 구조·SAVE 로직을 변경하지 않음** — storage key 제거만

### 15.3 Authoring 경계 (재확인)

- **dataset** = `sysInputs`(base) + `corrections` + signature + meta
- **SYS Apply** = `draft` → `applied` commit 경계 (Recall은 draft만 채움)
- **SAVE** = `getPersistableBaseSysInputs` 기준 persist (draft fallback 허용, commit 없음)

---

## 16. 현재 알려진 남은 이슈

### 16.1 궤적·렌더

- ~~**L-track C1-C2 spin reflection 방향 반전**~~ — §17에서 수정 완료
- **trajectory 트랙 전환 시 곡률 반전 현상** — 미해결 (§3.5 Open 항목과 연계, L-track spin 보정과 별개)
- 기울기·스핀 값의 곡선 반영 미연결 (§7.1)

### 16.2 History · dataset

- **History snapshot 전체 복원** 구조 유지 — canonical-only rehydrate 아님
- `positions_dataset` **장기 경량화** 미완료
- export/import **canonical dataset 구조 최종화** 예정 (Phase 4)

### 16.3 UX · 제품

- **S1/S2/S3 slot 전환 안정성** — PHASE 2 STEP 2–3에서 hydrate·render SSOT 상당 부분 해소 (§21). grid/trajectory **abnormal residue**·legacy path는 잔여 (§21.5)
- **Position lock vs slot/modal** — STEP 4–4-1 완료 (§21.3–21.4). SYS/modal 후 Position 유지, cross-slot만 OFF
- SYS **교육 문구 vs effective 부호** — 옆돌리기 밀림 입력 시 문구가 effective 부호 기준으로 표시될 수 있음 (§19.5)
- SYS **CO 보조선** — `slidePortionForCoLine` 양수만 사용, 옆돌리기 effective 음수 slide 시 보조선 미표시 가능 (curve deform은 연동됨)
- ADMIN **UI/UX 최종 구조** 미완료 (SYS 이중 구현·오버레이 모듈화 등)
- **multi-system rollout** 전 단계
- SAVE 후 **dirty dot(S1●)** — draft ≠ applied 의도적 분리로 잔존 가능
- Position LOCK 시 공 드래그 제한 — unlock → 이동 → lock → SAVE 워크플로

### 16.4 문서·운영

- `PROJECT_LOG_2026-06.md` 분리 시 본 파일은 스냅샷으로 유지·링크만 추가 권장 (§7.2)

---

## 17. Left-track reflection correction

**상태**: 완료

**문제**

- 좌회전(L-track, `B2T_L` / `T2B_L`)에서 C1→C2 구간 spin reflection 방향이 R-track 대비 반대로 적용되는 현상
- 동일 spin 입력이라도 left/right track 간 C2 예측 각도 불일치

**해결**

- `frontend/src/domain/reflectionEngine.ts`
  - `isLeftHandedTrack(track)` — L suffix 트랙 판별
  - `handedSpinAdjustDeg = spinAdjustDeg * (isLeftHandedTrack(track) ? -1 : 1)`
  - `thetaOutDeg = thetaReflectDeg + handedSpinAdjustDeg + 180`
- left/right track reflection **일관성** 확보 (DEV: `[C2_REFLECT_DEBUG]` 로그)

**Git**

- 메시지: `fix(reflection): correct left-track C1-C2 spin reflection direction`
- hash: 로컬 `git log` 확인

**의도적 미변경**

- trajectory Hermite / `createCurveSegment` 본체
- SYS 5&Half slide/draw effective sign (§19)

---

## 18. SYS modal UI / overlay stabilization

**상태**: 완료

**배경**

- SYS·History 등 오버레이 드래그 시 `transform` 기반 이동이 서브픽셀·합성 레이어에서 **문자 가독성 왜곡**을 유발할 수 있음
- SYS 하단 info/result 박스에 container 단위 `monospace`가 걸리면 한글·숫자 혼합 라인이 깨짐

**구현 요약**

| 항목 | 내용 |
| ---- | ---- |
| Draggable shell | `ModalShell` — **transform drag 제거**, `left`/`top` + `snapPx` 배치 |
| Viewport | `clampOffset` — 패널이 뷰포트 밖으로 과도하게 나가지 않도록 margin clamp |
| Backdrop | **transparent backdrop 유지** (테이블 시인성) |
| Typography | container monospace 제거 → **formula token만** `.sys-info-box__mono` |
| 숫자 정렬 | `.sys-info-box__text` / `__num` — `font-variant-numeric: tabular-nums` |
| Grid 기본값 | `showSystemGrid` 초기값 **`false`** (Grid default OFF) |

**포함 파일**

- `frontend/src/components/common/ModalShell.jsx` — 공통 draggable shell (SYS·History 등)
- `frontend/src/index.css` — `.sys-info-box*` typography
- `frontend/src/App.jsx` — `ModalShell`로 SYS/HPT 등 오버레이 래핑
- `frontend/src/components/WorkspaceHistoryModal.jsx` — History도 동일 shell

**Git**

- 메시지: `feat(modal): improve draggable overlay and typography readability`
- hash: 로컬 `git log` 확인

**명시: 최종 반영 아님 (rollback)**

- 세션 중 시도했던 **blur / glass / backdrop-filter** 기반 modal 스타일 실험은 **최종 코드에 포함하지 않음** (가독성·성능 이슈로 롤백). 본 §18은 **left/top drag + typography** 안정화만 기록.

**의도적 미변경**

- `admin/sys/SysOverlay.tsx` (메인 앱 미사용 트리)
- 5&Half 계산 로직 (§19는 별도)

---

## 19. 5&Half shotType-aware correction sign

**상태**: 완료 (분석 + EXECUTE)

### 19.1 문제·분석 (PLAN)

**기존 구조**

```text
shotType state → UI / adminState.sys / signature.shotType (SAVE)
                ↘ 5&Half effective 계산 경로에는 미연결
```

**핵심 계산 choke point**

```text
unifiedSlideFromCorrections
  → CO_eff (= CO_base + unifiedSlide)
  → Sn = (CO_eff - 50) × 0.5
  → C4_eff = C3_r + Sn
  → derived C3_eff = CO_eff - C1(base)
  → trajectory: unifiedSlideForCurve → createCurveSegment
```

**기존 effective 규칙 (shotType 무관, 뒤돌리기만 해당)**

- 저장: slide ≥ 0, draw ≤ 0 (상호 배타) — **유지**
- raw: 밀림 → `+`, 끌림 → `-`
- 문제: **옆돌리기 계열**에서 기대 방향과 반대

**목표 룰 (5&Half)**

| 공략 유형 | 밀림 (slide 저장 +) | 끌림 (draw 저장 -) |
| --------- | ------------------- | ------------------ |
| 뒤돌리기 계열 | effective **+** | effective **-** |
| 옆돌리기 계열 (`startsWith("옆돌리기")`) | effective **-** | effective **+** |

### 19.2 구현

**신규**

- `frontend/src/domain/englishCorrectionSign.ts` — `getShotTypeCorrectionSign(shotType)`
  - `shotType?.startsWith("옆돌리기")` → `-1` (옆돌리기 대회전 포함)
  - 그 외 → `+1`
- `frontend/src/domain/englishCorrectionSign.test.ts`

**변경**

- `frontend/src/App.jsx`
  - `unifiedSlideFromCorrections(corrections, shotType)`:
    - `return raw * getShotTypeCorrectionSign(shotType)`
  - 연결 지점:
    - SysOverlay: `formData.shotType`
    - `buildSlotEffectiveRenderSysValues`: `adminSys?.shotType`
    - curve: `adminState?.sys?.shotType ?? "뒤돌리기"`

**정책 (재확인)**

- **저장 구조·Recall·canonical `corrections` 값 변경 없음**
- correction 숫자 자체를 뒤집어 저장하지 않음 — **effective 계산 계층만** sign 반전

**Git**

- 메시지: `feat(sys): apply shot-type-aware correction sign in 5&Half`
- hash: 로컬 `git log` 확인

### 19.3 검증 (논리·빌드)

| 케이스 | 결과 |
| ------ | ---- |
| 뒤돌리기 + 밀림 +3 | CO +3 (기존과 동일) |
| 옆돌리기 + 밀림 +3 | effective -3 → CO 감소 |
| 옆돌리기 + 끌림 | effective 부호 반전 |
| Sn / C4 / derived C3 | CO_eff 연쇄 반영 |
| trajectory curve | `unifiedSlideForCurve` 동일 helper |
| `npm run build` | 성공 |
| `englishCorrectionSign.test.ts` | 통과 |

### 19.4 의도적 미변경

- `useShotSlots.ts` — slot draft `outputs` Sn/C4 (base CO만, 별도 이슈)
- `engine/calculator/systems/five_and_half.ts` — 레거시 C3 가산 모델
- `admin/sys/SysOverlay.tsx` — 메인 미사용
- transform/modal (§18과 분리)

### 19.5 남은 UX 리스크 (계산 외)

- **교육 문구** (`eduStartCorrectionLine`): effective 부호 기준 분기 → 옆돌리기에서 입력 라벨(밀림)과 문구 불일치 가능
- **CO_corrected_line**: `slidePortionForCoLine`이 양수 unified만 사용 — 옆돌리기 effective 음수 slide 시 보조선만 누락 가능 (curve deform은 동작)

---

## 20. 다음 작업 예정 — S1/S2/S3 slot switching stability

**상태**: PHASE 2 STEP 2–3로 **부분 완료** — 상세·잔여 과제는 §21 참고. 본 절의 초기 증상 분석은 설계 배경으로 유지.

### 20.1 현재 증상

S1 → S2 (또는 타 슬롯) 전환 시:

- grid overlay 소실
- SYS 값 사라짐 / admin·slot 불일치
- trajectory reset
- render inconsistency (`resolvedSlotSys` vs `adminState.sys` 경계)

### 20.2 중기 목표 (설계 방향)

동일 position(record) 아래:

```text
동일 position
 ├─ S1 strategy
 ├─ S2 strategy
 └─ S3 strategy
```

을 하나의 포지션 그룹으로 안정 저장·전환 (canonical `strategies.S1/S2/S3`는 이미 존재 — **런타임 전환 SSOT** 정리가 선행)

### 20.3 선행 작업 (최우선)

```text
slot switching stability 확보
```

- `shotEditor.slots` / `activeSlot` 전환 시 `resolvedSlotSys`·`adminState.sys`·grid·trajectory 동기화 경로 분석
- Recall hydrate vs SYS Apply vs 단순 slot switch 분리
- §14 hydrate·§19 effective sign 회귀 없이 진행

### 20.4 관련 파일 (분석 후보)

- `frontend/src/hooks/useShotSlots.ts`
- `frontend/src/App.jsx` — `switchSlot`, `resolvedSlotSys`, `showSystemGrid`
- `frontend/src/domain/strategyHydrate.ts`

---

## 21. PHASE 2 — Slot runtime · Render SSOT · Position UX stabilization

**기록일**: 2026-05-20 이후 세션 (EXECUTE + DEBUG)  
**범위**: `frontend/src/App.jsx`, `frontend/src/hooks/useShotSlots.ts`, `frontend/src/domain/*` (hydrate/resolve/runtime)

### 21.0 현재 프로젝트 상태 (요약)

**trajectory render SSOT stabilization 진행 중**

| 영역 | 상태 |
| ---- | ---- |
| Slot runtime hydrate / targetBall per-slot | STEP 2 완료 |
| Render-layer SSOT (`slotRenderSys`) | STEP 3 완료 |
| Position lock UX (slot vs modal) | STEP 4–4-1 완료 |
| Trajectory **algorithm** / Hermite baseline | 미변경 (§3.5 보호) |
| Abnormal trajectory residue / legacy render cleanup | **잔여** (§21.5) |

**선언**: 테이블 cushion/curve **render path**는 slot container SSOT로 정렬됨. `useTrajectoryState`는 STR 등 보조. **완전한 trajectory purity·recall auto·legacy fallback 제거**는 후속.

---

### 21.1 PHASE 2 STEP 2 — Slot runtime hydrate stabilization

**목적**

- S1/S2/S3 클릭 시 `runAutoRecommend` partial merge 제거 → slot container **full runtime replace**
- per-slot `targetBall` / `corrections` / `shotType` 유지
- Target 클릭 시 `hydrateSlotRuntime`가 target UI를 덮어쓰는 regression 제거

**Root cause (STEP 2-2 Target regression)**

1. `patchSlotRuntimeMeta` → `slots` ref 변경 → effect `[activeSlot, slots]` → `hydrateSlotRuntime` → `applySlotRuntimeTargetBall(null)` (`hasDraft:false` 시 payload target null)
2. `resolvedSlotSys` / render는 slot 기준이나 target hydrate effect가 **slots 변경마다** target UI reset

**수정 위치**

| 파일 | 내용 |
| ---- | ---- |
| `domain/slotRuntimeHydrate.ts` | `buildSlotRuntimePayload`, `extractSlotRuntimeMeta`, `createEmptySlotRuntime` |
| `domain/slotSysResolve.ts` | `resolveSlotSysForRender` (EMPTY ≠ BROKEN) |
| `domain/slotDraftFromEntry.ts` | recall 시 full hydrate |
| `hooks/useShotSlots.ts` | `patchSlotRuntimeMeta`, recall loaders |
| `App.jsx` | `hydrateSlotRuntime` / `syncSlotRuntimeAdminAndTrajectory` **effect 분리**; S1/S2/S3에서 `runAutoRecommend` 제거 |

**Effect sequence (slot switch, STEP 2-2 이후)**

```text
currentButtonId → S1|S2|S3
  → switchSlot(activeSlot)
  → [activeSlot] hydrateSlotRuntime
       → applySlotRuntimeTargetBall (target only)
       → syncSlotRuntimeAdminAndTrajectory (admin + trajectory)
  → [slots, activeSlot] syncSlotRuntimeAdminAndTrajectory only (target UI 금지)
```

**영향 state**

- `shotEditor.slots[*].draft|applied` — per-slot meta (`targetBall`, `corrections`, …)
- `targetColor`, `isTargetSelected` — hydrate A만
- `adminState.sys` — sync (SYS modal mirror)
- `trajectory` — `setAdjusting` / `resetTrajectory` / `applySysResult`

**Regression**

- STEP 2-2 전: Target 클릭 직후 target OFF (로그로 확인, Fix A effect 분리)
- STEP 2 후: Target per-slot 유지 정상화 (SAVE/recall 경로 포함)

**테스트**

- `npm run build` 성공
- 수동: S1 Target → S2/S3 전환 target 복원, Target flicker 없음

**현재 상태**: **완료** (render SSOT는 STEP 3에서 추가)

---

### 21.2 PHASE 2 STEP 3 — Render SSOT alignment (DEBUG → EXECUTE)

#### 21.2.1 DEBUG — Stale trajectory / legacy runtime residue

**목적**: slot 전환 시 이전 슬롯 correction/curve가 섞이는 **원인 추적 only** (코드 수정 없음)

**Root cause (확정)**

1. **Render-before-effect race**: `resolvedSlotSys`는 즉시 새 슬롯, `buildSlotEffectiveRenderSysValues(..., adminState.sys)`는 **이전 슬롯 corrections/shotType** 사용
2. 테이블 `cushionPath`/curve는 **`useTrajectoryState`가 아님** — 매 render 동기 계산
3. `resolvedSlotSys?.corrections`는 타입상 없음 → curve가 `adminState.sys` fallback 고정
4. `runAutoRecommend` on slot click — **REJECTED** (STEP 2에서 제거됨)

**Legacy path 분석**

- `display.anchors` fallback — 빈 슬롯 시 view JSON 잔상 (PARTIAL)
- `derivedRef` / drag freeze — 드래그 중 edge case

#### 21.2.2 EXECUTE — slotRenderSys 통합

**목적**: render path에서 `adminState.sys` fallback 제거, active slot container SSOT 통일

**수정 위치 (`App.jsx`)**

| 위치 | 변경 |
| ---- | ---- |
| `slotRenderSys` useMemo | `buildSlotRuntimePayload(activeSlot).adminSys` |
| `resolvedSlotSysValues` | `buildSlotEffectiveRenderSysValues(..., slotRenderSys)` |
| `slotRenderSysNoCorrections` | baseline path (admin 대체) |
| cushion/curve (~5847+) | `slotRenderSys.corrections`, `shotType` only — **adminState fallback 제거** |

**adminState.sys fallback 제거 위치**

- `resolvedSlotSysValues` deps: `adminState?.sys` → `slotRenderSys`
- `corrBundleForCurve` / `shotTypeForCurve`: `adminState?.sys` chain 제거
- `adminSysNoCorrections` → `slotRenderSysNoCorrections`

**영향 state**

- Render: `resolvedSlotSysValues`, `rawAnchors`, `cushionPath`, `useCurveDeform`
- Mirror only (변경 없음): `adminState.sys` — SYS modal·SAVE·sync effect

**Effect sequence (slot switch, post-STEP 3)**

```text
paint #1: resolvedSlotSys = new slot, slotRenderSys = new slot meta (동기)
        → cushionPath/curve = new slot (no prev-slot correction bleed)
paint #2+: syncSlotRuntimeAdminAndTrajectory → adminState.sys mirror catch-up
```

**Regression**: 없음 (의도: 첫 프레임부터 slot meta 정합)

**테스트**: `npm run build` 성공; S1↔S2↔S3 빠른 전환 시 이전 slide/curve 혼입 제거 (수동 권장)

**현재 상태**: **완료** (trajectory **algorithm**·persist·recall 미변경)

**resolvedSlotSys / resolvedSlotSysValues 관계 (정리)**

```text
resolvedSlotSys     = resolveSlotSysForRender(slot)     // inputs/outputs/systemId/track
slotRenderSys       = buildSlotRuntimePayload(slot)     // corrections/shotType/spaceSel for render
resolvedSlotSysValues = merge(inputs, outputs) + buildSlotEffectiveRenderSysValues(merged, sys, slotRenderSys)
```

---

### 21.3 PHASE 2 STEP 4 — Position button UX reset

**목적**: slot navigation 시 초기 진입과 동일하게 **Position OFF** (새 편집 세션)

**수정 위치**

- `App.jsx` — S1/S2/S3 `currentButtonId` effect에 `setIsPositionLocked(false)` 추가 (최초)

**영향 state**

- `isPositionLocked` → Position 버튼 `.active`, `canEditPosition`, `canUseSystemControls`

**Regression (STEP 4)**

- SYS Apply / overlay close 후 `currentButtonId`가 `activeSlot`(예: S1)으로 복귀 → **동일 slot id로 effect 재실행** → Position OFF (의도와 충돌)

**테스트**: CASE C (S1→S2 Position OFF) — 의도대로; CASE A/B — **실패** (STEP 4-1로 해소)

**현재 상태**: STEP 4-1로 **대체·정교화** (아래 §21.4)

---

### 21.4 PHASE 2 STEP 4-1 — Position lock persistence stabilization

**목적**

- Position ON 후 SYS/HP/T/STR/AI·trajectory 작업 중 **Position 유지**
- Position OFF는 **(1) 관리자 토글 (2) cross-slot navigation (3) 초기 진입** 만

**Root cause**

- `Stage.jsx`: `onFuncOverlayClose={() => setCurrentButtonId(activeSlot)}`
- overlay 닫힘 → `currentButtonId`가 S1/S2/S3로 복귀 → STEP 4 effect가 **슬롯 이동이 아닌데도** `setIsPositionLocked(false)` 실행

**Effect sequence (regression vs fix)**

```text
[Regression]
  SYS open → currentButtonId=SYS (effect skip)
  SYS close → currentButtonId=S1 → effect → setIsPositionLocked(false) ✗

[Fix 4-1]
  lastSlotNavButtonRef 추적
  isCrossSlotNavigation = prev ∈ {S1,S2,S3} && prev !== current
  → S1→S1 (overlay restore): no reset
  → S1→S2: reset Position
```

**수정 위치**

- `App.jsx` — `lastSlotNavButtonRef`, slot navigation effect 조건부 reset only

**`setIsPositionLocked` 호출처 (전체 추적)**

| 위치 | 조건 | STEP 4-1 |
| ---- | ---- | -------- |
| `handleTogglePositionLock` | 관리자 Position 버튼 | 유지 |
| slot navigation effect | **cross-slot only** | 수정됨 |
| `view` 초기화 effect | view load | 유지 |
| `useSettings` workspace restore | 스냅샷 복원 | 유지 |
| hydrate / sync / applySysResult | — | **없음** (확인) |

**영향 state**

- `isPositionLocked`, `canUseSystemControls` (= Position ∧ Target)

**Regression**

- STEP 4 regression: **해소**
- targetBall / hydrate / trajectory / slotRenderSys: **미접촉**

**검증 (논리)**

| Case | 기대 | 결과 |
| ---- | ---- | ---- |
| A | Position ON → SYS 입력 → Position 유지 | overlay S1→S1, no cross-slot reset |
| B | HP/T → STR modal | 동일 |
| C | S1→S2 | Position OFF |
| D | S2 Position ON 후 작업 | 유지 |
| E | Target/trajectory 변경 | hydrate가 `isPositionLocked` 미접촉 |

**테스트**: `npm run build` 성공

**현재 상태**: **완료**

---

### 21.5 남은 주요 TODO (PHASE 2 이후)

1. **abnormal trajectory residue 제거** — slot 전환·SYS 변경 후 간헐적 path/label 잔상 (render SSOT 이후 잔여 케이스)
2. **legacy render path cleanup** — `display.anchors` fallback, debug ingest, `formData` correction chain 정리
3. **trajectory purity stabilization** — render vs `useTrajectoryState` vs STR panel SSOT 명시·동기화
4. **recall auto behavior 정리** — Position LOCK 시 `runPositionRecall` / `applyPositionRecall`와 slot switch 경계
5. **old correction fallback 제거** — render 외 경로에 남은 `adminState.sys` / `formData` 혼용 점검 (SYS Apply 직후 등)

---

### 21.6 PHASE 2 변경 파일 요약


| STEP | 주요 파일 |
| ---- | --------- |
| 2 | `slotRuntimeHydrate.ts`, `slotSysResolve.ts`, `slotDraftFromEntry.ts`, `useShotSlots.ts`, `adminSysFromSlot.ts`, `App.jsx` |
| 3 | `App.jsx` (`slotRenderSys`, curve/cushion render) |
| 4 / 4-1 | `App.jsx` (slot navigation effect, `lastSlotNavButtonRef`) |

**Git**: PHASE 2 커밋 메시지·해시는 로컬 `git log` 확인 (본 로그 작성 시점 기준 push 여부는 환경별).

**의도적 미변경 (PHASE 2 전체)**

- persistence / canonical SAVE / recall **검색** 정책
- trajectory algorithm (`createCurveSegment`, Hermite baseline §3.5)
- `runAutoRecommend` 재도입
- `admin/sys/SysOverlay.tsx` (메인 미사용 트리)

---

## 22. USER rail / overlay stabilization (2026-05)

**기록일**: 2026-05 후반 (STEP 2-1 Search wiring · STEP 2-2 UI/state cleanup · white screen 긴급 복구)  
**범위**: `frontend/src/components/Stage.jsx`, `frontend/src/App.jsx` (USER rail·overlay·modal wiring만; hydrate/runtime core 미변경)

### 22.1 배경

USER rail UX stabilization 작업 중 다음을 **low-risk patch** 범위로 진행했다.

- History modal wiring
- BASELINE(기준값) overlay close
- active border 분리
- USER overlay cleanup

초기 설계는 `userHistoryOpenRef` / `userOverlayCloseRef`를 Stage↔App **registration pattern**으로 연결하려 했으나, 실제 ref 선언 없이 mount 시 참조되며 **white screen**이 발생했다.

### 22.2 White screen root cause

**실제 원인**

- `onUserHistoryOpenRegister` / `onUserOverlayCloseRegister` 경로에서 **선언되지 않은 ref** 참조

**에러**

- `ReferenceError: userHistoryOpenRef is not defined`
- mount 단계 crash → App 전체 white screen

**중요**

- 문제는 `hydrateSlotRuntime` / `syncSlotRuntimeAdminAndTrajectory` / trajectory **runtime이 아님**
- **unsafe ref wiring** 이었음

### 22.3 최종 복구 방향 (rollback + minimal patch)

**ref registration 패턴 제거**

| 제거 | 대체 |
| ---- | ---- |
| `onUserHistoryOpenRegister` | Stage → prop callback 직접 호출 |
| `onUserOverlayCloseRegister` | `(onOpenHistory ?? userRailActions.openHistory)?.()` |
| 미선언 ref 기반 imperative wiring | `(onCloseUserOverlay ?? userRailActions.closeOverlay)?.()` |

**App**

- `userRailActions` prop으로 handler 전달 (stable object; mount 시 App effect에서 `openHistory` / `closeOverlay` 할당)

**유지**

- 기존 `userSearchHandlerRef` + `onUserSearchStrategiesRegister` 패턴 (USER Search) — **유지**
- 이번 복구는 **USER rail overlay wiring만** 최소 수정

### 22.4 USER UI stabilization 결과

**완료**

| 항목 | 결과 |
| ---- | ---- |
| History modal open | 정상 (`handleOpenUserHistory` → `setShowHistoryModal`) |
| rail label | `"기준선"` → `"기준값"` (id `BASELINE` 유지) |
| BASELINE 클릭 | overlay close (`setOverlayContent(null)` + `onFuncOverlayClose`) |
| HP/T active border | 기준값 토글 시 overlay close로 `currentButtonId` → `activeSlot` 복귀 시 제거 |
| state 분리 | `userGuideLayersActive` vs `currentButtonId` (overlay func) 분리 |
| white screen | 제거 |

**미변경 (의도적)**

- `hydrateSlotRuntime`
- `syncSlotRuntimeAdminAndTrajectory`
- `slotRenderSys`
- `applyPositionRecall` / recall schema
- trajectory algorithm
- ADMIN SAVE / canonical persist
- Recall v1 canonical matching (§8)

### 22.5 운영 규칙 (USER rail/UI 작업 시)

1. **「요청된 범위 외 수정 금지」** — 특히 금지: import cleanup, refactor, hook reorder, global rename, unrelated lint cleanup
2. **mount registration / ref wiring 추가 시** — 반드시 선언·cleanup·useEffect ownership 검증 후 적용
3. **USER overlay/UI 작업** — hydrate / runtime / render core path와 **분리 유지**
4. **Cursor 작업 요청 시** — 「문서/라인 단위 수정 범위 제한」 명시 필수

### 22.6 검증 상태


| 항목 | 결과 |
| ---- | ---- |
| `npm run build` | 성공 |
| white screen 복구 | 완료 |
| USER rail 정상 렌더 | 확인 |
| History open | 정상 |
| BASELINE overlay close | 정상 |
| trajectory / hydrate regression | 없음 (core path 미변경) |


### 22.7 STEP 2-2에서 의도적으로 미해결 (다음 STEP 2-3 예정)

- 시스템값(SystemValueLabels) 미표시 / `outputs.result` gate
- target mismatch (position-level `targetBall` vs per-slot) — **§23 Step 9에서 Admin Search 경로 SSOT 정리 완료**
- trajectory stale on strategy switch (Search apply 후 `hydrateSlotRuntime` 미호출 등)
- slot별 target hydrate
- search apply 후 explicit hydrate sync

---

## 23. Admin UX Refactoring — Phase 1 (2026-05-27)

**Status**: STABLE  
**범위**: Admin 모드 입력 UX 단순화 · Recall/Search/Reset 상태머신 · Target 선택 · 입력 세션 · targetBall 동기화  
**Recall 엔진**: `runAdminPositionRecall()` / `adminStrict` / spatial matching **로직 미변경** (UX·상태 경계만 수정)

### 23.1 배경 — 기존 문제

| # | 문제 |
| - | ---- |
| 1 | **Target → Position → Search** 순서 강제로 입력 단계 과다 |
| 2 | Search **성공 시에만** SYS/HP/T/STR/AI/SAVE 활성 → 신규 데이터 입력 흐름 단절 |
| 3 | Reset 후에도 trajectory / impact / labels 잔존 |
| 4 | 화면 Target 선택과 Recall `targetBall` 불일치 (UI 빨강 · Recall 노랑 등) |
| 5 | Position 버튼이 실질적으로 **입력 세션 시작** 역할만 수행 |

### 23.2 단계별 진행 내역

#### Step 1 — Search / Reset 토글

| 기존 | 변경 |
| ---- | ---- |
| Search만 반복 | Search → (성공 **또는** 실패) → **Reset** → Search |

- 좌측 rail `Stage.jsx`: `adminSearchButtonMode` (`search` \| `reset`)
- `App.jsx`: `handleAdminSearch` / `handleAdminSearchReset` 등록

#### Step 2 — Reset 잔존 레이어 제거

**원인**: `trajectory`는 초기화되었으나 `impactLines` / `anchors` / `resolvedSlotSys` 경로가 계속 렌더.

**수정**

- `adminTableLayersVisible` 단일 SSOT
- Reset 시 `resolvedSlotSys = null`, `rawAnchors = {}` (ADMIN)
- S1/S2/S3 전환 시 레이어 자동 재표시 제거

**결과**: Reset 후 trajectory · impact · system labels 완전 제거.

#### Step 3 — Search no-match / 화면·엔진 불일치

**증상**: 화면에 recall 후보가 있어도 Search 시 「추천 데이터 없음」.

**원인**: `adminStrict` spatial recall과 slot draft hydrate가 **서로 다른 소스** 참조.

**수정**: Search 실패 시 slot draft `recommendedFrom.positionId` 기반 **fallback** 허용 (`runAdminPositionRecall` 내부, 엔진 알고리즘 변경 없음).

#### Step 4 — Target 선택 UX (더블클릭)

| 기존 | 변경 |
| ---- | ---- |
| Target 버튼 → 볼 선택 | **볼 더블클릭** → 즉시 Target 지정 |

- `applyTargetFromBallId(ballId, traceMessage)` 공통화
- TRACE: `TARGET_SELECTED_BY_DOUBLECLICK` (및 Search 직전 `ADMIN_SEARCH_TARGET_STATE`)

#### Step 5 — Target 버튼 제거

**제거**: 우측 `Target` 버튼 UI, `applyTarget()` 버튼 경로.

**유지**: 더블클릭, `targetColor`, `isTargetSelected`, `patchSlotRuntimeMeta({ targetBall })`.

#### Step 6 — Position 버튼 제거

**분석**: Position 버튼 = 입력 세션 시작 + 공 좌표 slot 동기화. → **Search 단계로 통합**.

**제거**: Position 버튼 UI, `handleTogglePositionLock()`, Position Lock 진입 전용 recall (`runPositionRecall` on lock).

#### Step 7 — Admin 입력 세션 모델

| 함수 | 역할 |
| ---- | ---- |
| `beginAdminInputSession()` | Search 성공/실패 후 `isPositionLocked=true`, `syncBallsToAllSlots`, `adminState.balls` 동기화 |
| `endAdminInputSession()` | Reset 시 `isPositionLocked=false`, overlay 닫기 |

**게이트**: `canUseSystemControls = ADMIN && isPositionLocked && isTargetSelected` → Stage `systemControlsAvailable` → SYS/HP/T/STR/AI/SAVE.

#### Step 8 — Search 성공/실패 공통 입력 정책

| | 기존 | 변경 |
| - | ---- | ---- |
| Search 성공 | 입력 가능 | 입력 가능 + 레이어 표시 + hydrate |
| Search 실패 | 종료 | **알림 유지** + **빈 입력 세션** + `beginAdminInputSession()` |

Recall 결과 유무와 무관하게 관리자 **신규 데이터 입력** 가능.

#### Step 9 — targetBall / Recall 동기화 (버그 수정)

**증상**: 빨간공 더블클릭 → Search → UI는 빨강, Recall은 이전 노란공 기준.

**원인 (4경로 분리)**

1. React 배치: 더블클릭 직후 Search가 **이전 렌더 `targetColor`** 로 쿼리
2. `hydrateSlotRuntime` → `applySlotRuntimeTargetBall(payload.targetBall)` 이 slot draft **구 target** 으로 UI 덮어씀
3. `patchSlotRuntimeMeta`가 draft/applied 없으면 `targetBall` 미기록
4. `handleAdminSearch`에서 `beginAdminInputSession()` 미호출 → 입력 버튼 비활성 (버그2)

**수정**

- `adminTargetColorRef` / `adminTargetSelectedRef` — Search 직전 SSOT
- `getAdminSearchTargetBall()` — spatial recall 쿼리 · hydrate effective target · recall apply 후 patch 공용
- `hydrateSlotRuntime`: ref 기준 target 우선 (`effectiveTargetBall`)
- `patchSlotRuntimeMeta`: draft 없어도 `{ targetBall }` stub on draft/applied
- Search 직전 `console.log('[ADMIN_SEARCH_TARGET]', …)` / `[ADMIN_INPUT_SESSION]`

**결과**: UI 선택 볼 = Recall query `targetBall` = hydrate 반영 target.

#### Step 10 — Search → Reset → Search 반복 안정화

Reset 시 `clearSearchSlotDrafts()`, `endAdminInputSession()`, display runtime 제거로 **이전 slot draft / targetBall / recall 레이어 재사용** 방지.

### 23.3 최종 Admin 플로우 (확정)

```text
1. 볼 배치
2. 타겟볼 더블클릭
3. Search
4. Recall 결과 확인 (성공 시 레이어, 실패 시 빈 입력)
5. SYS / HP/T / STR / AI 입력
6. SAVE
7. Reset
8. 다음 데이터 입력
```

### 23.4 Reset 정책 (유지/제거)

| Reset 시 **유지** | Reset 시 **제거** |
| ----------------- | ----------------- |
| `ballsState` | trajectory |
| `targetColor` | impact |
| `isTargetSelected` | labels |
| 테이블 볼 위치 | admin runtime display (`clearAdminDisplayRuntime`, `clearSearchSlotDrafts`, `sys` 스냅샷 초기화) |

### 23.5 변경 파일 요약

| 파일 | 변경 |
| ---- | ---- |
| `frontend/src/App.jsx` | Search/Reset, 입력 세션, target SSOT ref, hydrate effective target, Target/Position UI 제거 |
| `frontend/src/components/Stage.jsx` | Admin rail Search/Reset, tooltip |
| `frontend/src/hooks/useShotSlots.ts` | `patchSlotRuntimeMeta` targetBall stub |

**의도적 미변경**: `runAdminPositionRecall()` 본문 recall matching, `adminStrict`, `runSpatialRecall` 알고리즘.

### 23.6 검증

| 항목 | 결과 |
| ---- | ---- |
| `npm run build` | 성공 |
| `strategyButtonModel.test.ts` | 8 / 8 PASS |
| 수동 | Search 성공·실패, Reset, Search↔Reset 반복, 더블클릭 Target, Recall target 동기화 |

### 23.7 SystemValueLabels 배경 이슈 (보류)

세션 중 CO/C1/C2/C3 라벨 뒤 **반투명 흰색 사각 배경**이 보고되었으나 **최신 빌드에서 미재현** → 별도 CSS 수정 없음.

- `SystemValueLabels.jsx`: 흰색 `<text>` + `AnchorPoint`만 사용
- `label-chip` / `badge` / `pill` / `background` / `backdrop-filter` **미적용**
- Phase 1 수정으로 해당 증상이 해결된 것은 아님 (미재현으로 보류)

### 23.8 현재 상태 · 다음 작업

**완료**

- Admin UX Refactoring Phase 1
- Recall / Search / Reset 상태머신 안정화
- Target 더블클릭 UX
- 입력 세션 기반 Admin 입력 모델

**다음 (Phase 2 예정)**

1. Recall 버튼(우측 패널) 경로와 Search 경로 통합 검토
2. Admin 입력 자동화 추가 개선
3. Data 정리 기능 고도화
4. 저장 워크플로우 최적화
5. Admin UX Refactoring Phase 2 착수

**관련**: §21 Position lock UX는 §23에서 Position 버튼 제거·입력 세션으로 **대체**됨. §22.7 target mismatch 항목은 §23.2 Step 9로 Admin Search 경로에서 해소.

---

*End of PROJECT LOG – 2026-05*
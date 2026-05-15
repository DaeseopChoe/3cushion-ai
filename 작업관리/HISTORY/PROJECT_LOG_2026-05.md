# PROJECT LOG – 2026-05

Version: v1.0  
Created: 2026-05-03  
Scope: Trajectory · 테이블 UX · SYS 설정 UI  

이전 월 로그: `PROJECT_LOG_2026-04.md`

---

## 1. 세션 개요

2026-05 세션은 **곡선 궤적 안정화**, **코칭/조작 UX**, **관리자 SYS 폼 표시**를 중심으로 진행했다.

주제별로 보면:

- **Trajectory**: 베이스라인·쿠션 경로 렌더 분리, 단조 곡선·effect-line 구속 후 Curve A/B 단순화 및 prebend 튜닝
- **UX**: 큐→임팩트 흰색 점선 가이드 복구, 볼 드래그 정밀 모드(Ctrl/Shift)
- **SYS UI**: 물리 보정 라벨·표시 순서 정리

---

## 2. Git 커밋 요약 (월별)

| 날짜 | 커밋 | 요약 |
|------|------|------|
| 2026-05-01 | `00b627c` | Base Line 렌더 복구, cushionPath 렌더 분리, 의도치 않은 polyline 제거, 곡선 디버깅 준비 |
| 2026-05-03 | `a234fb9` | 단조(monotonic) 곡선 궤적 및 effect-line confinement 안정화 |
| (Recall v1) | *(권장 메시지)* | `refactor: stabilize recall v1 canonical matching` — 관리자 Recall canonical 안정화(§8). 실제 해시는 로컬 `git log`로 확인. |

*(로컬에서 커밋되지 않은 후속 수정은 아래 세션별 항목에만 적었음.)*

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

- 사용자 피드백에 따라 **Curve B는 단일 quadratic**, **`tangentB = dirTB`(peak→merge 단위 방향)** 로 되돌림.
- **`applyEffectLineBlendToControl`** 은 유지.
- Curve A만 **`CURVE_A_PREBEND_RATIO`** 를 `0.12` → **`0.15`** 로 소폭 상향하여 merge 전 방향을 자연스럽게 맞추는 쪽으로 조정.

**코어 파일**: `frontend/src/utils/trajectory/curveTrajectory.ts`

### 3.4 주황색 보조선(CO_sys→C1 머지 가이드) 굵기

- 렌더 위치: `frontend/src/components/table/ImpactLines.jsx` 의 주황 `#fb923c` `<line>` (CO_line ↔ C1_line).
- 보정 가이드용으로 **`strokeWidth`를 약하게**(예: `2` → `1`) 조정하여 궤적과 시각적 위계를 맞추는 변경이 포함되었다.

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

- **`curveMode: "offsetDecay"`** — base + normal*offset 모델, 좌표계 정렬 문제로 시각 변화 미미.
- **`curveMode: "tangentCurve"`** — 3구간 tangent 적분, 매개변수 민감도 과다.
- **A↔C 사이 짧은 Hermite 스무딩 구간 삽입** (`smoothToC1Dir`/`smoothLen`/`pSmoothEnd`/`smoothPoints`) — 구조 복잡도 증가, 효과 한계.
- **`extendedC1`(C를 c1 너머 2배 연장)** — App.jsx 결합부에서 `cushionPath.slice(1)[0]=c1`과 충돌하여 “뒤로 접힘” 발생.
- **`cStart`(C 시작점을 impact 쪽 50% 당김)** — `tMidDir` 블렌드와의 정합성 문제.

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

- coarse 통과 후보에 대해 **`ball3L1Sum`**(세 볼에 걸친 Manhattan 합, 동등 가중)을 계산하고 **최소값인 `PositionRecord` 1건만** 반환(Top1).
- **동률** 시 `positionId`의 **`localeCompare`**로 안정적으로 1건 결정.

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

| 구분 | 관리자 Recall (현재 v1 canonical) | 사용자 추천 엔진(향후) |
|------|-----------------------------------|-------------------------|
| 역할 | **Dataset authoring / editing** 도구 | **Runtime inference**, nearest recommendation, 다양한 랭킹·혼합 정책 가능 |
| 정책 | 위 §8.2 고정 | **별도 정의** — 본 Recall 정책을 그대로 확장·복붙하지 않는다 |
| interpolation | 없음 | **가능**(blended recommendation 등 설계 여지) |

**원칙**: 현재 Recall v1 canonical 정책을 **사용자 추천 엔진으로 자동 승격·확장하지 않는다.** 추천 엔진은 요구사항이 확정되면 **독립 사양**으로 추가한다.

### 8.5 후보·선택 알고리즘 요약

- **signature / formulaHash** 기준 Recall 비교 제거.
- **Ball3 위치만**으로 탐색(`filterRecordsByTargetBall` 버킷 후 coarse).
- coarse 통과 후 **`ball3L1Sum` 최소 1개** 선택.
- 동률 시 **`positionId` `localeCompare`**.

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

*End of PROJECT LOG – 2026-05*

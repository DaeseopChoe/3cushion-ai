# CURRENT_CODE_SNAPSHOT_SUMMARY
3Cushion AI – Session Change Summary
Version: v0.3
Date: 2026-03
Author: 목계님

------------------------------------------------------------
이 문서는 “최근 세션에서 발생한 코드 변경 사항”을 요약하는 문서이다.
PROJECT_MASTER_STATE_CURRENT와 다르며,
구조 변화 여부 판단을 위한 보조 문서이다.
------------------------------------------------------------
본 문서는 구조 변경이 아닌 **경미 변경**(UI 수정, 내부 수치 조정, 스타일 변경 등)만 기록한다.
구조/계산/상태 엔진 변경 시 PROJECT_MASTER_STATE_CURRENT를 재작성한다.
------------------------------------------------------------

# 1. 이번 세션 작업 목적

- App.jsx 내부 HptOverlay에 HP_n UI 반영 (1줄 구조)
- App.jsx 계산 블록 한 구역으로 정리 (Physics Engine Block 마커)
- SYS → HP_n → HP/T 1단계 연동 (SYS 적용 시 HP_n 결과를 sysHpNResult에 저장, HP/T 열릴 때만 반영)

------------------------------------------------------------

# 2. 변경 파일 목록

## 수정된 파일

- frontend/src/App.jsx

## 신규 파일

- 없음

## 삭제된 파일

- 없음

------------------------------------------------------------

# 3. 변경 내용 요약 (기능 단위)

### 3.1 UI 변경
- App.jsx 내부 HptOverlay: HP_n 입력칸 추가 (number input, 기본값 0)
- 두께 / HP_n / 타점X / 타점Y 1줄 배치 (flex, gap 12px)

### 3.2 계산 흐름 변경
- 없음

### 3.3 상태 변경
- sysHpNResult 상태 추가 (SYS에서 HP_n 계산 결과 임시 저장, UI 동기화용)
- SYS onSave 시 newData.calculated?.HP_n 있으면 setSysHpNResult 호출
- HptOverlay mount 시 useEffect로 sysHpNResult → hpN 반영 (열릴 때만 1회)

### 3.4 코드 정리
- Physics Engine Block 구역 마커 추가 (toPx, toRg, calcImpactBall, calculateImpact, determineRotation, adjustSystemLine 등)
- Phase 2 분리 대상으로 표시

3.5 HP/T 설정 UI 전면 개선 (최종 구조 안정화)
▪ 상단 구조 재정비

상단 2줄 3등분 레이아웃 구성

1행: 두께 | 회전 | 당점

2행: 각 필드 값

각 영역 flex: 1 균등 배분

▪ 회전 필드 UX 개선

Collapsed 기본 표시:

회전 0팁

좌측 n팁

우측 n팁

클릭 시 Expanded UI 전환:

[좌측/우측 토글 버튼 1개]

[숫자 input (0~4, 소수 1자리)]

팁 고정 텍스트

0 입력 시 자동 Collapsed 복귀

방향 상태를 rotationDir state로 분리

▪ 당점 필드 UX 개선

회전과 동일한 Collapsed/Expanded 구조 적용

verticalDir state 분리

0 입력 시 자동 Collapsed

▪ HP_n 분리 구조

HP_n은 별도 줄로 분리

sysHpNResult != null일 때만 표시

형식: HP_n : [ − 우측 3팁 + ]

HP_n → hit_point 변환 로직 유지

hpToTipXY() 사용 (0~4, 22.5° 단위, 반지름 4)

▪ 입력 안정성

입력 중간 상태 허용: "", "-", ".", "-."

safeNum 헬퍼로 계산 보호

조이스틱 NaN 방지

▪ 계산/구조 영향

hit_point 구조 유지 ({ x, y })

Strategy / Trajectory / Physics Engine 영향 없음

Draft/Applied 구조 변경 없음

계산 파이프라인 변경 없음

🔵 구조 영향 재판정

기존 판정 유지:

계산 파이프라인 변경: ❌
구조 변경: ❌
UI/UX 개선: ✅
→ PROJECT_MASTER_STATE_CURRENT 수정 불필요

🔵 기술 부채 변화 (업데이트)

기술 부채:

감소 ⬇

설명:

회전/당점 상태 책임 분리

HP_n 조건부 UI 분리

입력 안전성 강화

확장 대비 구조 안정화
------------------------------------------------------------

# 4. 구조 영향 분석 (중요)

아래 항목 중 변경이 있었는가?

□ 폴더 구조 변경
□ 계산 파이프라인 변경
□ Draft/Applied 구조 변경
□ 전략 → 궤적 → 물리 연결 변경
□ 저장 포맷 변경
□ 물리 계산 로직 변경

판정:

- 계산 파이프라인 변경: ❌
- 구조 변경: ❌
- UI만 변경: ✅

→ PROJECT_MASTER_STATE_CURRENT 업데이트 필요 여부: 불필요


------------------------------------------------------------

# 5. 전략 → 궤적 → 물리 영향도

이번 변경이 다음 중 어디에 영향을 주는가?

Strategy Engine (useShotSlots): 영향 없음
Trajectory Engine: 영향 없음
Physics Engine: 영향 없음
Rendering Layer: UI 레이아웃 변경만

------------------------------------------------------------

# 6. App.jsx 영향도 분석

- 물리 계산 수정 여부: 없음
- 좌표계 변환 수정 여부: 없음
- Overlay 연결 수정 여부: SYS onSave → setSysHpNResult, HptOverlay sysHpNResult prop → hpN (열릴 때만 반영)

------------------------------------------------------------

# 7. 기술 부채 변화

이번 세션으로 기술 부채가:

동일 (약간 감소)

설명:

- Physics Engine Block 마커 추가 → Phase 2 분리 준비, 감소 방향
- App.jsx 내 HptOverlay UI 정리

------------------------------------------------------------

# 8. 다음 세션 준비 메모

- Phase 2 리팩터링: Physics Engine Block 분리 (utils/physics/)
- HP_n sys 연결, 4팁 로직 등은 추후 세션

------------------------------------------------------------

# 9. 세션 종료 체크 (강제)

아래 중 하나라도 체크되면
PROJECT_MASTER_STATE_CURRENT 재작성:

□ 구조 변경
□ 계산 구조 변경
□ 상태 구조 변경
□ 저장 포맷 변경
□ 물리 계산 변경

판정: 불필요
🔷 문서 간 역할 정리
문서	목적	갱신 방식
PROJECT_MASTER_INDEX	헌법	거의 고정
FRONTEND_ARCHITECTURE	구조 설계	Phase 단위
SYSTEM_ARCHITECTURE	계산 설계	구조 변경 시
CALCULATION_RULES	수식 규칙	규칙 변경 시
PROJECT_MASTER_STATE_CURRENT	현재 코드 상태	구조 변경 시 전면 재작성
CURRENT_CODE_SNAPSHOT_SUMMARY	세션 변경 요약	세션마다 생성

------------------------------------------------------------

## 🔄 2026-02 코드 스냅샷 업데이트 (AI/HPT 구조 안정화)

### 1. HPT 구조 리팩터링 및 안정화

#### 1-1. mode(TIP / SPIN) 구조 도입

- HptState에 `mode: "TIP" | "SPIN"` 필드 추가
- useHptController ↔ parent 간 mode 동기화 확정
- buildPlayStrategy에 mode 전달
- TIP / SPIN 모드 기반 문장 분기 처리

현재 HPT는 단일 책임 구조(SSOT) 기반으로 안정화된 상태이다.

---

#### 1-2. SYS → HPT 방향성 오류 수정

**기존:**

- `hpt.hpDirection` 기반으로 방향 결정
- SYS 계산값과 현재 hp 방향이 충돌하는 문제 존재

**수정:**

- `sysHpNResult`의 부호 기준으로 방향 결정
  - ≥ 0 → right
  - < 0 → left
- `Math.abs(sysHpNResult)` 기반 tip 계산
- 0~4 범위 clamp 적용

이로 인해 SYS 계산값이 HPT UI에 정확히 반영되도록 수정 완료.

---

### 2. AI 코멘트 생성 로직 리팩터링

#### 2-1. buildPlayStrategy 구조 개선

- 값 존재 시에만 문장 생성 (조건부 삽입)
- SYS 도착값 / 1쿠션 개별 분기 처리
- TIP / SPIN 모드 기반 타점 문장 분기
- BANK 두께 처리 추가 (`T === "BANK"` → "뱅크 샷")

AI 코멘트는 현재 구조적으로 안정된 상태.

---

### 3. STR 기본값 구조 정리

**기본값 재정의:**

- strokeType: null
- accelPattern: "부드러운 등속"
- speedRails: 2.5
- strokeDepth: 1.5 Ball
- impactStrength: "평범한"

"미디엄 팔로우" 제거.

---

### 4. 원 포인트 레슨 시스템 도입

#### 4-1. 데이터 구조

```ts
type LessonItem = {
  id: string;
  text: string;
};

onePointLessons: LessonItem[];
```

#### 4-2. 라이브러리

- localStorage 기반 누적 저장 (key: `ONE_POINT_LESSON_LIBRARY_V1`)
- 빈도(count) 기반 정렬 유지
- count UI 표시 제거
- 적용 버튼 클릭 시 라이브러리에 해당 항목 있으면 count++
- 저장 버튼: 중복 시 text 덮어쓰기, 신규 시 count=0 추가
- 드롭다운 선택 시 draft에만 반영 (count 변화 없음)

---

### 5. 전략 문서형 UI 구조로 전환

**기존:**

- textarea 기반 편집형 UI

**변경:**

- 전략 문서형 div 출력 구조
- 자동 높이 조절
- AI 코멘트 + 원 포인트 레슨 통합 박스
- 출력은 읽기 전용 문서 형태로 유지

---

### 6. 숨김 인터랙션 관리 구조

**관리자 기능:**

- 클릭 → 선택 (하이라이트)
- Delete 키 → 즉시 삭제
- Drag handle (☰) → 순서 변경
- 핸들은 hover 시에만 표시
- 사용자 화면에서는 관리 기능을 숨길 수 있는 구조로 설계됨 (CSS `display:none` 가능)

---

### 7. Drag & Drop 의존성 추가

**신규 패키지:**

- @dnd-kit/core
- @dnd-kit/sortable
- @dnd-kit/utilities

---

### 8. UI 미세 조정

- 전체 적용 / 취소 버튼 높이 축소 (padding 18px → 10px 16px)
- 상단 적용/저장 버튼과 시각적 일관성 유지

---

### 9. 변경 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| App.jsx | HPT mode, 원 포인트 레슨, 전략 박스 UI, LessonRow, DndContext |
| index.css | .drag-handle 스타일 추가 |
| admin/save/saveShotRecord.ts | onePointLessons `LessonItem[]` 저장 |
| package.json | @dnd-kit 패키지 추가 |

---

### 📌 현재 상태 요약

현재 프론트엔드 구조는:

- HPT mode(TIP/SPIN) 기반 단일 책임 구조 안정화
- SYS 계산값 방향성 오류 수정 완료
- AI 코멘트 시스템 구조 리팩터링 완료
- 원 포인트 레슨 라이브러리 + 드래그 정렬 기능 도입
- 전략 문서형 출력 구조 완성

본 스냅샷은 UI/상태 흐름이 안정화된 기준 버전이다.

------------------------------------------------------------

## 🔄 2026-03 New Modules Introduced

| 모듈 | 역할 |
|------|------|
| positionMergeEngine.ts | Position 병합 로직 (upsertPositionRecord, isSameBalls, ε=0.5) |
| slotAutoRecommend.ts | Admin 슬롯 자동 추천 (KD-tree 기반) |
| kdTree6d.ts | 6D KD-tree 구현 (balls → Point6D, nearest search) |
| positionKDIndex.ts | signatureKey별 KD-Tree 인덱스 매니저 |
| signatureKey.ts | makeSignatureKey (systemId + formulaHash + shotType) |

------------------------------------------------------------

## 🔄 2026-03 strategyEngine.ts Refactor

**strategyEngine.ts**

Role:
Strategy recommendation engine.

Exports:

- recommendForAdmin
- recommendForUser
- recommendWithInterpolation (future)

Dependencies:

- positionSearchEngine
- KD-tree search

------------------------------------------------------------

## 🔄 2026-03 App Slim화 세션 (Geometry/Physics/Render/Controllers/Domain 분리)

### 1. 변경 사항 요약

#### 1-1. Geometry 분리
- `utils/geometry/coords.ts` 신규 생성
- toPx, toRg, pointerToRg, clamp, formatResultNum, fmt, escapeRegExp 이동
- SCALE/PADDING/TABLE_H 등 상수는 파일 내 정의 금지, 호출부에서 인자 전달

#### 1-2. Physics 분리
- `utils/physics/impact.ts`: calculateImpact, determineRotation, getImpactDirection
- `utils/physics/systemLine.ts`: adjustSystemLine
- BALL_DIAMETER_RG, BALL_RADIUS_RG는 인자로 주입

#### 1-3. Rendering 컴포넌트 분리
- `components/table/AnchorPoint.jsx` (순수 렌더)
- `components/table/SystemValueLabels.jsx` (앵커 라벨 계산 + AnchorPoint 호출)
- `components/table/ImpactLines.jsx` (CO-1C 라인 + 쿠션 경로)
- `components/table/CoachingOverlay.jsx` (가이드라인 + 임팩트볼 렌더)

#### 1-4. Controller 훅 도입
- `hooks/useCoachingController.ts`: T, impactBall, guideLine 등 (early return 이전 호출 원칙으로 hook order 이슈 해결)
- `hooks/useSystemController.ts`: T, system, onChangeT
- `hooks/useDisplayController.ts`: anchors, displayOptions, strategy 추출

#### 1-5. Config 추출
- `config/tableConfig.ts`: TABLE 관련 상수 (SCALE, TABLE_W, TABLE_H, PADDING 등) 단일 출처

#### 1-6. Domain(전략) 엔진 분리
- `domain/railEngine.ts`: groupSystemValuesByRail, buildRailGroupedStrategy (rail grouping + strategy 가공)
- `domain/strategyEngine.ts`: recommendForAdmin, recommendForUser, recommendWithInterpolation (추천 엔진)
- App에서는 buildRailGroupedStrategy 호출

### 2. 변경 파일 목록

| 파일 | 유형 | 내용 |
|------|------|------|
| utils/geometry/coords.ts | 신규 | 좌표·클램프·포맷 유틸 |
| utils/physics/impact.ts | 신규 | Impact 계산 |
| utils/physics/systemLine.ts | 신규 | adjustSystemLine |
| utils/physics/index.ts | 신규 | re-export |
| components/table/AnchorPoint.jsx | 신규 | 앵커 점 렌더 |
| components/table/SystemValueLabels.jsx | 신규 | 앵커 라벨 |
| components/table/ImpactLines.jsx | 신규 | CO-1C/쿠션 라인 |
| components/table/CoachingOverlay.jsx | 신규 | 가이드라인·임팩트볼 |
| hooks/useCoachingController.ts | 신규 | 코칭 오버레이 컨트롤 |
| hooks/useSystemController.ts | 신규 | T, system |
| hooks/useDisplayController.ts | 신규 | anchors, displayOptions |
| config/tableConfig.ts | 신규 | 테이블 상수 |
| domain/railEngine.ts | 신규 | 레일 그룹핑, buildRailGroupedStrategy |
| domain/strategyEngine.ts | 신규 | 추천 엔진 (recommendForAdmin, recommendForUser) |
| domain/index.ts | 신규 | re-export |
| App.jsx | 수정 | 위 모듈/훅 조립, orchestrator 전환 |

### 3. 구조 영향 판정

□ 폴더 구조 변경: ✅
□ 계산 파이프라인 변경: ✅ (domain/physics 분리)
□ Draft/Applied 구조 변경: ❌
□ 전략→궤적→물리 연결 변경: ✅ (레이어 분리)

→ PROJECT_MASTER_STATE_CURRENT 전면 재작성 완료

------------------------------------------------------------

## 🔄 2026-03 Admin Save & Dataset Persistence

### 1. New Domain Modules

| 파일 | 유형 | 내용 |
|------|------|------|
| frontend/src/domain/adminSaveEngine.ts | 신규 | createPositionRecord, createStrategyEntry, appendPositionToDataset |
| frontend/src/domain/finalCoordinateEngine.ts | 신규 | 시스템 기반 final(1C) 좌표 계산, 5_half_system / n_across_short 지원 |
| frontend/src/domain/evaluateStrategy.ts | 신규 | balls + sysInputs → userImpact, userFinal 계산 래퍼 |

### 2. App.jsx 변경 사항

- dataset useState 초기화 (localStorage "positions_dataset" 로드)
- handleSaveStrategy 구현 (evalForSave, createStrategyEntry, appendPositionToDataset)
- AiOverlay onSaveStrategy prop 추가, "전체 적용" 시 호출
- 슬롯 동기화: SYS/HP/T/STR/AI 적용 시 slot.applied에 저장

### 3. State Flow Update

- SYS / HP/T / STR / AI → slot.applied 저장
- "전체 적용" 클릭 시 PositionRecord 생성 후 dataset에 append
- dataset → localStorage "positions_dataset" 자동 persist

### 4. 데이터 저장 구조

- dataset: **로컬 전용** (localStorage)
- 백엔드 persist **미구현**
- JSON export 가능 구조 (PositionRecord[])

------------------------------------------------------------

## 🔄 2026-03 Impact Engine Integration

### ImpactEngine 도입

**신규 모듈**

- `frontend/src/utils/physics/ImpactEngine.ts`

**역할**

- Impact 계산을 단일 엔진으로 통합.

**제공 함수**

- `computeImpactFromLegacyT()`
- `computeImpactFromDisplayThickness()`
- `computeThicknessFromImpact()`
- `snapImpactToOrbit()`
- `parseLegacyT()`
- `displayThicknessToLegacyT()`

**목적**

- Legacy T / Display thickness / Impact drag 계산 — 3개 기준을 단일 수학 모델로 통합

### Impact 계산 구조 변경

| 기존 | 변경 |
|------|------|
| calcImpactBall | → computeImpactFromLegacyT |
| calculateImpact | → computeImpactFromDisplayThickness |

- Impact 계산 책임은 ImpactEngine으로 이동.

### Impact Drag 시스템 추가

**새 UX**

- ImpactBall drag 가능
- drag → thickness 자동 계산
- drag → SYS T 자동 업데이트

**mode**

- CONTACT
- FREE

**double click**

- CONTACT ↔ FREE

### Contact Snap 시스템

- ImpactBall은 targetBall과 정확히 접촉하도록 snap된다.

**수식**

- `impact = target - unit(target-impact) * BALL_DIAMETER`

**목적**

- visual gap 제거
- 물리 모델 일관성 유지

### Auto Capture Engine 추가

**신규 모듈**

- `autoCaptureEngine.ts`

**기능**

- 볼 상태가 1초 안정되면 dataset candidate 자동 생성

**API**

- `createCaptureCandidate()`
- `candidateToPositionPayload()`

**사용 위치**

- App.jsx

### Admin Dataset Builder 기반 구축

- Admin 모드는 이제 **Strategy Editor** + **Dataset Builder** 역할을 동시에 수행한다.
- 자동 캡처는 향후 dataset 생성 파이프라인의 기반이 된다.

------------------------------------------------------------

## 🔄 2026-03 구조 변경 (궤적/anchors/calibration/SystemGrid)

### 1. AnchorCoordinateEngine 도입

**신규 모듈:** `domain/anchorCoordinateEngine.ts`

**기능:**
- anchors.json 기반 sys → 좌표 계산
- parseAnchorId, getTrackAnchors, interpolateCoord
- sysToCoordFromAnchors, getAnchorsForRendering

### 2. CalibrationEngine 도입

**신규 모듈:** `domain/calibrationEngine.ts`

**역할:**
- impact pivot 기준 CO → C1 라인 보정
- rawAnchors → calibrateTrajectory → rawAnchorsCalibrated

### 3. anchorsRegistry 도입

**신규 모듈:** `data/systems/anchorsRegistry.ts`

**기능:**
- 모든 anchors.json 자동 로딩 (import.meta.glob)
- 32 systems 지원

### 4. SystemGrid 렌더링 도입

**신규 컴포넌트:** `components/table/SystemGrid.jsx`

**역할:**
- anchors.json 기반 시스템 그리드 표시
- FG values → frame 영역
- RG values → rail edge
- ADMIN 모드 showSystemGrid 옵션

### 5. Geometry Module 추가

**신규 파일:**
- `utils/geometry/line.ts`: computeLineFromPoints
- `utils/geometry/rail.ts`: lineRailIntersection, computeRailPoints, buildCushionPath

**목적:** App.jsx CO→C1 rail 교점 계산 분리

### 6. Trajectory Reference Model 명확화

- 시스템 궤적 기준: CO → C1 → C2 → C3 → C4 → C5 → C6
- baseline trajectory: C3 = C4 = C5 = C6
- corrected trajectory: C4 = C5 = C6

### 7. FG / RG 판단 규칙

- FG: x 또는 y = -2.25 / 42.25 / 82.25
- RG: 그 외 좌표

### 8. 엔진 계층 구조

```
System Engine
   ↓
AnchorCoordinateEngine
   ↓
CalibrationEngine
   ↓
TrajectoryEngine
   ↓
PhysicsEngine
```

------------------------------------------------------------

## 🔄 2026-03 Anchor Coordinate Rendering Debug Session

이번 세션에서 다음 문제 분석이 진행됨.

**문제:**

- SYS 변경 시 trajectory rendering 불안정
- S1 / S2 슬롯 간 sysValues contamination
- getAnchorsForRendering fallback 발생

**원인:**

1. adminState.sys가 activeSlot 변경 시 동기화되지 않음
2. sysValues → rawAnchors 변환 실패 시 display.anchors fallback
3. convertCanonicalAnchors 실행 조건 오류
4. offset_fg2rg 값이 system.values로 전달되지 않음

**추가 분석:**

- reflection C2 실패는 계산 오류가 아니라 rawAnchors 입력 오염 문제

------------------------------------------------------------
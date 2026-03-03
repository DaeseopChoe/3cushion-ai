# PROJECT_MASTER_STATE_CURRENT
3Cushion AI – Current Code State Snapshot
Version: v2.1
Last Updated: 2026-03
Owner: 목계님

------------------------------------------------------------
이 문서는 “현재 실제 코드 상태”만 기록한다.
설명/이론/설계 철학은 포함하지 않는다.
구조 변경 시 전체를 재작성한다.

이 문서는 구조 붕괴 방지를 위한 통제 문서이다.
아래의 SESSION CHANGE DECISION PROTOCOL이
이 문서의 유일한 재작성 기준이다.

⚠ 구조 변경 항목이 감지되면,
ChatGPT는 작업을 계속하기 전에
반드시 "MASTER_STATE_CURRENT 전면 재작성 권고" 메시지를 먼저 출력한다.

------------------------------------------------------------
# 🔴 SESSION CHANGE DECISION PROTOCOL

작업 도중 아래 항목 중 하나라도 발생하면:

□ 폴더/파일 구조 변경
□ 계산 흐름 변경
□ Draft/Applied 구조 변경
□ 전략 → 궤적 → 물리 파이프라인 변경
□ 저장 포맷 변경
□ 물리 계산 로직 변경

→ ChatGPT는 즉시 아래 메시지를 출력해야 한다:

"⚠ 구조 변경 감지되었습니다.
PROJECT_MASTER_STATE_CURRENT를 전면 재작성하시겠습니까?"

사용자는 반드시:
1) 전면 재작성
또는
2) 구조 변경이 아님을 명시적으로 선언

둘 중 하나를 선택해야 한다.

--------------------------------------------

위 항목이 모두 해당되지 않는 경우:

→ CURRENT_CODE_SNAPSHOT_SUMMARY.md만 업데이트한다.

------------------------------------------------------------

# 1. 현재 실제 폴더 구조 (Frontend 기준)

frontend/src/

admin/
  ai/
  hpt/
  str/
  sys/
  save/
  tests/
  AdminContainer.tsx

components/
  table/
    AnchorPoint.jsx
    SystemValueLabels.jsx
    ImpactLines.jsx
    CoachingOverlay.jsx
    TableGrid.jsx
    RailFrame.jsx
    Ball.jsx

config/
  tableConfig.ts

contexts/
data/
  systems/ (39개 시스템)
  system/calculator/

domain/
  railEngine.ts
  strategyEngine.ts
  adminSaveEngine.ts
  finalCoordinateEngine.ts
  evaluateStrategy.ts
  positionSearchEngine.ts
  strategySignature.ts
  index.ts

hooks/
  useShotSlots.ts
  useTrajectoryState.ts
  useCoachingController.ts
  useSystemController.ts
  useDisplayController.ts

lib/
utils/
  geometry/
    coords.ts
  physics/
    impact.ts
    systemLine.ts
    index.ts
  systemCalculator.ts
  trajectorySampleBuilder.ts
  layoutCalculator.js
  tipClockConverter.ts
  aiPlayStrategyBuilder.ts

App.jsx
main.jsx

※ 이 구조는 현재 실제 코드 기준이며, 변경 시 본 섹션 전체 수정.

------------------------------------------------------------

# 2. App.jsx 현재 상태 평가

App.jsx 역할 (Orchestrator 전환 완료):

✔ State Bridge (ballsState, dragState, overlayState, adminState)
✔ Event Handler (pointer, joystick, overlay)
✔ Stage Layout (SVG 조립)
✔ 훅 호출·데이터 조립 (useSystemController, useCoachingController, useDisplayController, runStrategyEngine)

이미 분리된 것:

- Geometry: utils/geometry/coords.ts (toPx, toRg, clamp, pointerToRg 등)
- Physics: utils/physics/* (calculateImpact, adjustSystemLine)
- Rendering: components/table/* (AnchorPoint, SystemValueLabels, ImpactLines, CoachingOverlay)
- Controllers: hooks/useCoachingController, useSystemController, useDisplayController
- Config: config/tableConfig.ts
- Domain: domain/strategyEngine, domain/railEngine

아직 App에 남은 것:

- Ball 렌더 (로컬 Ball 컴포넌트)
- Pointer handlers (handlePointerDown, handlePointerMove 등)
- Joystick 블록
- Overlay 모달 분기 (SysOverlay, HptOverlay, StrOverlay, AiOverlay)
- groupSystemValuesByRail 등 rail 계산 로직 → domain으로 이전됨 (2026-03)

※ 구조 변경 시 이 항목은 반드시 갱신

------------------------------------------------------------

# 3. 전략 엔진 상태 (useShotSlots)

현재 구조:

Draft / Applied 분리 유지
3 Slot 구조 (S1 / S2 / S3)

updateDraftSys 흐름:
input 병합 → base 고정 → SYSTEM_PROFILES 조회 →
calculateByProfileExpr 실행 →
draft.sys.outputs.result 생성

applyDraftSys:
structuredClone 기반 확정

saveShot:
Applied만 저장
trajectorySamples 파생 생성
version: v1.4

------------------------------------------------------------

# 4. 궤적 엔진 상태 (useTrajectoryState)

상태 머신:

IDLE → ADJUSTING → APPLIED

현재 문제점:

- 실제 물리 트랙 계산 미연결
- derived.track 하드코딩
- App.jsx 브리지 의존

------------------------------------------------------------

# 5. 전략 → 궤적 → 물리 연결 구조 (현재)

Admin SysOverlay
   ↓
calculateByProfileExpr
   ↓
useShotSlots.updateDraftSys
   ↓
applyDraftSys
   ↓
useTrajectoryState.applySysResult
   ↓
domain/runStrategyEngine (전략·레일 가공)
   ↓
utils/physics/* (Impact 계산)
   ↓
hooks/useCoachingController (T, impactBall, guideLine)
   ↓
components/table/* (렌더)
   ↓
Stage (App.jsx 조립)

※ Strategy 가공·Physics·Render는 분리 완료. Config는 config/tableConfig.

------------------------------------------------------------

# 5.5 Domain Layer Additions (2026-03)

- adminSaveEngine.ts: PositionRecord creation, createStrategyEntry, appendPositionToDataset
- finalCoordinateEngine.ts: system-based final (1C) coordinate calculation (5_half_system, n_across_short)
- evaluateStrategy.ts: impact + final computation wrapper (balls + sysInputs → userImpact, userFinal)

------------------------------------------------------------

# 5.6 Dataset State

- dataset is stored in App.jsx as React state
- persisted to localStorage under key "positions_dataset"
- structure: PositionRecord[]
- PositionRecord contains: balls, strategies[]
- StrategyEntry contains: slot, signature, sysInputs, hpT, str, ai, meta

------------------------------------------------------------

# 5.7 Meta Storage

StrategyMeta now includes:
- impact (Point)
- final (Point)
- angle_ci
- angle_fs

------------------------------------------------------------

# 5.8 Save Flow

AiOverlay "전체 적용" →
  onSaveStrategy →
  handleSaveStrategy →
  createStrategyEntry →
  createPositionRecord →
  appendPositionToDataset →
  localStorage persist ("positions_dataset")

------------------------------------------------------------

# 5.9 Known Limitations

- Position merge strategy not implemented (always creates new PositionRecord)
- Search engine not yet connected to user flow
- Admin auto-recommend loading not implemented

------------------------------------------------------------

# 6. 현재 기술 부채 (Technical Debt)

□ App.jsx 여전히 대형 (Orchestrator + Overlay + Ball + pointer handlers)
□ derived.track 미구현
□ Admin/User 분기 통합 (Overlay 블록 일부 혼합)
□ Ball, Joystick 블록 추가 분리 여지

해소됨:

- Geometry/physics/render/controllers/config/domain 분리 완료

------------------------------------------------------------

# 7. 세션 종료 체크 프로토콜 (강제 실행)

새 채팅창으로 이동하기 전 반드시 실행:

1. 오늘 변경 사항 요약
2. 아래 항목 체크

[CHECK]

□ 폴더 구조 변경
□ 계산 로직 변경
□ 상태 엔진 변경
□ 저장 포맷 변경
□ 물리 계산 로직 변경
□ 전략→궤적→물리 연결 변경

3. 하나라도 체크되면:

→ PROJECT_MASTER_STATE_CURRENT 전면 재작성
→ Version 증가
→ 날짜 업데이트

4. 체크가 모두 해제라면:

→ 버전 유지
→ 날짜만 갱신 가능

------------------------------------------------------------

# 8. 새 채팅 시작 템플릿 (자동 감지 트리거)

새 채팅창에서 항상 아래 템플릿 사용:

------------------------------------------------------------
프로젝트: 3Cushion AI

업로드 문서:
- PROJECT_MASTER_INDEX
- FRONTEND_ARCHITECTURE_BASELINE
- SYSTEM_ARCHITECTURE
- CALCULATION_RULES
- PROJECT_MASTER_STATE_CURRENT

작업 중 아래 변경이 발생하면
CURRENT 업데이트 필요 여부를 즉시 판단해 주세요:

1. 폴더 구조 변경
2. 계산 흐름 변경
3. Draft/Applied 구조 변경
4. 전략→궤적→물리 파이프라인 변경
------------------------------------------------------------

이 문장을 반드시 포함한다.
이 문장은 구조 붕괴 방지 장치이다.

------------------------------------------------------------

# 9. 문서 운영 규칙

- CURRENT는 누적 로그가 아니다.
- 항상 “현재 코드 상태”만 기록한다.
- 과거 내용은 제거한다.
- 세션 단위로 재작성한다.
- Git 커밋과 함께 관리한다.

------------------------------------------------------------

# 🔄 2026-02 프로젝트 상태 업데이트 (AI/HPT 구조 안정화 완료)

## 1. HPT 구조 상태

- HptState에 `mode: "TIP" | "SPIN"` 필드 확정
- parent ↔ controller 역주입 구조 안정화
- 단일 clamp 책임 유지
- SYS 계산값의 HP_n이 HPT에 정확히 투영됨

### SYS → HPT 투영 구조

- 방향: sysHpNResult 부호 기준
- 크기: Math.abs(sysHpNResult)
- tip 범위: 0 ~ 4 clamp

방향 충돌 및 음수 clamp 문제 해결 완료.

---

## 2. AI 코멘트 생성 구조 확정

AI 전략 문장은 다음 조건 기반 구조로 확정됨:

- 도착값 / 1쿠션 값 존재 시에만 해당 문장 출력
- TIP 모드 → 시침 기반 문장
- SPIN 모드 → 회전/당점 기반 문장
- BANK 두께 처리 반영
- STR 기본값 반영

문장 생성 로직은 현재 안정 상태.

---

## 3. STR 기본값 구조 확정

**기본 설정:**

- 스트로크 타입 → null
- 가속 패턴 → 부드러운 등속
- 목표 속도 → 2.5 레일
- 스트로크 깊이 → 1.5 Ball
- 타격 강도 → 평범한

null 스트로크 타입은 문장에 출력하지 않음.

---

## 4. 전략 출력 UI 구조 확정

전략 출력은 textarea 기반에서 문서형 div 구조로 변경됨.

**출력 구조:**

- AI 코멘트
- 원 포인트 레슨 (다중 지원)

**특성:**

- 자동 높이
- 읽기 전용 출력
- 입력 계층과 출력 계층 완전 분리

---

## 5. 원 포인트 레슨 시스템 도입 완료

### 구조

```ts
type LessonItem = {
  id: string;
  text: string;
};

onePointLessons: LessonItem[];
```

### 기능

- 다중 레슨 지원
- 라이브러리 누적 저장 (localStorage)
- Drag & Drop 정렬
- 선택 → Delete 키 삭제
- hover 시 핸들 표시
- 관리자 전용 인터랙션

사용자 UI와 관리자 UI 분리 가능한 구조로 설계됨.

---

## 6. Drag & Drop 계층 추가

**의존성:**

- @dnd-kit/core
- @dnd-kit/sortable
- @dnd-kit/utilities

- 전략 문서 출력에는 영향 없음.
- 정렬 상태만 변경.

---

### 📌 현재 프로젝트 안정 상태 요약

**2026-02 기준:**

- HPT 구조 안정화 완료
- SYS 연동 오류 해결
- AI 전략 생성 구조 확정
- STR 기본값 확정
- 원 포인트 레슨 관리 시스템 도입
- 관리자 인터랙션 구조 완성
- AI 버튼 설정 작업 1차 완료

현재 프론트엔드는 구조적으로 안정된 상태이며,
이 시점을 기준으로 기능 확장 단계로 전환 가능하다.
